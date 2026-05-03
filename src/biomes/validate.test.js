import { describe, it, expect } from 'vitest';
import { validateBiomeConfig } from './validate';

const valid = {
  id: 'campsite',
  layers: { back: 'back.svg', mid: 'mid.svg', fore: 'fore.svg' },
  ambient: ['lanternFlicker'],
  hotspots: [
    { role: 'guide', x: '50%', y: '70%' },
    { role: 'stage', x: '34%', y: '58%', stageIndex: 0 },
  ],
};

describe('validateBiomeConfig', () => {
  it('accepts a valid config', () => {
    const r = validateBiomeConfig(valid);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects missing id', () => {
    const r = validateBiomeConfig({ ...valid, id: undefined });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/id/);
  });

  it('rejects missing layer', () => {
    const r = validateBiomeConfig({ ...valid, layers: { back: 'b.svg', mid: 'm.svg' } });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/fore/);
  });

  it('rejects hotspot without role', () => {
    const r = validateBiomeConfig({
      ...valid,
      hotspots: [{ x: '50%', y: '70%' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/role/);
  });

  it('rejects stage hotspot without stageIndex', () => {
    const r = validateBiomeConfig({
      ...valid,
      hotspots: [{ role: 'stage', x: '50%', y: '70%' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/stageIndex/);
  });

  it('rejects invalid x/y format', () => {
    const r = validateBiomeConfig({
      ...valid,
      hotspots: [{ role: 'guide', x: 50, y: '70%' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/x/);
  });

  it('accepts cabin as a valid biome id', () => {
    const cabinCfg = {
      id: 'cabin',
      layers: { back: 'b.svg', mid: 'm.svg', fore: 'f.svg' },
      ambient: ['hearthFlicker'],
      hotspots: [
        { role: 'wallMap',         x: '20%', y: '40%' },
        { role: 'specimenCabinet', x: '75%', y: '30%' },
        { role: 'bulletinBoard',   x: '45%', y: '60%' },
      ],
    };
    const r = validateBiomeConfig(cabinCfg);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('accepts wallMap role without enforcing biome-role pairing (validator is role-agnostic)', () => {
    // wallMap is valid regardless of biome id — it's the config author's responsibility
    // to only use hub roles on hub configs. The validator just checks membership.
    const r = validateBiomeConfig({
      id: 'cabin',
      layers: { back: 'b.svg', mid: 'm.svg', fore: 'f.svg' },
      ambient: [],
      hotspots: [{ role: 'wallMap', x: '20%', y: '40%' }],
    });
    expect(r.ok).toBe(true);
  });
});
