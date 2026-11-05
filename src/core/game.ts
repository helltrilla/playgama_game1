import {
  AD_BOOST_BY_ID,
  AD_X2_DURATION,
  ALCHEMY_ELIXIR_DURATION,
  ALCHEMY_ELIXIR_MULT,
  ALCHEMY_SPEED_DURATION,
  AUTO_TAP_PER_SEC,
  COIN_TIERS,
  COIN_UNLOCK_GLOBAL_MULT,
  DIAMOND_MULT,
  EDGE_CHANCE,
  EDGE_MULT,
  FRENZY_COOLDOWN,
  FRENZY_DURATION,
  FRENZY_MULT,
  LUCKY_MULT,
  REBIRTH_BASE_COST,
  REBIRTH_COST_GROWTH,
  REBIRTH_PASSIVE_BONUS,
  REBIRTH_UPGRADES,
  TOKEN_UPGRADE_BY_ID,
  UPGRADE_BY_ID,
  offlineEfficiency,
  upgradeCost,
  type AdBoostId,
  type CoinTier,
  type TokenUpgradeId,
  type UpgradeId,
} from '../data/upgrades';
import { ACHIEVEMENTS, ACHIEVEMENTS_PER_TOKEN, type AchievementId } from '../data/achievements';
import { TABLES, TABLE_BY_ID, type TableDef } from '../data/tables';
import { defaultState, emptyLevels, SaveManager, type GameState } from './save';
import type { Clock } from './clock';
import type { Rng } from './rng';
import type { StorageAdapter } from './storage';
import { EventBus } from './events';

export type CoinKind = 0 | 1 | 2 | 3; // 0 = normal, 1 = lucky (x3+), 2 = diamond (x8+), 3 = edge (x25!)

export interface TossedCoin {
  value: bigint;
  kind: CoinKind;
  tier?: CoinTier;
}

export type BuyMode = 1 | 10 | 'max';
export type AlchemyOutcome = 'fail' | 'speed' | 'elixir';

export interface CoinFusionInfo {
  canFuse: boolean;
  nextTier: CoinTier | null;
  usedCount: number;
  cost: bigint;
  isLeftover: boolean;
}

export interface CoinTierStat {
  tier: CoinTier;
  count: number;
  singleValue: bigint;
  perCoinPerSec: bigint;
  totalTierPerSec: bigint;
  actualPerSec10s: bigint;
  estimatedAutoPerSec: bigint;
}

export interface OfflineResult {
  seconds: number;
  earned: bigint;
  capHours: number;
  efficiency: number;
}

export interface RebirthProgress {
  pendingPoints: number;
  currentStepGold: bigint;
  nextStepCost: bigint;
  ratio: number; // 0..1
}

/**
 * Calculates accumulated Rebirth Points and progress bar towards the next point
 * using a geometric cost progression that persists across Rebirths:
 * stepCost(existingPoints + i) = floor(REBIRTH_BASE_COST * (REBIRTH_COST_GROWTH ^ (existingPoints + i)))
 */
export function calcRebirthProgress(runEarned: bigint, existingPoints = 0): RebirthProgress {
  let remaining = runEarned > 0n ? runEarned : 0n;
  let points = 0;
  let stepCostNum =
    REBIRTH_BASE_COST * Math.pow(REBIRTH_COST_GROWTH, Math.max(0, Math.floor(existingPoints)));

  while (points < 1000) {
    const stepCost = BigInt(Math.max(1, Math.floor(stepCostNum)));
    if (remaining >= stepCost) {
      remaining -= stepCost;
      points++;
      stepCostNum *= REBIRTH_COST_GROWTH;
    } else {
      const ratio = stepCost > 0n ? Math.min(1, Number((remaining * 1000n) / stepCost) / 1000) : 0;
      return {
        pendingPoints: points,
        currentStepGold: remaining,
        nextStepCost: stepCost,
        ratio,
      };
    }
  }

  const fallbackCost = BigInt(Math.max(1, Math.floor(stepCostNum)));
  return {
    pendingPoints: points,
    currentStepGold: 0n,
    nextStepCost: fallbackCost,
    ratio: 1,
  };
}

export interface GameEvents {
  state_changed: void;
  gold_added: { amount: bigint; source: string };
  coin_tossed: { coin: TossedCoin; source: 'tap' | 'auto'; tableId: string };
  upgrade_purchased: { upgradeId: UpgradeId; count: number; newLevel: number; cost: bigint };
  table_unlocked: { tableId: string; cost: bigint };
  table_switched: { tableId: string };
  ad_boost_granted: { boostId: AdBoostId; newLevel: number };
  frenzy_activated: { until: number };
  achievement_unlocked: { achievementId: AchievementId; tokensAwarded: number };
}

export class GameEngine {
  readonly state: GameState;
  readonly save: SaveManager;
  readonly events = new EventBus<GameEvents>();
  sceneDrivenHelpers = false;
  headsStreak = 0;

  private autoAccumulator = 0;
  private lastTapTime = 0;
  private recentCoinPayouts: Array<{ time: number; amount: bigint; tier: CoinTier }> = [];

  constructor(
    state: GameState = defaultState(),
    readonly storage: StorageAdapter,
    readonly clock: Clock,
    readonly rng: Rng,
  ) {
    this.state = state;
    this.save = new SaveManager(state, storage, clock);
  }

  // ---------- Derived economy values ----------

  activeTable(): TableDef {
    return TABLE_BY_ID[this.state.activeTable] || TABLES[0];
  }

  tableDef(id: string): TableDef | undefined {
    return TABLE_BY_ID[id];
  }

  upgradeLevel(uid: UpgradeId): number {
    // Upgrades are global across tables (ADR-5)
    return this.state.tables[TABLES[0].id]?.[uid] ?? 0;
  }

  /** Whether an upgrade is unlocked (either available by default, or its required Rebirth Talent is >= 1) */
  isUpgradeUnlocked(uid: UpgradeId): boolean {
    const def = UPGRADE_BY_ID[uid];
    if (!def) return false;
    if (def.requiresRebirthTalent) {
      if (this.tokenUpgradeLevel(def.requiresRebirthTalent) >= 1) return true;
      if (def.coinTier && (this.state.coinDelta?.[def.coinTier] ?? 0) > 0) return true;
      return false;
    }
    return true;
  }

