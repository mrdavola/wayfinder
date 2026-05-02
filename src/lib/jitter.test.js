// src/lib/jitter.test.js
import { describe, it, expect } from 'vitest';
import { seededJitterDeg } from './jitter';

describe('seededJitterDeg', () => {
  it('returns a number between -maxDeg and +maxDeg', () => {
    for (let i = 0; i < 50; i++) {
      const v = seededJitterDeg(`id-${i}`, 1);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same input', () => {
    expect(seededJitterDeg('abc', 1)).toBe(seededJitterDeg('abc', 1));
  });

  it('returns different values for different ids', () => {
    const a = seededJitterDeg('id-a', 1);
    const b = seededJitterDeg('id-b', 1);
    expect(a).not.toBe(b);
  });

  it('respects maxDeg', () => {
    expect(Math.abs(seededJitterDeg('x', 0.5))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(seededJitterDeg('x', 2))).toBeLessThanOrEqual(2);
  });

  it('returns 0 for empty id', () => {
    expect(seededJitterDeg('', 1)).toBe(0);
  });
});
