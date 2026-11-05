// All economy numbers live here according to ECONOMY_SPEC.md
// Formula: cost(level) = floor(baseCost * (growth ^ level))

export type UpgradeId =
  | 'multiToss'
  | 'silverCoins'
  | 'goldCoins'
  | 'platinumCoins'
  | 'sapphireCoins'
  | 'emeraldCoins'
  | 'diamondTierCoins'
  | 'rubyCoins'
  | 'amethystCoins'
  | 'obsidianCoins'
  | 'mythrilCoins'
  | 'astralCoins'
  | 'solarCoins'
  | 'celestialCoins'
  | 'luckyCoin'
  | 'headsChance'
  | 'offlineVault'
  | 'coinValue'
  | 'bronzeFall'
  | 'bronzePercent'
  | 'silverValue'
  | 'silverFall'
  | 'silverPercent'
  | 'goldValue'
  | 'goldFall'
  | 'goldPercent'
  | 'platinumValue'
  | 'platinumFall'
  | 'platinumPercent'
  | 'sapphireValue'
  | 'sapphireFall'
  | 'sapphirePercent'
  | 'emeraldValue'
  | 'emeraldFall'
  | 'emeraldPercent'
  | 'diamondValue'
  | 'diamondFall'
  | 'diamondPercent'
  | 'rubyValue'
  | 'rubyFall'
  | 'rubyPercent'
  | 'amethystValue'
  | 'amethystFall'
  | 'amethystPercent'
  | 'obsidianValue'
  | 'obsidianFall'
  | 'obsidianPercent'
  | 'mythrilValue'
  | 'mythrilFall'
  | 'mythrilPercent'
  | 'astralValue'
  | 'astralFall'
  | 'astralPercent'
  | 'solarValue'
  | 'solarFall'
  | 'solarPercent'
  | 'celestialValue'
  | 'celestialFall'
  | 'celestialPercent'
  | 'autoTosser'
  | 'tossSpeed'
  | 'minionTier'
  | 'megaMinion';

export type CoinTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'sapphire'
  | 'emerald'
  | 'diamond'
  | 'ruby'
  | 'amethyst'
  | 'obsidian'
  | 'mythril'
  | 'astral'
  | 'solar'
  | 'celestial';

export const COIN_TIERS: CoinTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'sapphire',
  'emerald',
  'diamond',
  'ruby',
  'amethyst',
  'obsidian',
  'mythril',
  'astral',
  'solar',
  'celestial',
];

export type UpgradeCategory = 'upgrades' | 'coins' | 'minions';

export type IconName =
  | 'coin'
  | 'hand'
  | 'speed'
  | 'multi'
  | 'clover'
  | 'vault'
  | 'sun'
  | 'diamond'
  | 'magnet'
  | 'clock'
  | 'bolt'
  | 'sound'
  | 'mute'
  | 'lang'
  | 'close'
  | 'chevron'
  | 'lock'
  | 'play'
  | 'arrowL'
  | 'arrowR'
  | 'check';

export interface UpgradeDef {
  id: UpgradeId;
  category: UpgradeCategory;
  coinTier?: CoinTier;
  requiresRebirthTalent?: TokenUpgradeId;
  nameKey: string;
  descKey: string;
  icon: IconName;
  baseCost: number;
  growth: number;
  maxLevel: number; // Infinity = unlimited
  /** Numeric effect for a level */
  effect: (level: number) => number;
  unit: 'gold' | 'perSec' | 'times' | 'percent' | 'hours' | 'coins' | 'tier';
}

