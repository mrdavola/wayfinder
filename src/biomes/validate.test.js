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
});
