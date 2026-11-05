import * as THREE from 'three';
import type { CoinSystem } from './coinMesh';

export const MAX_HELPERS = 30;

interface HelperAgent {
  active: boolean;
  group: THREE.Group;
  body: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
  x: number;
  z: number;
  rotY: number;
  targetCoinIdx: number;
  walkPhase: number;
  cooldown: number;
  tossAnim: number;
}

const TUNIC_COLORS = [
  0x1d4ed8, // Royal avatar blue (#1)!
  0x2563eb,
  0x059669,
  0x7c3aed,
  0xd97706,
  0xdb2777,
  0x0891b2,
  0xdc2626,
  0x4f46e5,
  0x0d9488,
  0x9333ea,
  0xe11d48,
  0x2563eb,
  0x16a34a,
  0xc026d3,
];

interface SharedHelperAssets {
  bodyGeo: THREE.BufferGeometry;
  hemGeo: THREE.BufferGeometry;
  collarGeo: THREE.BufferGeometry;
  vNeckGeo: THREE.BufferGeometry;
  beltGeo: THREE.BufferGeometry;
  buckleGeo: THREE.BufferGeometry;
  headGeo: THREE.BufferGeometry;
  noseGeo: THREE.BufferGeometry;
  cheekGeo: THREE.BufferGeometry;
  earGeo: THREE.BufferGeometry;
  hairTuftGeo: THREE.BufferGeometry;
  browGeo: THREE.BufferGeometry;
  smileGeo: THREE.BufferGeometry;
  eyeWhiteGeo: THREE.BufferGeometry;
  irisGeo: THREE.BufferGeometry;
  catchlightGeo: THREE.BufferGeometry;
  hatBandGeo: THREE.BufferGeometry;
  hatMidGeo: THREE.BufferGeometry;
  hatTipGeo: THREE.BufferGeometry;
  pomGeo: THREE.BufferGeometry;
  sleeveGeo: THREE.BufferGeometry;
  handGeo: THREE.BufferGeometry;
  pouchBodyGeo: THREE.BufferGeometry;
  pouchNeckGeo: THREE.BufferGeometry;
  footGeo: THREE.BufferGeometry;
  bootTipGeo: THREE.BufferGeometry;
  pauldronGeo: THREE.BufferGeometry;
  hammerShaftGeo: THREE.BufferGeometry;
  hammerHeadGeo: THREE.BufferGeometry;
  skinMat: THREE.MeshStandardMaterial;
  noseMat: THREE.MeshStandardMaterial;
  cheekMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  goldMat: THREE.MeshStandardMaterial;
  leatherMat: THREE.MeshStandardMaterial;
  pouchMat: THREE.MeshStandardMaterial;
  bootMat: THREE.MeshStandardMaterial;
  eyeWhiteMat: THREE.MeshStandardMaterial;
  irisMat: THREE.MeshStandardMaterial;
  tunicMats: THREE.MeshStandardMaterial[];
}

let sharedAssets: SharedHelperAssets | null = null;