export const UPGRADES: UpgradeDef[] = [
  // ==================== TAB 1: UPGRADES (Click Power & Coin Unlocks) ====================
  {
    id: 'multiToss',
    category: 'upgrades',
    coinTier: 'bronze',
    nameKey: 'up.multiToss.name',
    descKey: 'up.multiToss.desc',
    icon: 'multi',
    baseCost: 15,
    growth: 1.15,
    maxLevel: 25,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'silverCoins',
    category: 'upgrades',
    coinTier: 'silver',
    nameKey: 'up.silverCoins.name',
    descKey: 'up.silverCoins.desc',
    icon: 'coin',
    baseCost: 2000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'goldCoins',
    category: 'upgrades',
    coinTier: 'gold',
    nameKey: 'up.goldCoins.name',
    descKey: 'up.goldCoins.desc',
    icon: 'coin',
    baseCost: 50000,
    growth: 1.15,
    maxLevel: 10,
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'platinumCoins',
    category: 'upgrades',
    coinTier: 'platinum',
    nameKey: 'up.platinumCoins.name',
    descKey: 'up.platinumCoins.desc',
    icon: 'coin',
    baseCost: 1500000,
    growth: 1.15,
    maxLevel: 10,
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'sapphireCoins',
    category: 'upgrades',
    coinTier: 'sapphire',
    nameKey: 'up.sapphireCoins.name',
    descKey: 'up.sapphireCoins.desc',
    icon: 'diamond',
    baseCost: 35000000,
    growth: 1.15,
    maxLevel: 10,
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'emeraldCoins',
    category: 'upgrades',
    coinTier: 'emerald',
    nameKey: 'up.emeraldCoins.name',
    descKey: 'up.emeraldCoins.desc',
    icon: 'diamond',
    baseCost: 800000000,
    growth: 1.15,
    maxLevel: 10,
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'diamondTierCoins',
    category: 'upgrades',
    coinTier: 'diamond',
    nameKey: 'up.diamondTierCoins.name',
    descKey: 'up.diamondTierCoins.desc',
    icon: 'diamond',
    baseCost: 18000000000,
    growth: 1.15,
    maxLevel: 10,
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'rubyCoins',
    category: 'upgrades',
    coinTier: 'ruby',
    requiresRebirthTalent: 'tokenUp25',
    nameKey: 'up.rubyCoins.name',
    descKey: 'up.rubyCoins.desc',
    icon: 'diamond',
    baseCost: 400000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'amethystCoins',
    category: 'upgrades',
    coinTier: 'amethyst',
    requiresRebirthTalent: 'tokenUp26',
    nameKey: 'up.amethystCoins.name',
    descKey: 'up.amethystCoins.desc',
    icon: 'diamond',
    baseCost: 9000000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'obsidianCoins',
    category: 'upgrades',
    coinTier: 'obsidian',
    requiresRebirthTalent: 'tokenUp27',
    nameKey: 'up.obsidianCoins.name',
    descKey: 'up.obsidianCoins.desc',
    icon: 'diamond',
    baseCost: 200000000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'mythrilCoins',
    category: 'upgrades',
    coinTier: 'mythril',
    requiresRebirthTalent: 'tokenUp28',
    nameKey: 'up.mythrilCoins.name',
    descKey: 'up.mythrilCoins.desc',
    icon: 'diamond',
    baseCost: 4500000000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'astralCoins',
    category: 'upgrades',
    coinTier: 'astral',
    requiresRebirthTalent: 'tokenUp29',
    nameKey: 'up.astralCoins.name',
    descKey: 'up.astralCoins.desc',
    icon: 'diamond',
    baseCost: 100000000000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'solarCoins',
    category: 'upgrades',
    coinTier: 'solar',
    requiresRebirthTalent: 'tokenUp30',
    nameKey: 'up.solarCoins.name',
    descKey: 'up.solarCoins.desc',
    icon: 'sun',
    baseCost: 2200000000000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'celestialCoins',
    category: 'upgrades',
    coinTier: 'celestial',
    requiresRebirthTalent: 'tokenUp31',
    nameKey: 'up.celestialCoins.name',
    descKey: 'up.celestialCoins.desc',
    icon: 'sun',
    baseCost: 50000000000000000000,
    growth: 1.15,
    maxLevel: 9,
    unit: 'coins',
    effect: (l) => 1 + l,
  },
  {
    id: 'luckyCoin',
    category: 'upgrades',
    nameKey: 'up.luckyCoin.name',
    descKey: 'up.luckyCoin.desc',
    icon: 'clover',
    baseCost: 400,
    growth: 1.15,
    maxLevel: 15,
    unit: 'percent',
    effect: (l) => Math.min(0.3, 0.02 * l),
  },
  {
    id: 'headsChance',
    category: 'upgrades',
    nameKey: 'up.headsChance.name',
    descKey: 'up.headsChance.desc',
    icon: 'sun',
    baseCost: 250,
    growth: 1.15,
    maxLevel: 7,
    unit: 'percent',
    effect: (l) => Number((0.5 + 0.05 * l).toFixed(2)),
  },
  {
    id: 'offlineVault',
    category: 'upgrades',
    nameKey: 'up.offlineVault.name',
    descKey: 'up.offlineVault.desc',
    icon: 'vault',
    baseCost: 600,
    growth: 1.15,
    maxLevel: 10,
    unit: 'hours',
    effect: (l) => 4 + 0.5 * l,
  },

  // ==================== TAB 2: COINS (Active Click Power & Coin Upgrades) ====================
  // --- Bronze Coin ---
  {
    id: 'coinValue',
    category: 'coins',
    coinTier: 'bronze',
    nameKey: 'up.coinValue.name',
    descKey: 'up.coinValue.desc',
    icon: 'coin',
    baseCost: 15,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 1 + l,
  },
  {
    id: 'bronzeFall',
    category: 'coins',
    coinTier: 'bronze',
    nameKey: 'up.bronzeFall.name',
    descKey: 'up.bronzeFall.desc',
    icon: 'speed',
    baseCost: 30,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'bronzePercent',
    category: 'coins',
    coinTier: 'bronze',
    nameKey: 'up.bronzePercent.name',
    descKey: 'up.bronzePercent.desc',
    icon: 'sun',
    baseCost: 90,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.1 * l).toFixed(2)),
  },

  // --- Silver Coin ---
  {
    id: 'silverValue',
    category: 'coins',
    coinTier: 'silver',
    nameKey: 'up.silverValue.name',
    descKey: 'up.silverValue.desc',
    icon: 'coin',
    baseCost: 2500,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 10 + l * 2,
  },
  {
    id: 'silverFall',
    category: 'coins',
    coinTier: 'silver',
    nameKey: 'up.silverFall.name',
    descKey: 'up.silverFall.desc',
    icon: 'speed',
    baseCost: 3500,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'silverPercent',
    category: 'coins',
    coinTier: 'silver',
    nameKey: 'up.silverPercent.name',
    descKey: 'up.silverPercent.desc',
    icon: 'sun',
    baseCost: 5000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.12 * l).toFixed(2)),
  },

  // --- Gold Coin ---
  {
    id: 'goldValue',
    category: 'coins',
    coinTier: 'gold',
    nameKey: 'up.goldValue.name',
    descKey: 'up.goldValue.desc',
    icon: 'coin',
    baseCost: 60000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 25 + l * 6,
  },
  {
    id: 'goldFall',
    category: 'coins',
    coinTier: 'gold',
    nameKey: 'up.goldFall.name',
    descKey: 'up.goldFall.desc',
    icon: 'speed',
    baseCost: 85000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'goldPercent',
    category: 'coins',
    coinTier: 'gold',
    nameKey: 'up.goldPercent.name',
    descKey: 'up.goldPercent.desc',
    icon: 'sun',
    baseCost: 120000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.15 * l).toFixed(2)),
  },

  // --- Platinum Coin ---
  {
    id: 'platinumValue',
    category: 'coins',
    coinTier: 'platinum',
    nameKey: 'up.platinumValue.name',
    descKey: 'up.platinumValue.desc',
    icon: 'coin',
    baseCost: 1800000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 75 + l * 18,
  },
  {
    id: 'platinumFall',
    category: 'coins',
    coinTier: 'platinum',
    nameKey: 'up.platinumFall.name',
    descKey: 'up.platinumFall.desc',
    icon: 'speed',
    baseCost: 2400000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'platinumPercent',
    category: 'coins',
    coinTier: 'platinum',
    nameKey: 'up.platinumPercent.name',
    descKey: 'up.platinumPercent.desc',
    icon: 'sun',
    baseCost: 3200000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.18 * l).toFixed(2)),
  },

  // --- Sapphire Coin ---
  {
    id: 'sapphireValue',
    category: 'coins',
    coinTier: 'sapphire',
    nameKey: 'up.sapphireValue.name',
    descKey: 'up.sapphireValue.desc',
    icon: 'diamond',
    baseCost: 42000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 220 + l * 55,
  },
  {
    id: 'sapphireFall',
    category: 'coins',
    coinTier: 'sapphire',
    nameKey: 'up.sapphireFall.name',
    descKey: 'up.sapphireFall.desc',
    icon: 'speed',
    baseCost: 56000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'sapphirePercent',
    category: 'coins',
    coinTier: 'sapphire',
    nameKey: 'up.sapphirePercent.name',
    descKey: 'up.sapphirePercent.desc',
    icon: 'sun',
    baseCost: 75000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.2 * l).toFixed(2)),
  },

  // --- Emerald Coin ---
  {
    id: 'emeraldValue',
    category: 'coins',
    coinTier: 'emerald',
    nameKey: 'up.emeraldValue.name',
    descKey: 'up.emeraldValue.desc',
    icon: 'diamond',
    baseCost: 950000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 650 + l * 160,
  },
  {
    id: 'emeraldFall',
    category: 'coins',
    coinTier: 'emerald',
    nameKey: 'up.emeraldFall.name',
    descKey: 'up.emeraldFall.desc',
    icon: 'speed',
    baseCost: 1300000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'emeraldPercent',
    category: 'coins',
    coinTier: 'emerald',
    nameKey: 'up.emeraldPercent.name',
    descKey: 'up.emeraldPercent.desc',
    icon: 'sun',
    baseCost: 1750000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.22 * l).toFixed(2)),
  },

  // --- Diamond Coin ---
  {
    id: 'diamondValue',
    category: 'coins',
    coinTier: 'diamond',
    nameKey: 'up.diamondValue.name',
    descKey: 'up.diamondValue.desc',
    icon: 'diamond',
    baseCost: 22000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 1900 + l * 480,
  },
  {
    id: 'diamondFall',
    category: 'coins',
    coinTier: 'diamond',
    nameKey: 'up.diamondFall.name',
    descKey: 'up.diamondFall.desc',
    icon: 'speed',
    baseCost: 30000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'diamondPercent',
    category: 'coins',
    coinTier: 'diamond',
    nameKey: 'up.diamondPercent.name',
    descKey: 'up.diamondPercent.desc',
    icon: 'sun',
    baseCost: 40000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.25 * l).toFixed(2)),
  },

  // --- Ruby Coin (Unlocked via Rebirth Talent tokenUp25) ---
  {
    id: 'rubyValue',
    category: 'coins',
    coinTier: 'ruby',
    requiresRebirthTalent: 'tokenUp25',
    nameKey: 'up.rubyValue.name',
    descKey: 'up.rubyValue.desc',
    icon: 'diamond',
    baseCost: 480000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 5500 + l * 1400,
  },
  {
    id: 'rubyFall',
    category: 'coins',
    coinTier: 'ruby',
    requiresRebirthTalent: 'tokenUp25',
    nameKey: 'up.rubyFall.name',
    descKey: 'up.rubyFall.desc',
    icon: 'speed',
    baseCost: 650000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'rubyPercent',
    category: 'coins',
    coinTier: 'ruby',
    requiresRebirthTalent: 'tokenUp25',
    nameKey: 'up.rubyPercent.name',
    descKey: 'up.rubyPercent.desc',
    icon: 'sun',
    baseCost: 900000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.28 * l).toFixed(2)),
  },

  // --- Amethyst Coin (Unlocked via Rebirth Talent tokenUp26) ---
  {
    id: 'amethystValue',
    category: 'coins',
    coinTier: 'amethyst',
    requiresRebirthTalent: 'tokenUp26',
    nameKey: 'up.amethystValue.name',
    descKey: 'up.amethystValue.desc',
    icon: 'diamond',
    baseCost: 11000000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 16000 + l * 4000,
  },
  {
    id: 'amethystFall',
    category: 'coins',
    coinTier: 'amethyst',
    requiresRebirthTalent: 'tokenUp26',
    nameKey: 'up.amethystFall.name',
    descKey: 'up.amethystFall.desc',
    icon: 'speed',
    baseCost: 15000000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'amethystPercent',
    category: 'coins',
    coinTier: 'amethyst',
    requiresRebirthTalent: 'tokenUp26',
    nameKey: 'up.amethystPercent.name',
    descKey: 'up.amethystPercent.desc',
    icon: 'sun',
    baseCost: 20000000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.3 * l).toFixed(2)),
  },

  // --- Obsidian Coin (Unlocked via Rebirth Talent tokenUp27) ---
  {
    id: 'obsidianValue',
    category: 'coins',
    coinTier: 'obsidian',
    requiresRebirthTalent: 'tokenUp27',
    nameKey: 'up.obsidianValue.name',
    descKey: 'up.obsidianValue.desc',
    icon: 'diamond',
    baseCost: 240000000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 46000 + l * 11500,
  },
  {
    id: 'obsidianFall',
    category: 'coins',
    coinTier: 'obsidian',
    requiresRebirthTalent: 'tokenUp27',
    nameKey: 'up.obsidianFall.name',
    descKey: 'up.obsidianFall.desc',
    icon: 'speed',
    baseCost: 330000000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'obsidianPercent',
    category: 'coins',
    coinTier: 'obsidian',
    requiresRebirthTalent: 'tokenUp27',
    nameKey: 'up.obsidianPercent.name',
    descKey: 'up.obsidianPercent.desc',
    icon: 'sun',
    baseCost: 450000000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.32 * l).toFixed(2)),
  },

  // --- Mythril Coin (Unlocked via Rebirth Talent tokenUp28) ---
  {
    id: 'mythrilValue',
    category: 'coins',
    coinTier: 'mythril',
    requiresRebirthTalent: 'tokenUp28',
    nameKey: 'up.mythrilValue.name',
    descKey: 'up.mythrilValue.desc',
    icon: 'diamond',
    baseCost: 5400000000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 135000 + l * 34000,
  },
  {
    id: 'mythrilFall',
    category: 'coins',
    coinTier: 'mythril',
    requiresRebirthTalent: 'tokenUp28',
    nameKey: 'up.mythrilFall.name',
    descKey: 'up.mythrilFall.desc',
    icon: 'speed',
    baseCost: 7500000000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'mythrilPercent',
    category: 'coins',
    coinTier: 'mythril',
    requiresRebirthTalent: 'tokenUp28',
    nameKey: 'up.mythrilPercent.name',
    descKey: 'up.mythrilPercent.desc',
    icon: 'sun',
    baseCost: 10000000000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.35 * l).toFixed(2)),
  },

  // --- Astral Coin (Unlocked via Rebirth Talent tokenUp29) ---
  {
    id: 'astralValue',
    category: 'coins',
    coinTier: 'astral',
    requiresRebirthTalent: 'tokenUp29',
    nameKey: 'up.astralValue.name',
    descKey: 'up.astralValue.desc',
    icon: 'diamond',
    baseCost: 120000000000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 400000 + l * 100000,
  },
  {
    id: 'astralFall',
    category: 'coins',
    coinTier: 'astral',
    requiresRebirthTalent: 'tokenUp29',
    nameKey: 'up.astralFall.name',
    descKey: 'up.astralFall.desc',
    icon: 'speed',
    baseCost: 165000000000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'astralPercent',
    category: 'coins',
    coinTier: 'astral',
    requiresRebirthTalent: 'tokenUp29',
    nameKey: 'up.astralPercent.name',
    descKey: 'up.astralPercent.desc',
    icon: 'sun',
    baseCost: 220000000000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.38 * l).toFixed(2)),
  },

  // --- Solar Coin (Unlocked via Rebirth Talent tokenUp30) ---
  {
    id: 'solarValue',
    category: 'coins',
    coinTier: 'solar',
    requiresRebirthTalent: 'tokenUp30',
    nameKey: 'up.solarValue.name',
    descKey: 'up.solarValue.desc',
    icon: 'sun',
    baseCost: 2600000000000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 1200000 + l * 300000,
  },
  {
    id: 'solarFall',
    category: 'coins',
    coinTier: 'solar',
    requiresRebirthTalent: 'tokenUp30',
    nameKey: 'up.solarFall.name',
    descKey: 'up.solarFall.desc',
    icon: 'speed',
    baseCost: 3600000000000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'solarPercent',
    category: 'coins',
    coinTier: 'solar',
    requiresRebirthTalent: 'tokenUp30',
    nameKey: 'up.solarPercent.name',
    descKey: 'up.solarPercent.desc',
    icon: 'sun',
    baseCost: 4800000000000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.42 * l).toFixed(2)),
  },

  // --- Celestial Coin (Unlocked via Rebirth Talent tokenUp31) ---
  {
    id: 'celestialValue',
    category: 'coins',
    coinTier: 'celestial',
    requiresRebirthTalent: 'tokenUp31',
    nameKey: 'up.celestialValue.name',
    descKey: 'up.celestialValue.desc',
    icon: 'sun',
    baseCost: 60000000000000000000,
    growth: 1.15,
    maxLevel: Infinity,
    unit: 'gold',
    effect: (l) => 3500000 + l * 880000,
  },
  {
    id: 'celestialFall',
    category: 'coins',
    coinTier: 'celestial',
    requiresRebirthTalent: 'tokenUp31',
    nameKey: 'up.celestialFall.name',
    descKey: 'up.celestialFall.desc',
    icon: 'speed',
    baseCost: 82000000000000000000,
    growth: 1.15,
    maxLevel: 15,
    unit: 'times',
    effect: (l) => Number((1 + 0.1 * l).toFixed(2)),
  },
  {
    id: 'celestialPercent',
    category: 'coins',
    coinTier: 'celestial',
    requiresRebirthTalent: 'tokenUp31',
    nameKey: 'up.celestialPercent.name',
    descKey: 'up.celestialPercent.desc',
    icon: 'sun',
    baseCost: 110000000000000000000,
    growth: 1.15,
    maxLevel: 25,
    unit: 'percent',
    effect: (l) => Number((0.5 * l).toFixed(2)),
  },

  // ==================== TAB 3: MINIONS (Passive Income / Auto Helpers) ====================
  {
    id: 'autoTosser',
    category: 'minions',
    nameKey: 'up.autoTosser.name',
    descKey: 'up.autoTosser.desc',
    icon: 'hand',
    baseCost: 60,
    growth: 1.15,
    maxLevel: 15, // 1st auto-helper costs 60 gold and brings 1 coin/sec!
    unit: 'coins',
    effect: (l) => l,
  },
  {
    id: 'tossSpeed',
    category: 'minions',
    nameKey: 'up.tossSpeed.name',
    descKey: 'up.tossSpeed.desc',
    icon: 'speed',
    baseCost: 500,
    growth: 1.15,
    maxLevel: 20,
    unit: 'times',
    effect: (l) => Number((1 + 0.08 * l).toFixed(2)),
  },
  {
    id: 'minionTier',
    category: 'minions',
    nameKey: 'up.minionTier.name',
    descKey: 'up.minionTier.desc',
    icon: 'bolt',
    baseCost: 3000,
    growth: 1.15,
    maxLevel: 13, // 0=Bronze .. 6=Diamond, 7=Ruby .. 13=Celestial
    unit: 'tier',
    effect: (l) => l,
  },
  {
    id: 'megaMinion',
    category: 'minions',
    requiresRebirthTalent: 'tokenUp37',
    nameKey: 'up.megaMinion.name',
    descKey: 'up.megaMinion.desc',
    icon: 'bolt',
    baseCost: 15000000,
    growth: 1.15,
    maxLevel: 3, // Max 3 Heavy Minions; each slams the table every 5 seconds and tosses ALL coins!
    unit: 'coins',
    effect: (l) => l,
  },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<
  UpgradeId,
  UpgradeDef
