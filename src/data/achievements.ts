import { formatBig } from '../core/bignum';
import type { GameState } from '../core/save';
import type { IconName, UpgradeId } from './upgrades';

export type AchievementId =
  | 'ach_bronze_5'
  | 'ach_silver_1'
  | 'ach_gold_1'
  | 'ach_platinum_1'
  | 'ach_sapphire_1'
  | 'ach_emerald_1'
  | 'ach_diamond_1'
  | 'ach_earn_100'
  | 'ach_earn_1k'
  | 'ach_earn_10k'
  | 'ach_earn_100k'
  | 'ach_earn_1m'
  | 'ach_earn_100m'
  | 'ach_earn_1b'
  | 'ach_earn_10b'
  | 'ach_taps_10'
  | 'ach_taps_100'
  | 'ach_taps_500'
  | 'ach_minion_1'
  | 'ach_minion_5'
  | 'ach_minion_15'
  | 'ach_table_marble'
  | 'ach_table_malachite'
  | 'ach_table_obsidian'
  | 'ach_table_royal';

export interface AchievementProgress {
  current: string;
  target: string;
  ratio: number; // 0..1
  done: boolean;
}

export interface AchievementDef {
  id: AchievementId;
  nameKey: string;
  descKey: string;
  icon: IconName;
  evaluate: (state: GameState) => AchievementProgress;
}

export const ACHIEVEMENTS_PER_TOKEN = 5;

function maxUpgradeAcrossTables(state: GameState, id: UpgradeId): number {
  let max = 0;
  for (const tbl of Object.values(state.tables)) {
    const v = tbl?.[id] ?? 0;
    if (v > max) max = v;
  }
  return max;
}

function numProg(cur: number, target: number): AchievementProgress {
  const clamped = Math.min(cur, target);
  return {
    current: String(clamped),
    target: String(target),
    ratio: target > 0 ? Math.min(1, cur / target) : 1,
    done: cur >= target,
  };
}

