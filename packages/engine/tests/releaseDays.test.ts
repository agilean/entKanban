import { describe, expect, it } from 'vitest';
import { shouldEnterReleasePhase, isDailyReleaseActive } from '../src/finance/releaseDays.js';

describe('releaseDays', () => {
  it('enters release on billing days', () => {
    expect(shouldEnterReleasePhase(12, 3)).toBe(true);
    expect(shouldEnterReleasePhase(10, 3)).toBe(false);
  });

  it('enters release every day when I1 daily deploy is active', () => {
    expect(isDailyReleaseActive(1)).toBe(true);
    expect(shouldEnterReleasePhase(10, 1)).toBe(true);
    expect(shouldEnterReleasePhase(11, 1)).toBe(true);
  });
});