>;

/** Global income multipliers granted upon unlocking new coin tiers (level >= 1) */
export const COIN_UNLOCK_GLOBAL_MULT: Partial<Record<UpgradeId, number>> = {
  silverCoins: 5, // Unlocking Silver Coin (2,000) grants x5 global income!
  goldCoins: 10, // Unlocking Gold Coin (50,000) grants x10 global income!
};

/** Alchemical Laboratory (Coin Sink) constants */
export const ALCHEMY_BREW_DURATION_MS = 1500; // 1.5s flask bubbling animation
export const ALCHEMY_SPEED_DURATION = 30; // 30 seconds of +10 auto-clicks/sec
export const ALCHEMY_SPEED_CLICKS_PER_SEC = 10; // +10 auto-clicks per second
export const ALCHEMY_ELIXIR_DURATION = 15; // 15 seconds of x10 global income
export const ALCHEMY_ELIXIR_MULT = 10; // x10 global income multiplier

export const LUCKY_MULT = 3;
export const DIAMOND_MULT = 8;
export const EDGE_MULT = 25;
export const EDGE_CHANCE = 0.01;
export const AUTO_TAP_PER_SEC = 8; // hold limit from ECONOMY_SPEC §4 (8 taps/sec)

/** Cost formula according to ECONOMY_SPEC §1 */
export function upgradeCost(def: UpgradeDef, level: number): bigint {
  if (level >= def.maxLevel) return 0n;
  const raw = def.baseCost * Math.pow(def.growth, level);
  if (!Number.isFinite(raw) || raw >= 1e30) {
    return 10n ** 30n;
  }
  return BigInt(Math.max(1, Math.floor(raw)));
}