function bigProg(cur: bigint, target: bigint): AchievementProgress {
  const done = cur >= target;
  const clamped = done ? target : cur;
  const ratio = target > 0n ? Math.min(1, Number((clamped * 1000n) / target) / 1000) : 1;
  return {
    current: formatBig(clamped),
    target: formatBig(target),
    ratio,
    done,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Coin Unlocks ---
  {
    id: 'ach_bronze_5',
    nameKey: 'ach.bronze5.name',
    descKey: 'ach.bronze5.desc',
    icon: 'multi',
    evaluate: (s) => numProg(1 + maxUpgradeAcrossTables(s, 'multiToss'), 5),
  },
  {
    id: 'ach_silver_1',
    nameKey: 'ach.silver1.name',
    descKey: 'ach.silver1.desc',
    icon: 'coin',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'silverCoins'), 1),
  },
  {
    id: 'ach_gold_1',
    nameKey: 'ach.gold1.name',
    descKey: 'ach.gold1.desc',
    icon: 'coin',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'goldCoins'), 1),
  },
  {
    id: 'ach_platinum_1',
    nameKey: 'ach.platinum1.name',
    descKey: 'ach.platinum1.desc',
    icon: 'coin',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'platinumCoins'), 1),
  },
  {
    id: 'ach_sapphire_1',
    nameKey: 'ach.sapphire1.name',
    descKey: 'ach.sapphire1.desc',
    icon: 'diamond',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'sapphireCoins'), 1),
  },
  {
    id: 'ach_emerald_1',
    nameKey: 'ach.emerald1.name',
    descKey: 'ach.emerald1.desc',
    icon: 'diamond',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'emeraldCoins'), 1),
  },
  {
    id: 'ach_diamond_1',
    nameKey: 'ach.diamond1.name',
    descKey: 'ach.diamond1.desc',
    icon: 'diamond',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'diamondTierCoins'), 1),
  },

  // --- Total Gold Earned ---
  {
    id: 'ach_earn_100',
    nameKey: 'ach.earn100.name',
    descKey: 'ach.earn100.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 100n),
  },
  {
    id: 'ach_earn_1k',
    nameKey: 'ach.earn1k.name',
    descKey: 'ach.earn1k.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 1_000n),
  },
  {
    id: 'ach_earn_10k',
    nameKey: 'ach.earn10k.name',
    descKey: 'ach.earn10k.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 10_000n),
  },
  {
    id: 'ach_earn_100k',
    nameKey: 'ach.earn100k.name',
    descKey: 'ach.earn100k.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 100_000n),
  },
  {
    id: 'ach_earn_1m',
    nameKey: 'ach.earn1m.name',
    descKey: 'ach.earn1m.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 1_000_000n),
  },
  {
    id: 'ach_earn_100m',
    nameKey: 'ach.earn100m.name',
    descKey: 'ach.earn100m.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 100_000_000n),
  },
  {
    id: 'ach_earn_1b',
    nameKey: 'ach.earn1b.name',
    descKey: 'ach.earn1b.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 1_000_000_000n),
  },
  {
    id: 'ach_earn_10b',
    nameKey: 'ach.earn10b.name',
    descKey: 'ach.earn10b.desc',
    icon: 'sun',
    evaluate: (s) => bigProg(s.totalEarned, 10_000_000_000n),
  },

  // --- Taps, Minions & Tables ---
  {
    id: 'ach_taps_10',
    nameKey: 'ach.taps10.name',
    descKey: 'ach.taps10.desc',
    icon: 'hand',
    evaluate: (s) => numProg(s.stats.taps, 10),
  },
  {
    id: 'ach_taps_100',
    nameKey: 'ach.taps100.name',
    descKey: 'ach.taps100.desc',
    icon: 'hand',
    evaluate: (s) => numProg(s.stats.taps, 100),
  },
  {
    id: 'ach_taps_500',
    nameKey: 'ach.taps500.name',
    descKey: 'ach.taps500.desc',
    icon: 'hand',
    evaluate: (s) => numProg(s.stats.taps, 500),
  },
  {
    id: 'ach_minion_1',
    nameKey: 'ach.minion1.name',
    descKey: 'ach.minion1.desc',
    icon: 'speed',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'autoTosser'), 1),
  },
  {
    id: 'ach_minion_5',
    nameKey: 'ach.minion5.name',
    descKey: 'ach.minion5.desc',
    icon: 'speed',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'autoTosser'), 5),
  },
  {
    id: 'ach_minion_15',
    nameKey: 'ach.minion15.name',
    descKey: 'ach.minion15.desc',
    icon: 'speed',
    evaluate: (s) => numProg(maxUpgradeAcrossTables(s, 'autoTosser'), 15),
  },
  {
    id: 'ach_table_marble',
    nameKey: 'ach.tableMarble.name',
    descKey: 'ach.tableMarble.desc',
    icon: 'clover',
    evaluate: (s) => numProg(s.unlocked.includes('marble') ? 1 : 0, 1),
  },
  {
    id: 'ach_table_malachite',
    nameKey: 'ach.tableMalachite.name',
    descKey: 'ach.tableMalachite.desc',
    icon: 'clover',
    evaluate: (s) => numProg(s.unlocked.includes('malachite') ? 1 : 0, 1),
  },
  {
    id: 'ach_table_obsidian',
    nameKey: 'ach.tableObsidian.name',
    descKey: 'ach.tableObsidian.desc',
    icon: 'clover',
    evaluate: (s) => numProg(s.unlocked.includes('obsidian') ? 1 : 0, 1),
  },
  {
    id: 'ach_table_royal',
    nameKey: 'ach.tableRoyal.name',
    descKey: 'ach.tableRoyal.desc',
    icon: 'clover',
    evaluate: (s) => numProg(s.unlocked.includes('royal') ? 1 : 0, 1),
  },
];
