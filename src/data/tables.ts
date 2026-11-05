// Table definitions. Add a new object to TABLES to add a table: no logic changes needed.
export type WoodKind = 'wood' | 'darkwood' | 'marble';

export interface TableDef {
  id: string;
  nameKey: string;
  /** Gold needed to unlock (0 = free). */
  unlockCost: number;
  /** Multiplier on every coin landed on this table. */
  incomeMult: number;
  materials: {
    frame: { kind: WoodKind; color: number; roughness: number; metalness: number };
    felt: { color: number; roughness: number; sheen: number };
    trim: { color: number; roughness: number; metalness: number; thickness: number };
  };
  lighting: {
    background: number;
    ambient: number;
    ambientColor: number;
    keyColor: number;
    keyIntensity: number;
    rimColor: number;
    rimIntensity: number;
    exposure: number;
    envIntensity: number;
  };
  coin: {
    tint: [number, number, number];
    scale: number;
    bounce: number;
  };
}

export const TABLES: TableDef[] = [
  {
    id: 'wooden',
    nameKey: 'table.wooden',
    unlockCost: 0,
    incomeMult: 1,
    materials: {
      frame: { kind: 'wood', color: 0x8a5a33, roughness: 0.55, metalness: 0.0 },
      felt: { color: 0x1f6b3a, roughness: 0.95, sheen: 0.6 },
      trim: { color: 0xc79a5b, roughness: 0.4, metalness: 0.8, thickness: 0.035 },
    },
    lighting: {
      background: 0x120d09,
      ambient: 0.55,
      ambientColor: 0xffe2c0,
      keyColor: 0xffe6bf,
      keyIntensity: 3.2,
      rimColor: 0xff9d52,
      rimIntensity: 1.2,
      exposure: 1.0,
      envIntensity: 0.9,
    },
    coin: { tint: [1.0, 0.95, 0.85], scale: 1, bounce: 0.46 },
  },
  {
    id: 'marble',
    nameKey: 'table.marble',
    unlockCost: 5_000,
    incomeMult: 1.25,
    materials: {
      frame: { kind: 'marble', color: 0xedebe6, roughness: 0.18, metalness: 0.0 },
      felt: { color: 0x2457a6, roughness: 0.95, sheen: 0.7 },
      trim: { color: 0xb9b5ac, roughness: 0.25, metalness: 0.95, thickness: 0.03 },
    },
    lighting: {
      background: 0x0a1018,
      ambient: 0.6,
      ambientColor: 0xd8e8ff,
      keyColor: 0xf2f7ff,
      keyIntensity: 3.4,
      rimColor: 0x6fa8ff,
      rimIntensity: 1.5,
      exposure: 1.05,
      envIntensity: 1.1,
    },
    coin: { tint: [1.0, 1.0, 1.0], scale: 1.03, bounce: 0.48 },
  },
  {
    id: 'malachite',
    nameKey: 'table.malachite',
    unlockCost: 250_000,
    incomeMult: 1.5,
    materials: {
      frame: { kind: 'darkwood', color: 0x3b2314, roughness: 0.45, metalness: 0.05 },
      felt: { color: 0x0d5c52, roughness: 0.92, sheen: 0.8 },
      trim: { color: 0xd99b26, roughness: 0.3, metalness: 0.9, thickness: 0.04 },
    },
    lighting: {
      background: 0x071412,
      ambient: 0.55,
      ambientColor: 0xc2f5eb,
      keyColor: 0xe6fff9,
      keyIntensity: 3.4,
      rimColor: 0x34d399,
      rimIntensity: 1.4,
      exposure: 1.03,
      envIntensity: 1.0,
    },
    coin: { tint: [0.96, 1.02, 0.96], scale: 1.05, bounce: 0.5 },
  },
  {
    id: 'obsidian',
    nameKey: 'table.obsidian',
    unlockCost: 8_000_000,
    incomeMult: 2,
    materials: {
      frame: { kind: 'marble', color: 0x1c1924, roughness: 0.2, metalness: 0.15 },
      felt: { color: 0x3b1d5e, roughness: 0.94, sheen: 0.88 },
      trim: { color: 0xd8dee9, roughness: 0.22, metalness: 0.98, thickness: 0.048 },
    },
    lighting: {
      background: 0x0b0714,
      ambient: 0.52,
      ambientColor: 0xe2d4ff,
      keyColor: 0xf3e8ff,
      keyIntensity: 3.5,
      rimColor: 0xa855f7,
      rimIntensity: 1.55,
      exposure: 1.05,
      envIntensity: 1.08,
    },
    coin: { tint: [1.0, 0.98, 1.04], scale: 1.08, bounce: 0.51 },
  },
  {
    id: 'royal',
    nameKey: 'table.royal',
    unlockCost: 250_000_000,
    incomeMult: 3,
    materials: {
      frame: { kind: 'darkwood', color: 0x2a1710, roughness: 0.4, metalness: 0.05 },
      felt: { color: 0x6b1230, roughness: 1.0, sheen: 1.0 },
      trim: { color: 0xf2b63d, roughness: 0.22, metalness: 1.0, thickness: 0.06 },
    },
    lighting: {
      background: 0x120609,
      ambient: 0.45,
      ambientColor: 0xffc8c0,
      keyColor: 0xffd9a8,
      keyIntensity: 3.6,
      rimColor: 0xff5a78,
      rimIntensity: 1.6,
      exposure: 1.05,
      envIntensity: 1.0,
    },
    coin: { tint: [1.05, 0.95, 0.8], scale: 1.1, bounce: 0.52 },
  },
];

export const TABLE_BY_ID: Record<string, TableDef> = Object.fromEntries(
  TABLES.map((t) => [t.id, t]),
);

/** Table surface size in world units. */
export const TABLE_W = 8.2;
export const TABLE_D = 5.0;
export const TABLE_SPACING = 16;