/** Offline efficiency according to ECONOMY_SPEC §4 */
export function offlineEfficiency(level: number): number {
  return 0.5 + 0.05 * level;
}

// ----- Ad boosts (rewarded) according to ECONOMY_SPEC §5 (70 total permanent ad upgrades) -----
export type AdBoostId =
  | 'goldenHour'
  | 'diamondCoins'
  | 'magnetTouch'
  | 'minionRush'
  | 'luckyCharm'
  | 'vipDiscount'
  | 'coinGravity'
  | 'timeWarp'
  | 'frenzy';

export interface AdBoostDef {
  id: AdBoostId;
  nameKey: string;
  descKey: string;
  icon: IconName;
  maxLevel: number;
  values: number[];
  unit: 'times' | 'percent' | 'coins' | 'minutes' | 'seconds';
}

export const AD_BOOSTS: AdBoostDef[] = [
  {
    id: 'goldenHour',
    nameKey: 'ad.goldenHour.name',
    descKey: 'ad.goldenHour.desc',
    icon: 'sun',
    maxLevel: 10,
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12], // 10 levels: x1 -> x12 permanent income
    unit: 'times',
  },
  {
    id: 'diamondCoins',
    nameKey: 'ad.diamondCoins.name',
    descKey: 'ad.diamondCoins.desc',
    icon: 'diamond',
    maxLevel: 10,
    values: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5], // 10 levels: 0% -> 50%
    unit: 'percent',
  },
  {
    id: 'magnetTouch',
    nameKey: 'ad.magnetTouch.name',
    descKey: 'ad.magnetTouch.desc',
    icon: 'magnet',
    maxLevel: 10,
    values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 10 levels: +0 -> +10 extra coins per tap
    unit: 'coins',
  },
  {
    id: 'minionRush',
    nameKey: 'ad.minionRush.name',
    descKey: 'ad.minionRush.desc',
    icon: 'hand',
    maxLevel: 10,
    values: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5], // 10 levels: +0% -> +150% minion speed
    unit: 'percent',
  },
  {
    id: 'luckyCharm',
    nameKey: 'ad.luckyCharm.name',
    descKey: 'ad.luckyCharm.desc',
    icon: 'clover',
    maxLevel: 10,
    values: [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.27, 0.3], // 10 levels: +0% -> +30% Lucky & Heads chance
    unit: 'percent',
  },
  {
    id: 'vipDiscount',
    nameKey: 'ad.vipDiscount.name',
    descKey: 'ad.vipDiscount.desc',
    icon: 'coin',
    maxLevel: 10,
    values: [0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.28, 0.32, 0.36, 0.4], // 10 levels: -0% -> -40% shop discount
    unit: 'percent',
  },
  {
    id: 'coinGravity',
    nameKey: 'ad.coinGravity.name',
    descKey: 'ad.coinGravity.desc',
    icon: 'speed',
    maxLevel: 9,
    values: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35], // 9 levels: +0% -> +135% coin fall speed
    unit: 'percent',
  },
  {
    id: 'frenzy',
    nameKey: 'ad.frenzy.name',
    descKey: 'ad.frenzy.desc',
    icon: 'bolt',
    maxLevel: 1,
    values: [0, 60], // 1 level: permanently unlocks 60s Frenzy x5 button (total permanent ads = 10+10+10+10+10+10+9+1 = 70!)
    unit: 'seconds',
  },
  {
    id: 'timeWarp',
    nameKey: 'ad.timeWarp.name',
    descKey: 'ad.timeWarp.desc',
    icon: 'clock',
    maxLevel: Infinity,
    values: [10], // 10 minutes of auto-income
    unit: 'minutes',
  },
];