function getSharedHelperAssets(): SharedHelperAssets {
  if (sharedAssets) return sharedAssets;

  const earGeo = new THREE.ConeGeometry(0.036, 0.085, 6);
  earGeo.scale(0.65, 1.0, 0.85);

  const hairTuftGeo = new THREE.SphereGeometry(0.046, 8, 8);
  hairTuftGeo.scale(1.25, 0.75, 0.9);

  const smileGeo = new THREE.TorusGeometry(0.032, 0.008, 6, 12, Math.PI);

  sharedAssets = {
    bodyGeo: new THREE.CylinderGeometry(0.118, 0.178, 0.34, 14),
    hemGeo: new THREE.TorusGeometry(0.174, 0.015, 8, 16),
    collarGeo: new THREE.TorusGeometry(0.122, 0.014, 8, 14),
    vNeckGeo: new THREE.BoxGeometry(0.022, 0.075, 0.02),
    beltGeo: new THREE.CylinderGeometry(0.156, 0.162, 0.048, 14),
    buckleGeo: new THREE.BoxGeometry(0.068, 0.062, 0.036),
    headGeo: new THREE.SphereGeometry(0.146, 14, 12),
    noseGeo: new THREE.SphereGeometry(0.028, 8, 8),
    cheekGeo: new THREE.SphereGeometry(0.026, 8, 8),
    earGeo,
    hairTuftGeo,
    browGeo: new THREE.BoxGeometry(0.038, 0.012, 0.014),
    smileGeo,
    eyeWhiteGeo: new THREE.SphereGeometry(0.032, 8, 8),
    irisGeo: new THREE.SphereGeometry(0.019, 8, 8),
    catchlightGeo: new THREE.SphereGeometry(0.007, 6, 6),
    hatBandGeo: new THREE.CylinderGeometry(0.148, 0.152, 0.065, 14),
    hatMidGeo: new THREE.CylinderGeometry(0.088, 0.142, 0.15, 12),
    hatTipGeo: new THREE.ConeGeometry(0.088, 0.16, 10),
    pomGeo: new THREE.SphereGeometry(0.044, 10, 10),
    sleeveGeo: new THREE.CylinderGeometry(0.044, 0.056, 0.16, 10),
    handGeo: new THREE.SphereGeometry(0.044, 8, 8),
    pouchBodyGeo: new THREE.SphereGeometry(0.058, 10, 8),
    pouchNeckGeo: new THREE.CylinderGeometry(0.028, 0.018, 0.035, 8),
    footGeo: new THREE.BoxGeometry(0.088, 0.068, 0.135),
    bootTipGeo: new THREE.SphereGeometry(0.044, 8, 8),
    pauldronGeo: new THREE.SphereGeometry(0.075, 10, 8),
    hammerShaftGeo: new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8),
    hammerHeadGeo: new THREE.BoxGeometry(0.11, 0.075, 0.16),
    skinMat: new THREE.MeshStandardMaterial({
      color: 0xffd7b5,
      roughness: 0.46,
      metalness: 0.04,
    }),
    noseMat: new THREE.MeshStandardMaterial({
      color: 0xff9b85,
      roughness: 0.42,
      metalness: 0.04,
    }),
    cheekMat: new THREE.MeshStandardMaterial({
      color: 0xff7b7b,
      roughness: 0.5,
      metalness: 0.02,
    }),
    hairMat: new THREE.MeshStandardMaterial({
      color: 0x5c3317,
      roughness: 0.55,
      metalness: 0.08,
    }),
    goldMat: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.22,
      metalness: 0.86,
    }),
    leatherMat: new THREE.MeshStandardMaterial({
      color: 0x5c3418,
      roughness: 0.62,
      metalness: 0.1,
    }),
    pouchMat: new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.65,
      metalness: 0.08,
    }),
    bootMat: new THREE.MeshStandardMaterial({
      color: 0x3b2112,
      roughness: 0.6,
      metalness: 0.12,
    }),
    eyeWhiteMat: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
    }),
    irisMat: new THREE.MeshStandardMaterial({
      color: 0x2b1708,
      roughness: 0.12,
    }),
    tunicMats: TUNIC_COLORS.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.48,
          metalness: 0.12,
        }),
    ),
  };

  return sharedAssets;
}

