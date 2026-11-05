import * as THREE from 'three';
import { TABLE_SPACING, TABLES, type TableDef } from '../data/tables';
import type { CoinTier } from '../data/upgrades';
import { TableGroup } from './tableMesh';
import { CoinSystem } from './coinMesh';
import { HelperSystem } from './helperMesh';
import { ParticleSystem } from './particles';
import type { CoinKind } from '../core/game';

export interface SceneTapResult {
  x: number;
  z: number;
}

/** Creates a warm studio reflection environment map for metallic PBR surfaces */
function createStudioEnvMap(renderer: THREE.WebGLRenderer): THREE.Texture | null {
  try {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x281e15);

    const lightGeo = new THREE.PlaneGeometry(10, 10);
    const warmMat = new THREE.MeshBasicMaterial({ color: 0xfff0d0, side: THREE.DoubleSide });
    const topLight = new THREE.Mesh(lightGeo, warmMat);
    topLight.position.set(0, 8, 2);
    topLight.rotation.x = Math.PI / 2;
    envScene.add(topLight);

    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffb86c, side: THREE.DoubleSide });
    const sideLight = new THREE.Mesh(lightGeo, rimMat);
    sideLight.position.set(-8, 4, -6);
    sideLight.lookAt(0, 0, 0);
    envScene.add(sideLight);

    const fillMat = new THREE.MeshBasicMaterial({ color: 0x8ab4f8, side: THREE.DoubleSide });
    const fillLight = new THREE.Mesh(lightGeo, fillMat);
    fillLight.position.set(8, 3, 6);
    fillLight.lookAt(0, 0, 0);
    envScene.add(fillLight);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileCubemapShader();
    const envRT = pmrem.fromScene(envScene, 0.04);
    pmrem.dispose();
    return envRT.texture;
  } catch {
    return null;
  }
}

export class GameScene {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly tableGroup: TableGroup;
  readonly coinSystem: CoinSystem;
  readonly helperSystem: HelperSystem;
  readonly particleSystem: ParticleSystem;

  onTick?: (dt: number) => void;
  onCoinLanded?: (x: number, y: number, z: number, kind: CoinKind, tier: CoinTier) => void;
  onHelperTossCoin?: (coinIdx: number) => void;
  onMegaMinionSlam?: (x: number, z: number) => void;

  private keyLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private rimLight!: THREE.DirectionalLight;
  private currentTableDef: TableDef = TABLES[0];

  private targetCamX = 0;
  private currentCamX = 0;
  private baseCamY = 7.8;
  private baseCamZ = 5.8;
  private camOffsetX = 0;
  private lookAtOffsetZ = 0;
  private portraitDrawerCollapsed = false;
  private pointerParallaxX = 0;
  private pointerParallaxY = 0;
  private shakeIntensity = 0;
  private reducedMotion = false;
  private isTouchDevice = false;
  private lastLandBurstTime = 0;
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private feltPlanes: THREE.Mesh[] = [];

  private isPaused = false;
  private isTabHidden = false;
  private isContextLost = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private totalElapsed = 0;
  private qualityDowngraded = false;

  // Debug stats
  fps = 60;
  drawCalls = 0;
  triangles = 0;
  private frameCount = 0;
  private fpsTimer = 0;

  // Shockwave rings pool for tap/swipe visual feedback
  private shockwaves: Array<{
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    active: boolean;
    age: number;
  }> = [];

  // Golden Relic (Mega-Coin) state
  private relicGroup!: THREE.Group;
  private relicCoinMesh!: THREE.Mesh;
  private relicHaloMesh!: THREE.Mesh;
  private relicActive = false;
  private relicTimeLeft = 0;
  private relicNextSpawnIn = 35; // First Golden Relic spawns after ~35s of play
  private relicX = 0;
  private relicZ = 0;
  private relicVx = 0;
  private relicVz = 0;
  private relicPhase = 0;
  onRelicSpawned?: () => void;

  private resizeObserver: ResizeObserver | null = null;

  constructor(private container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0b08);

    // Check prefers-reduced-motion & touch device early for GPU optimization
    if (typeof window !== 'undefined') {
      if (window.matchMedia) {
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
      this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    const initW =
      container.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280) || 1;
    const initH =
      container.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 720) || 1;