export const AD_BOOST_BY_ID = Object.fromEntries(AD_BOOSTS.map((b) => [b.id, b])) as Record<
  AdBoostId,
  AdBoostDef
>;

export const FRENZY_DURATION = 60; // 60 seconds
export const FRENZY_COOLDOWN = 300; // 5 minutes
export const FRENZY_MULT = 5; // x5 income
export const AD_X2_DURATION = 300; // 5 minutes (300 seconds) of x2 Gold from ad
export const TIME_WARP_COOLDOWN = 300; // 5 minutes
export const REWARDED_COOLDOWN = 30; // seconds minimum between ad prompts

export const REBIRTH_BASE_COST = 25_000; // 25K gold for the 1st rebirth point in a run
export const REBIRTH_COST_GROWTH = 1.434; // Smoother geometric progression multiplier per rebirth point
export const REBIRTH_PASSIVE_BONUS = 0.05; // +5% permanent income per earned Rebirth Point

// ----- Separate Rebirth Talent Tree & Ad Token Branch -----
export type TokenUpgradeId =
  | 'tokenUp1'
  | 'tokenUp2'
  | 'tokenUp3'
  | 'tokenUp4'
  | 'tokenUp5'
  | 'tokenUp6'
  | 'tokenUp7'
  | 'tokenUp8'
  | 'tokenUp9'
  | 'tokenUp10'
  | 'tokenUp11'
  | 'tokenUp12'
  | 'tokenUp13'
  | 'tokenUp14'
  | 'tokenUp15'
  | 'tokenUp16'
  | 'tokenUp17'
  | 'tokenUp18'
  | 'tokenUp19'
  | 'tokenUp20'
  | 'tokenUp21'
  | 'tokenUp22'
  | 'tokenUp23'
  | 'tokenUp24'
  | 'tokenUp25'
  | 'tokenUp26'
  | 'tokenUp27'
  | 'tokenUp28'
  | 'tokenUp29'
  | 'tokenUp30'
  | 'tokenUp31'
  | 'tokenUp32'
  | 'tokenUp33'
  | 'tokenUp34'
  | 'tokenUp35'
  | 'tokenUp36'
  | 'tokenUp37';

