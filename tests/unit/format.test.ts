import { describe, it, expect } from 'vitest';
import { formatBig, formatNum } from '../../src/core/bignum';

describe('AC-ECO-5: Number formatting', () => {
  it('formats small numbers (< 1000) as plain integers', () => {
    expect(formatBig(0n)).toBe('0');
    expect(formatBig(1n)).toBe('1');
    expect(formatBig(42n)).toBe('42');
    expect(formatBig(999n)).toBe('999');
  });

  it('formats with standard suffixes (K, M, B, T, etc.) with max 3 significant figures', () => {
    expect(formatBig(1000n)).toBe('1K');
    expect(formatBig(1234n)).toBe('1.23K');
    expect(formatBig(12345n)).toBe('12.3K');
    expect(formatBig(123456n)).toBe('123K');
    expect(formatBig(1000000n)).toBe('1M');
    expect(formatBig(1234567n)).toBe('1.23M');
    expect(formatBig(5600000000n)).toBe('5.6B');
  });

  it('formats very large numbers with scientific notation beyond last suffix', () => {
    // 1e33 is Dc, 1e45 is 10^45
    const big = 1230000000000000000000000000000000000000000000n; // 46 digits -> 1.23e45
    expect(formatBig(big)).toBe('1.23e45');
  });

  it('never outputs negative strings', () => {
    expect(formatBig(-50n)).toBe('0');
    expect(formatNum(-10)).toBe('0');
  });
});
