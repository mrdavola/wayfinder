// src/lib/artGen.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@fal-ai/client', () => ({
  fal: {
    config: vi.fn(),
    subscribe: vi.fn(),
  },
}));

import { generatePortrait, generateDecorSlot } from './artGen';
import { fal } from '@fal-ai/client';

beforeEach(() => vi.clearAllMocks());

describe('generatePortrait', () => {
  it('returns image URL from fal.ai', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/portrait.png' }] } });
    const url = await generatePortrait('campsite');
    expect(url).toBe('https://cdn.fal.ai/portrait.png');
  });

  it('throws when fal.ai returns no image', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [] } });
    await expect(generatePortrait('campsite')).rejects.toThrow('No image URL');
  });

  it('calls fal-ai/nano-banana-2 model', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite');
    expect(fal.subscribe.mock.calls[0][0]).toBe('fal-ai/nano-banana-2');
  });

  it('includes the style prefix in the prompt', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('vintage natural-history');
  });

  it('uses lab-specific subject for biomeId=lab', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('lab');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('lab');
  });

  it('falls back to campsite subject for unknown biomeId', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('atlantis');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('field guide');
  });

  it('appends extraHint when provided', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite', 'for a marine biology project');
    const { prompt } = fal.subscribe.mock.calls[0][1].input;
    expect(prompt).toContain('marine biology');
  });

  it('uses portrait_4_3 image size', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/x.png' }] } });
    await generatePortrait('campsite');
    const { image_size } = fal.subscribe.mock.calls[0][1].input;
    expect(image_size).toBe('portrait_4_3');
  });
});

describe('generateDecorSlot', () => {
  it('returns { url, prompt } from fal.ai', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/decor.png' }] } });
    const result = await generateDecorSlot('bulletin_note', 'campsite', 'Ocean Expedition');
    expect(result.url).toBe('https://cdn.fal.ai/decor.png');
    expect(typeof result.prompt).toBe('string');
    expect(result.prompt.length).toBeGreaterThan(10);
  });

  it('includes quest title in the prompt', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/decor.png' }] } });
    const { prompt } = await generateDecorSlot('bulletin_note', 'campsite', 'Ocean Expedition');
    expect(prompt).toContain('Ocean Expedition');
  });

  it('falls back to generic subject for unknown slot', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [{ url: 'https://cdn.fal.ai/decor.png' }] } });
    const { prompt } = await generateDecorSlot('unknown_slot', 'campsite', '');
    expect(prompt).toContain('campsite');
  });

  it('throws when fal.ai returns no image', async () => {
    fal.subscribe.mockResolvedValue({ data: { images: [] } });
    await expect(generateDecorSlot('bulletin_note', 'campsite', '')).rejects.toThrow('No image URL');
  });
});
