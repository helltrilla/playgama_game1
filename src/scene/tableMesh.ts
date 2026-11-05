import * as THREE from 'three';
import { TABLE_D, TABLE_SPACING, TABLE_W, TABLES, type TableDef } from '../data/tables';
import { ALL_TABLE_MATERIALS } from './palette';

export class TableGroup extends THREE.Group {
  readonly tableMeshes = new Map<string, THREE.Group>();

  constructor() {
    super();
    this.buildTables();
  }

  private buildTables(): void {
    TABLES.forEach((def, index) => {
      const group = this.createTable(def);
      group.position.x = index * TABLE_SPACING;
      this.add(group);
      this.tableMeshes.set(def.id, group);
    });
  }

  private createTable(def: TableDef): THREE.Group {
    const table = new THREE.Group();
    const mats = ALL_TABLE_MATERIALS[def.id];

    // 1. Felt playing field (top surface at y = 0)
    const feltThickness = 0.14;
    const feltGeo = new THREE.BoxGeometry(TABLE_W, feltThickness, TABLE_D);
    feltGeo.translate(0, -feltThickness / 2, 0);
    const feltMesh = new THREE.Mesh(feltGeo, mats.felt);
    feltMesh.receiveShadow = true;
    feltMesh.name = `felt_${def.id}`;
    table.add(feltMesh);

    // 2. Outer raised frame (cushion / border)
    const frameThickness = 0.42;
    const frameHeight = 0.22;
    const frameTotalW = TABLE_W + frameThickness * 2;
    const frameTotalD = TABLE_D + frameThickness * 2;

    const outerShape = new THREE.Shape();
    outerShape.moveTo(-frameTotalW / 2, -frameTotalD / 2);
    outerShape.lineTo(frameTotalW / 2, -frameTotalD / 2);
    outerShape.lineTo(frameTotalW / 2, frameTotalD / 2);
    outerShape.lineTo(-frameTotalW / 2, frameTotalD / 2);
    outerShape.closePath();

    const holeShape = new THREE.Path();
    holeShape.moveTo(-TABLE_W / 2, -TABLE_D / 2);
    holeShape.lineTo(TABLE_W / 2, -TABLE_D / 2);
    holeShape.lineTo(TABLE_W / 2, TABLE_D / 2);
    holeShape.lineTo(-TABLE_W / 2, TABLE_D / 2);
    holeShape.closePath();
    outerShape.holes.push(holeShape);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: frameHeight,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    };

    const frameGeo = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    frameGeo.rotateX(Math.PI / 2);
    frameGeo.translate(0, frameHeight - 0.05, 0);

    const frameMesh = new THREE.Mesh(frameGeo, mats.frame);
    frameMesh.castShadow = true;
    frameMesh.receiveShadow = true;
    table.add(frameMesh);

    // 3. Metallic Trim Inlay (hollow border ring along the inner cushion edge)
    const trimWidth = def.materials.trim.thickness || 0.05;
    const trimOuterW = TABLE_W + 0.04;
    const trimOuterD = TABLE_D + 0.04;
    const trimInnerW = TABLE_W - trimWidth * 2;
    const trimInnerD = TABLE_D - trimWidth * 2;

    const trimShape = new THREE.Shape();
    trimShape.moveTo(-trimOuterW / 2, -trimOuterD / 2);
    trimShape.lineTo(trimOuterW / 2, -trimOuterD / 2);
    trimShape.lineTo(trimOuterW / 2, trimOuterD / 2);
    trimShape.lineTo(-trimOuterW / 2, trimOuterD / 2);
    trimShape.closePath();

    const trimHole = new THREE.Path();
    trimHole.moveTo(-trimInnerW / 2, -trimInnerD / 2);
    trimHole.lineTo(trimInnerW / 2, -trimInnerD / 2);
    trimHole.lineTo(trimInnerW / 2, trimInnerD / 2);
    trimHole.lineTo(-trimInnerW / 2, trimInnerD / 2);
    trimHole.closePath();
    trimShape.holes.push(trimHole);

    const trimGeo = new THREE.ExtrudeGeometry(trimShape, {
      depth: 0.025,
      bevelEnabled: false,
    });
    trimGeo.rotateX(Math.PI / 2);
    trimGeo.translate(0, 0.02, 0);

    const trimMesh = new THREE.Mesh(trimGeo, mats.trim);
    trimMesh.receiveShadow = true;
    table.add(trimMesh);