function createHelperFigurine(
  colorIndex: number,
  isTitan = false,
): {
  group: THREE.Group;
  body: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftFoot: THREE.Mesh;
  rightFoot: THREE.Mesh;
} {
  const assets = getSharedHelperAssets();
  const tunicMat = assets.tunicMats[colorIndex % assets.tunicMats.length];
  const group = new THREE.Group();

  // 1. Plump royal tunic body
  const body = new THREE.Mesh(assets.bodyGeo, tunicMat);
  body.position.y = 0.26;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Golden bottom hem ring
  const hem = new THREE.Mesh(assets.hemGeo, assets.goldMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = -0.155;
  body.add(hem);

  // Golden collar + V-neck placket (just like the avatar!)
  const collar = new THREE.Mesh(assets.collarGeo, assets.goldMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.155;
  body.add(collar);

  const vNeck = new THREE.Mesh(assets.vNeckGeo, assets.goldMat);
  vNeck.position.set(0, 0.11, 0.125);
  body.add(vNeck);

  // Brown leather belt + golden buckle
  const belt = new THREE.Mesh(assets.beltGeo, assets.leatherMat);
  belt.position.y = -0.04;
  body.add(belt);

  const buckle = new THREE.Mesh(assets.buckleGeo, assets.goldMat);
  buckle.position.set(0, -0.04, 0.15);
  body.add(buckle);

  // 2. Expressive Elf/Gnome Head (matching avatar!)
  const head = new THREE.Mesh(assets.headGeo, assets.skinMat);
  head.position.y = 0.295;
  body.add(head);

  // Cute rosy button nose
  const nose = new THREE.Mesh(assets.noseGeo, assets.noseMat);
  nose.scale.set(1.15, 0.9, 1.0);
  nose.position.set(0, 0.0, 0.142);
  head.add(nose);

  // Rosy cheeks
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(assets.cheekGeo, assets.cheekMat);
    cheek.scale.set(1.1, 0.75, 0.5);
    cheek.position.set(side * 0.088, -0.018, 0.118);
    head.add(cheek);
  }

  // Pointed elf ears sticking out on both sides
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(assets.earGeo, assets.skinMat);
    ear.position.set(side * 0.155, 0.005, 0.01);
    ear.rotation.z = -side * 1.15;
    ear.rotation.y = side * 0.25;
    head.add(ear);
  }

  // Happy smile under nose
  const smile = new THREE.Mesh(assets.smileGeo, assets.hairMat);
  smile.position.set(0, -0.036, 0.134);
  smile.rotation.x = Math.PI;
  head.add(smile);

  // Big warm eyes + eyebrows + white catchlights
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(assets.eyeWhiteGeo, assets.eyeWhiteMat);
    eye.position.set(side * 0.052, 0.032, 0.122);
    head.add(eye);

    const iris = new THREE.Mesh(assets.irisGeo, assets.irisMat);
    iris.position.set(0, 0, 0.018);
    eye.add(iris);

    const catchlight = new THREE.Mesh(assets.catchlightGeo, assets.eyeWhiteMat);
    catchlight.position.set(side * 0.006, 0.007, 0.016);
    iris.add(catchlight);

    const brow = new THREE.Mesh(assets.browGeo, assets.hairMat);
    brow.position.set(side * 0.052, 0.074, 0.128);
    brow.rotation.z = -side * 0.14;
    head.add(brow);
  }

  // Brown hair tuft peeking from under the front of the cap
  const hairTuft = new THREE.Mesh(assets.hairTuftGeo, assets.hairMat);
  hairTuft.position.set(0.01, 0.105, 0.118);
  hairTuft.rotation.z = -0.22;
  head.add(hairTuft);

  // 3. Curved / Slouched Gnome Cap with Fluffy Golden Pom-Pom (like on the avatar!)
  const hatBand = new THREE.Mesh(assets.hatBandGeo, isTitan ? assets.goldMat : tunicMat);
  hatBand.position.set(0, 0.095, -0.008);
  hatBand.rotation.x = -0.12;
  head.add(hatBand);

  const hatMid = new THREE.Mesh(assets.hatMidGeo, tunicMat);
  hatMid.position.set(0.022, 0.185, -0.032);
  hatMid.rotation.z = -0.28;
  hatMid.rotation.x = -0.22;
  head.add(hatMid);

  const hatTip = new THREE.Mesh(assets.hatTipGeo, tunicMat);
  hatTip.position.set(0.078, 0.275, -0.068);
  hatTip.rotation.z = -0.78;
  hatTip.rotation.x = -0.35;
  head.add(hatTip);

  const pom = new THREE.Mesh(assets.pomGeo, assets.goldMat);
  pom.position.set(0.142, 0.31, -0.095);
  head.add(pom);

  // 4. Sleeved Arms + Hands + Leather Coin Pouch (or Titan Warhammer!)
  const leftArm = new THREE.Mesh(assets.sleeveGeo, tunicMat);
  leftArm.position.set(-0.185, 0.28, 0.03);
  leftArm.rotation.z = 0.28;
  leftArm.rotation.x = -0.35;
  group.add(leftArm);

  const leftHand = new THREE.Mesh(assets.handGeo, assets.skinMat);
  leftHand.position.set(0, -0.088, 0);
  leftArm.add(leftHand);

  // Cute leather coin bag held in the left hand (just like on the avatar!)
  const pouch = new THREE.Mesh(assets.pouchBodyGeo, assets.pouchMat);
  pouch.scale.set(1.0, 1.15, 0.95);
  pouch.position.set(-0.01, -0.065, 0.025);
  leftHand.add(pouch);

  const pouchNeck = new THREE.Mesh(assets.pouchNeckGeo, assets.goldMat);
  pouchNeck.position.set(0, 0.055, 0);
  pouch.add(pouchNeck);

  const rightArm = new THREE.Mesh(assets.sleeveGeo, tunicMat);
  rightArm.position.set(0.185, 0.28, 0.03);
  rightArm.rotation.z = -0.28;
  rightArm.rotation.x = -0.35;
  group.add(rightArm);

  const rightHand = new THREE.Mesh(assets.handGeo, assets.skinMat);
  rightHand.position.set(0, -0.088, 0);
  rightArm.add(rightHand);

  if (isTitan) {
    // Golden shoulder pauldrons & Golden Warhammer for Heavy Minions (Titans)
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(assets.pauldronGeo, assets.goldMat);
      pauldron.scale.set(1.1, 0.75, 1.0);
      pauldron.position.set(side * 0.165, 0.13, 0);
      body.add(pauldron);
    }
    const shaft = new THREE.Mesh(assets.hammerShaftGeo, assets.leatherMat);
    shaft.position.set(0, -0.03, 0.09);
    shaft.rotation.x = Math.PI / 2;
    rightHand.add(shaft);

    const hammerHead = new THREE.Mesh(assets.hammerHeadGeo, assets.goldMat);
    hammerHead.position.set(0, -0.14, 0);
    shaft.add(hammerHead);
  }

  // 5. Pointed Elf Boots
  const leftFoot = new THREE.Mesh(assets.footGeo, assets.bootMat);
  leftFoot.position.set(-0.072, 0.034, 0.015);
  const leftToe = new THREE.Mesh(assets.bootTipGeo, assets.bootMat);
  leftToe.position.set(0, 0.008, 0.068);
  leftFoot.add(leftToe);
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(assets.footGeo, assets.bootMat);
  rightFoot.position.set(0.072, 0.034, 0.015);
  const rightToe = new THREE.Mesh(assets.bootTipGeo, assets.bootMat);
  rightToe.position.set(0, 0.008, 0.068);
  rightFoot.add(rightToe);
  group.add(rightFoot);

  group.visible = false;
  return { group, body, leftArm, rightArm, leftFoot, rightFoot };
}

