export interface Rng {
  /** Returns a pseudo-random float in [0, 1) */
  next(): number;
}

export class MathRng implements Rng {
  next(): number {
    return Math.random();
  }
}

/**
 * Deterministic PRNG using Mulberry32 algorithm.
 * Excellent distribution and speed for game simulations and tests.
 */
export class SeededRng implements Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Helper to get integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
