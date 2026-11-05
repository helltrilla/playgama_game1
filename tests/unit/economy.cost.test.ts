import { describe, it, expect } from 'vitest';
import { UPGRADES, upgradeCost } from '../../src/data/upgrades';

describe('AC-ECO-1: Upgrade cost formula', () => {
  it('calculates cost according to cost(level) = floor(baseCost * growth^level)', () => {
    for (const def of UPGRADES) {
      for (let level = 0; level < Math.min(10, def.maxLevel); level++) {
        const expected = BigInt(
          Math.max(1, Math.floor(def.baseCost * Math.pow(def.growth, level))),
        );
        const actual = upgradeCost(def, level);
        expect(actual).toBe(expected);
      }
    }
  });

  it('matches exact sample values for coinValue (BasePrice 15, growth 1.15)', () => {
    for (const def of UPGRADES) {
      expect(def.growth).toBeCloseTo(1.15, 5);
    }
    const coinVal = UPGRADES.find((u) => u.id === 'coinValue')!;
    // level 0: 15 * 1.15^0 = 15
    expect(upgradeCost(coinVal, 0)).toBe(15n);
    // level 1: floor(15 * 1.15^1) = 17
    expect(upgradeCost(coinVal, 1)).toBe(17n);
    // level 2: floor(15 * 1.15^2) = 19
    expect(upgradeCost(coinVal, 2)).toBe(19n);
  });
});
