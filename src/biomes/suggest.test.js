import { describe, it, expect } from 'vitest';
import { suggestBiome } from './suggest';

describe('suggestBiome', () => {
  it('returns campsite for null quest', () => {
    expect(suggestBiome(null)).toBe('campsite');
  });

  it('returns campsite for quest with no career_pathway', () => {
    expect(suggestBiome({ title: 'My Quest' })).toBe('campsite');
  });

  it('maps biology → lab', () => {
    expect(suggestBiome({ career_pathway: 'biology' })).toBe('lab');
  });

  it('maps chemistry → lab', () => {
    expect(suggestBiome({ career_pathway: 'chemistry' })).toBe('lab');
  });

  it('maps ecology → lab', () => {
    expect(suggestBiome({ career_pathway: 'ecology' })).toBe('lab');
  });

  it('maps engineering → workshop', () => {
    expect(suggestBiome({ career_pathway: 'engineering' })).toBe('workshop');
  });

  it('maps material_science → workshop', () => {
    expect(suggestBiome({ career_pathway: 'material_science' })).toBe('workshop');
  });

  it('maps technology → workshop', () => {
    expect(suggestBiome({ career_pathway: 'technology' })).toBe('workshop');
  });

  it('maps unknown pathway → campsite', () => {
    expect(suggestBiome({ career_pathway: 'social_studies' })).toBe('campsite');
  });

  it('is case-insensitive', () => {
    expect(suggestBiome({ career_pathway: 'Biology' })).toBe('lab');
    expect(suggestBiome({ career_pathway: 'ENGINEERING' })).toBe('workshop');
  });

  it('never returns cabin', () => {
    const result = suggestBiome({ career_pathway: 'anything' });
    expect(result).not.toBe('cabin');
  });

  it('returns the explicit biome_id when already set to a quest biome', () => {
    expect(suggestBiome({ biome_id: 'lab', career_pathway: 'engineering' })).toBe('lab');
    expect(suggestBiome({ biome_id: 'workshop' })).toBe('workshop');
    expect(suggestBiome({ biome_id: 'campsite' })).toBe('campsite');
  });

  it('ignores cabin biome_id and falls back to suggest', () => {
    expect(suggestBiome({ biome_id: 'cabin', career_pathway: 'biology' })).toBe('lab');
  });
});
