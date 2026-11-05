import { describe, it, expect } from 'vitest';
import { FakeClock } from '../../src/core/clock';

describe('FakeClock', () => {
  it('initializes and advances time predictably', () => {
    const clock = new FakeClock(1000);
    expect(clock.now()).toBe(1000);

    clock.advance(500);
    expect(clock.now()).toBe(1500);

    clock.set(2000);
    expect(clock.now()).toBe(2000);
  });
});
