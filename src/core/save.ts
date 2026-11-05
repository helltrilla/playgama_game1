import {
  AD_BOOSTS,
  UPGRADES,
  TOKEN_UPGRADES,
  COIN_TIERS,
  type AdBoostId,
  type UpgradeId,
  type TokenUpgradeId,
  type CoinTier,
} from '../data/upgrades';
import { ACHIEVEMENTS, type AchievementId } from '../data/achievements';
import { TABLES } from '../data/tables';
import { parseBig } from './bignum';
import type { Clock } from './clock';
import type { StorageAdapter } from './storage';

export const SAVE_VERSION = 1;
export const SAVE_KEYS = [
  'saveVersion',
  'gold',
  'totalEarned',
  'unlocked',
  'activeTable',
  'tables',
  'ad',
  'frenzy',
  'settings',
  'lastSeen',
  'stats',
] as const;
export type SaveKey = (typeof SAVE_KEYS)[number];

export interface Settings {
  lang: string | null; // 'en' | 'ru' | null (null = follow platform)
  muted: boolean;
  onboardingDone?: boolean;
}

export interface GameState {
  gold: bigint;
  totalEarned: bigint;
  runEarned: bigint;
  rebirths: number;
  rebirthPoints: number;
  unlocked: string[];
  activeTable: string;
  tables: Record<string, Record<UpgradeId, number>>;
  coinDelta?: Partial<Record<CoinTier, number>>;
  ad: Record<AdBoostId, number>;
  tokens: number;
  tokenUpgrades: Record<TokenUpgradeId, number>;
  achievements: AchievementId[];
  achTokensClaimed: number;
  frenzyUntil: number;
  frenzyReadyAt: number;
  x2Until: number;
  alchemySpeedUntil?: number;
  alchemyElixirUntil?: number;
  settings: Settings;
  lastSeen: number;
  stats: { taps: number; rewarded: number; sessions: number };
}

export function emptyLevels(): Record<UpgradeId, number> {
  const o = {} as Record<UpgradeId, number>;
  UPGRADES.forEach((u) => (o[u.id] = 0));
  return o;
}

export function defaultState(): GameState {
  const ad = {} as Record<AdBoostId, number>;
  AD_BOOSTS.forEach((b) => (ad[b.id] = 0));
  const tokenUpgrades = {} as Record<TokenUpgradeId, number>;
  TOKEN_UPGRADES.forEach((u) => (tokenUpgrades[u.id] = 0));
  const tables: Record<string, Record<UpgradeId, number>> = {};
  TABLES.forEach((t) => (tables[t.id] = emptyLevels()));
  return {
    gold: 0n,
    totalEarned: 0n,
    runEarned: 0n,
    rebirths: 0,
    rebirthPoints: 0,
    unlocked: [TABLES[0].id],
    activeTable: TABLES[0].id,
    tables,
    coinDelta: {},
    ad,
    tokens: 0,
    tokenUpgrades,
    achievements: [],
    achTokensClaimed: 0,
    frenzyUntil: 0,
    frenzyReadyAt: 0,
    x2Until: 0,
    alchemySpeedUntil: 0,
    alchemyElixirUntil: 0,
    settings: { lang: null, muted: false },
    lastSeen: 0,
    stats: { taps: 0, rewarded: 0, sessions: 0 },
  };
}

function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (s === null || s === undefined) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/** Upgrade stored data from older save versions. */
export function migrateSave(
  raw: Record<string, string | null>,
  from: number,
): Record<string, string | null> {
  const data = { ...raw };
  switch (from) {
    case 0:
      // no data or pre-versioned data
      break;
    default:
      break;
  }
  return data;
}