export class HelperSystem {
  readonly group = new THREE.Group();
  private readonly helpers: HelperAgent[] = [];
  private readonly megaHelpers: Array<{
    active: boolean;
    group: THREE.Group;
    body: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    x: number;
    z: number;
    slamTimer: number;
    slamAnim: number;
    idlePhase: number;
  }> = [];
  private currentCenterX = Number.NaN;
  private autoTosserLevel = 0;
  private speedMult = 1.0;
  private maxTierLevel = 0;
  private lastSyncKey = '';

  constructor() {
    for (let i = 0; i < MAX_HELPERS; i++) {
      const fig = createHelperFigurine(i, false);
      this.group.add(fig.group);
      this.helpers.push({
        active: false,
        group: fig.group,
        body: fig.body,
        leftArm: fig.leftArm,
        rightArm: fig.rightArm,
        leftFoot: fig.leftFoot,
        rightFoot: fig.rightFoot,
        x: 0,
        z: 0,
        rotY: 0,
        targetCoinIdx: -1,
        walkPhase: i * 1.3,
        cooldown: 0,
        tossAnim: 0,
      });
    }

    // Create 3 Heavy Minions (Titans) that slam the table every 5 seconds
    for (let i = 0; i < 3; i++) {
      const fig = createHelperFigurine(7 + i, true); // Crimson, violet, gold-styled tunics + Warhammer
      fig.group.scale.setScalar(1.42);
      this.group.add(fig.group);
      this.megaHelpers.push({
        active: false,
        group: fig.group,
        body: fig.body,
        leftArm: fig.leftArm,
        rightArm: fig.rightArm,
        x: 0,
        z: 0,
        slamTimer: 1.5 + i * 1.65,
        slamAnim: 0,
        idlePhase: i * 2.1,
      });
    }
  }

