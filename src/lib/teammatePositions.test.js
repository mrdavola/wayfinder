import { describe, it, expect } from 'vitest';
import { computeTeammatePositions } from './teammatePositions';

describe('computeTeammatePositions', () => {
  it('returns an empty array for count 0', () => {
    expect(computeTeammatePositions(0)).toEqual([]);
  });

  it('returns 1 position for count 1', () => {
    const pos = computeTeammatePositions(1);
    expect(pos).toHaveLength(1);
  });

  it('returns N positions for count N up to max', () => {
    expect(computeTeammatePositions(3)).toHaveLength(3);
  });

  it('caps at 5 even if count exceeds max', () => {
    expect(computeTeammatePositions(99)).toHaveLength(5);
  });

  it('each position has x and y as percentage strings', () => {
    const pos = computeTeammatePositions(3);
    const pct = /^\d+(\.\d+)?%$/;
    pos.forEach(p => {
      expect(p.x).toMatch(pct);
      expect(p.y).toMatch(pct);
    });
  });

  it('all positions in a result are unique', () => {
    const pos = computeTeammatePositions(5);
    const keys = pos.map(p => `${p.x}|${p.y}`);
    expect(new Set(keys).size).toBe(5);
  });
});
