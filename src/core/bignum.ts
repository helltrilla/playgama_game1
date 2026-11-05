import { bigintSuffixes } from '../data/upgrades';

const SUFFIXES = bigintSuffixes();

/**
 * Format a BigInt according to ECONOMY_SPEC §7:
 * - < 1 000: integer
 * - Suffixes K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc
 * - Max 3 significant figures at suffix (e.g. 1.23M, 12.3M, 123M)
 * - Beyond suffix: scientific notation (e.g. 1.23e45)
 * - Invariant: non-negative
 */
export function formatBig(b: bigint): string {
  if (b <= 0n) return '0';
  const s = b.toString();
  const len = s.length;
  if (len <= 3) return s;

  const group = Math.floor((len - 1) / 3);
  const intDigits = len - group * 3;
  const decimals = Math.max(0, 3 - intDigits);
  const frac = s.slice(intDigits, intDigits + decimals).replace(/0+$/, '');

  if (group < SUFFIXES.length) {
    return s.slice(0, intDigits) + (frac ? '.' + frac : '') + SUFFIXES[group];
  }

  // Beyond the last suffix: scientific notation 1.23e45
  const exp = len - 1;
  const sFrac = s.slice(1, 3).replace(/0+$/, '');
  return s[0] + (sFrac ? '.' + sFrac : '') + 'e' + exp;
}

/** Format a small number used for effect labels (levels, percent, multipliers). */
export function formatNum(n: number, maxDecimals = 2): string {
  if (!isFinite(n) || n <= 0) return '0';
  if (n >= 1000) return formatBig(BigInt(Math.floor(n)));
  const f = Number(n.toFixed(maxDecimals));
  return String(f);
}

export function parseBig(v: unknown, fallback = 0n): bigint {
  try {
    if (typeof v === 'bigint') return v < 0n ? 0n : v;
    if (typeof v === 'number' && isFinite(v)) return v < 0 ? 0n : BigInt(Math.floor(v));
    if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
  } catch {
    /* fallback */
  }
  return fallback;
}

/** Multiply a bigint by a double factor with ~1e-6 precision, exact for integer-ish factors. */
export function mulBig(b: bigint, f: number): bigint {
  if (f <= 0 || b <= 0n) return 0n;
  const SCALE = 1_000_000n;
  return (b * BigInt(Math.round(f * 1_000_000))) / SCALE;
}