  /**
   * Synchronizes the number, speed, allowed coin tier, and Heavy Minions on the active table.
   */
  syncHelpers(
    autoTosserLevel: number,
    tossSpeedMult: number,
    maxTierLevel: number,
    centerX: number,
    megaMinionCount = 0,
  ): void {
    const syncKey = `${autoTosserLevel}|${tossSpeedMult}|${maxTierLevel}|${centerX}|${megaMinionCount}`;
    if (syncKey === this.lastSyncKey) return;
    this.lastSyncKey = syncKey;

    this.autoTosserLevel = autoTosserLevel;
    this.speedMult = tossSpeedMult;
    this.maxTierLevel = maxTierLevel;

    const count = Math.min(MAX_HELPERS, Math.max(0, autoTosserLevel));
    const megaCount = Math.min(3, Math.max(0, megaMinionCount));
    const tableChanged = this.currentCenterX !== centerX;
    this.currentCenterX = centerX;

    for (let i = 0; i < MAX_HELPERS; i++) {
      const h = this.helpers[i];
      if (i < count) {
        if (!h.active || tableChanged) {
          const ring = i < 12 ? 1.35 : 2.1;
          const angle = (i / Math.max(1, count)) * Math.PI * 2 + 0.55;
          h.active = true;
          h.x = centerX + Math.cos(angle) * ring;
          h.z = Math.sin(angle) * (ring * 0.64);
          h.rotY = angle + Math.PI;
          h.targetCoinIdx = -1;
          h.cooldown = (i % 6) * 0.05;
          h.tossAnim = 0;
          h.group.position.set(h.x, 0.02, h.z);
          h.group.rotation.y = h.rotY;
          h.group.visible = true;
        }
      } else if (h.active) {
        h.active = false;
        h.targetCoinIdx = -1;
        h.group.visible = false;
      }
    }

    const megaOffsetsX = [-1.65, 0, 1.65];
    for (let i = 0; i < 3; i++) {
      const m = this.megaHelpers[i];
      if (i < megaCount) {
        if (!m.active || tableChanged) {
          m.active = true;
          m.x = centerX + megaOffsetsX[i];
          m.z = -1.38;
          m.slamTimer = 1.4 + i * 1.65;
          m.slamAnim = 0;
          m.group.position.set(m.x, 0.02, m.z);
          m.group.rotation.y = 0; // Face forward (+Z) toward center of table
          m.group.visible = true;
        }
      } else if (m.active) {
        m.active = false;
        m.group.visible = false;
      }
    }
  }

