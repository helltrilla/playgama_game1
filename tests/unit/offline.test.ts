import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';

describe('AC-OFF-1: Offline income logic', () => {
  let engine: GameEngine;
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock(1000000);
    engine = new GameEngine(undefined, new InMemoryStorage(), clock, new SeededRng(1));
    // Give engine autoTosser level 2 (1 toss/sec)
    engine.addGold(10000n);
    engine.buyUpgrade('autoTosser', 1);
    engine.buyUpgrade('autoTosser', 1);
    engine.state.lastSeen = clock.now();
  });

  it('calculates offline earnings within cap and efficiency', () => {
    // Advance clock by 1 hour (3600 sec)
    clock.advance(3600 * 1000);
    const offline = engine.calculateOffline(clock.now());

    expect(offline).not.toBeNull();
    expect(offline!.seconds).toBe(3600);
    expect(offline!.capHours).toBe(4); // base cap
    expect(offline!.efficiency).toBe(0.5); // base efficiency (50%)
    expect(offline!.earned).toBeGreaterThan(0n);
  });

  it('caps offline earnings at offlineCapSeconds', () => {
    // Advance clock by 10 hours (exceeding 4h cap)
    clock.advance(10 * 3600 * 1000);
    const offline = engine.calculateOffline(clock.now());

    expect(offline).not.toBeNull();
    // Earnings should be calculated for 4 hours, not 10 hours
    const ips = engine.autoIncomePerSecond();
    const expected = BigInt(Math.floor(ips * (4 * 3600) * 0.5));
    expect(offline!.earned).toBe(expected);
  });

  it('returns null if away for less than 30 seconds', () => {
    clock.advance(20 * 1000); // 20s
    expect(engine.calculateOffline(clock.now())).toBeNull();
  });

  it('returns null if clock is rewound (now < lastSeen)', () => {
    const pastTime = clock.now() - 50000;
    expect(engine.calculateOffline(pastTime)).toBeNull();
  });

  it('Collect x2 doubles the collected offline amount', () => {
    clock.advance(3600 * 1000);
    const offline = engine.calculateOffline(clock.now())!;
    const goldBefore = engine.state.gold;

    const collected = engine.collectOffline(2); // x2 watch ad
    expect(collected).toBe(offline.earned * 2n);
    expect(engine.state.gold).toBe(goldBefore + collected);
  });
});
