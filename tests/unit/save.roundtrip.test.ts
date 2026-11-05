import { describe, it, expect } from 'vitest';
import {
  deserializeState,
  serializeKey,
  SAVE_KEYS,
  SaveManager,
  defaultState,
} from '../../src/core/save';
import { InMemoryStorage } from '../../src/core/storage';
import { FakeClock } from '../../src/core/clock';

describe('AC-SAVE-1..4: Save serialization and roundtrip', () => {
  it('AC-SAVE-1: Serializes and deserializes state without data loss', () => {
    const s = defaultState();
    s.gold = 12345678901234567890n;
    s.totalEarned = 99999999999999999999n;
    s.unlocked = ['wooden', 'marble'];
    s.activeTable = 'marble';
    s.tables['wooden'].coinValue = 15;
    s.tables['wooden'].autoTosser = 7;
    s.ad.goldenHour = 2;
    s.ad.frenzy = 1;
    s.frenzyUntil = 50000;
    s.settings.lang = 'ru';
    s.settings.muted = true;
    s.lastSeen = 1234567;
    s.stats.taps = 42;

    const raw: Record<string, string | null> = {};
    for (const k of SAVE_KEYS) {
      raw[k] = serializeKey(s, k);
    }

    const restored = deserializeState(raw);
    expect(restored.gold).toBe(s.gold);
    expect(restored.totalEarned).toBe(s.totalEarned);
    expect(restored.unlocked).toEqual(s.unlocked);
    expect(restored.activeTable).toBe(s.activeTable);
    expect(restored.tables['wooden'].coinValue).toBe(15);
    expect(restored.tables['wooden'].autoTosser).toBe(7);
    expect(restored.ad.goldenHour).toBe(2);
    expect(restored.ad.frenzy).toBe(1);
    expect(restored.frenzyUntil).toBe(50000);
    expect(restored.settings.lang).toBe('ru');
    expect(restored.settings.muted).toBe(true);
    expect(restored.lastSeen).toBe(1234567);
    expect(restored.stats.taps).toBe(42);
  });

  it('AC-SAVE-3: SaveManager marks dirty keys and flushes all at once', async () => {
    const storage = new InMemoryStorage();
    const clock = new FakeClock(1000);
    const s = defaultState();
    const manager = new SaveManager(s, storage, clock);

    s.gold = 500n;
    manager.mark('gold');
    await manager.flush();

    const stored = await storage.get(['gold', 'lastSeen', 'saveVersion']);
    expect(stored.gold).toBe(JSON.stringify('500'));
    expect(stored.lastSeen).toBe(JSON.stringify(1000));
  });

  it('AC-SAVE-4: Safe defaults when stored data is corrupt or missing', () => {
    const corrupted: Record<string, string | null> = {
      gold: 'not a json',
      tables: null,
      unlocked: '["non_existing_table"]',
      ad: '{"broken": 999}',
    };
    const s = deserializeState(corrupted);
    expect(s.gold).toBe(0n);
    expect(s.unlocked).toContain('wooden');
    expect(s.activeTable).toBe('wooden');
  });
});
