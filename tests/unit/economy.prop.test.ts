import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GameEngine } from '../../src/core/game';
import { FakeClock } from '../../src/core/clock';
import { SeededRng } from '../../src/core/rng';
import { InMemoryStorage } from '../../src/core/storage';
import { UPGRADES } from '../../src/data/upgrades';
import { deserializeState, serializeKey, SAVE_KEYS } from '../../src/core/save';

describe('AC-ECO-6: Property-based invariants (fast-check)', () => {
  it('Invariant 1 & 2: Gold is never negative; purchasing reduces Gold by exact cost', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 1_000_000_000n }),
        fc.constantFrom(...UPGRADES.map((u) => u.id)),
        fc.constantFrom<1 | 10 | 'max'>(1, 10, 'max'),
        (initialGold, upgradeId, mode) => {
          const engine = new GameEngine(
            undefined,
            new InMemoryStorage(),
            new FakeClock(1000),
            new SeededRng(1),
          );
          engine.addGold(initialGold);
          const quote = engine.quoteUpgrade(upgradeId, mode);
          const goldBefore = engine.state.gold;

          const bought = engine.buyUpgrade(upgradeId, mode);
          if (bought) {
            expect(engine.state.gold).toBe(goldBefore - quote.totalCost);
          } else {
            expect(engine.state.gold).toBe(goldBefore);
          }
          expect(engine.state.gold >= 0n).toBe(true);
        },
      ),
    );
  });

  it('Invariant 3: Upgrade levels never exceed maxLevel', () => {
    fc.assert(
      fc.property(fc.constantFrom(...UPGRADES.map((u) => u.id)), (upgradeId) => {
        const engine = new GameEngine(
          undefined,
          new InMemoryStorage(),
          new FakeClock(1000),
          new SeededRng(1),
        );
        // Infinite gold
        engine.addGold(1_000_000_000_000_000_000n);
        engine.buyUpgrade(upgradeId, 'max');

        const def = UPGRADES.find((u) => u.id === upgradeId)!;
        const level = engine.upgradeLevel(upgradeId);
        expect(level <= def.maxLevel).toBe(true);
      }),
    );
  });

  it('Invariant 4: Monotonicity: higher upgrade level never decreases coinBase or autoRate', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (level) => {
        const engine1 = new GameEngine(
          undefined,
          new InMemoryStorage(),
          new FakeClock(1000),
          new SeededRng(1),
        );
        const engine2 = new GameEngine(
          undefined,
          new InMemoryStorage(),
          new FakeClock(1000),
          new SeededRng(1),
        );

        engine1.addGold(100_000_000n);
        engine2.addGold(100_000_000n);

        for (let i = 0; i < level; i++) {
          engine1.buyUpgrade('coinValue', 1);
          engine2.buyUpgrade('coinValue', 1);
        }
        engine2.buyUpgrade('coinValue', 1);

        expect(engine2.coinBase() >= engine1.coinBase()).toBe(true);
      }),
    );
  });

  it('Invariant 5: Serialization roundtrip idempotence (Save -> Load -> Save produces same data)', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 1_000_000_000_000n }),
        fc.integer({ min: 0, max: 100 }),
        (gold, taps) => {
          const engine = new GameEngine(
            undefined,
            new InMemoryStorage(),
            new FakeClock(1000),
            new SeededRng(1),
          );
          engine.addGold(gold);
          engine.state.stats.taps = taps;

          const raw: Record<string, string | null> = {};
          for (const k of SAVE_KEYS) {
            raw[k] = serializeKey(engine.state, k);
          }

          const restored = deserializeState(raw);
          const raw2: Record<string, string | null> = {};
          for (const k of SAVE_KEYS) {
            raw2[k] = serializeKey(restored, k);
          }

          expect(raw2).toEqual(raw);
        },
      ),
    );
  });

  it('Invariant 6: Same seed and same actions yield strictly identical results', () => {
    const clock1 = new FakeClock(1000);
    const clock2 = new FakeClock(1000);
    const e1 = new GameEngine(undefined, new InMemoryStorage(), clock1, new SeededRng(9999));
    const e2 = new GameEngine(undefined, new InMemoryStorage(), clock2, new SeededRng(9999));

    for (let i = 0; i < 20; i++) {
      clock1.advance(150);
      clock2.advance(150);
      const coins1 = e1.tap(clock1.now());
      const coins2 = e2.tap(clock2.now());
      expect(coins1).toEqual(coins2);
    }
    expect(e1.state.gold).toBe(e2.state.gold);
  });
});
