import { describe, expect, it } from 'vitest';
import { inverseNormalCdf, requiredSampleSize } from './power';

describe('inverseNormalCdf', () => {
  it('matches canonical quantiles', () => {
    expect(inverseNormalCdf(0.975)).toBeCloseTo(1.959964, 5);
    expect(inverseNormalCdf(0.8)).toBeCloseTo(0.841621, 5);
    expect(inverseNormalCdf(0.5)).toBeCloseTo(0, 9);
    expect(inverseNormalCdf(0.025)).toBeCloseTo(-1.959964, 5);
  });

  it('rejects out-of-range p', () => {
    expect(() => inverseNormalCdf(0)).toThrow(RangeError);
    expect(() => inverseNormalCdf(1)).toThrow(RangeError);
  });
});

describe('requiredSampleSize (§7.3 — pooled two-proportion z-test)', () => {
  it('canonical case: 2.0% baseline, +20% relative (→2.4%), α=.05, power=.8, 50/50', () => {
    // The playbook §7.3 pre-launch example. Hand-computed with the pooled
    // formula: nA ≈ 8,158 … but for baseline 2% → 2.4%:
    const result = requiredSampleSize({
      baselineRate: 0.02,
      mde: 0.2,
      mdeMode: 'relative',
    });
    expect(result).not.toBeNull();
    expect(result!.variantRate).toBeCloseTo(0.024, 9);
    expect(result!.nA).toBe(result!.nB);
    // Pooled formula lands at ~21,109 per arm — a 20% relative lift on a 2%
    // baseline is a small absolute effect, hence the large sample (the
    // playbook's point about iteration tests). Band allows float ordering.
    expect(result!.nA).toBeGreaterThanOrEqual(21_100);
    expect(result!.nA).toBeLessThanOrEqual(21_120);
  });

  it('5% baseline, +20% relative (→6%): ~8,158 per arm (pooled formula)', () => {
    const result = requiredSampleSize({
      baselineRate: 0.05,
      mde: 0.2,
      mdeMode: 'relative',
    });
    expect(result!.nA).toBeGreaterThanOrEqual(8156);
    expect(result!.nA).toBeLessThanOrEqual(8160);
  });

  it('a bigger MDE needs less sample ("test big things")', () => {
    const small = requiredSampleSize({
      baselineRate: 0.02,
      mde: 0.05,
      mdeMode: 'relative',
    });
    const big = requiredSampleSize({
      baselineRate: 0.02,
      mde: 0.3,
      mdeMode: 'relative',
    });
    expect(small!.nA).toBeGreaterThan(big!.nA * 10);
  });

  it('supports absolute MDE and unequal allocation', () => {
    const result = requiredSampleSize({
      baselineRate: 0.05,
      mde: 0.01,
      mdeMode: 'absolute',
      allocation: 1 / 3,
    });
    expect(result).not.toBeNull();
    expect(result!.nB).toBe(Math.ceil(result!.nA * 2));
  });

  it('returns null on degenerate inputs', () => {
    expect(
      requiredSampleSize({ baselineRate: 0, mde: 0.2, mdeMode: 'relative' }),
    ).toBeNull();
    expect(
      requiredSampleSize({ baselineRate: 0.5, mde: 0, mdeMode: 'relative' }),
    ).toBeNull();
    expect(
      requiredSampleSize({ baselineRate: 0.9, mde: 0.2, mdeMode: 'relative' }),
    ).toBeNull(); // p2 ≥ 1
  });
});