function clampLevel(n: unknown): number {
  const v = Number(n);
  return isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function deserializeState(rawIn: Record<string, string | null>): GameState {
  const s = defaultState();
  const from = Number(rawIn.saveVersion ?? 0) || 0;
  const raw = migrateSave(rawIn, from);
  s.gold = parseBig(parseJSON(raw.gold, '0'));
  s.totalEarned = parseBig(parseJSON(raw.totalEarned, '0'));
  const unlocked = parseJSON<string[]>(raw.unlocked, [TABLES[0].id]);
  s.unlocked = Array.isArray(unlocked)
    ? unlocked.filter((id) => TABLES.some((t) => t.id === id))
    : [TABLES[0].id];
  if (!s.unlocked.includes(TABLES[0].id)) s.unlocked.unshift(TABLES[0].id);
  const active = parseJSON<string>(raw.activeTable, TABLES[0].id);
  s.activeTable = s.unlocked.includes(active) ? active : TABLES[0].id;
  const tables = parseJSON<Record<string, Record<string, number>>>(raw.tables, {});
  TABLES.forEach((t) => {
    UPGRADES.forEach((u) => {
      s.tables[t.id][u.id] = Math.min(clampLevel(tables[t.id]?.[u.id]), u.maxLevel);
    });
  });
  const rawDelta = tables._coinDelta;
  if (rawDelta && typeof rawDelta === 'object') {
    for (const tier of COIN_TIERS) {
      const d = Number(rawDelta[tier]);
      if (Number.isFinite(d) && d !== 0) {
        s.coinDelta![tier] = Math.trunc(d);
      }
    }
  }
  const ad = parseJSON<Record<string, unknown>>(raw.ad, {});
  AD_BOOSTS.forEach((b) => {
    s.ad[b.id] = Math.min(clampLevel(ad[b.id]), b.maxLevel);
  });
  s.tokens = clampLevel(ad._tokens);
  s.rebirths = clampLevel(ad._rebirths);
  s.rebirthPoints = clampLevel(ad._rebirthPoints);
  s.runEarned = ad._runEarned !== undefined ? parseBig(String(ad._runEarned)) : s.totalEarned;
  const rawTokUps = (ad._tokenUpgrades as Record<string, unknown>) || {};
  TOKEN_UPGRADES.forEach((u) => {
    s.tokenUpgrades[u.id] = Math.min(clampLevel(rawTokUps[u.id]), u.maxLevel);
  });
  const validAchIds = new Set<string>(ACHIEVEMENTS.map((a) => a.id));
  const rawAch = ad._achievements;
  s.achievements = Array.isArray(rawAch)
    ? rawAch.filter((id): id is AchievementId => typeof id === 'string' && validAchIds.has(id))
    : [];
  s.achTokensClaimed = clampLevel(ad._achTokens);
  const fr = parseJSON<{
    until?: number;
    readyAt?: number;
    x2Until?: number;
    speedUntil?: number;
    elixirUntil?: number;
  }>(raw.frenzy, {});
  s.frenzyUntil = Number(fr.until) || 0;
  s.frenzyReadyAt = Number(fr.readyAt) || 0;
  s.x2Until = Number(fr.x2Until) || 0;
  s.alchemySpeedUntil = Number(fr.speedUntil) || 0;
  s.alchemyElixirUntil = Number(fr.elixirUntil) || 0;
  const st = parseJSON<Partial<Settings>>(raw.settings, {});
  s.settings.lang = st.lang === 'en' || st.lang === 'ru' ? st.lang : null;
  s.settings.muted = !!st.muted;
  if (st.onboardingDone) {
    s.settings.onboardingDone = true;
  }
  s.lastSeen = Number(parseJSON(raw.lastSeen, 0)) || 0;
  const stats = parseJSON<Partial<GameState['stats']>>(raw.stats, {});
  s.stats = {
    taps: Number(stats.taps) || 0,
    rewarded: Number(stats.rewarded) || 0,
    sessions: Number(stats.sessions) || 0,
  };
  return s;
}

export function serializeKey(s: GameState, key: SaveKey): string {
  switch (key) {
    case 'saveVersion':
      return String(SAVE_VERSION);
    case 'gold':
      return JSON.stringify(s.gold.toString());
    case 'totalEarned':
      return JSON.stringify(s.totalEarned.toString());
    case 'unlocked':
      return JSON.stringify(s.unlocked);
    case 'activeTable':
      return JSON.stringify(s.activeTable);
    case 'tables':
      return JSON.stringify({
        ...s.tables,
        _coinDelta: s.coinDelta || {},
      });
    case 'ad':
      return JSON.stringify({
        ...s.ad,
        _tokens: s.tokens,
        _rebirths: s.rebirths ?? 0,
        _rebirthPoints: s.rebirthPoints ?? 0,
        _runEarned: (s.runEarned ?? 0n).toString(),
        _tokenUpgrades: s.tokenUpgrades,
        _achievements: s.achievements,
        _achTokens: s.achTokensClaimed,
      });
    case 'frenzy':
      return JSON.stringify({
        until: s.frenzyUntil,
        readyAt: s.frenzyReadyAt,
        x2Until: s.x2Until || 0,
        speedUntil: s.alchemySpeedUntil || 0,
        elixirUntil: s.alchemyElixirUntil || 0,
      });
    case 'settings':
      return JSON.stringify(s.settings);
    case 'lastSeen':
      return JSON.stringify(s.lastSeen);
    case 'stats':
      return JSON.stringify(s.stats);
  }
}

/** Batches writes: significant changes mark keys dirty; one storage.set per flush. */
export class SaveManager {
  private dirty = new Set<SaveKey>();
  private saving = false;

  constructor(
    private state: GameState,
    private storage: StorageAdapter,
    private clock: Clock,
  ) {}

  setState(s: GameState): void {
    this.state = s;
  }

  mark(...keys: SaveKey[]): void {
    keys.forEach((k) => this.dirty.add(k));
  }

  markAll(): void {
    SAVE_KEYS.forEach((k) => this.dirty.add(k));
  }

  async flush(): Promise<boolean> {
    if (this.saving || this.dirty.size === 0) return true;
    this.saving = true;
    this.state.lastSeen = this.clock.now();
    this.dirty.add('lastSeen');
    this.dirty.add('saveVersion');
    const keys = [...this.dirty];
    this.dirty.clear();
    const values = keys.map((k) => serializeKey(this.state, k));
    const ok = await this.storage.set(keys, values);
    if (!ok) {
      keys.forEach((k) => this.dirty.add(k));
    }
    this.saving = false;
    return ok;
  }

  async reset(): Promise<void> {
    this.dirty.clear();
    await this.storage.delete([...SAVE_KEYS]);
  }
}