  update(
    dt: number,
    coinSystem: CoinSystem,
    onTossCoin: (coinIdx: number) => void,
    onMegaSlam?: (x: number, z: number) => void,
  ): void {
    // Update Heavy Minions (Titans) that slam the table every 5 seconds
    for (let i = 0; i < 3; i++) {
      const m = this.megaHelpers[i];
      if (!m.active) continue;

      if (m.slamAnim > 0) {
        m.slamAnim = Math.max(0, m.slamAnim - dt);
        const p = 1 - m.slamAnim / 0.42;
        const jump = Math.sin(p * Math.PI);
        m.group.position.y = 0.02 + jump * 0.42;
        m.leftArm.position.y = 0.28 + jump * 0.25;
        m.rightArm.position.y = 0.28 + jump * 0.25;
      } else {
        m.idlePhase += dt * 3.5;
        m.group.position.y = 0.02 + Math.abs(Math.sin(m.idlePhase)) * 0.03;
      }

      m.slamTimer -= dt;
      if (m.slamTimer <= 0) {
        m.slamTimer = 5.0;
        m.slamAnim = 0.42;
        onMegaSlam?.(m.x, m.z + 0.55);
      }
    }

    if (this.autoTosserLevel <= 0) return;

    const activeLimit = Math.min(MAX_HELPERS, this.autoTosserLevel);
    // Base run speed scales with minion count and Minion Speed upgrade
    const moveSpeed = (2.25 + Math.min(15, this.autoTosserLevel) * 0.11) * this.speedMult;
    const reservedCoins = new Set<number>();

    // Keep track of already-claimed resting coins
    for (let i = 0; i < activeLimit; i++) {
      const h = this.helpers[i];
      if (!h.active || h.targetCoinIdx < 0) continue;
      const st = coinSystem.getCoinState(h.targetCoinIdx);
      if (st && st.active && !st.inFlight) {
        reservedCoins.add(h.targetCoinIdx);
      } else {
        h.targetCoinIdx = -1;
      }
    }

    const halfW = 3.12;
    const halfD = 1.72;

    for (let i = 0; i < activeLimit; i++) {
      const h = this.helpers[i];
      if (!h.active) continue;

      if (h.tossAnim > 0) {
        h.tossAnim = Math.max(0, h.tossAnim - dt);
        const raise = Math.sin((h.tossAnim / 0.28) * Math.PI);
        h.leftArm.position.y = 0.28 + raise * 0.18;
        h.rightArm.position.y = 0.28 + raise * 0.18;
        h.leftArm.position.z = 0.03 + raise * 0.11;
        h.rightArm.position.z = 0.03 + raise * 0.11;
        h.body.position.y = 0.26 + raise * 0.09;
        h.body.rotation.z = 0;
      }

      if (h.cooldown > 0) {
        h.cooldown = Math.max(0, h.cooldown - dt);
        continue;
      }

      // Smart target selection: prioritize higher-rank coins within minion's unlocked tier mastery
      if (h.targetCoinIdx < 0) {
        let nextIdx = coinSystem.findBestRestingCoinForHelper(
          h.x,
          h.z,
          reservedCoins,
          this.maxTierLevel,
        );
        if (nextIdx < 0) {
          // If all allowed resting coins are targeted by other minions, allow sharing target
          nextIdx = coinSystem.findBestRestingCoinForHelper(h.x, h.z, undefined, this.maxTierLevel);
        }
        if (nextIdx >= 0) {
          h.targetCoinIdx = nextIdx;
          reservedCoins.add(nextIdx);
        }
      }

      const targetState = h.targetCoinIdx >= 0 ? coinSystem.getCoinState(h.targetCoinIdx) : null;

      if (!targetState || !targetState.active || targetState.inFlight) {
        h.targetCoinIdx = -1;
        // Gentle idle bob while waiting for a coin to land on the table
        h.walkPhase += dt * 3.2;
        h.body.position.y = 0.26 + Math.sin(h.walkPhase) * 0.015;
        h.body.rotation.z = 0;
        h.leftFoot.position.z = 0;
        h.rightFoot.position.z = 0;
        continue;
      }

      const dx = targetState.x - h.x;
      const dz = targetState.z - h.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.001) {
        const desiredRot = Math.atan2(dx, dz);
        // Shortest-angle interpolation
        let diff = desiredRot - h.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        h.rotY += diff * Math.min(1, dt * 15);
        h.group.rotation.y = h.rotY;
      }

      const reachDist = 0.44;
      if (dist > reachDist) {
        const step = Math.min(dist - reachDist * 0.85, moveSpeed * dt);
        let moveX = (dx / dist) * step;
        let moveZ = (dz / dist) * step;

        // Soft separation from nearby active minions so they spread out naturally
        const minSep = 0.35;
        const minSepSq = minSep * minSep;
        for (let j = 0; j < activeLimit; j++) {
          if (j === i) continue;
          const other = this.helpers[j];
          if (!other.active) continue;
          const sdx = h.x - other.x;
          if (sdx >= minSep || sdx <= -minSep) continue;
          const sdz = h.z - other.z;
          if (sdz >= minSep || sdz <= -minSep) continue;
          const dSq = sdx * sdx + sdz * sdz;
          if (dSq < minSepSq && dSq > 0.00001) {
            const d = Math.sqrt(dSq);
            const push = ((minSep - d) / minSep) * 1.35 * dt;
            moveX += (sdx / d) * push;
            moveZ += (sdz / d) * push;
          }
        }

        h.x += moveX;
        h.z += moveZ;

        // Keep helper inside table felt boundaries
        const relX = h.x - this.currentCenterX;
        if (Math.abs(relX) > halfW) h.x = this.currentCenterX + Math.sign(relX) * halfW;
        if (Math.abs(h.z) > halfD) h.z = Math.sign(h.z) * halfD;

        // Walk cycle animation with cute waddle
        h.walkPhase += dt * moveSpeed * 5.4;
        const swing = Math.sin(h.walkPhase);
        h.body.position.y = 0.26 + Math.abs(swing) * 0.048;
        h.body.rotation.z = swing * 0.075;
        h.leftFoot.position.z = swing * 0.075;
        h.rightFoot.position.z = -swing * 0.075;
        h.leftFoot.position.y = 0.036 + Math.max(0, swing) * 0.032;
        h.rightFoot.position.y = 0.036 + Math.max(0, -swing) * 0.032;
        h.leftArm.position.z = -swing * 0.065;
        h.rightArm.position.z = swing * 0.065;
        h.leftArm.position.y = 0.28;
        h.rightArm.position.y = 0.28;

        h.group.position.set(h.x, 0.02, h.z);
      } else {
        // Reached the coin! Toss it into the air!
        const coinIdx = h.targetCoinIdx;
        h.targetCoinIdx = -1;
        h.tossAnim = 0.28;
        h.cooldown = Math.max(0.12, 0.48 / this.speedMult);
        h.leftFoot.position.set(-0.07, 0.036, 0);
        h.rightFoot.position.set(0.07, 0.036, 0);
        h.body.rotation.z = 0;
        onTossCoin(coinIdx);
      }
    }
  }
}