export interface TokenUpgradeDef {
  id: TokenUpgradeId;
  nameKey: string;
  descKey: string;
  icon: IconName;
  tokenCost: number; // cost in Rebirth Points / Tokens per level (0 if triggered by watching an ad)
  maxLevel: number;
  isAdBoost?: boolean;
  /** For Rebirth Talent Tree: which parent node(s) require at least 1 level to unlock this node */
  requires?: TokenUpgradeId[];
  /** Visual tier / column in the Rebirth Talent Tree (1 = root .. 12 = apex) */
  treeTier?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** Gamblers Table layout zone: 'minions' (Left Wing), 'hub' (Center Core), 'coin' (Horizontal Spine moving Right), 'top' (Above Coin), 'bottom' (Below Coin) */
  branchZone?: 'minions' | 'hub' | 'coin' | 'top' | 'bottom';
  /** Associated coin tier column (0..6 for Ruby..Celestial) when part of the rightward coin progression */
  coinCol?: number;
}

export const AD_TOKEN_UPGRADES: TokenUpgradeDef[] = [
  {
    id: 'tokenUp1', // -10% shop discount per level (5 levels, 1 token each)
    nameKey: 'token.up1.name',
    descKey: 'token.up1.desc',
    icon: 'coin',
    tokenCost: 1,
    maxLevel: 5,
  },
  {
    id: 'tokenUp2', // x1.5 coin fall/toss speed (1 level, 3 tokens)
    nameKey: 'token.up2.name',
    descKey: 'token.up2.desc',
    icon: 'speed',
    tokenCost: 3,
    maxLevel: 1,
  },
  {
    id: 'tokenUp3', // +5 minions per level (3 levels, 2 tokens each = up to +15 minions)
    nameKey: 'token.up3.name',
    descKey: 'token.up3.desc',
    icon: 'hand',
    tokenCost: 2,
    maxLevel: 3,
  },
  {
    id: 'tokenUp4', // x2 Gold for 5 minutes by watching an ad
    nameKey: 'token.up4.name',
    descKey: 'token.up4.desc',
    icon: 'bolt',
    tokenCost: 0,
    maxLevel: 1,
    isAdBoost: true,
  },
];

