import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';
import { AD_BOOST_BY_ID } from '../../src/data/upgrades';

describe('AC-ADS-1..4: Ad Boosts and Rewarded rewards', () => {
  let engine: GameEngine;
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock(1000);
    engine = new GameEngine(undefined, new InMemoryStorage(), clock, new SeededRng(1));
  });

  it('AC-ADS-1: Rewarded reward is only granted upon explicit call (from rewarded state)', () => {
    expect(engine.adBoostLevel('goldenHour')).toBe(0);
    const ok = engine.grantReward('goldenHour');
    expect(ok).toBe(true);
    expect(engine.adBoostLevel('goldenHour')).toBe(1);
    expect(engine.goldenHourMultiplier()).toBe(2); // level 1 = x2 income
  });

  it('AC-ADS-3: Upgrades in ad branch increase up to maxLevel', () => {
    const max = AD_BOOST_BY_ID.goldenHour.maxLevel;
    for (let i = 0; i < max; i++) {
      expect(engine.grantReward('goldenHour')).toBe(true);
    }
    expect(engine.adBoostLevel('goldenHour')).toBe(max);
    // Exceeding maxLevel fails
    expect(engine.grantReward('goldenHour')).toBe(false);
  });

  it('AC-ADS-4: Frenzy duration and cooldown track through Clock', () => {
    engine.grantReward('frenzy'); // unlocks and starts frenzy for 60s
    expect(engine.frenzyActive(clock.now())).toBe(true);
    expect(engine.totalMultiplier()).toBe(5); // x5 frenzy multiplier

    // Advance 61 seconds: frenzy expires
    clock.advance(61 * 1000);
    expect(engine.frenzyActive(clock.now())).toBe(false);
    expect(engine.totalMultiplier()).toBe(1);

    // Cannot activate while on cooldown (300s cooldown)
    expect(engine.activateFrenzy(clock.now())).toBe(false);
    expect(engine.frenzyCooldownSeconds(clock.now())).toBeGreaterThan(0);

    // Advance past cooldown
    clock.advance(300 * 1000);
    expect(engine.frenzyCooldownSeconds(clock.now())).toBe(0);
    expect(engine.activateFrenzy(clock.now())).toBe(true);
    expect(engine.frenzyActive(clock.now())).toBe(true);
  });
});