    // 4. Ornate Corner Bosses / Medallions & Rail Studs on the frame
    const cornerBossGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.08, 16);
    const cornerGemGeo = new THREE.SphereGeometry(0.11, 12, 10);
    cornerGemGeo.scale(1, 0.45, 1);
    const cornerX = TABLE_W / 2 + frameThickness * 0.5;
    const cornerZ = TABLE_D / 2 + frameThickness * 0.5;
    const corners = [
      [-cornerX, -cornerZ],
      [cornerX, -cornerZ],
      [-cornerX, cornerZ],
      [cornerX, cornerZ],
    ];
    for (const [cx, cz] of corners) {
      const boss = new THREE.Mesh(cornerBossGeo, mats.trim);
      boss.position.set(cx, frameHeight + 0.01, cz);
      table.add(boss);

      const gem = new THREE.Mesh(cornerGemGeo, mats.trim);
      gem.position.set(cx, frameHeight + 0.055, cz);
      table.add(gem);
    }

    // Decorative rail studs along top and bottom rails
    const studGeo = new THREE.SphereGeometry(0.055, 8, 8);
    studGeo.scale(1, 0.5, 1);
    for (const sx of [-1.8, 0, 1.8]) {
      for (const sz of [-cornerZ, cornerZ]) {
        const stud = new THREE.Mesh(studGeo, mats.trim);
        stud.position.set(sx, frameHeight + 0.03, sz);
        table.add(stud);
      }
    }

    // 5. Sculpted Under-Table Apron Skirt & Gold Molding Strip
    const apronW = TABLE_W + 0.36;
    const apronD = TABLE_D + 0.36;
    const apronH = 0.38;
    const apronGeo = new THREE.BoxGeometry(apronW, apronH, apronD);
    const apronMesh = new THREE.Mesh(apronGeo, mats.frame);
    apronMesh.position.set(0, -feltThickness - apronH / 2 + 0.04, 0);
    apronMesh.castShadow = true;
    table.add(apronMesh);

    const moldingGeo = new THREE.BoxGeometry(apronW + 0.06, 0.05, apronD + 0.06);
    const moldingMesh = new THREE.Mesh(moldingGeo, mats.trim);
    moldingMesh.position.set(0, -feltThickness - apronH + 0.05, 0);
    table.add(moldingMesh);

    // 6. Sculpted Baluster Legs + Golden Capitals + Floor Carpet Platform
    const legGeo = new THREE.CylinderGeometry(0.28, 0.19, 3.8, 16);
    const capGeo = new THREE.TorusGeometry(0.26, 0.045, 8, 16);
    capGeo.rotateX(Math.PI / 2);
    const footRingGeo = new THREE.CylinderGeometry(0.26, 0.32, 0.22, 16);

    const legY = -2.0 - feltThickness;
    const legX = TABLE_W / 2 - 0.35;
    const legZ = TABLE_D / 2 - 0.35;

    const legPositions = [
      [-legX, legY, -legZ],
      [legX, legY, -legZ],
      [-legX, legY, legZ],
      [legX, legY, legZ],
    ];

    for (const [x, y, z] of legPositions) {
      const leg = new THREE.Mesh(legGeo, mats.frame);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      table.add(leg);

      const cap = new THREE.Mesh(capGeo, mats.trim);
      cap.position.set(x, -feltThickness - apronH - 0.04, z);
      table.add(cap);

      const foot = new THREE.Mesh(footRingGeo, mats.trim);
      foot.position.set(x, y - 1.65, z);
      table.add(foot);
    }

    // 7. Unique Themed 3D Hall Backdrop & Floor Environment per Table
    const backdrop = this.createTableBackdrop(def, mats);
    table.add(backdrop);

    return table;
  }

  private createTableBackdrop(
    def: TableDef,
    mats: {
      felt: THREE.MeshStandardMaterial;
      frame: THREE.MeshStandardMaterial;
      trim: THREE.MeshStandardMaterial;
    },
  ): THREE.Group {
    const env = new THREE.Group();

    // Wide Royal Hall Floor Platform (spans 15.6 x 18 units so 1:1 and portrait viewports never show empty void)
    const floorY = -3.85;
    const hallFloorGeo = new THREE.BoxGeometry(15.6, 0.14, 18.0);
    const hallFloor = new THREE.Mesh(hallFloorGeo, mats.frame);
    hallFloor.position.set(0, floorY - 0.08, 0.5);
    hallFloor.receiveShadow = true;
    env.add(hallFloor);

    // Decorative Golden Floor Border Strips & Cross-Inlays on the Hall Floor
    const floorStripW = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.03, 0.12), mats.trim);
    floorStripW.position.set(0, floorY + 0.005, 4.2);
    env.add(floorStripW);

    const floorStripBack = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.03, 0.12), mats.trim);
    floorStripBack.position.set(0, floorY + 0.005, -4.2);
    env.add(floorStripBack);

    // Grand Hall Wainscot Back Wall behind the columns so the top of 1:1 viewports is richly framed
    const backWallGeo = new THREE.BoxGeometry(15.6, 11.5, 0.28);
    const backWall = new THREE.Mesh(backWallGeo, mats.frame);
    backWall.position.set(0, 1.4, -5.35);
    backWall.receiveShadow = true;
    env.add(backWall);

    const wallGoldMolding = new THREE.Mesh(new THREE.BoxGeometry(15.65, 0.14, 0.34), mats.trim);
    wallGoldMolding.position.set(0, 0.25, -5.32);
    env.add(wallGoldMolding);

    const wallTopCornice = new THREE.Mesh(new THREE.BoxGeometry(15.65, 0.22, 0.42), mats.trim);
    wallTopCornice.position.set(0, 3.85, -5.28);
    env.add(wallTopCornice);

    // Ornate Floor Medallion / Rug beneath the table
    const rugOuterGeo = new THREE.CylinderGeometry(6.8, 7.1, 0.12, 32);
    const rugOuter = new THREE.Mesh(rugOuterGeo, mats.frame);
    rugOuter.position.set(0, floorY, -0.4);
    rugOuter.receiveShadow = true;
    env.add(rugOuter);

    const rugTrimGeo = new THREE.TorusGeometry(6.65, 0.08, 8, 36);
    rugTrimGeo.rotateX(Math.PI / 2);
    const rugTrim = new THREE.Mesh(rugTrimGeo, mats.trim);
    rugTrim.position.set(0, floorY + 0.07, -0.4);
    env.add(rugTrim);

    const rugInnerGeo = new THREE.CylinderGeometry(6.4, 6.4, 0.04, 32);
    const rugInner = new THREE.Mesh(rugInnerGeo, mats.felt);
    rugInner.position.set(0, floorY + 0.06, -0.4);
    rugInner.receiveShadow = true;
    env.add(rugInner);

    // Theme-specific 3D architectural props & glowing accents behind the table (z = -4.2 .. -5.8)
    const glowMat = new THREE.MeshStandardMaterial({
      color: def.lighting.rimColor,
      emissive: def.lighting.rimColor,
      emissiveIntensity: 1.35,
      roughness: 0.2,
    });

    if (def.id === 'wooden') {
      // Cozy Collector's Tavern / Study: Wooden pillars with warm glowing lanterns & treasure barrels
      const pillarGeo = new THREE.BoxGeometry(0.55, 6.2, 0.55);
      const capGeo = new THREE.BoxGeometry(0.72, 0.22, 0.72);
      const lanternGeo = new THREE.SphereGeometry(0.24, 12, 10);
      const beamGeo = new THREE.BoxGeometry(10.6, 0.38, 0.42);

      const beam = new THREE.Mesh(beamGeo, mats.frame);
      beam.position.set(0, 2.1, -4.6);
      env.add(beam);

      for (const px of [-4.6, -2.1, 2.1, 4.6]) {
        const pillar = new THREE.Mesh(pillarGeo, mats.frame);
        pillar.position.set(px, -0.8, -4.6);
        env.add(pillar);

        const cap = new THREE.Mesh(capGeo, mats.trim);
        cap.position.set(px, 1.85, -4.6);
        env.add(cap);

        const lantern = new THREE.Mesh(lanternGeo, glowMat);
        lantern.position.set(px, 1.35, -4.15);
        env.add(lantern);
      }

      // Treasure chests / barrels flanking the background
      const barrelGeo = new THREE.CylinderGeometry(0.46, 0.42, 0.95, 14);
      const hoopGeo = new THREE.TorusGeometry(0.45, 0.035, 8, 16);
      hoopGeo.rotateX(Math.PI / 2);
      for (const bx of [-5.1, 5.1]) {
        const barrel = new THREE.Mesh(barrelGeo, mats.frame);
        barrel.position.set(bx, -0.6, -2.8);
        env.add(barrel);

        const hoop = new THREE.Mesh(hoopGeo, mats.trim);
        hoop.position.set(bx, -0.35, -2.8);
        env.add(hoop);
      }
    } else if (def.id === 'marble') {
      // Classical Marble Pantheon: Fluted white marble columns + golden capitals + sapphire braziers
      const colGeo = new THREE.CylinderGeometry(0.32, 0.36, 6.5, 16);
      const baseGeo = new THREE.BoxGeometry(0.92, 0.35, 0.92);
      const archGeo = new THREE.BoxGeometry(11.2, 0.48, 0.65);

      const arch = new THREE.Mesh(archGeo, mats.frame);
      arch.position.set(0, 2.35, -4.75);
      env.add(arch);

      const archTrim = new THREE.Mesh(new THREE.BoxGeometry(11.3, 0.1, 0.72), mats.trim);
      archTrim.position.set(0, 2.1, -4.75);
      env.add(archTrim);

      for (const cx of [-4.8, -2.2, 2.2, 4.8]) {
        const col = new THREE.Mesh(colGeo, mats.frame);
        col.position.set(cx, -0.8, -4.75);
        env.add(col);

        const cap = new THREE.Mesh(baseGeo, mats.trim);
        cap.position.set(cx, 2.0, -4.75);
        env.add(cap);

        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 1), glowMat);
        orb.position.set(cx, 1.35, -4.15);
        env.add(orb);
      }
    } else if (def.id === 'malachite') {
      // Malachite Emerald Vault: Glowing emerald crystal spires & golden floating rings
      const spireGeo = new THREE.ConeGeometry(0.48, 3.6, 6);
      const smallSpireGeo = new THREE.ConeGeometry(0.3, 2.1, 6);
      const ringGeo = new THREE.TorusGeometry(0.68, 0.05, 8, 24);
      ringGeo.rotateX(Math.PI / 2);

      for (const [sx, sz, rotZ] of [
        [-4.9, -3.6, 0.12],
        [-2.5, -4.6, -0.06],
        [0, -4.85, 0],
        [2.5, -4.6, 0.06],
        [4.9, -3.6, -0.12],
      ]) {
        const spire = new THREE.Mesh(spireGeo, glowMat);
        spire.position.set(sx, 0.4, sz);
        spire.rotation.z = rotZ;
        env.add(spire);

        const sideCrystal = new THREE.Mesh(smallSpireGeo, mats.felt);
        sideCrystal.position.set(sx + (sx < 0 ? 0.45 : -0.45), -0.3, sz + 0.2);
        sideCrystal.rotation.z = -rotZ * 1.8;
        env.add(sideCrystal);

        const ring = new THREE.Mesh(ringGeo, mats.trim);
        ring.position.set(sx, 0.9, sz);
        env.add(ring);
      }
    } else if (def.id === 'obsidian') {
      // Obsidian Arcane Sanctum: Dark volcanic monoliths + glowing violet runes & floating rings
      const monoGeo = new THREE.BoxGeometry(0.75, 5.2, 0.48);
      const runeBandGeo = new THREE.BoxGeometry(0.82, 0.16, 0.54);
      const crystalGeo = new THREE.OctahedronGeometry(0.36, 0);

      for (const [mx, mz, ry] of [
        [-5.0, -3.5, 0.25],
        [-2.4, -4.65, 0.1],
        [0, -4.9, 0],
        [2.4, -4.65, -0.1],
        [5.0, -3.5, -0.25],
      ]) {
        const mono = new THREE.Mesh(monoGeo, mats.frame);
        mono.position.set(mx, -0.4, mz);
        mono.rotation.y = ry;
        env.add(mono);

        const band1 = new THREE.Mesh(runeBandGeo, glowMat);
        band1.position.set(mx, 0.85, mz);
        band1.rotation.y = ry;
        env.add(band1);

        const band2 = new THREE.Mesh(runeBandGeo, mats.trim);
        band2.position.set(mx, 1.45, mz);
        band2.rotation.y = ry;
        env.add(band2);

        const shard = new THREE.Mesh(crystalGeo, glowMat);
        shard.position.set(mx, 2.55, mz);
        env.add(shard);
      }
    } else {
      // Royal Throne Hall ('royal'): Grand gilded colonnade + crimson banners + central crown arch
      const pillarGeo = new THREE.CylinderGeometry(0.34, 0.38, 6.6, 16);
      const bannerGeo = new THREE.BoxGeometry(1.15, 3.2, 0.08);
      const crownRingGeo = new THREE.TorusGeometry(1.15, 0.12, 10, 28);
      const crownOrbGeo = new THREE.SphereGeometry(0.32, 14, 12);

      // Central Royal Arch & Crown Emblem behind the table
      const archRing = new THREE.Mesh(crownRingGeo, mats.trim);
      archRing.position.set(0, 1.65, -4.8);
      env.add(archRing);

      const centerGem = new THREE.Mesh(crownOrbGeo, glowMat);
      centerGem.position.set(0, 1.65, -4.8);
      env.add(centerGem);

      for (const rx of [-4.8, -2.3, 2.3, 4.8]) {
        const pillar = new THREE.Mesh(pillarGeo, mats.trim);
        pillar.position.set(rx, -0.7, -4.75);
        env.add(pillar);

        const banner = new THREE.Mesh(bannerGeo, mats.felt);
        banner.position.set(rx, 0.7, -4.32);
        env.add(banner);

        const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 1), glowMat);
        crest.position.set(rx, 1.15, -4.22);
        env.add(crest);
      }
    }

    return env;
  }
}
