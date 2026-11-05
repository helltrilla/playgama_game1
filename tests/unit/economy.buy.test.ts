import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';
import { UPGRADE_BY_ID } from '../../src/data/upgrades';

describe('AC-ECO-2 & AC-ECO-3: Purchasing upgrades', () => {
  let engine: GameEngine;
  let clock: FakeClock;
  let storage: InMemoryStorage;

  beforeEach(() => {
    clock = new FakeClock(1000);
    storage = new InMemoryStorage();
    engine = new GameEngine(undefined, storage, clock, new SeededRng(42));
  });

  it('AC-ECO-2: Cannot purchase upgrade without sufficient gold; gold never drops below zero', () => {
    expect(engine.state.gold).toBe(0n);
    const bought = engine.buyUpgrade('coinValue', 1);
    expect(bought).toBe(false);
    expect(engine.upgradeLevel('coinValue')).toBe(0);
    expect(engine.state.gold).toBe(0n);
  });

  it('AC-ECO-2: Deducts exact cost when gold is sufficient', () => {
    engine.addGold(100n);
    const cost = engine.costForLevel('coinValue', 0); // 10n
    const bought = engine.buyUpgrade('coinValue', 1);
    expect(bought).toBe(true);
    expect(engine.upgradeLevel('coinValue')).toBe(1);
    expect(engine.state.gold).toBe(100n - cost);
  });

  it('AC-ECO-3: Purchases exact x10 mode batch or fails if incomplete', () => {
    engine.addGold(50n); // not enough for 10 levels of coinValue
    const quote = engine.quoteUpgrade('coinValue', 10);
    expect(quote.count).toBe(0); // cannot afford 10

    // Add enough gold for 10 levels
    let sum10 = 0n;
    for (let l = 0; l < 10; l++) {
      sum10 += engine.costForLevel('coinValue', l);
    }
    engine.addGold(sum10);
    const quote2 = engine.quoteUpgrade('coinValue', 10);
    expect(quote2.count).toBe(10);
    expect(quote2.totalCost).toBe(sum10);

    const bought = engine.buyUpgrade('coinValue', 10);
    expect(bought).toBe(true);
    expect(engine.upgradeLevel('coinValue')).toBe(10);
  });

  it('AC-ECO-3: Max mode buys as many as affordable without exceeding budget or maxLevel', () => {
    engine.addGold(1000n);
    const quote = engine.quoteUpgrade('tossSpeed', 'max');
    expect(quote.count).toBeGreaterThan(0);
    expect(quote.totalCost).toBeLessThanOrEqual(1000n);

    const goldBefore = engine.state.gold;
    const bought = engine.buyUpgrade('tossSpeed', 'max');
    expect(bought).toBe(true);
    expect(engine.state.gold).toBe(goldBefore - quote.totalCost);
    expect(engine.upgradeLevel('tossSpeed')).toBe(quote.count);
    expect(engine.upgradeLevel('tossSpeed')).toBeLessThanOrEqual(UPGRADE_BY_ID.tossSpeed.maxLevel);
  });
});