  /** Base value of a coin for a given tier including flat upgrade and % bonus */
  coinBase(tier: CoinTier = 'bronze'): number {
    switch (tier) {
      case 'celestial': {
        const flat = UPGRADE_BY_ID.celestialValue.effect(this.upgradeLevel('celestialValue'));
        const pct =
          1 + UPGRADE_BY_ID.celestialPercent.effect(this.upgradeLevel('celestialPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp35');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'solar': {
        const flat = UPGRADE_BY_ID.solarValue.effect(this.upgradeLevel('solarValue'));
        const pct = 1 + UPGRADE_BY_ID.solarPercent.effect(this.upgradeLevel('solarPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp24');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'astral': {
        const flat = UPGRADE_BY_ID.astralValue.effect(this.upgradeLevel('astralValue'));
        const pct = 1 + UPGRADE_BY_ID.astralPercent.effect(this.upgradeLevel('astralPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp32');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'mythril': {
        const flat = UPGRADE_BY_ID.mythrilValue.effect(this.upgradeLevel('mythrilValue'));
        const pct = 1 + UPGRADE_BY_ID.mythrilPercent.effect(this.upgradeLevel('mythrilPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp19');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'obsidian': {
        const flat = UPGRADE_BY_ID.obsidianValue.effect(this.upgradeLevel('obsidianValue'));
        const pct = 1 + UPGRADE_BY_ID.obsidianPercent.effect(this.upgradeLevel('obsidianPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp20');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'amethyst': {
        const flat = UPGRADE_BY_ID.amethystValue.effect(this.upgradeLevel('amethystValue'));
        const pct = 1 + UPGRADE_BY_ID.amethystPercent.effect(this.upgradeLevel('amethystPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp15');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'ruby': {
        const flat = UPGRADE_BY_ID.rubyValue.effect(this.upgradeLevel('rubyValue'));
        const pct = 1 + UPGRADE_BY_ID.rubyPercent.effect(this.upgradeLevel('rubyPercent'));
        const talent = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp13');
        return Math.max(1, Math.floor(flat * pct * talent));
      }
      case 'diamond': {
        const flat = UPGRADE_BY_ID.diamondValue.effect(this.upgradeLevel('diamondValue'));
        const pct = 1 + UPGRADE_BY_ID.diamondPercent.effect(this.upgradeLevel('diamondPercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
      case 'emerald': {
        const flat = UPGRADE_BY_ID.emeraldValue.effect(this.upgradeLevel('emeraldValue'));
        const pct = 1 + UPGRADE_BY_ID.emeraldPercent.effect(this.upgradeLevel('emeraldPercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
      case 'sapphire': {
        const flat = UPGRADE_BY_ID.sapphireValue.effect(this.upgradeLevel('sapphireValue'));
        const pct = 1 + UPGRADE_BY_ID.sapphirePercent.effect(this.upgradeLevel('sapphirePercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
      case 'platinum': {
        const flat = UPGRADE_BY_ID.platinumValue.effect(this.upgradeLevel('platinumValue'));
        const pct = 1 + UPGRADE_BY_ID.platinumPercent.effect(this.upgradeLevel('platinumPercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
      case 'gold': {
        const flat = UPGRADE_BY_ID.goldValue.effect(this.upgradeLevel('goldValue'));
        const pct = 1 + UPGRADE_BY_ID.goldPercent.effect(this.upgradeLevel('goldPercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
      case 'silver': {
        const flat = UPGRADE_BY_ID.silverValue.effect(this.upgradeLevel('silverValue'));
        const pct = 1 + UPGRADE_BY_ID.silverPercent.effect(this.upgradeLevel('silverPercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
      case 'bronze':
      default: {
        const flat = UPGRADE_BY_ID.coinValue.effect(this.upgradeLevel('coinValue'));
        const pct = 1 + UPGRADE_BY_ID.bronzePercent.effect(this.upgradeLevel('bronzePercent'));
        return Math.max(1, Math.floor(flat * pct));
      }
    }
  }

  /** Number of persistent coins of each tier lying on the table (after any 5->1 fusions) */
  coinCountsByTier(): Record<CoinTier, number> {
    const raw: Record<CoinTier, number> = {
      bronze: UPGRADE_BY_ID.multiToss.effect(this.upgradeLevel('multiToss')) + this.magnetExtra(),
      silver: UPGRADE_BY_ID.silverCoins.effect(this.upgradeLevel('silverCoins')),
      gold: UPGRADE_BY_ID.goldCoins.effect(this.upgradeLevel('goldCoins')),
      platinum: UPGRADE_BY_ID.platinumCoins.effect(this.upgradeLevel('platinumCoins')),
      sapphire: UPGRADE_BY_ID.sapphireCoins.effect(this.upgradeLevel('sapphireCoins')),
      emerald: UPGRADE_BY_ID.emeraldCoins.effect(this.upgradeLevel('emeraldCoins')),
      diamond: UPGRADE_BY_ID.diamondTierCoins.effect(this.upgradeLevel('diamondTierCoins')),
      ruby: this.isUpgradeUnlocked('rubyCoins')
        ? UPGRADE_BY_ID.rubyCoins.effect(this.upgradeLevel('rubyCoins'))
        : 0,
      amethyst: this.isUpgradeUnlocked('amethystCoins')
        ? UPGRADE_BY_ID.amethystCoins.effect(this.upgradeLevel('amethystCoins'))
        : 0,
      obsidian: this.isUpgradeUnlocked('obsidianCoins')
        ? UPGRADE_BY_ID.obsidianCoins.effect(this.upgradeLevel('obsidianCoins'))
        : 0,
      mythril: this.isUpgradeUnlocked('mythrilCoins')
        ? UPGRADE_BY_ID.mythrilCoins.effect(this.upgradeLevel('mythrilCoins'))
        : 0,
      astral: this.isUpgradeUnlocked('astralCoins')
        ? UPGRADE_BY_ID.astralCoins.effect(this.upgradeLevel('astralCoins'))
        : 0,
      solar: this.isUpgradeUnlocked('solarCoins')
        ? UPGRADE_BY_ID.solarCoins.effect(this.upgradeLevel('solarCoins'))
        : 0,
      celestial: this.isUpgradeUnlocked('celestialCoins')
        ? UPGRADE_BY_ID.celestialCoins.effect(this.upgradeLevel('celestialCoins'))
        : 0,
    };

    const delta = this.state.coinDelta || {};
    const out = {} as Record<CoinTier, number>;
    for (const tier of COIN_TIERS) {
      out[tier] = Math.max(0, raw[tier] + (delta[tier] || 0));
    }
    return out;
  }

  /** Returns the next coin tier for 5->1 fusion, or null if at max tier or locked by Rebirth talent */
  nextCoinTier(tier: CoinTier): CoinTier | null {
    const idx = COIN_TIERS.indexOf(tier);
    if (idx < 0 || idx >= COIN_TIERS.length - 1) return null;
    const next = COIN_TIERS[idx + 1];
    if (idx + 1 >= 7) {
      const uid = `${next}Coins` as UpgradeId;
      if (!this.isUpgradeUnlocked(uid)) return null;
    }
    return next;
  }

  /**
   * Computes whether a coin tier can be fused into +1 coin of the next tier:
   * - If count >= 5: Free 5 -> 1 fusion!
   * - If 1 <= count < 5 and a higher tier coin is already on the table: can fuse the leftover
   *   coins into +1 next-tier coin by paying the proportional gold cost of the missing (5 - count) coins.
   */
  getCoinFusionInfo(tier: CoinTier): CoinFusionInfo {
    const nextTier = this.nextCoinTier(tier);
    if (!nextTier) {
      return { canFuse: false, nextTier: null, usedCount: 0, cost: 0n, isLeftover: false };
    }
    const counts = this.coinCountsByTier();
    const curCount = counts[tier] ?? 0;
    if (curCount >= 5) {
      return {
        canFuse: true,
        nextTier,
        usedCount: 5,
        cost: 0n,
        isLeftover: false,
      };
    }
    const idx = COIN_TIERS.indexOf(tier);
    const hasHigherCoin = COIN_TIERS.slice(idx + 1).some((t) => (counts[t] ?? 0) > 0);
    if (curCount >= 1 && hasHigherCoin) {
      const unlockMap: Partial<Record<CoinTier, UpgradeId>> = {
        silver: 'silverCoins',
        gold: 'goldCoins',
        platinum: 'platinumCoins',
        sapphire: 'sapphireCoins',
        emerald: 'emeraldCoins',
        diamond: 'diamondTierCoins',
        ruby: 'rubyCoins',
        amethyst: 'amethystCoins',
        obsidian: 'obsidianCoins',
        mythril: 'mythrilCoins',
        astral: 'astralCoins',
        solar: 'solarCoins',
        celestial: 'celestialCoins',
      };
      const nextUid = unlockMap[nextTier] ?? 'silverCoins';
      const baseCost = this.costForLevel(nextUid, 0);
      const cost = (baseCost * BigInt(5 - curCount)) / 5n;
      return {
        canFuse: this.state.gold >= cost,
        nextTier,
        usedCount: curCount,
        cost,
        isLeftover: true,
      };
    }
    return {
      canFuse: false,
      nextTier,
      usedCount: 5,
      cost: 0n,
      isLeftover: false,
    };
  }

  /** Executes a 5 -> 1 (or leftover -> 1) coin fusion from `tier` into `nextCoinTier(tier)` */
  fuseCoinTier(tier: CoinTier): boolean {
    const info = this.getCoinFusionInfo(tier);
    if (!info.canFuse || !info.nextTier || info.usedCount <= 0) return false;
    if (info.cost > 0n) {
      if (this.state.gold < info.cost) return false;
      this.state.gold -= info.cost;
      this.save.mark('gold');
    }
    if (!this.state.coinDelta) {
      this.state.coinDelta = {};
    }
    this.state.coinDelta[tier] = (this.state.coinDelta[tier] || 0) - info.usedCount;
    this.state.coinDelta[info.nextTier] = (this.state.coinDelta[info.nextTier] || 0) + 1;
    this.save.mark('tables');
    this.events.emit('state_changed', undefined);
    return true;
  }

  /** Fall speed multiplier for each coin tier (including x1.5 Token Upgrade, tokenUp20 Heavy Gravity, and per-coin bottom skills) */
  fallSpeedByTier(): Record<CoinTier, number> {
    const tokenSpeed = this.coinSpeedTokenMultiplier();
    return {
      bronze: UPGRADE_BY_ID.bronzeFall.effect(this.upgradeLevel('bronzeFall')) * tokenSpeed,
      silver: UPGRADE_BY_ID.silverFall.effect(this.upgradeLevel('silverFall')) * tokenSpeed,
      gold: UPGRADE_BY_ID.goldFall.effect(this.upgradeLevel('goldFall')) * tokenSpeed,
      platinum: UPGRADE_BY_ID.platinumFall.effect(this.upgradeLevel('platinumFall')) * tokenSpeed,
      sapphire: UPGRADE_BY_ID.sapphireFall.effect(this.upgradeLevel('sapphireFall')) * tokenSpeed,
      emerald: UPGRADE_BY_ID.emeraldFall.effect(this.upgradeLevel('emeraldFall')) * tokenSpeed,
      diamond: UPGRADE_BY_ID.diamondFall.effect(this.upgradeLevel('diamondFall')) * tokenSpeed,
      ruby:
        UPGRADE_BY_ID.rubyFall.effect(this.upgradeLevel('rubyFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp14')),
      amethyst:
        UPGRADE_BY_ID.amethystFall.effect(this.upgradeLevel('amethystFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp17')),
      obsidian:
        UPGRADE_BY_ID.obsidianFall.effect(this.upgradeLevel('obsidianFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp18')),
      mythril:
        UPGRADE_BY_ID.mythrilFall.effect(this.upgradeLevel('mythrilFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp21')),
      astral:
        UPGRADE_BY_ID.astralFall.effect(this.upgradeLevel('astralFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp10')),
      solar:
        UPGRADE_BY_ID.solarFall.effect(this.upgradeLevel('solarFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp34')),
      celestial:
        UPGRADE_BY_ID.celestialFall.effect(this.upgradeLevel('celestialFall')) *
        tokenSpeed *
        (1 + 0.3 * this.tokenUpgradeLevel('tokenUp36')),
    };
  }

  /** Highest coin tier minions can toss: 0 = bronze .. 13 = celestial */
  minionMaxTier(): number {
    const upgraded = this.upgradeLevel('minionTier');
    const counts = this.coinCountsByTier();
    let hasEligible = false;
    let lowestAvailable = -1;
    for (let i = 0; i < COIN_TIERS.length; i++) {
      if ((counts[COIN_TIERS[i]] ?? 0) > 0) {
        if (lowestAvailable === -1) lowestAvailable = i;
        if (i <= upgraded) hasEligible = true;
      }
    }
    if (!hasEligible && lowestAvailable > upgraded) {
      return lowestAvailable;
    }
    return upgraded;
  }

  /** Number of Heavy Minions (Table Slammers) active on the table (0..3) */
  megaMinionCount(): number {
    if (!this.isUpgradeUnlocked('megaMinion')) return 0;
    return UPGRADE_BY_ID.megaMinion.effect(this.upgradeLevel('megaMinion'));
  }

  /** Total active minions on the table (base autoTosser + +5 per tokenUp3 + +4 from tokenUp16) */
  totalMinionCount(): number {
    const base = UPGRADE_BY_ID.autoTosser.effect(this.upgradeLevel('autoTosser'));
    const bonusAd = this.tokenUpgradeLevel('tokenUp3') * 5;
    const bonusRebirth = this.tokenUpgradeLevel('tokenUp16') * 4;
    return base + bonusAd + bonusRebirth;
  }

  /** Shop price multiplier from tokenUp1 (-10%/lvl), tokenUp9 (-12%), tokenUp12 (-18%), and vipDiscount ad boost (-4%/lvl) */
  shopDiscountMultiplier(): number {
    const lvl1 = this.tokenUpgradeLevel('tokenUp1');
    const lvl9 = this.tokenUpgradeLevel('tokenUp9');
    const lvl12 = this.tokenUpgradeLevel('tokenUp12');
    const vipB = AD_BOOST_BY_ID.vipDiscount;
    const vipDisc = vipB.values[Math.min(this.state.ad.vipDiscount || 0, vipB.maxLevel)] ?? 0;
    return Math.max(0.2, (1 - 0.1 * lvl1 - 0.12 * lvl9 - 0.18 * lvl12) * (1 - vipDisc));
  }

  /** Total minion speed multiplier (tossSpeed + tokenUp9 + tokenUp33 + minionRush ad boost) */
  minionSpeedMultiplier(): number {
    const base = UPGRADE_BY_ID.tossSpeed.effect(this.upgradeLevel('tossSpeed'));
    const rushB = AD_BOOST_BY_ID.minionRush;
    const rushBonus = rushB.values[Math.min(this.state.ad.minionRush || 0, rushB.maxLevel)] ?? 0;
    const overdrive =
      1 +
      0.4 * this.tokenUpgradeLevel('tokenUp9') +
      0.75 * this.tokenUpgradeLevel('tokenUp33') +
      rushBonus;
    return Number((base * overdrive).toFixed(2));
  }

  /** Coin speed multiplier from tokenUp2 (x1.5 when unlocked), tokenUp20 (+50%), and coinGravity ad boost */
  coinSpeedTokenMultiplier(): number {
    const adSpeed = this.tokenUpgradeLevel('tokenUp2') > 0 ? 1.5 : 1.0;
    const gravB = AD_BOOST_BY_ID.coinGravity;
    const gravBonus = gravB.values[Math.min(this.state.ad.coinGravity || 0, gravB.maxLevel)] ?? 0;
    const gravitySpeed = 1 + 0.5 * this.tokenUpgradeLevel('tokenUp20') + gravBonus;
    return Number((adSpeed * gravitySpeed).toFixed(2));
  }

  /** Whether the 5-minute x2 Gold ad boost is currently active */
  adX2Active(now = this.clock.now()): boolean {
    return now < (this.state.x2Until || 0);
  }

  adX2RemainingSeconds(now = this.clock.now()): number {
    return Math.max(0, Math.ceil(((this.state.x2Until || 0) - now) / 1000));
  }

  /** Total persistent coins lying on the table */
  coinCount(): number {
    const counts = this.coinCountsByTier();
    let sum = 0;
    for (const tier of COIN_TIERS) {
      sum += counts[tier];
    }
    return sum;
  }

  frenzyActive(now = this.clock.now()): boolean {
    return now < this.state.frenzyUntil;
  }

  goldenHourMultiplier(): number {
    const b = AD_BOOST_BY_ID.goldenHour;
    const level = Math.min(this.state.ad.goldenHour, b.maxLevel);
    return b.values[level] ?? 1;
  }

  tableMultiplier(tableId = this.state.activeTable): number {
    const t = TABLE_BY_ID[tableId];
    const base = t ? t.incomeMult : 1;
    const sov = 1 + 0.75 * this.tokenUpgradeLevel('tokenUp35');
    return base * sov;
  }

  /** Total Rebirth Points owned by the player (unspent + invested in the Rebirth Talent Tree) */
  totalRebirthPoints(): number {
    let spent = 0;
    for (const def of REBIRTH_UPGRADES) {
      spent += this.tokenUpgradeLevel(def.id) * def.tokenCost;
    }
    return (this.state.rebirthPoints || 0) + spent;
  }

  /** Passive income bonus per Rebirth Point (+5% base + +3% tokenUp24 + +5% tokenUp36) */
  rebirthPointPassiveBonus(): number {
    return (
      REBIRTH_PASSIVE_BONUS +
      0.03 * this.tokenUpgradeLevel('tokenUp24') +
      0.05 * this.tokenUpgradeLevel('tokenUp36')
    );
  }

  /** Passive % per Rebirth Point * Midas Mint (tokenUp5) * Starlight (tokenUp32) * Royal (tokenUp10) * Imperial (tokenUp34) * Eternity (tokenUp36) */
  rebirthIncomeMultiplier(): number {
    const passive = 1 + this.rebirthPointPassiveBonus() * this.totalRebirthPoints();
    const midas = 1 + 0.25 * this.tokenUpgradeLevel('tokenUp5');
    const starlight = 1 + 0.8 * this.tokenUpgradeLevel('tokenUp32');
    const royal = 1 + 0.6 * this.tokenUpgradeLevel('tokenUp10');
    const imperial = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp34');
    const eternity = 1 + 1.0 * this.tokenUpgradeLevel('tokenUp36');
    return passive * midas * starlight * royal * imperial * eternity;
  }

  luckyCoinMult(): number {
    return LUCKY_MULT + this.tokenUpgradeLevel('tokenUp6');
  }

  diamondCoinMult(): number {
    return DIAMOND_MULT + 2 * this.tokenUpgradeLevel('tokenUp6');
  }

  edgeCoinMult(): number {
    return EDGE_MULT + 25 * this.tokenUpgradeLevel('tokenUp18');
  }

  echoFlipChance(): number {
    return Math.min(0.5, 0.2 * this.tokenUpgradeLevel('tokenUp7'));
  }

  tripleFlipChance(): number {
    return Math.min(0.4, 0.15 * this.tokenUpgradeLevel('tokenUp17'));
  }

  minionCoinGoldBonus(): number {
    return 1 + 0.6 * this.tokenUpgradeLevel('tokenUp23');
  }

  /** Chance of landing Heads (50% base, up to 85% with Weighted Edge + +10% tokenUp10 + luckyCharm ad boost) */
  headsChance(): number {
    const base = UPGRADE_BY_ID.headsChance.effect(this.upgradeLevel('headsChance'));
    const royalBonus = 0.1 * this.tokenUpgradeLevel('tokenUp10');
    const charmB = AD_BOOST_BY_ID.luckyCharm;
    const charmBonus = charmB.values[Math.min(this.state.ad.luckyCharm || 0, charmB.maxLevel)] ?? 0;
    return Number(Math.min(0.95, base + royalBonus + charmBonus).toFixed(2));
  }

  edgeChance(): number {
    return EDGE_CHANCE * (1 + 1.0 * this.tokenUpgradeLevel('tokenUp10'));
  }

  /** Multiplier from consecutive Heads streak (x1.5 at 2+, x2 at 4+, x3 at 7+, x5 at 10+), boosted by tokenUp14 */
  headsComboMultiplier(): number {
    let base = 1;
    if (this.headsStreak >= 10) base = 5;
    else if (this.headsStreak >= 7) base = 3;
    else if (this.headsStreak >= 4) base = 2;
    else if (this.headsStreak >= 2) base = 1.5;
    if (base <= 1) return 1;
    const mastery = 1 + 0.5 * this.tokenUpgradeLevel('tokenUp14');
    return Number((base * mastery).toFixed(2));
  }

  /** Rolls Heads vs Tails when a coin lands on the table and updates the Heads streak */
  rollHeadsStreak(forceHeads?: boolean): { streak: number; mult: number; isHeads: boolean } {
    const isHeads = forceHeads !== undefined ? forceHeads : this.rng.next() < this.headsChance();
    if (isHeads) {
      this.headsStreak++;
    } else {
      this.headsStreak = 0;
    }
    return {
      streak: this.headsStreak,
      mult: this.headsComboMultiplier(),
      isHeads,
    };
  }

  /**
   * Global income multiplier granted by unlocking new coin tiers:
   * Silver Coin (2,000) -> x5, Gold Coin (50,000) -> x10, etc.
   */
  coinUnlockGlobalMultiplier(): number {
    let mult = 1;
    const counts = this.coinCountsByTier();
    const uidToTier: Partial<Record<UpgradeId, CoinTier>> = {
      silverCoins: 'silver',
      goldCoins: 'gold',
      platinumCoins: 'platinum',
      sapphireCoins: 'sapphire',
      emeraldCoins: 'emerald',
      diamondTierCoins: 'diamond',
    };
    for (const [uid, bonusMult] of Object.entries(COIN_UNLOCK_GLOBAL_MULT) as Array<
      [UpgradeId, number]
    >) {
      const tier = uidToTier[uid];
      const hasCoin = tier ? (counts[tier] ?? 0) >= 1 : false;
      if ((this.upgradeLevel(uid) >= 1 || hasCoin) && bonusMult > 1) {
        mult *= bonusMult;
      }
    }
    return mult;
  }

  /** Whether Alchemy Speed Potion (+10 auto-clicks/sec for 30s) is active */
  alchemySpeedActive(now = this.clock.now()): boolean {
    return now < (this.state.alchemySpeedUntil || 0);
  }

  alchemySpeedRemainingSeconds(now = this.clock.now()): number {
    return Math.max(0, Math.ceil(((this.state.alchemySpeedUntil || 0) - now) / 1000));
  }

  /** Whether Alchemy Golden Elixir (x10 total income for 15s) is active */
  alchemyElixirActive(now = this.clock.now()): boolean {
    return now < (this.state.alchemyElixirUntil || 0);
  }

  alchemyElixirRemainingSeconds(now = this.clock.now()): number {
    return Math.max(0, Math.ceil(((this.state.alchemyElixirUntil || 0) - now) / 1000));
  }

  /**
   * Cost to brew a random potion in the Alchemical Laboratory:
   * Equal to 2 minutes (120s) of average income over the last 10 seconds (minimum 100 gold).
   */
  alchemyBrewCost(now = this.clock.now()): bigint {
    const avg10s = this.averageIncomePerSecond10s(now);
    const cost = avg10s * 120n;
    return cost >= 100n ? cost : 100n;
  }

  canBrewAlchemy(): boolean {
    return this.state.gold >= this.alchemyBrewCost();
  }

  /** Deducts the cost of brewing a potion immediately when starting the flask animation */
  payAlchemyCost(): boolean {
    const cost = this.alchemyBrewCost();
    if (this.state.gold < cost) return false;
    this.state.gold -= cost;
    this.save.mark('gold');
    this.events.emit('state_changed', undefined);
    return true;
  }

  /**
   * Resolves the Alchemical Laboratory potion brew outcome:
   * - 60% -> 'fail' (Experiment Failed, resource burned)
   * - 30% -> 'speed' (Speed Potion: +10 auto-clicks/sec for 30s)
   * - 10% -> 'elixir' (Golden Elixir: x10 global income for 15s)
   */
  rollAlchemyOutcome(now = this.clock.now()): 'fail' | 'speed' | 'elixir' {
    const r = this.rng.next();
    if (r < 0.6) {
      return 'fail';
    }
    if (r < 0.9) {
      const baseUntil = Math.max(this.state.alchemySpeedUntil || 0, now);
      this.state.alchemySpeedUntil = baseUntil + ALCHEMY_SPEED_DURATION * 1000;
      this.save.mark('frenzy');
      this.events.emit('state_changed', undefined);
      return 'speed';
    }
    const baseUntil = Math.max(this.state.alchemyElixirUntil || 0, now);
    this.state.alchemyElixirUntil = baseUntil + ALCHEMY_ELIXIR_DURATION * 1000;
    this.save.mark('frenzy');
    this.events.emit('state_changed', undefined);
    return 'elixir';
  }

  totalMultiplier(tableId = this.state.activeTable, now = this.clock.now()): number {
    const tableM = this.tableMultiplier(tableId);
    const goldenM = this.goldenHourMultiplier();
    const frenzyM = this.frenzyActive(now) ? FRENZY_MULT : 1;
    const x2M = this.adX2Active(now) ? 2 : 1;
    const rebirthM = this.rebirthIncomeMultiplier();
    const comboM = this.headsComboMultiplier();
    const coinUnlockM = this.coinUnlockGlobalMultiplier();
    const elixirM = this.alchemyElixirActive(now) ? ALCHEMY_ELIXIR_MULT : 1;
    return tableM * goldenM * frenzyM * x2M * rebirthM * comboM * coinUnlockM * elixirM;
  }

  diamondChance(): number {
    const b = AD_BOOST_BY_ID.diamondCoins;
    const level = Math.min(this.state.ad.diamondCoins, b.maxLevel);
    const base = b.values[level] ?? 0;
    const fever = 0.06 * this.tokenUpgradeLevel('tokenUp21');
    return Math.min(0.6, base + fever);
  }

  luckyChance(): number {
    const base = UPGRADE_BY_ID.luckyCoin.effect(this.upgradeLevel('luckyCoin'));
    const bonus = 0.05 * this.tokenUpgradeLevel('tokenUp6');
    const charmB = AD_BOOST_BY_ID.luckyCharm;
    const charmBonus = charmB.values[Math.min(this.state.ad.luckyCharm || 0, charmB.maxLevel)] ?? 0;
    return Math.min(0.65, base + bonus + charmBonus);
  }

  magnetExtra(): number {
    const b = AD_BOOST_BY_ID.magnetTouch;
    const level = Math.min(this.state.ad.magnetTouch, b.maxLevel);
    return (b.values[level] ?? 0) + this.tokenUpgradeLevel('tokenUp13');
  }

  multiChance(): number {
    return Math.min(0.5, 0.05 * this.upgradeLevel('multiToss'));
  }

  /**
   * Calculates income for a single coin according to ECONOMY_SPEC §2:
   * coinGold = max(1, floor(coinBase * multiplier * specialCoinFactor))
   */
  calcCoinValue(
    kind: CoinKind,
    tableId = this.state.activeTable,
    tier: CoinTier = 'bronze',
  ): bigint {
    const base = this.coinBase(tier);
    const mult = this.totalMultiplier(tableId);
    const specialFactor =
      kind === 3
        ? this.edgeCoinMult()
        : kind === 2
          ? this.diamondCoinMult()
          : kind === 1
            ? this.luckyCoinMult()
            : 1;
    const gold = Math.max(1, Math.floor(base * mult * specialFactor));
    return BigInt(gold);
  }

  /** Auto tosses per second: 1st auto-helper brings 1 coin/sec base rate */
  autoRate(): number {
    const tosserCount = this.totalMinionCount();
    const megaRate = this.megaMinionCount() * 0.2 * Math.max(1, this.coinCount());
    return tosserCount * 1.0 * this.minionSpeedMultiplier() + megaRate;
  }

  /** Average base coin value across coins that minions are able to toss */
  private avgMinionCoinBase(): number {
    const counts = this.coinCountsByTier();
    const maxTier = this.minionMaxTier();
    let total = 0;
    let weighted = 0;
    for (let i = 0; i < COIN_TIERS.length; i++) {
      if (i > maxTier) break;
      const tier = COIN_TIERS[i];
      const count = counts[tier];
      total += count;
      weighted += count * this.coinBase(tier);
    }
    if (total <= 0) return this.coinBase('bronze');
    return weighted / total;
  }

  /** Expected income per second from helpers on the active table (used for offline & Time Warp) */
  autoIncomePerSecond(tableId = this.state.activeTable): number {
    const rate = this.autoRate();
    if (rate <= 0) return 0;
    const base = this.avgMinionCoinBase();
    const mult = this.totalMultiplier(tableId, this.clock.now()) * this.minionCoinGoldBonus();
    const dProb = this.diamondChance();
    const lProb = this.luckyChance();
    const factor =
      (1 - dProb - lProb) * 1 +
      lProb * (1 - dProb) * this.luckyCoinMult() +
      dProb * this.diamondCoinMult();
    const echoMult = 1 + this.echoFlipChance() + 2 * this.tripleFlipChance();
    const avgCoin = Math.max(1, base * mult * Math.max(1, factor) * echoMult);
    return rate * avgCoin;
  }

  /**
   * Real measured income per second calculated directly from the coins that actually paid out gold
   * over a rolling 3-second window (shown on HUD).
   */
  actualIncomePerSecond(now = this.clock.now()): bigint {
    this.pruneCoinPayouts(now);
    const cutoff3s = now - 3000;
    let sum = 0n;
    let count = 0;
    for (let i = 0; i < this.recentCoinPayouts.length; i++) {
      if (this.recentCoinPayouts[i].time >= cutoff3s) {
        sum += this.recentCoinPayouts[i].amount;
        count++;
      }
    }
    if (count === 0) return 0n;
    const perSec = sum / 3n;
    return perSec > 0n ? perSec : 1n;
  }

  /**
   * Real measured average income per second over the last 10 seconds (10,000 ms).
   * Used for Time Warp (10 minutes of income) and Alchemical Laboratory brew cost.
   */
  averageIncomePerSecond10s(now = this.clock.now()): bigint {
    this.pruneCoinPayouts(now);
    let sum = 0n;
    for (let i = 0; i < this.recentCoinPayouts.length; i++) {
      sum += this.recentCoinPayouts[i].amount;
    }
    if (sum > 0n) {
      const perSec = sum / 10n;
      return perSec > 0n ? perSec : 1n;
    }
    // Fallback if no coins have been tossed in the last 10 seconds
    const baseCoin = this.calcCoinValue(0, this.state.activeTable, 'bronze');
    const helpers = BigInt(Math.max(1, this.totalMinionCount()));
    return baseCoin * helpers;
  }

  /**
   * Detailed income statistics for each unlocked/active coin tier on the table:
   * - count: number of coins of this tier currently on the table
   * - singleValue: gold value of 1 normal coin toss of this tier
   * - perCoinPerSec: gold/sec brought by 1 coin of this tier (value * fallSpeed * expected special mult)
   * - totalTierPerSec: gold/sec brought by all coins of this tier on the table
   * - actualPerSec10s: real measured gold/sec from this coin tier over the last 10 seconds
   * - estimatedAutoPerSec: estimated passive gold/sec from minions for this coin tier
   */
  coinTierStats(now = this.clock.now()): CoinTierStat[] {
    this.pruneCoinPayouts(now);
    const counts = this.coinCountsByTier();
    const fallSpeeds = this.fallSpeedByTier();
    const sumByTier = {} as Record<CoinTier, bigint>;
    for (const tier of COIN_TIERS) {
      sumByTier[tier] = 0n;
    }
    for (let i = 0; i < this.recentCoinPayouts.length; i++) {
      const p = this.recentCoinPayouts[i];
      sumByTier[p.tier] = (sumByTier[p.tier] ?? 0n) + p.amount;
    }

    const maxMinionIdx = this.minionMaxTier();
    let totalMinionEligibleCoins = 0;
    for (let i = 0; i < COIN_TIERS.length; i++) {
      if (i <= maxMinionIdx) {
        totalMinionEligibleCoins += counts[COIN_TIERS[i]] ?? 0;
      }
    }

    const effectiveMinionTossRate = this.autoRate();
    const dProb = this.diamondChance();
    const lProb = this.luckyChance();
    const specialFactor = Math.max(
      1,
      (1 - dProb - lProb) * 1 +
        lProb * (1 - dProb) * this.luckyCoinMult() +
        dProb * this.diamondCoinMult(),
    );
    const echoMult = 1 + this.echoFlipChance() + 2 * this.tripleFlipChance();

    const unlockUidByTier: Partial<Record<CoinTier, UpgradeId>> = {
      silver: 'silverCoins',
      gold: 'goldCoins',
      platinum: 'platinumCoins',
      sapphire: 'sapphireCoins',
      emerald: 'emeraldCoins',
      diamond: 'diamondTierCoins',
      ruby: 'rubyCoins',
      amethyst: 'amethystCoins',
      obsidian: 'obsidianCoins',
      mythril: 'mythrilCoins',
      astral: 'astralCoins',
      solar: 'solarCoins',
      celestial: 'celestialCoins',
    };

    const out: CoinTierStat[] = [];
    for (let idx = 0; idx < COIN_TIERS.length; idx++) {
      const tier = COIN_TIERS[idx];
      const count = counts[tier] ?? 0;
      const uid = unlockUidByTier[tier];
      const isUnlocked =
        tier === 'bronze' ||
        count > 0 ||
        sumByTier[tier] > 0n ||
        (uid ? this.upgradeLevel(uid) >= 1 : false);
      if (!isUnlocked) continue;

      const singleValue = this.calcCoinValue(0, this.state.activeTable, tier);
      const fallSpeed = fallSpeeds[tier] ?? 1;
      const perCoinNum = Number(singleValue) * fallSpeed * specialFactor * echoMult;
      const perCoinPerSec =
        Number.isFinite(perCoinNum) && perCoinNum >= 1
          ? BigInt(Math.max(1, Math.round(perCoinNum)))
          : singleValue;
      const totalTierPerSec = count > 0 ? perCoinPerSec * BigInt(count) : 0n;

      let estimatedAutoPerSec = 0n;
      if (
        count > 0 &&
        idx <= maxMinionIdx &&
        totalMinionEligibleCoins > 0 &&
        effectiveMinionTossRate > 0
      ) {
        const tierTossesPerSec = effectiveMinionTossRate * (count / totalMinionEligibleCoins);
        const estNum =
          Number(singleValue) *
          tierTossesPerSec *
          this.minionCoinGoldBonus() *
          specialFactor *
          echoMult;
        if (Number.isFinite(estNum) && estNum > 0) {
          estimatedAutoPerSec = BigInt(Math.max(1, Math.round(estNum)));
        }
      }

      const raw10s = sumByTier[tier] / 10n;
      const actualPerSec10s =
        sumByTier[tier] > 0n ? (raw10s > 0n ? raw10s : 1n) : estimatedAutoPerSec;

      out.push({
        tier,
        count,
        singleValue,
        perCoinPerSec,
        totalTierPerSec,
        actualPerSec10s,
        estimatedAutoPerSec,
      });
    }
    return out;
  }

  private pruneCoinPayouts(now = this.clock.now()): void {
    const cutoff10s = now - 10000;
    while (this.recentCoinPayouts.length > 0 && this.recentCoinPayouts[0].time < cutoff10s) {
      this.recentCoinPayouts.shift();
    }
  }

  private recordCoinPayout(
    amount: bigint,
    now = this.clock.now(),
    tier: CoinTier = 'bronze',
  ): void {
    if (amount <= 0n) return;
    this.pruneCoinPayouts(now);
    this.recentCoinPayouts.push({ time: now, amount, tier });
    if (this.recentCoinPayouts.length > 512) {
      this.recentCoinPayouts.shift();
    }
  }

  // ---------- Toss Roll ----------

  rollCoinKind(): CoinKind {
    const rDiamond = this.rng.next();
    const isDiamond = rDiamond < this.diamondChance();
    const isEdge = rDiamond >= 1 - this.edgeChance();
    const rLucky = this.rng.next();
    const isLucky = rLucky < this.luckyChance();

    if (isEdge) return 3; // Rare Edge landing (x25+)
    if (isDiamond) return 2; // Diamond has priority over Lucky
    if (isLucky) return 1;
    return 0;
  }

  /**
   * Called when a 3D Helper (Minion) reaches a resting coin on the table and tosses it.
   */
  helperTossCoin(tier: CoinTier = 'bronze'): TossedCoin {
    const kind = this.rollCoinKind();
    let value = this.calcCoinValue(kind, this.state.activeTable, tier);
    const minionBonus = this.minionCoinGoldBonus();
    if (minionBonus > 1.001) {
      value = BigInt(Math.max(1, Math.floor(Number(value) * minionBonus)));
    }
    if (this.tripleFlipChance() > 0 && this.rng.next() < this.tripleFlipChance()) {
      value *= 3n;
    } else if (this.echoFlipChance() > 0 && this.rng.next() < this.echoFlipChance()) {
      value *= 2n;
    }
    this.recordCoinPayout(value, this.clock.now(), tier);
    this.addGold(value, 'auto');
    const coin: TossedCoin = { value, kind, tier };
    this.events.emit('coin_tossed', {
      coin,
      source: 'auto',
      tableId: this.state.activeTable,
    });
    return coin;
  }

  /**
   * Called when a Heavy Minion (megaMinion) slams the table every 5 seconds,
   * tossing all resting coins at once in a single batched payout.
   */
  megaMinionSlam(tiers?: CoinTier[], now = this.clock.now()): TossedCoin[] {
    let targetTiers = tiers;
    if (!targetTiers) {
      targetTiers = [];
      const counts = this.coinCountsByTier();
      for (const tier of COIN_TIERS) {
        for (let k = 0; k < counts[tier]; k++) {
          targetTiers.push(tier);
        }
      }
    }
    if (targetTiers.length === 0) return [];

    const coins: TossedCoin[] = [];
    let batchGold = 0n;
    const minionBonus = this.minionCoinGoldBonus();
    const tripleCh = this.tripleFlipChance();
    const echoCh = this.echoFlipChance();

    for (let i = 0; i < targetTiers.length; i++) {
      const tier = targetTiers[i];
      const kind = this.rollCoinKind();
      let value = this.calcCoinValue(kind, this.state.activeTable, tier);
      if (minionBonus > 1.001) {
        value = BigInt(Math.max(1, Math.floor(Number(value) * minionBonus)));
      }
      if (tripleCh > 0 && this.rng.next() < tripleCh) {
        value *= 3n;
      } else if (echoCh > 0 && this.rng.next() < echoCh) {
        value *= 2n;
      }
      batchGold += value;
      this.recordCoinPayout(value, now, tier);
      coins.push({ value, kind, tier });
    }

    if (batchGold > 0n) {
      this.addGold(batchGold, 'auto');
    }
    return coins;
  }

  /**
   * Tap action. Rate limited for hold-down auto tap (max 8 taps/sec per AC-GAME-2),
   * or bypassRateLimit = true when swiping across the table felt.
   * @param maxAvailable Optional cap of resting coins currently available on the 3D table.
   * @param tiers Optional list of coin tiers being tossed.
   * @param bypassRateLimit When true (Swipe-to-Flip), skips the stationary hold rate limit.
   */
  tap(
    now = this.clock.now(),
    maxAvailable?: number,
    tiers?: CoinTier[],
    bypassRateLimit = false,
  ): TossedCoin[] | null {
    const minInterval = 1000 / AUTO_TAP_PER_SEC;
    if (!bypassRateLimit && this.lastTapTime > 0 && now - this.lastTapTime < minInterval) {
      return null;
    }
    if (maxAvailable !== undefined && maxAvailable <= 0) {
      return null;
    }
    if (!bypassRateLimit) {
      this.lastTapTime = now;
    }
    this.state.stats.taps++;
    this.save.mark('stats');

    const desiredCoins = 1 + this.magnetExtra();
    const totalCoins =
      maxAvailable !== undefined ? Math.min(desiredCoins, maxAvailable) : desiredCoins;
    const coins: TossedCoin[] = [];
    let batchGold = 0n;
    const tripleCh = this.tripleFlipChance();
    const echoCh = this.echoFlipChance();

    for (let i = 0; i < totalCoins; i++) {
      const tier = tiers?.[i] ?? this.claimCoinTierForToss(now, COIN_TIERS.length - 1);
      const kind = this.rollCoinKind();
      let value = this.calcCoinValue(kind, this.state.activeTable, tier);
      if (tripleCh > 0 && this.rng.next() < tripleCh) {
        value *= 3n;
      } else if (echoCh > 0 && this.rng.next() < echoCh) {
        value *= 2n;
      }
      const coin: TossedCoin = { value, kind, tier };
      coins.push(coin);
      batchGold += value;
      this.recordCoinPayout(value, now, tier);
      this.events.emit('coin_tossed', {
        coin,
        source: 'tap',
        tableId: this.state.activeTable,
      });
    }

    if (batchGold > 0n) {
      this.addGold(batchGold, 'tap');
    }

    return coins;
  }

  /**
   * Claims the random Golden Relic (Mega-Coin) on the table:
   * Awards +2 minutes of average income over the last 10s (boosted by tokenUp19 Relic Hunter) and 15+ seconds of free Frenzy x5!
   */
  claimGoldenRelic(now = this.clock.now()): bigint {
    const avg10s = this.averageIncomePerSecond10s(now);
    const relicMult = Math.round((1 + 1.5 * this.tokenUpgradeLevel('tokenUp19')) * 100);
    const rawReward = (avg10s * 120n * BigInt(relicMult)) / 100n;
    const reward = rawReward >= 50n ? rawReward : 50n;
    this.addGold(reward, 'relic');
    const frenzySec = 15 + 10 * this.tokenUpgradeLevel('tokenUp19');
    const baseUntil = Math.max(this.state.frenzyUntil, now);
    this.state.frenzyUntil = baseUntil + frenzySec * 1000;
    this.save.mark('frenzy');
    this.events.emit('frenzy_activated', { until: this.state.frenzyUntil });
    return reward;
  }

  addGold(amount: bigint, source = 'income'): void {
    if (amount <= 0n) return;
    this.state.gold += amount;
    this.state.totalEarned += amount;
    this.state.runEarned = (this.state.runEarned ?? 0n) + amount;
    this.save.mark('gold', 'totalEarned', 'ad');
    this.checkAchievements();
    this.events.emit('gold_added', { amount, source });
    this.events.emit('state_changed', undefined);
  }

  // ---------- Game Step / Tick ----------

  private tierFlightReadyAt: Partial<Record<CoinTier, number[]>> = {};

  /**
   * Selects a resting coin on the table to toss, respecting physical flight duration (~950ms / fallSpeed)
   * per coin on the table. Falls back to bronze if all coins are mid-air.
   */
  private claimCoinTierForToss(nowMs: number, maxTierCap: number): CoinTier {
    const counts = this.coinCountsByTier();
    const fallSpeeds = this.fallSpeedByTier();
    const maxIdx = Math.min(COIN_TIERS.length - 1, maxTierCap);

    for (let idx = maxIdx; idx >= 0; idx--) {
      const tier = COIN_TIERS[idx];
      const count = counts[tier] ?? 0;
      if (count <= 0) continue;

      // Rebirth coin tiers (idx >= 7: ruby..celestial) require unlocking the preceding tier in the current run (or upgrading/fusing this tier)
      if (
        idx >= 7 &&
        this.upgradeLevel(`${tier}Coins` as UpgradeId) < 1 &&
        (this.state.coinDelta?.[tier] ?? 0) <= 0
      ) {
        const prevTier = COIN_TIERS[idx - 1];
        const prevUid: UpgradeId =
          prevTier === 'diamond' ? 'diamondTierCoins' : (`${prevTier}Coins` as UpgradeId);
        if (this.upgradeLevel(prevUid) < 1) {
          continue;
        }
      }

      let slots = this.tierFlightReadyAt[tier];
      if (!slots) {
        slots = [];
        this.tierFlightReadyAt[tier] = slots;
      }
      while (slots.length < count) {
        slots.push(0);
      }

      const flightMs = Math.max(120, Math.round(950 / (fallSpeeds[tier] ?? 1)));
      for (let s = 0; s < count; s++) {
        if ((slots[s] ?? 0) <= nowMs) {
          slots[s] = nowMs + flightMs;
          return tier;
        }
      }
    }
    return 'bronze';
  }

  step(dtSeconds: number): void {
    if (dtSeconds <= 0 || this.sceneDrivenHelpers) return;

    const rate = this.autoRate();
    if (rate > 0) {
      this.autoAccumulator += rate * dtSeconds;
      const count = Math.floor(this.autoAccumulator + 1e-9);
      if (count > 0) {
        this.autoAccumulator = Math.max(0, this.autoAccumulator - count);
        const now = this.clock.now();
        const maxMinionIdx = this.minionMaxTier();
        for (let i = 0; i < count; i++) {
          const tier = this.claimCoinTierForToss(now, maxMinionIdx);
          this.helperTossCoin(tier);
        }
      }
      if (this.autoAccumulator > 100) this.autoAccumulator = 100;
    }
  }

  // ---------- Purchases (Upgrades) ----------

  costForLevel(uid: UpgradeId, level = this.upgradeLevel(uid)): bigint {
    const def = UPGRADE_BY_ID[uid];
    if (level >= def.maxLevel) return 0n;

    let raw: bigint;
    if (uid === 'minionTier') {
      // Teaching minions to toss the next coin tier (level 0=Silver .. level 12=Celestial)
      // scales directly with 1.5x the unlock cost of that coin tier!
      const tierUnlockIds: UpgradeId[] = [
        'silverCoins',
        'goldCoins',
        'platinumCoins',
        'sapphireCoins',
        'emeraldCoins',
        'diamondTierCoins',
        'rubyCoins',
        'amethystCoins',
        'obsidianCoins',
        'mythrilCoins',
        'astralCoins',
        'solarCoins',
        'celestialCoins',
      ];
      const targetUid = tierUnlockIds[Math.min(level, tierUnlockIds.length - 1)];
      const targetBase = UPGRADE_BY_ID[targetUid]?.baseCost ?? def.baseCost;
      const priceNum = Math.floor(targetBase * 1.5);
      raw = BigInt(Math.max(1, priceNum));
    } else if (uid === 'autoTosser') {
      // Progressive minion hiring cost: 60 -> 600 -> 2,500 -> 12K -> 28.8K -> ... -> 183M
      if (level === 0) {
        raw = 60n;
      } else if (level === 1) {
        raw = 600n;
      } else if (level === 2) {
        raw = 2500n;
      } else {
        const priceNum = Math.floor(12000 * Math.pow(2.4, level - 3));
        raw = BigInt(Math.max(1, priceNum));
      }
    } else if (uid === 'tossSpeed' && level >= 1) {
      const priceNum = Math.floor(def.baseCost * Math.pow(1.75, level));
      raw = BigInt(Math.max(1, priceNum));
    } else {
      raw = upgradeCost(def, level);
    }

    if (raw <= 0n) return 0n;
    const disc = this.shopDiscountMultiplier();
    if (disc >= 0.999) return raw;
    const discBps = BigInt(Math.max(1, Math.round(disc * 1000)));
    const discounted = (raw * discBps) / 1000n;
    return discounted > 0n ? discounted : 1n;
  }

  /**
   * Quotes purchase according to AC-ECO-3 (modes x1, x10, max)
   */
  quoteUpgrade(uid: UpgradeId, mode: BuyMode): { count: number; totalCost: bigint } {
    if (!this.isUpgradeUnlocked(uid)) {
      return { count: 0, totalCost: 0n };
    }
    const def = UPGRADE_BY_ID[uid];
    let currentLevel = this.upgradeLevel(uid);
    if (currentLevel >= def.maxLevel) {
      return { count: 0, totalCost: 0n };
    }

    const effectiveMode: BuyMode = uid === 'minionTier' ? 1 : mode;
    const want = effectiveMode === 'max' ? 1000 : effectiveMode;
    let count = 0;
    let totalCost = 0n;
    let budget = this.state.gold;

    while (count < want && currentLevel < def.maxLevel) {
      const p = this.costForLevel(uid, currentLevel);
      if (effectiveMode === 'max' && p > budget) break;
      if (effectiveMode !== 'max' && totalCost + p > this.state.gold) break;

      totalCost += p;
      if (effectiveMode === 'max') budget -= p;
      currentLevel++;
      count++;
    }

    if (effectiveMode !== 'max' && count < effectiveMode) {
      // Cannot afford full batch in x1 / x10 mode
      return { count: 0, totalCost: 0n };
    }

    return { count, totalCost };
  }

  buyUpgrade(uid: UpgradeId, mode: BuyMode): boolean {
    const q = this.quoteUpgrade(uid, mode);
    if (q.count === 0 || q.totalCost <= 0n || q.totalCost > this.state.gold) {
      return false;
    }

    this.state.gold -= q.totalCost;
    // Set level on all tables (global upgrades)
    for (const t of TABLES) {
      this.state.tables[t.id][uid] += q.count;
    }
    this.save.mark('gold', 'tables');
    this.checkAchievements();

    const newLevel = this.upgradeLevel(uid);
    this.events.emit('upgrade_purchased', {
      upgradeId: uid,
      count: q.count,
      newLevel,
      cost: q.totalCost,
    });
    this.events.emit('state_changed', undefined);
    return true;
  }

  // ---------- Tables ----------

  isTableUnlocked(tableId: string): boolean {
    return this.state.unlocked.includes(tableId);
  }

  tableUnlockCost(tableId: string): bigint {
    const def = TABLE_BY_ID[tableId];
    if (!def || def.unlockCost <= 0) return 0n;
    const disc = Math.max(0.4, 1 - 0.35 * this.tokenUpgradeLevel('tokenUp15'));
    return BigInt(Math.max(1, Math.floor(def.unlockCost * disc)));
  }

  unlockTable(tableId: string): boolean {
    const def = TABLE_BY_ID[tableId];
    if (!def || this.isTableUnlocked(tableId)) return false;

    const cost = this.tableUnlockCost(tableId);
    if (this.state.gold < cost) return false;

    this.state.gold -= cost;
    this.state.unlocked.push(tableId);
    this.save.mark('gold', 'unlocked');
    this.checkAchievements();

    this.events.emit('table_unlocked', { tableId, cost });
    this.events.emit('state_changed', undefined);
    return true;
  }

  setActiveTable(tableId: string): boolean {
    if (!this.isTableUnlocked(tableId) || tableId === this.state.activeTable) {
      return false;
    }
    this.state.activeTable = tableId;
    this.autoAccumulator = 0;
    this.save.mark('activeTable');

    this.events.emit('table_switched', { tableId });
    this.events.emit('state_changed', undefined);
    return true;
  }

  calcBuyInfo(
    uid: UpgradeId,
    mode: 'x1' | 'x10' | 'max',
  ): { count: number; totalCost: bigint; displayCost: bigint } {
    const effectiveMode = uid === 'minionTier' ? 'x1' : mode;
    const buyMode: BuyMode = effectiveMode === 'x1' ? 1 : effectiveMode === 'x10' ? 10 : 'max';
    const q = this.quoteUpgrade(uid, buyMode);
    if (q.count > 0 && q.totalCost > 0n) {
      return { count: q.count, totalCost: q.totalCost, displayCost: q.totalCost };
    }

    // Even when unaffordable, always compute and show the actual price of the next level(s)
    const def = UPGRADE_BY_ID[uid];
    const curLevel = this.upgradeLevel(uid);
    if (curLevel >= def.maxLevel) {
      return { count: 0, totalCost: 0n, displayCost: 0n };
    }
    const targetCount = effectiveMode === 'x10' ? Math.min(10, def.maxLevel - curLevel) : 1;
    let displayCost = 0n;
    for (let i = 0; i < targetCount; i++) {
      displayCost += this.costForLevel(uid, curLevel + i);
    }
    return { count: 0, totalCost: 0n, displayCost };
  }

  /**
   * Time Warp Reward: 10 minutes (600 seconds) of the real average income per second
   * measured over the last 10 seconds!
   */
  calcTimeWarpReward(now = this.clock.now()): bigint {
    const avgPerSec10s = this.averageIncomePerSecond10s(now);
    return avgPerSec10s * 600n;
  }

  // ---------- Ad Boosts (Rewarded) ----------

  adBoostLevel(id: AdBoostId): number {
    return this.state.ad[id] ?? 0;
  }

  grantReward(id: AdBoostId, now = this.clock.now()): boolean {
    const def = AD_BOOST_BY_ID[id];
    if (!def) return false;

    if (id === 'timeWarp') {
      const instant = this.calcTimeWarpReward(now);
      this.addGold(instant, 'time_warp');
      this.state.ad.timeWarp++;
    } else if (id === 'frenzy') {
      this.state.ad.frenzy = 1;
      this.state.frenzyUntil = now + FRENZY_DURATION * 1000;
      this.state.frenzyReadyAt = this.state.frenzyUntil + FRENZY_COOLDOWN * 1000;
      this.save.mark('frenzy');
      this.events.emit('frenzy_activated', { until: this.state.frenzyUntil });
    } else {
      if (this.state.ad[id] >= def.maxLevel) return false;
      this.state.ad[id]++;
    }

    this.state.stats.rewarded++;
    this.save.mark('ad', 'stats');

    this.events.emit('ad_boost_granted', { boostId: id, newLevel: this.state.ad[id] });
    this.events.emit('state_changed', undefined);
    return true;
  }

  activateFrenzy(now = this.clock.now()): boolean {
    if (this.state.ad.frenzy < 1) return false;
    if (this.frenzyActive(now)) return false;
    if (now < this.state.frenzyReadyAt) return false;

    this.state.frenzyUntil = now + FRENZY_DURATION * 1000;
    this.state.frenzyReadyAt = this.state.frenzyUntil + FRENZY_COOLDOWN * 1000;
    this.save.mark('frenzy');

    this.events.emit('frenzy_activated', { until: this.state.frenzyUntil });
    this.events.emit('state_changed', undefined);
    return true;
  }

  frenzyCooldownSeconds(now = this.clock.now()): number {
    return Math.max(0, Math.ceil((this.state.frenzyReadyAt - now) / 1000));
  }

  // ---------- Rebirth & Token Branch (Overlay Popup) ----------

  rebirthProgress(): RebirthProgress {
    return calcRebirthProgress(this.state.runEarned ?? 0n, this.totalRebirthPoints());
  }

  /**
   * Checks whether a Rebirth Talent Tree node is unlocked (either root node, or at least one prerequisite is >= level 1).
   */
  isRebirthNodeUnlocked(
    id: TokenUpgradeId,
    draft?: Partial<Record<TokenUpgradeId, number>>,
  ): boolean {
    const def = TOKEN_UPGRADE_BY_ID[id];
    if (!def?.requires || def.requires.length === 0) return true;
    return def.requires.some((reqId) => this.tokenUpgradeLevel(reqId) + (draft?.[reqId] || 0) >= 1);
  }

  /**
   * Executes a Rebirth: applies chosen Rebirth Talent Tree allocations from accumulated Rebirth Points
   * in tier order (Tier 1 -> Tier 7), stores any unspent points in rebirthPoints,
   * increments rebirth counter, resets current run gold, tables, and upgrades, and applies Head Start / Starting Capital perks.
   */
  performRebirth(allocations?: Partial<Record<TokenUpgradeId, number>>): number {
    const prog = this.rebirthProgress();
    if (prog.pendingPoints <= 0) return 0;

    const gained = prog.pendingPoints;
    let pool = (this.state.rebirthPoints || 0) + gained;

    if (allocations) {
      for (const def of REBIRTH_UPGRADES) {
        const id = def.id;
        const rawCount = allocations[id];
        if (!rawCount || rawCount <= 0) continue;
        if (!this.isRebirthNodeUnlocked(id)) continue;

        const cur = this.tokenUpgradeLevel(id);
        const maxAdd = Math.max(0, def.maxLevel - cur);
        const want = Math.min(maxAdd, Math.max(0, Math.floor(rawCount || 0)));
        for (let k = 0; k < want; k++) {
          if (pool >= def.tokenCost) {
            pool -= def.tokenCost;
            this.state.tokenUpgrades[id] = (this.state.tokenUpgrades[id] || 0) + 1;
          }
        }
      }
    }

    this.state.rebirthPoints = pool;
    this.state.rebirths = (this.state.rebirths || 0) + 1;
    const startGold = BigInt(this.tokenUpgradeLevel('tokenUp11') * 1000);
    this.state.gold = startGold;
    this.state.runEarned = 0n;
    this.state.unlocked = [TABLES[0].id];
    this.state.activeTable = TABLES[0].id;
    this.state.coinDelta = {};

    const hsLvl = this.tokenUpgradeLevel('tokenUp8');
    for (const t of TABLES) {
      const lvls = emptyLevels();
      if (hsLvl > 0) {
        lvls.multiToss = hsLvl * 2;
        lvls.autoTosser = hsLvl;
      }
      this.state.tables[t.id] = lvls;
    }

    this.autoAccumulator = 0;
    this.recentCoinPayouts = [];
    this.tierFlightReadyAt = {};
    this.save.markAll();
    this.events.emit('table_switched', { tableId: TABLES[0].id });
    this.events.emit('state_changed', undefined);
    return gained;
  }

  grantAdToken(amount = 1): number {
    this.state.tokens = Math.max(0, (this.state.tokens || 0) + amount);
    this.state.stats.rewarded++;
    this.save.mark('ad', 'stats');
    this.events.emit('state_changed', undefined);
    return this.state.tokens;
  }

  tokenUpgradeLevel(id: TokenUpgradeId): number {
    return this.state.tokenUpgrades?.[id] ?? 0;
  }

  buyTokenUpgrade(id: TokenUpgradeId): boolean {
    const def = TOKEN_UPGRADE_BY_ID[id];
    if (!def || def.isAdBoost) return false;
    const cur = this.tokenUpgradeLevel(id);
    if (cur >= def.maxLevel) return false;

    const isRebirthPerk = REBIRTH_UPGRADES.some((u) => u.id === id);
    if (isRebirthPerk && !this.isRebirthNodeUnlocked(id)) {
      return false;
    }

    if (isRebirthPerk && (this.state.rebirthPoints || 0) >= def.tokenCost) {
      this.state.rebirthPoints -= def.tokenCost;
    } else if ((this.state.tokens || 0) >= def.tokenCost) {
      this.state.tokens -= def.tokenCost;
    } else {
      return false;
    }

    const nextLvl = cur + 1;
    this.state.tokenUpgrades[id] = nextLvl;

    if (id === 'tokenUp8') {
      for (const t of TABLES) {
        this.state.tables[t.id].multiToss = Math.max(
          this.state.tables[t.id].multiToss ?? 0,
          nextLvl * 2,
        );
        this.state.tables[t.id].autoTosser = Math.max(
          this.state.tables[t.id].autoTosser ?? 0,
          nextLvl,
        );
      }
      this.save.mark('tables');
    } else if (id === 'tokenUp11') {
      this.state.gold += 1000n;
      this.save.mark('gold');
    }

    this.save.mark('ad');
    this.events.emit('state_changed', undefined);
    return true;
  }

  activateAdX2(now = this.clock.now()): number {
    const baseTime = Math.max(now, this.state.x2Until || 0);
    this.state.x2Until = baseTime + AD_X2_DURATION * 1000;
    this.state.stats.rewarded++;
    this.save.mark('frenzy', 'stats');
    this.events.emit('state_changed', undefined);
    return this.state.x2Until;
  }

  // ---------- Achievements Branch (Every 5 completed -> +1 Token) ----------

  checkAchievements(): { newlyUnlocked: AchievementId[]; tokensAwarded: number } {
    if (!Array.isArray(this.state.achievements)) {
      this.state.achievements = [];
    }
    const unlockedSet = new Set<AchievementId>(this.state.achievements);
    const newlyUnlocked: AchievementId[] = [];

    for (const ach of ACHIEVEMENTS) {
      if (unlockedSet.has(ach.id)) continue;
      if (ach.evaluate(this.state).done) {
        this.state.achievements.push(ach.id);
        unlockedSet.add(ach.id);
        newlyUnlocked.push(ach.id);
      }
    }

    if (newlyUnlocked.length === 0) {
      return { newlyUnlocked, tokensAwarded: 0 };
    }

    const totalCompleted = this.state.achievements.length;
    const deservedTokens = Math.floor(totalCompleted / ACHIEVEMENTS_PER_TOKEN);
    const claimed = this.state.achTokensClaimed || 0;
    const tokensAwarded = Math.max(0, deservedTokens - claimed);

    if (tokensAwarded > 0) {
      this.state.tokens = (this.state.tokens || 0) + tokensAwarded;
      this.state.achTokensClaimed = deservedTokens;
    }

    this.save.mark('ad');
    for (let i = 0; i < newlyUnlocked.length; i++) {
      this.events.emit('achievement_unlocked', {
        achievementId: newlyUnlocked[i],
        tokensAwarded: i === newlyUnlocked.length - 1 ? tokensAwarded : 0,
      });
    }

    return { newlyUnlocked, tokensAwarded };
  }

  // ---------- Offline Earnings according to ECONOMY_SPEC §6 ----------

  calculateOffline(now = this.clock.now()): OfflineResult | null {
    const last = this.state.lastSeen;
    if (!last || now <= last) return null;

    const elapsed = (now - last) / 1000;
    if (elapsed < 30) return null; // Minimum 30s away per ECONOMY_SPEC §6

    const vaultLevel = this.upgradeLevel('offlineVault');
    const dynamoLvl = this.tokenUpgradeLevel('tokenUp22');
    const capHours = 4 + 0.5 * vaultLevel + 6 * dynamoLvl;
    const efficiency = offlineEfficiency(vaultLevel) * (1 + 0.75 * dynamoLvl);

    const effectiveSeconds = Math.min(elapsed, capHours * 3600);
    const ips = this.autoIncomePerSecond();
    const earned = BigInt(Math.floor(ips * effectiveSeconds * efficiency));

    if (earned < 1n) return null;

    return {
      seconds: elapsed,
      earned,
      capHours,
      efficiency,
    };
  }

  collectOffline(multiplier = 1, precalculated?: OfflineResult | null): bigint {
    const offline = precalculated !== undefined ? precalculated : this.calculateOffline();
    if (!offline || offline.earned <= 0n) return 0n;

    const amount = offline.earned * BigInt(multiplier);
    this.addGold(amount, 'offline');
    this.state.lastSeen = this.clock.now();
    this.save.mark('lastSeen');
    return amount;
  }
}
