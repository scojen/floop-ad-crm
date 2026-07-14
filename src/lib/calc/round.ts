/** Shared numeric helpers. Calc modules never emit NaN/Infinity — null instead. */

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Division that returns null on missing inputs or non-positive denominators. */
export function safeDiv(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }
  return numerator / denominator;
}

export function isNum(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Treat a nullable optional cost as zero when unset. */
export function orZero(value: number | null | undefined): number {
  return isNum(value) ? value : 0;
}
