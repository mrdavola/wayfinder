import { describe, it, expect } from 'vitest';
import { getBiome, listBiomes } from './index';
import { validateBiomeConfig } from './validate';

describe('biomes registry', () => {
  it('lists at least the campsite biome', () => {
    const ids = listBiomes();
    expect(ids).toContain('campsite');
  });

  it('returns a valid config for campsite', () => {
    const cfg = getBiome('campsite');
    expect(cfg).toBeDefined();
    const r = validateBiomeConfig(cfg);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('returns undefined for unknown biome', () => {
    expect(getBiome('mars')).toBeUndefined();
  });
});
