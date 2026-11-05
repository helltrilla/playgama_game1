import * as THREE from 'three';
import type { CoinKind } from '../core/game';
import { TABLE_SPACING } from '../data/tables';
import { COIN_TIERS, type CoinTier } from '../data/upgrades';

export const MAX_COINS = 85;

export interface ActiveCoin {
  active: boolean;
  inFlight: boolean;
  settling: boolean;
  tier: CoinTier;
  fallSpeed: number;
  kind: CoinKind;
  centerX: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  wobbleAmp: number;
  wobblePhase: number;
  wobbleFreq: number;
  bounces: number;
  maxBounces: number;
  bounceFactor: number;
  baseScale: number;
  scale: number;
}

/** Generates procedural color map and normal map for the coin relief (Crown + Laurel Wreath + 5 Stars) */
function createCoinTextures(): {
  colorMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 512;
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const ctx = hCanvas.getContext('2d')!;

  // Base height map
  ctx.fillStyle = '#7c7c7c';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.45;

  // 1. Milled / reeded outer rim
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 24;
  ctx.strokeStyle = '#d8d8d8';
  ctx.stroke();

  const numReeds = 64;
  for (let i = 0; i < numReeds; i++) {
    const a = (i / numReeds) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r - 11);
    const y1 = cy + Math.sin(a) * (r - 11);
    const x2 = cx + Math.cos(a) * (r + 11);
    const y2 = cy + Math.sin(a) * (r + 11);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9a9a9a';
    ctx.stroke();
  }

  // 2. Recessed inner coin field
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
  ctx.fillStyle = '#626262';
  ctx.fill();

  // Inner raised ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 22, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#cccccc';
  ctx.stroke();

  // Helper to draw a 5-pointed star at (sx, sy) with outer radius sr
  const drawStar = (sx: number, sy: number, sr: number, rot = -Math.PI / 2) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i / 10) * Math.PI * 2;
      const d = i % 2 === 0 ? sr : sr * 0.44;
      const px = sx + Math.cos(a) * d;
      const py = sy + Math.sin(a) * d;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };

  // 3. Upper arc of 5 stars (just like the avatar coin!)
  ctx.fillStyle = '#efefef';
  const starAngles = [-0.82, -0.41, 0, 0.41, 0.82];
  for (let i = 0; i < starAngles.length; i++) {
    const a = -Math.PI / 2 + starAngles[i];
    const sr = i === 2 ? 19 : i === 1 || i === 3 ? 15 : 12;
    const sx = cx + Math.cos(a) * (r * 0.64);
    const sy = cy + Math.sin(a) * (r * 0.64);
    drawStar(sx, sy, sr);
  }

  // 4. Lower Laurel Wreath (two curved branches + bottom rosette flower)
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let step = 0; step <= 16; step++) {
      const t = step / 16;
      const a = Math.PI / 2 - side * (0.12 + t * 1.05);
      const bx = cx + Math.cos(a) * (r * 0.65);
      const by = cy + Math.sin(a) * (r * 0.65);
      if (step === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#dcdcdc';
    ctx.stroke();

    // Laurel leaves along each branch
    for (let leaf = 0; leaf < 6; leaf++) {
      const t = (leaf + 0.5) / 6;
      const a = Math.PI / 2 - side * (0.18 + t * 0.92);
      const lx = cx + Math.cos(a) * (r * 0.65);
      const ly = cy + Math.sin(a) * (r * 0.65);
      for (const leafSide of [-1, 1]) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(a + side * (-Math.PI / 2 + leafSide * 0.48));
        ctx.beginPath();
        ctx.ellipse(0, -11, 6, 13, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ececec';
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Bottom rosette gem between laurel stems
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.66, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f5f5';
  ctx.fill();

  // 5. Center Royal 3-Pointed Crown with jewels!
  const crownY = cy + 16;
  const crownW = 148;
  const crownH = 92;

  // Crown main body polygon
  ctx.fillStyle = '#f6f6f6';
  ctx.beginPath();
  ctx.moveTo(cx - crownW * 0.42, crownY + 22);
  ctx.lineTo(cx - crownW * 0.52, crownY - crownH * 0.55);
  ctx.lineTo(cx - crownW * 0.22, crownY - crownH * 0.12);
  ctx.lineTo(cx, crownY - crownH * 0.78);
  ctx.lineTo(cx + crownW * 0.22, crownY - crownH * 0.12);
  ctx.lineTo(cx + crownW * 0.52, crownY - crownH * 0.55);
  ctx.lineTo(cx + crownW * 0.42, crownY + 22);
  ctx.closePath();
  ctx.fill();

  // Crown base band
  ctx.beginPath();
  ctx.roundRect(cx - crownW * 0.43, crownY + 28, crownW * 0.86, 18, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Pearl spheres on the 3 crown tips
  const pearls = [
    [cx - crownW * 0.52, crownY - crownH * 0.58, 10],
    [cx, crownY - crownH * 0.82, 12],
    [cx + crownW * 0.52, crownY - crownH * 0.58, 10],
  ];
  for (const [px, py, pr] of pearls) {
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // Recessed diamond jewel in center of crown
  ctx.fillStyle = '#909090';
  ctx.beginPath();
  ctx.moveTo(cx, crownY - 22);
  ctx.lineTo(cx + 14, crownY - 4);
  ctx.lineTo(cx, crownY + 14);
  ctx.lineTo(cx - 14, crownY - 4);
  ctx.closePath();
  ctx.fill();

  // Create high-contrast grayscale map so bronze, silver, gold, and gem tints show the emblem clearly!
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  const colorData = cCtx.createImageData(size, size);
  const cOut = colorData.data;
  for (let i = 0; i < data.length; i += 4) {
    const h = data[i] / 255;
    const v = Math.min(255, Math.max(145, Math.round(135 + h * 125)));
    cOut[i] = v;
    cOut[i + 1] = v;
    cOut[i + 2] = v;
    cOut[i + 3] = 255;
  }
  cCtx.putImageData(colorData, 0, 0);
  const colorMap = new THREE.CanvasTexture(cCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;

  // Convert height map to crisp normal map
  const normalData = ctx.createImageData(size, size);
  const out = normalData.data;

  const getHeight = (x: number, y: number) => {
    const px = Math.max(0, Math.min(size - 1, x));
    const py = Math.max(0, Math.min(size - 1, y));
    return data[(py * size + px) * 4] / 255.0;
  };

  const strength = 4.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (getHeight(x + 1, y) - getHeight(x - 1, y)) * strength;
      const dy = (getHeight(x, y + 1) - getHeight(x, y - 1)) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      out[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.floor(((-dy / len) * 0.5 + 0.5) * 255);
      out[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }

  ctx.putImageData(normalData, 0, 0);
  const normalMap = new THREE.CanvasTexture(hCanvas);
  return { colorMap, normalMap };
}

/** Deterministic spread position for coin index i on a table centered at centerX */
function getInitialCoinPos(i: number, centerX: number): { x: number; z: number } {
  if (i === 0) {
    return { x: centerX, z: 0 };
  }
  const goldenAngle = 2.399963229728653;
  const angle = i * goldenAngle;
  const radius = Math.min(2.75, 0.58 * Math.sqrt(i));
  return {
    x: centerX + Math.cos(angle) * radius * 1.24,
    z: Math.sin(angle) * radius * 0.78,
  };
}

function tierRank(tier: CoinTier): number {
  const idx = COIN_TIERS.indexOf(tier);
  return idx >= 0 ? idx : 0;
}

function tierScaleMultiplier(tier: CoinTier): number {
  switch (tier) {
    case 'celestial':
      return 1.15;
    case 'solar':
      return 1.13;
    case 'astral':
      return 1.11;
    case 'mythril':
      return 1.09;
    case 'obsidian':
      return 1.08;
    case 'amethyst':
      return 1.06;
    case 'ruby':
      return 1.05;
    case 'diamond':
      return 1.04;
    case 'emerald':
      return 1.02;
    case 'sapphire':
      return 1.0;
    case 'platinum':
      return 0.98;
    case 'gold':
      return 0.96;
    case 'silver':
      return 0.94;
    case 'bronze':
    default:
      return 0.92;
  }
}

export class CoinSystem {
  readonly mesh: THREE.InstancedMesh;
  private readonly coins: ActiveCoin[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private currentCenterX = Number.NaN;
  private lastSyncKey = '';

  constructor() {
    const radius = 0.26;
    const thickness = 0.056;
    const geo = new THREE.CylinderGeometry(radius, radius, thickness, 24);

    let colorMap: THREE.CanvasTexture | null = null;
    let normalMap: THREE.CanvasTexture | null = null;
    try {
      const maps = createCoinTextures();
      colorMap = maps.colorMap;
      normalMap = maps.normalMap;
    } catch {
      // Fallback if canvas context fails in headless unit env
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: colorMap,
      metalness: 0.78,
      roughness: 0.22,
      normalMap,
      normalScale: new THREE.Vector2(1.35, 1.35),
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_COINS);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;

    for (let i = 0; i < MAX_COINS; i++) {
      this.coins.push({
        active: false,
        inFlight: false,
        settling: false,
        tier: 'bronze',
        fallSpeed: 1,
        kind: 0,
        centerX: 0,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        vRotX: 0,
        vRotY: 0,
        vRotZ: 0,
        wobbleAmp: 0,
        wobblePhase: 0,
        wobbleFreq: 0,
        bounces: 0,
        maxBounces: 3,
        bounceFactor: 0.48,
        baseScale: 1,
        scale: 1,
      });
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.applyCoinColor(i, 'bronze', 0, false);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  private applyCoinColor(idx: number, tier: CoinTier, kind: CoinKind, inFlight: boolean): void {
    if (kind === 3) {
      this.color.setRGB(1.0, 0.96, 0.45);
    } else if (inFlight && kind === 2) {
      this.color.setRGB(0.55, 0.96, 1.0);
    } else if (inFlight && kind === 1) {
      this.color.setRGB(1.0, 0.9, 0.25);
    } else if (tier === 'celestial') {
      this.color.setRGB(1.0, 0.95, 0.72);
    } else if (tier === 'solar') {
      this.color.setRGB(1.0, 0.56, 0.12);
    } else if (tier === 'astral') {
      this.color.setRGB(0.22, 0.96, 0.92);
    } else if (tier === 'mythril') {
      this.color.setRGB(0.62, 0.85, 1.0);
    } else if (tier === 'obsidian') {
      this.color.setRGB(0.45, 0.22, 0.68);
    } else if (tier === 'amethyst') {
      this.color.setRGB(0.76, 0.36, 1.0);
    } else if (tier === 'ruby') {
      this.color.setRGB(1.0, 0.2, 0.34);
    } else if (tier === 'diamond') {
      this.color.setRGB(0.45, 0.95, 1.0);
    } else if (tier === 'emerald') {
      this.color.setRGB(0.18, 0.92, 0.56);
    } else if (tier === 'sapphire') {
      this.color.setRGB(0.24, 0.58, 1.0);
    } else if (tier === 'platinum') {
      this.color.setRGB(0.84, 0.84, 1.0);
    } else if (tier === 'gold') {
      this.color.setRGB(1.0, 0.82, 0.16);
    } else if (tier === 'silver') {
      this.color.setRGB(0.88, 0.92, 0.98);
    } else {
      this.color.setRGB(0.82, 0.44, 0.18);
    }
    this.mesh.setColorAt(idx, this.color);
  }

  /**
   * Synchronizes the persistent coins of all 14 tiers lying on the active table.
   */
  syncCoins(
    counts: Partial<Record<CoinTier, number>>,
    fallSpeeds: Partial<Record<CoinTier, number>>,
    centerX: number,
    scaleMultiplier = 1.0,
  ): void {
    let syncKey = `${centerX}|${scaleMultiplier}`;
    for (let t = 0; t < COIN_TIERS.length; t++) {
      const tier = COIN_TIERS[t];
      syncKey += `|${counts[tier] || 0}:${fallSpeeds[tier] || 1}`;
    }
    if (syncKey === this.lastSyncKey) return;
    this.lastSyncKey = syncKey;

    const tierOrder: CoinTier[] = [];
    for (const tier of COIN_TIERS) {
      const cnt =
        tier === 'bronze' ? Math.max(1, counts.bronze || 0) : Math.max(0, counts[tier] || 0);
      for (let k = 0; k < cnt && tierOrder.length < MAX_COINS; k++) {
        tierOrder.push(tier);
      }
    }
    const totalCount = tierOrder.length;

    // Disable expensive coin shadow casting when many coins are active to keep mobile GPUs cool
    this.mesh.castShadow = totalCount <= 35;

    const tableChanged = this.currentCenterX !== centerX;
    this.currentCenterX = centerX;

    let matrixDirty = false;
    let colorDirty = false;
    const feltY = 0.035;

    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (i < totalCount) {
        const newTier = tierOrder[i];
        const tierChanged = c.tier !== newTier;
        c.tier = newTier;
        c.fallSpeed = fallSpeeds[newTier] ?? 1;
        c.baseScale = scaleMultiplier * tierScaleMultiplier(newTier);

        if (!c.active || tableChanged) {
          const pos = getInitialCoinPos(i, centerX);
          c.active = true;
          c.inFlight = false;
          c.settling = false;
          c.wobbleAmp = 0;
          c.kind = 0;
          c.centerX = centerX;
          c.x = pos.x;
          c.y = feltY;
          c.z = pos.z;
          c.vx = 0;
          c.vy = 0;
          c.vz = 0;
          c.rotX = 0;
          c.rotY = (i * 1.1) % (Math.PI * 2);
          c.rotZ = 0;
          c.scale = c.baseScale;

          this.dummy.position.set(c.x, c.y, c.z);
          this.dummy.rotation.set(c.rotX, c.rotY, c.rotZ);
          this.dummy.scale.setScalar(c.scale);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          this.applyCoinColor(i, c.tier, 0, false);
          matrixDirty = true;
          colorDirty = true;
        } else if (tierChanged && !c.inFlight) {
          c.scale = c.baseScale;
          this.dummy.position.set(c.x, c.y, c.z);
          this.dummy.rotation.set(c.rotX, c.rotY, c.rotZ);
          this.dummy.scale.setScalar(c.scale);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          this.applyCoinColor(i, c.tier, 0, false);
          matrixDirty = true;
          colorDirty = true;
        }
      } else if (c.active) {
        c.active = false;
        c.inFlight = false;
        c.settling = false;
        c.y = -100;
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        matrixDirty = true;
      }
    }

    if (matrixDirty) this.mesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** Number of active coins currently resting flat on the table (ready to be tossed) */
  countRestingCoins(maxTierLevel?: number): number {
    let count = 0;
    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (!c.active || c.inFlight) continue;
      if (maxTierLevel !== undefined && tierRank(c.tier) > maxTierLevel) continue;
      count++;
    }
    return count;
  }

  /** Returns indices of all resting coins on the table (used by Heavy Minion table slams) */
  getAllRestingCoinIndices(): number[] {
    const res: number[] = [];
    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (c.active && !c.inFlight) {
        res.push(i);
      }
    }
    return res;
  }

  /**
   * Finds the index of the closest resting coin to (x, z),
   * optionally excluding reserved indices, filtering by maxTierLevel, and enforcing a max strike radius.
   */
  findRestingCoinNear(
    x: number,
    z: number,
    excludeIndices?: Set<number>,
    maxTierLevel?: number,
    maxRadius?: number,
  ): number {
    let bestIdx = -1;
    let bestDistSq = maxRadius !== undefined ? maxRadius * maxRadius : Infinity;
    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (!c.active || c.inFlight) continue;
      if (excludeIndices && excludeIndices.has(i)) continue;
      if (maxTierLevel !== undefined && tierRank(c.tier) > maxTierLevel) continue;
      const dx = c.x - x;
      const dz = c.z - z;
      const dSq = dx * dx + dz * dz;
      if (dSq <= bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /**
   * Smart target selection for minions: prioritizes higher-rank resting coins within maxTierLevel
   * balanced with proximity to (x, z).
   */
  findBestRestingCoinForHelper(
    x: number,
    z: number,
    excludeIndices?: Set<number>,
    maxTierLevel = 0,
  ): number {
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (!c.active || c.inFlight) continue;
      if (excludeIndices && excludeIndices.has(i)) continue;
      const rank = tierRank(c.tier);
      if (rank > maxTierLevel) continue;
      const dx = c.x - x;
      const dz = c.z - z;
      const dSq = dx * dx + dz * dz;
      const score = (dSq + 0.35) / (1 + rank * 1.25);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** Returns the position, tier, and flight status of a persistent coin */
  getCoinState(
    coinIdx: number,
  ): { x: number; z: number; inFlight: boolean; active: boolean; tier: CoinTier } | null {
    const c = this.coins[coinIdx];
    if (!c || !c.active) return null;
    return { x: c.x, z: c.z, inFlight: c.inFlight, active: c.active, tier: c.tier };
  }

  /** Tosses a specific persistent coin into the air from its current position on the table */
  tossCoin(
    coinIdx: number,
    kind: CoinKind,
    scaleMultiplier = 1.0,
    bounceFactor = 0.48,
  ): { x: number; z: number; tier: CoinTier } | null {
    const c = this.coins[coinIdx];
    if (!c || !c.active || c.inFlight) return null;

    c.inFlight = true;
    c.settling = false;
    c.wobbleAmp = 0;
    c.kind = kind;
    c.y = 0.09;

    // Gently pull the coin toward its golden-angle spread slot so coins stay naturally separated without O(N^2) per-frame collisions
    const slot = getInitialCoinPos(coinIdx, c.centerX);
    const pullX = (slot.x - c.x) * 0.55;
    const pullZ = (slot.z - c.z) * 0.55;
    c.vy = 5.6 + Math.random() * 1.35;
    c.vx = pullX + (Math.random() - 0.5) * 1.15;
    c.vz = pullZ + (Math.random() - 0.5) * 1.15;

    // Start from current flat orientation with a crisp thumb-flick flip
    c.rotX = (Math.random() - 0.5) * 0.25;
    c.rotZ = (Math.random() - 0.5) * 0.25;
    const flipDir = Math.random() > 0.5 ? 1 : -1;
    c.vRotX = flipDir * (16 + Math.random() * 8);
    c.vRotY = (Math.random() - 0.5) * 9;
    c.vRotZ = (Math.random() - 0.5) * 7;

    c.bounces = 0;
    c.maxBounces = 3;
    c.bounceFactor = bounceFactor;
    c.baseScale = scaleMultiplier * tierScaleMultiplier(c.tier);
    c.scale = (kind === 3 ? 1.18 : kind === 2 ? 1.14 : kind === 1 ? 1.07 : 1.0) * c.baseScale;

    this.applyCoinColor(coinIdx, c.tier, kind, true);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    return { x: c.x, z: c.z, tier: c.tier };
  }

  /** Fallback spawn method that tosses the nearest resting coin to (x, z) */
  spawn(x: number, z: number, kind: CoinKind, scaleMultiplier = 1.0, bounceFactor = 0.48): void {
    const idx = this.findRestingCoinNear(x, z);
    if (idx !== -1) {
      this.tossCoin(idx, kind, scaleMultiplier, bounceFactor);
    } else {
      const centerX = Math.round(x / TABLE_SPACING) * TABLE_SPACING;
      if (this.activeCount === 0) {
        this.syncCoins({ bronze: 1 }, { bronze: 1 }, centerX, scaleMultiplier);
        this.tossCoin(0, kind, scaleMultiplier, bounceFactor);
      }
    }
  }

  update(
    dt: number,
    onLand?: (x: number, y: number, z: number, kind: CoinKind, tier: CoinTier) => void,
  ): void {
    const gravity = -19.5;
    const feltY = 0.035;
    const halfW = 3.26;
    const halfD = 1.82;
    let matrixDirty = false;
    let colorDirty = false;

    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (!c.active || !c.inFlight) continue;

      matrixDirty = true;
      const coinDt = Math.min(0.1, dt * c.fallSpeed);

      if (!c.settling) {
        // Air drag & gravity
        const drag = Math.max(0, 1 - 0.35 * coinDt);
        c.vx *= drag;
        c.vz *= drag;
        c.vy += gravity * coinDt;

        c.x += c.vx * coinDt;
        c.y += c.vy * coinDt;
        c.z += c.vz * coinDt;

        c.rotX += c.vRotX * coinDt;
        c.rotY += c.vRotY * coinDt;
        c.rotZ += c.vRotZ * coinDt;

        // Rim-aware contact height
        const tiltSin = Math.min(0.95, Math.hypot(Math.sin(c.rotX), Math.sin(c.rotZ)));
        const rimContactY = feltY + 0.18 * c.scale * tiltSin;

        if (c.y <= rimContactY && c.vy < 0) {
          c.y = rimContactY;
          c.bounces++;
          if (onLand && c.bounces === 1) {
            onLand(c.x, feltY, c.z, c.kind, c.tier);
          }

          const impact = Math.abs(c.vy);
          if (c.bounces < c.maxBounces && impact > 1.35) {
            // Elastic rim bounce with spin-to-velocity coupling
            c.vy = impact * c.bounceFactor * (0.78 + Math.random() * 0.14);
            c.vx = c.vx * 0.65 + Math.sin(c.rotZ) * impact * 0.14;
            c.vz = c.vz * 0.65 - Math.sin(c.rotX) * impact * 0.14;
            c.vRotX = -c.vRotX * 0.52 + (Math.random() - 0.5) * 6;
            c.vRotY *= 0.7;
            c.vRotZ = -c.vRotZ * 0.52 + (Math.random() - 0.5) * 6;
          } else {
            // Transition into realistic Euler-disk wobble/settle phase on the felt
            c.settling = true;
            c.vy = 0;
            c.vx *= 0.4;
            c.vz *= 0.4;
            c.wobbleAmp = 0.34;
            c.wobblePhase = Math.atan2(Math.sin(c.rotZ), Math.sin(c.rotX));
            c.wobbleFreq = 26;
          }
        }
      } else {
        // Settling wobble phase on felt
        const slideFriction = Math.max(0, 1 - 8.0 * coinDt);
        c.vx *= slideFriction;
        c.vz *= slideFriction;
        c.x += c.vx * coinDt;
        c.z += c.vz * coinDt;

        c.wobbleFreq += 45 * coinDt;
        c.wobblePhase += c.wobbleFreq * coinDt;
        c.wobbleAmp = Math.max(0, c.wobbleAmp - 1.55 * coinDt);

        c.rotX = Math.cos(c.wobblePhase) * c.wobbleAmp;
        c.rotZ = Math.sin(c.wobblePhase) * c.wobbleAmp;
        c.y = feltY + Math.sin(c.wobbleAmp) * 0.2 * c.scale;

        if (c.wobbleAmp <= 0.005) {
          c.inFlight = false;
          c.settling = false;
          c.vx = 0;
          c.vy = 0;
          c.vz = 0;
          if (c.kind === 3) {
            // Edge Coin stands upright vertically on its rim!
            c.scale = c.baseScale * 1.12;
            c.rotX = Math.PI / 2;
            c.rotZ = 0;
            c.y = feltY + 0.25 * c.scale;
            this.applyCoinColor(i, c.tier, 3, true);
          } else {
            c.y = feltY;
            c.rotX = 0;
            c.rotZ = 0;
            c.scale = c.baseScale;
            this.applyCoinColor(i, c.tier, 0, false);
          }
          colorDirty = true;
        }
      }

      // Cushion bounce off wooden rails
      const relX = c.x - c.centerX;
      if (Math.abs(relX) > halfW) {
        c.vx = -c.vx * 0.68;
        c.x = c.centerX + Math.sign(relX) * halfW;
        c.vRotZ = -c.vRotZ * 0.7;
      }
      if (Math.abs(c.z) > halfD) {
        c.vz = -c.vz * 0.68;
        c.z = Math.sign(c.z) * halfD;
        c.vRotX = -c.vRotX * 0.7;
      }

      this.dummy.position.set(c.x, c.y, c.z);
      this.dummy.rotation.set(c.rotX, c.rotY, c.rotZ);
      this.dummy.scale.setScalar(c.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (matrixDirty) this.mesh.instanceMatrix.needsUpdate = true;
    if (colorDirty && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  get activeCount(): number {
    let count = 0;
    for (let i = 0; i < this.coins.length; i++) {
      if (this.coins[i].active) count++;
    }
    return count;
  }
}
