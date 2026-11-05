import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';

describe('AC-TBL-1..4: Tables logic', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(undefined, new InMemoryStorage(), new FakeClock(), new SeededRng(1));
  });

  it('AC-TBL-1: Wooden is unlocked by default; other 4 tables are locked', () => {
    expect(engine.isTableUnlocked('wooden')).toBe(true);
    expect(engine.isTableUnlocked('marble')).toBe(false);
    expect(engine.isTableUnlocked('malachite')).toBe(false);
    expect(engine.isTableUnlocked('obsidian')).toBe(false);
    expect(engine.isTableUnlocked('royal')).toBe(false);
    expect(engine.state.activeTable).toBe('wooden');
  });

  it('AC-TBL-2: Unlocking a table deducts cost once and persists in unlocked list', () => {
    // Marble table costs 5 000
    expect(engine.unlockTable('marble')).toBe(false); // cannot afford

    engine.addGold(5000n);
    expect(engine.unlockTable('marble')).toBe(true);
    expect(engine.isTableUnlocked('marble')).toBe(true);
    expect(engine.state.gold).toBe(0n);

    // Unlocking again fails (already unlocked)
    expect(engine.unlockTable('marble')).toBe(false);

    // Can switch to unlocked table and back to wooden
    expect(engine.setActiveTable('marble')).toBe(true);
    expect(engine.state.activeTable).toBe('marble');
    expect(engine.setActiveTable('wooden')).toBe(true);
    expect(engine.state.activeTable).toBe('wooden');
  });

  it('AC-TBL-4: Table multiplier applies correctly to coin income across all 5 tables', () => {
    // Silver coin tier has base 10 at level 0
    const woodenCoin = engine.calcCoinValue(0, 'wooden', 'silver'); // 10 * 1 = 10
    const marbleCoin = engine.calcCoinValue(0, 'marble', 'silver'); // floor(10 * 1.25) = 12
    const malachiteCoin = engine.calcCoinValue(0, 'malachite', 'silver'); // 10 * 1.5 = 15
    const obsidianCoin = engine.calcCoinValue(0, 'obsidian', 'silver'); // 10 * 2 = 20
    const royalCoin = engine.calcCoinValue(0, 'royal', 'silver'); // 10 * 3 = 30

    expect(woodenCoin).toBe(10n);
    expect(marbleCoin).toBe(12n);
    expect(malachiteCoin).toBe(15n);
    expect(obsidianCoin).toBe(20n);
    expect(royalCoin).toBe(30n);
  });
});
