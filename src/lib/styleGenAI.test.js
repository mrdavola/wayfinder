import { describe, it, expect } from 'vitest';
import { STYLE_PREFIX_V1, STYLE_PREFIX_VERSION, buildArtPrompt } from './styleGenAI';

describe('styleGenAI', () => {
  it('exposes a non-empty style prefix', () => {
    expect(STYLE_PREFIX_V1.length).toBeGreaterThan(50);
  });
  it('declares a version', () => {
    expect(STYLE_PREFIX_VERSION).toBe('v1');
  });
  it('buildArtPrompt prepends prefix and joins user prompt', () => {
    const p = buildArtPrompt('a botanist with field journal, smiling');
    expect(p.startsWith(STYLE_PREFIX_V1)).toBe(true);
    expect(p).toContain('botanist');
  });
  it('buildArtPrompt collapses whitespace', () => {
    const p = buildArtPrompt('  a  scientist  ');
    expect(p).toContain('a scientist');
    expect(p).not.toMatch(/  /);
  });
});