    // Camera: fixed 55° downward angle
    const aspect = initW / initH;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.5, 120);
    this.camera.position.set(0, 7.8, 5.8);
    this.camera.lookAt(0, 0, 0);

    // Renderer (alpha: false guarantees opaque canvas without any checkerboard transparency)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isTouchDevice,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setClearColor(0x0e0b08, 1);
    const maxDpr = this.isTouchDevice ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.setSize(initW, initH);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.appendChild(this.renderer.domElement);

    // Environment map for metallic reflections on coins and trims
    const envMap = createStudioEnvMap(this.renderer);
    if (envMap) {
      this.scene.environment = envMap;
    }

    // Setup Lighting & Full-Bleed Hall Background Texture immediately
    this.setupLights();
    this.applyTableLighting(TABLES[0]);

    // Table Group
    this.tableGroup = new TableGroup();
    this.scene.add(this.tableGroup);

    // Collect felt meshes for raycasting
    this.tableGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name.startsWith('felt_')) {
        this.feltPlanes.push(child);
      }
    });

    // Coin System (InstancedMesh)
    this.coinSystem = new CoinSystem();
    this.scene.add(this.coinSystem.mesh);

    // 3D Table Helper System
    this.helperSystem = new HelperSystem();
    this.scene.add(this.helperSystem.group);

    // Particle System
    this.particleSystem = new ParticleSystem();
    this.particleSystem.points.frustumCulled = false;
    this.scene.add(this.particleSystem.points);

    // Setup Shockwave Ring Pool & Golden Relic Mesh
    this.setupShockwavesAndRelic();

    // Event Listeners
    this.setupEvents();
    this.updateCameraFraming();

    // Start render loop
    this.startLoop();
  }

  private setupShockwavesAndRelic(): void {
    const ringGeo = new THREE.RingGeometry(0.14, 0.24, 32);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd75e,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      mesh.position.y = 0.042;
      this.scene.add(mesh);
      this.shockwaves.push({ mesh, mat, active: false, age: 0 });
    }

    // Golden Relic (Mega-Coin)
    this.relicGroup = new THREE.Group();
    this.relicGroup.visible = false;

    const relicGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.14, 24);
    const relicMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xff9900,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.15,
    });
    this.relicCoinMesh = new THREE.Mesh(relicGeo, relicMat);
    this.relicCoinMesh.castShadow = true;
    this.relicGroup.add(this.relicCoinMesh);

    const haloGeo = new THREE.RingGeometry(0.72, 0.92, 32);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.relicHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.relicHaloMesh.position.y = 0.045;
    this.relicGroup.add(this.relicHaloMesh);

    this.scene.add(this.relicGroup);
  }

  /** Spawns a golden shockwave ring expanding across the table felt */
  spawnShockwave(x: number, z: number): void {
    let slot = this.shockwaves.find((s) => !s.active);
    if (!slot) {
      slot = this.shockwaves[0];
    }
    slot.active = true;
    slot.age = 0;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, 0.042, z);
    slot.mesh.scale.setScalar(1);
    slot.mat.opacity = 0.85;
  }

  /** Spawns the bouncing Golden Relic (Mega-Coin) on the active table */
  spawnGoldenRelic(): void {
    this.relicActive = true;
    this.relicTimeLeft = 12.0; // stays on table for 12 seconds
    this.relicPhase = 0;
    this.relicX = this.targetCamX + (Math.random() - 0.5) * 3.2;
    this.relicZ = (Math.random() - 0.5) * 1.8;
    const angle = Math.random() * Math.PI * 2;
    this.relicVx = Math.cos(angle) * 1.45;
    this.relicVz = Math.sin(angle) * 1.45;
    this.relicGroup.position.set(this.relicX, 0, this.relicZ);
    this.relicGroup.visible = true;
    this.particleSystem.burst(this.relicX, 0.5, this.relicZ, new THREE.Color(0xffd700), 20);
    this.onRelicSpawned?.();
  }

  /** Checks if a tap/swipe at (x, z) hits the active Golden Relic and collects it */
  tryCollectRelicAt(x: number, z: number): { x: number; y: number; z: number } | null {
    if (!this.relicActive) return null;
    const dx = x - this.relicX;
    const dz = z - this.relicZ;
    if (dx * dx + dz * dz <= 1.35 * 1.35) {
      this.relicActive = false;
      this.relicGroup.visible = false;
      this.relicNextSpawnIn = 55 + Math.random() * 25;
      this.particleSystem.burst(this.relicX, 0.45, this.relicZ, new THREE.Color(0xffea70), 36);
      this.triggerShake(0.12);
      return { x: this.relicX, y: 0.45, z: this.relicZ };
    }
    return null;
  }

  private setupLights(): void {
    const def = TABLES[0];
    this.ambientLight = new THREE.AmbientLight(def.lighting.ambientColor, def.lighting.ambient);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(def.lighting.keyColor, def.lighting.keyIntensity);
    this.keyLight.position.set(4, 12, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 5;
    this.keyLight.shadow.camera.bottom = -5;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(def.lighting.rimColor, def.lighting.rimIntensity);
    this.rimLight.position.set(-6, 4, -8);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);
  }

  private bgTextures = new Map<string, THREE.CanvasTexture>();

  private getTableBackgroundTexture(def: TableDef): THREE.CanvasTexture | null {
    const cached = this.bgTextures.get(def.id);
    if (cached) return cached;
    if (typeof document === 'undefined') return null;

    const w = 1024;
    const h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const bgCol = new THREE.Color(def.lighting.background);
    const rimCol = new THREE.Color(def.lighting.rimColor);
    const feltCol = new THREE.Color(def.materials.felt.color);
    const trimCol = new THREE.Color(def.materials.trim.color);

    // Rich, luminous hall colors across the entire 1:1 / 16:9 / 9:16 canvas (never near-black at top or bottom!)
    const topCol = bgCol.clone().lerp(feltCol, 0.42).lerp(rimCol, 0.22);
    const midCol = bgCol.clone().lerp(feltCol, 0.55).lerp(rimCol, 0.28);
    const botCol = bgCol.clone().lerp(feltCol, 0.36).lerp(trimCol, 0.22);
    const glowCol = rimCol.clone().lerp(new THREE.Color(0xffffff), 0.28);
    const goldHex = `#${trimCol.clone().lerp(new THREE.Color(0xffe08a), 0.45).getHexString()}`;

    // 1. Full-bleed vertical atmospheric gradient
    const vGrad = ctx.createLinearGradient(0, 0, 0, h);
    vGrad.addColorStop(0, `#${topCol.getHexString()}`);
    vGrad.addColorStop(0.5, `#${midCol.getHexString()}`);
    vGrad.addColorStop(1, `#${botCol.getHexString()}`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Warm royal hall wainscot & coffered wall paneling across the entire height (top, middle, bottom)
    ctx.save();
    ctx.strokeStyle = goldHex;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 2;
    const cols = 8;
    const rows = 8;
    const cellW = w / cols;
    const cellH = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW + 10;
        const y = r * cellH + 10;
        ctx.strokeRect(x, y, cellW - 20, cellH - 20);
        // Subtle corner diamond in each architectural panel
        ctx.beginPath();
        ctx.arc(x + (cellW - 20) * 0.5, y + (cellH - 20) * 0.5, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 3. Large warm center-top & floor radial spotlights so top and bottom edges are richly lit in 1:1
    const rGradTop = ctx.createRadialGradient(w * 0.5, h * 0.28, 20, w * 0.5, h * 0.35, w * 0.72);
    rGradTop.addColorStop(
      0,
      `rgba(${Math.round(glowCol.r * 255)}, ${Math.round(glowCol.g * 255)}, ${Math.round(glowCol.b * 255)}, 0.38)`,
    );
    rGradTop.addColorStop(
      0.6,
      `rgba(${Math.round(rimCol.r * 255)}, ${Math.round(rimCol.g * 255)}, ${Math.round(rimCol.b * 255)}, 0.16)`,
    );
    rGradTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rGradTop;
    ctx.fillRect(0, 0, w, h);

    const rGradBot = ctx.createRadialGradient(w * 0.5, h * 0.82, 20, w * 0.5, h * 0.8, w * 0.65);
    rGradBot.addColorStop(
      0,
      `rgba(${Math.round(trimCol.r * 255)}, ${Math.round(trimCol.g * 255)}, ${Math.round(trimCol.b * 255)}, 0.25)`,
    );
    rGradBot.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rGradBot;
    ctx.fillRect(0, 0, w, h);

    // 4. Soft bokeh / golden chandelier dust across the full height (0 .. h)
    for (let i = 0; i < 48; i++) {
      const bx = ((i * 173 + 67) % (w - 60)) + 30;
      const by = ((i * 131 + 29) % (h - 60)) + 30;
      const br = 3 + (i % 5) * 2.8;
      const alpha = 0.1 + (i % 4) * 0.05;
      const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br * 2.8);
      bGrad.addColorStop(
        0,
        `rgba(${Math.round(glowCol.r * 255)}, ${Math.round(glowCol.g * 255)}, ${Math.round(glowCol.b * 255)}, ${alpha})`,
      );
      bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.bgTextures.set(def.id, tex);
    return tex;
  }

  applyTableLighting(def: TableDef): void {
    this.currentTableDef = def;
    const bgTex = this.getTableBackgroundTexture(def);
    this.scene.background = bgTex ?? new THREE.Color(def.lighting.background);
    this.ambientLight.color.setHex(def.lighting.ambientColor);
    this.ambientLight.intensity = def.lighting.ambient;

    this.keyLight.color.setHex(def.lighting.keyColor);
    this.keyLight.intensity = def.lighting.keyIntensity;

    this.rimLight.color.setHex(def.lighting.rimColor);
    this.rimLight.intensity = def.lighting.rimIntensity;

    this.renderer.toneMappingExposure = def.lighting.exposure;
  }

  switchTable(tableId: string): void {
    const idx = TABLES.findIndex((t) => t.id === tableId);
    if (idx === -1) return;
    this.targetCamX = idx * TABLE_SPACING;
    this.applyTableLighting(TABLES[idx]);
  }

  setPointerParallax(normX: number, normY: number): void {
    if (this.reducedMotion) return;
    // max ~2 degrees subtle tilt
    this.pointerParallaxX = normX * 0.25;
    this.pointerParallaxY = -normY * 0.18;
  }

  triggerShake(intensity: number): void {
    if (this.reducedMotion) return;
    this.shakeIntensity = Math.min(0.16, Math.max(this.shakeIntensity, intensity));
  }

  raycastFelt(clientX: number, clientY: number): SceneTapResult | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    this.mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    const intersects = this.raycaster.intersectObjects(this.feltPlanes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      return {
        x: hit.point.x,
        z: hit.point.z,
      };
    }
    return null;
  }

  syncTableState(
    counts: Record<CoinTier, number>,
    fallSpeeds: Record<CoinTier, number>,
    autoTosserLevel: number,
    tossSpeedMult: number,
    minionMaxTier: number,
    megaMinionCount = 0,
  ): void {
    const c = this.currentTableDef.coin;
    this.coinSystem.syncCoins(counts, fallSpeeds, this.targetCamX, c.scale);
    this.helperSystem.syncHelpers(
      autoTosserLevel,
      tossSpeedMult,
      minionMaxTier,
      this.targetCamX,
      megaMinionCount,
    );
  }

  tossCoinByIndex(
    coinIdx: number,
    kind: CoinKind,
  ): { x: number; z: number; tier: CoinTier } | null {
    const c = this.currentTableDef.coin;
    return this.coinSystem.tossCoin(coinIdx, kind, c.scale, c.bounce);
  }

  spawnCoin(x: number, z: number, kind: CoinKind): void {
    const c = this.currentTableDef.coin;
    this.coinSystem.spawn(x, z, kind, c.scale, c.bounce);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onResize);
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize();
      });
      this.resizeObserver.observe(this.container);
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[GameScene] WebGL context lost.');
      this.isContextLost = true;
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.warn('[GameScene] WebGL context restored.');
      this.isContextLost = false;
      const envMap = createStudioEnvMap(this.renderer);
      if (envMap) this.scene.environment = envMap;
    });
  }

  setPortraitDrawerCollapsed(collapsed: boolean): void {
    this.portraitDrawerCollapsed = collapsed;
    this.updateCameraFraming();
  }

  private updateCameraFraming(): void {
    const w =
      this.container.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280) || 1;
    const h =
      this.container.clientHeight ||
      (typeof window !== 'undefined' ? window.innerHeight : 720) ||
      1;
    const aspect = w / h;
    this.camera.aspect = aspect;

    const halfFovV = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const tanV = Math.tan(halfFovV);

    // Use bottom-drawer portrait framing for vertical and near-square (1:1, aspect <= 1.15) viewports
    if (aspect <= 1.15) {
      const tanH = Math.max(0.14, tanV * aspect);
      const requiredDistCenter = 2.4 + 4.95 / tanH;
      const zoomOut = Math.min(3.5, Math.max(1.38, requiredDistCenter / 9.72));
      this.baseCamY = 7.8 * zoomOut;
      this.baseCamZ = 5.8 * zoomOut;
      this.camOffsetX = 0;
      this.lookAtOffsetZ = this.portraitDrawerCollapsed ? 0.35 * zoomOut : 0.92 * zoomOut;
    } else {
      // Landscape orientation: frame table inside the uncovered area to the left of the right upgrade panel
      const panelW = w <= 960 || h <= 520 ? 300 : 380;
      const visibleW = Math.max(w * 0.45, w - panelW);
      const visibleAspect = visibleW / h;
      const distForWidth = 2.4 + 4.95 / Math.max(0.2, tanV * visibleAspect);
      const distForHeight = 3.85 / tanV;
      const distCenter = Math.max(distForWidth, distForHeight);
      const zoomOut = Math.min(2.4, Math.max(1.06, distCenter / 9.44));
      this.baseCamY = 7.6 * zoomOut;
      this.baseCamZ = 5.6 * zoomOut;
      const actualDist = Math.hypot(this.baseCamY, this.baseCamZ);
      const halfScreenWorldW = actualDist * tanV * aspect;
      this.camOffsetX = (panelW / w) * halfScreenWorldW * 0.92;
      this.lookAtOffsetZ = 0.2;
    }

    this.camera.updateProjectionMatrix();
  }

  private onResize = (): void => {
    const w =
      this.container.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280) || 1;
    const h =
      this.container.clientHeight ||
      (typeof window !== 'undefined' ? window.innerHeight : 720) ||
      1;
    this.updateCameraFraming();
    this.renderer.setSize(w, h);
  };

  private onVisibilityChange = (): void => {
    this.isTabHidden = document.hidden;
    if (this.isTabHidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (this.isPaused) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  }

  private startLoop(): void {
    if (this.animFrameId !== null || this.isPaused || this.isTabHidden) return;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private stopLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (time: number): void => {
    this.animFrameId = requestAnimationFrame(this.loop);

    const rawDtMs = time - this.lastTime;
    // Cap to 60 FPS on 120Hz touch devices to save battery
    if (this.isTouchDevice && rawDtMs < 15.2) {
      return;
    }

    const dtMs = Math.min(rawDtMs, 100);
    this.lastTime = time;
    const dt = dtMs / 1000;
    this.totalElapsed += dt;

    if (this.isContextLost) return;

    this.onTick?.(dt);

    // Smooth camera pan between tables (lerp)
    this.currentCamX += (this.targetCamX - this.currentCamX) * Math.min(1, dt * 7);

    // Subtle camera shake decay on big coins
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.001) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity *= Math.max(0, 1 - dt * 14);
    } else {
      this.shakeIntensity = 0;
    }

    // Apply camera position with responsive portrait/landscape framing, parallax, and shake
    this.camera.position.x = this.currentCamX + this.camOffsetX + this.pointerParallaxX + shakeX;
    this.camera.position.y = this.baseCamY + this.pointerParallaxY + shakeY;
    this.camera.position.z = this.baseCamZ;
    this.camera.lookAt(this.currentCamX + this.camOffsetX, 0, this.lookAtOffsetZ);

    // Move directional lights with camera so shadows and highlights work on all tables
    this.keyLight.position.x = this.currentCamX + 4;
    this.keyLight.target.position.x = this.currentCamX;
    this.keyLight.target.updateMatrixWorld();

    this.rimLight.position.x = this.currentCamX - 6;
    this.rimLight.target.position.x = this.currentCamX;
    this.rimLight.target.updateMatrixWorld();

    // Update 3D Helpers & Heavy Minion table slammers
    this.helperSystem.update(
      dt,
      this.coinSystem,
      (coinIdx) => {
        this.onHelperTossCoin?.(coinIdx);
      },
      (slamX, slamZ) => {
        this.spawnShockwave(slamX, slamZ);
        this.triggerShake(0.08);
        this.onMegaMinionSlam?.(slamX, slamZ);
      },
    );

    // Update coins
    this.coinSystem.update(dt, (x, y, z, kind, tier) => {
      if (kind > 0 || (tier === 'gold' && time - this.lastLandBurstTime >= 60)) {
        this.lastLandBurstTime = time;
        const col =
          kind === 3
            ? new THREE.Color(0xfff380)
            : kind === 2
              ? new THREE.Color(0x80ffff)
              : kind === 1 || tier === 'gold'
                ? new THREE.Color(0xffd700)
                : new THREE.Color(0xe2e8f0);
        this.particleSystem.burst(x, y, z, col, kind === 3 ? 24 : kind === 2 ? 12 : 6);
        if (kind > 0) {
          this.triggerShake(kind === 3 ? 0.12 : kind === 2 ? 0.08 : 0.04);
        }
      }
      this.onCoinLanded?.(x, y, z, kind, tier);
    });

    // Update shockwave rings
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active) continue;
      sw.age += dt;
      const dur = 0.36;
      if (sw.age >= dur) {
        sw.active = false;
        sw.mesh.visible = false;
      } else {
        const p = sw.age / dur;
        const easeOut = 1 - (1 - p) * (1 - p);
        sw.mesh.scale.setScalar(1 + easeOut * 5.8);
        sw.mat.opacity = 0.85 * (1 - p);
      }
    }

    // Update Golden Relic (Mega-Coin) timer & hopping animation
    if (!this.relicActive) {
      this.relicNextSpawnIn -= dt;
      if (this.relicNextSpawnIn <= 0) {
        this.spawnGoldenRelic();
      }
    } else {
      this.relicTimeLeft -= dt;
      if (this.relicTimeLeft <= 0) {
        this.relicActive = false;
        this.relicGroup.visible = false;
        this.relicNextSpawnIn = 55 + Math.random() * 25;
      } else {
        this.relicPhase += dt * 7.5;
        this.relicX += this.relicVx * dt;
        this.relicZ += this.relicVz * dt;
        const halfW = 2.6;
        const halfD = 1.4;
        const relX = this.relicX - this.targetCamX;
        if (Math.abs(relX) > halfW) {
          this.relicVx = -this.relicVx;
          this.relicX = this.targetCamX + Math.sign(relX) * halfW;
        }
        if (Math.abs(this.relicZ) > halfD) {
          this.relicVz = -this.relicVz;
          this.relicZ = Math.sign(this.relicZ) * halfD;
        }
        const hopY = 0.38 + Math.abs(Math.sin(this.relicPhase)) * 0.55;
        this.relicGroup.position.set(this.relicX, 0, this.relicZ);
        this.relicCoinMesh.position.y = hopY;
        this.relicCoinMesh.rotation.x = Math.PI / 2;
        this.relicCoinMesh.rotation.z = this.relicPhase * 0.6;
        const pulse = 1 + Math.sin(this.relicPhase * 1.5) * 0.16;
        this.relicHaloMesh.scale.setScalar(pulse);
      }
    }

    // Update particles
    this.particleSystem.update(dt);

    // Render
    this.renderer.render(this.scene, this.camera);

    // Stats & auto-quality after 10s shader warm-up
    this.drawCalls = this.renderer.info.render.calls;
    this.triangles = this.renderer.info.render.triangles;
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;

      if (this.totalElapsed > 10 && !this.qualityDowngraded && this.fps < 40) {
        this.qualityDowngraded = true;
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
      }
    }
  };

  dispose(): void {
    this.stopLoop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.onResize);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.dispose();
  }
}