export const REBIRTH_UPGRADES: TokenUpgradeDef[] = [
  // ==================== CENTER HUB (Root & Core Skills) ====================
  {
    id: 'tokenUp5', // Root: Midas Mint (+100% coin income, 1/1)
    nameKey: 'token.up5.name',
    descKey: 'token.up5.desc',
    icon: 'sun',
    tokenCost: 1,
    maxLevel: 1,
    treeTier: 1,
    branchZone: 'hub',
  },
  {
    id: 'tokenUp6', // Crit Mastery (+2x Lucky, +4x Diamond, +10% Lucky chance, 1/1)
    nameKey: 'token.up6.name',
    descKey: 'token.up6.desc',
    icon: 'diamond',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp5'],
    treeTier: 2,
    branchZone: 'hub',
  },
  {
    id: 'tokenUp11', // Starting Capital (+1,000 starting gold on Rebirth, 1/1)
    nameKey: 'token.up11.name',
    descKey: 'token.up11.desc',
    icon: 'coin',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp5'],
    treeTier: 2,
    branchZone: 'hub',
  },
  {
    id: 'tokenUp8', // Royal Head Start (+4 Bronze coins & +2 Minions on Rebirth, 1/1)
    nameKey: 'token.up8.name',
    descKey: 'token.up8.desc',
    icon: 'bolt',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp5'],
    treeTier: 2,
    branchZone: 'hub',
  },
  {
    id: 'tokenUp7', // Echo Flip (+25% chance for 2x coin payout, 1/1)
    nameKey: 'token.up7.name',
    descKey: 'token.up7.desc',
    icon: 'multi',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp6'],
    treeTier: 3,
    branchZone: 'hub',
  },
  {
    id: 'tokenUp12', // Wholesale Bargain (-20% shop upgrade prices, 1/1)
    nameKey: 'token.up12.name',
    descKey: 'token.up12.desc',
    icon: 'coin',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp11'],
    treeTier: 3,
    branchZone: 'hub',
  },

  // ==================== LEFT WING: MINIONS BRANCH ====================
  {
    id: 'tokenUp9', // Collector Guild (+40% minion speed & -12% shop cost, 1/1)
    nameKey: 'token.up9.name',
    descKey: 'token.up9.desc',
    icon: 'speed',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp5', 'tokenUp8'],
    treeTier: 3,
    branchZone: 'minions',
  },
  {
    id: 'tokenUp16', // Minion Legion (+5 extra minions on table, 1/1)
    nameKey: 'token.up16.name',
    descKey: 'token.up16.desc',
    icon: 'hand',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp9'],
    treeTier: 4,
    branchZone: 'minions',
  },
  {
    id: 'tokenUp37', // Titan Minions (Unlocks Heavy Minions that slam table every 5s, 1/1)
    nameKey: 'token.up37.name',
    descKey: 'token.up37.desc',
    icon: 'bolt',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp16'],
    treeTier: 5,
    branchZone: 'minions',
  },
  {
    id: 'tokenUp23', // Golden Hands (Minion-tossed coins grant +75% extra gold, 1/1)
    nameKey: 'token.up23.name',
    descKey: 'token.up23.desc',
    icon: 'hand',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp37'],
    treeTier: 6,
    branchZone: 'minions',
  },
  {
    id: 'tokenUp22', // Offline Dynamo (+75% offline income & +6h offline cap, 1/1)
    nameKey: 'token.up22.name',
    descKey: 'token.up22.desc',
    icon: 'vault',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp23'],
    treeTier: 7,
    branchZone: 'minions',
  },
  {
    id: 'tokenUp33', // Hyperdrive Minions (+75% minion movement & toss speed, 1/1)
    nameKey: 'token.up33.name',
    descKey: 'token.up33.desc',
    icon: 'speed',
    tokenCost: 3,
    maxLevel: 1,
    requires: ['tokenUp22'],
    treeTier: 8,
    branchZone: 'minions',
  },

  // ==================== RIGHTWARD COINS PROGRESSION (Gamblers Table Style) ====================
  // --- Coin Column 0: RUBY COIN (Center Unlock + Top Value/Tap Skill + Bottom Combo Skill) ---
  {
    id: 'tokenUp25', // Center Spine: Unlock Ruby Coin (+1 free Ruby Coin, 1/1)
    nameKey: 'token.up25.name',
    descKey: 'token.up25.desc',
    icon: 'diamond',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp5'],
    treeTier: 3,
    branchZone: 'coin',
    coinCol: 0,
  },
  {
    id: 'tokenUp13', // Above Ruby: Ruby Magnetism (+2 extra coins per tap & +50% Ruby value, 1/1)
    nameKey: 'token.up13.name',
    descKey: 'token.up13.desc',
    icon: 'magnet',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp25'],
    treeTier: 4,
    branchZone: 'top',
    coinCol: 0,
  },
  {
    id: 'tokenUp14', // Below Ruby: Ruby Streak (+60% Heads Combo multiplier & +25% Ruby speed, 1/1)
    nameKey: 'token.up14.name',
    descKey: 'token.up14.desc',
    icon: 'clover',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp25'],
    treeTier: 4,
    branchZone: 'bottom',
    coinCol: 0,
  },

  // --- Coin Column 1: AMETHYST COIN ---
  {
    id: 'tokenUp26', // Center Spine: Unlock Amethyst Coin (+1 free Amethyst Coin, 1/1)
    nameKey: 'token.up26.name',
    descKey: 'token.up26.desc',
    icon: 'diamond',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp25'],
    treeTier: 5,
    branchZone: 'coin',
    coinCol: 1,
  },
  {
    id: 'tokenUp15', // Above Amethyst: Amethyst Felt (-45% table unlock cost & +50% Amethyst value, 1/1)
    nameKey: 'token.up15.name',
    descKey: 'token.up15.desc',
    icon: 'sun',
    tokenCost: 1,
    maxLevel: 1,
    requires: ['tokenUp26'],
    treeTier: 5,
    branchZone: 'top',
    coinCol: 1,
  },
  {
    id: 'tokenUp17', // Below Amethyst: Amethyst Resonance (+20% chance for 3x coin payout, 1/1)
    nameKey: 'token.up17.name',
    descKey: 'token.up17.desc',
    icon: 'multi',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp26'],
    treeTier: 5,
    branchZone: 'bottom',
    coinCol: 1,
  },

  // --- Coin Column 2: OBSIDIAN COIN ---
  {
    id: 'tokenUp27', // Center Spine: Unlock Obsidian Coin (+1 free Obsidian Coin, 1/1)
    nameKey: 'token.up27.name',
    descKey: 'token.up27.desc',
    icon: 'diamond',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp26'],
    treeTier: 6,
    branchZone: 'coin',
    coinCol: 2,
  },
  {
    id: 'tokenUp20', // Above Obsidian: Obsidian Gravity (+60% coin flight/fall speed & +50% Obsidian value, 1/1)
    nameKey: 'token.up20.name',
    descKey: 'token.up20.desc',
    icon: 'speed',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp27'],
    treeTier: 6,
    branchZone: 'top',
    coinCol: 2,
  },
  {
    id: 'tokenUp18', // Below Obsidian: Obsidian Razor Edge (+40x bonus on Edge landing, 1/1)
    nameKey: 'token.up18.name',
    descKey: 'token.up18.desc',
    icon: 'bolt',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp27'],
    treeTier: 7,
    branchZone: 'bottom',
    coinCol: 2,
  },

  // --- Coin Column 3: MYTHRIL COIN ---
  {
    id: 'tokenUp28', // Center Spine: Unlock Mythril Coin (+1 free Mythril Coin, 1/1)
    nameKey: 'token.up28.name',
    descKey: 'token.up28.desc',
    icon: 'diamond',
    tokenCost: 3,
    maxLevel: 1,
    requires: ['tokenUp27'],
    treeTier: 8,
    branchZone: 'coin',
    coinCol: 3,
  },
  {
    id: 'tokenUp19', // Above Mythril: Mythril Relic Hunter (+150% Golden Relic gold & +10s Frenzy, 1/1)
    nameKey: 'token.up19.name',
    descKey: 'token.up19.desc',
    icon: 'diamond',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp28'],
    treeTier: 8,
    branchZone: 'top',
    coinCol: 3,
  },
  {
    id: 'tokenUp21', // Below Mythril: Mythril Diamond Fever (+8% flat Diamond coin chance, 1/1)
    nameKey: 'token.up21.name',
    descKey: 'token.up21.desc',
    icon: 'diamond',
    tokenCost: 2,
    maxLevel: 1,
    requires: ['tokenUp28'],
    treeTier: 8,
    branchZone: 'bottom',
    coinCol: 3,
  },

  // --- Coin Column 4: ASTRAL COIN ---
  {
    id: 'tokenUp29', // Center Spine: Unlock Astral Coin (+1 free Astral Coin, 1/1)
    nameKey: 'token.up29.name',
    descKey: 'token.up29.desc',
    icon: 'diamond',
    tokenCost: 3,
    maxLevel: 1,
    requires: ['tokenUp28'],
    treeTier: 9,
    branchZone: 'coin',
    coinCol: 4,
  },
  {
    id: 'tokenUp32', // Above Astral: Astral Treasury (+120% to all coin income, 1/1)
    nameKey: 'token.up32.name',
    descKey: 'token.up32.desc',
    icon: 'sun',
    tokenCost: 3,
    maxLevel: 1,
    requires: ['tokenUp29'],
    treeTier: 9,
    branchZone: 'top',
    coinCol: 4,
  },
  {
    id: 'tokenUp10', // Below Astral: Astral Blessing (+80% gold, +10% Heads chance, 2x Edge chance, 1/1)
    nameKey: 'token.up10.name',
    descKey: 'token.up10.desc',
    icon: 'clover',
    tokenCost: 3,
    maxLevel: 1,
    requires: ['tokenUp29'],
    treeTier: 10,
    branchZone: 'bottom',
    coinCol: 4,
  },

  // --- Coin Column 5: SOLAR COIN ---
  {
    id: 'tokenUp30', // Center Spine: Unlock Solar Coin (+1 free Solar Coin, 1/1)
    nameKey: 'token.up30.name',
    descKey: 'token.up30.desc',
    icon: 'sun',
    tokenCost: 4,
    maxLevel: 1,
    requires: ['tokenUp29'],
    treeTier: 10,
    branchZone: 'coin',
    coinCol: 5,
  },
  {
    id: 'tokenUp24', // Above Solar: Solar Overlord (+5% passive income per Rebirth Point, 1/1)
    nameKey: 'token.up24.name',
    descKey: 'token.up24.desc',
    icon: 'sun',
    tokenCost: 3,
    maxLevel: 1,
    requires: ['tokenUp30'],
    treeTier: 10,
    branchZone: 'top',
    coinCol: 5,
  },
  {
    id: 'tokenUp34', // Below Solar: Solar Radiance (+150% to all coin income, 1/1)
    nameKey: 'token.up34.name',
    descKey: 'token.up34.desc',
    icon: 'coin',
    tokenCost: 4,
    maxLevel: 1,
    requires: ['tokenUp30'],
    treeTier: 11,
    branchZone: 'bottom',
    coinCol: 5,
  },

  // --- Coin Column 6: CELESTIAL COIN (Rightmost Apex) ---
  {
    id: 'tokenUp31', // Center Spine: Unlock Celestial Coin (+1 free Celestial Coin, 1/1)
    nameKey: 'token.up31.name',
    descKey: 'token.up31.desc',
    icon: 'sun',
    tokenCost: 5,
    maxLevel: 1,
    requires: ['tokenUp30'],
    treeTier: 12,
    branchZone: 'coin',
    coinCol: 6,
  },
  {
    id: 'tokenUp35', // Above Celestial: Celestial Sovereign (+100% bonus to all table income multipliers, 1/1)
    nameKey: 'token.up35.name',
    descKey: 'token.up35.desc',
    icon: 'sun',
    tokenCost: 4,
    maxLevel: 1,
    requires: ['tokenUp31'],
    treeTier: 11,
    branchZone: 'top',
    coinCol: 6,
  },
  {
    id: 'tokenUp36', // Below Celestial: Heart of Eternity (+5% per Rebirth Point & x2 total income, 1/1)
    nameKey: 'token.up36.name',
    descKey: 'token.up36.desc',
    icon: 'diamond',
    tokenCost: 5,
    maxLevel: 1,
    requires: ['tokenUp31'],
    treeTier: 12,
    branchZone: 'bottom',
    coinCol: 6,
  },
];

export const TOKEN_UPGRADES: TokenUpgradeDef[] = [...AD_TOKEN_UPGRADES, ...REBIRTH_UPGRADES];

export const TOKEN_UPGRADE_BY_ID = Object.fromEntries(
  TOKEN_UPGRADES.map((u) => [u.id, u]),
) as Record<TokenUpgradeId, TokenUpgradeDef>;

export function bigintSuffixes(): string[] {
  return ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
}
