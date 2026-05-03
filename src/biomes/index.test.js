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

  it('lists the cabin biome', () => {
    expect(listBiomes()).toContain('cabin');
  });

  it('lists the lab biome', () => {
    expect(listBiomes()).toContain('lab');
  });

  it('lists the workshop biome', () => {
    expect(listBiomes()).toContain('workshop');
  });

  it('lists exactly the four registered biomes', () => {
    expect(listBiomes()).toHaveLength(4);
  });

  it('returns a valid config for cabin', () => {
    const cfg = getBiome('cabin');
    expect(cfg).toBeDefined();
    const r = validateBiomeConfig(cfg);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('returns a valid config for lab', () => {
    const cfg = getBiome('lab');
    expect(cfg).toBeDefined();
    const r = validateBiomeConfig(cfg);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('returns a valid config for workshop', () => {
    const cfg = getBiome('workshop');
    expect(cfg).toBeDefined();
    const r = validateBiomeConfig(cfg);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
});
