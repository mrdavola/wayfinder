import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

function mockMatchMedia(matches) {
  const listeners = new Set();
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_, cb) => listeners.add(cb)),
    removeEventListener: vi.fn((_, cb) => listeners.delete(cb)),
  };
  window.matchMedia = vi.fn(() => mql);
  return { mql, listeners };
}

function Probe({ onValue }) { onValue(useReducedMotion()); return null; }

afterEach(() => { delete window.matchMedia; });

describe('useReducedMotion', () => {
  it('returns true when system prefers reduced motion', () => {
    mockMatchMedia(true);
    let captured;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toBe(true);
  });

  it('returns false when system does not prefer reduced motion', () => {
    mockMatchMedia(false);
    let captured;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    let captured;
    render(<Probe onValue={(v) => (captured = v)} />);
    expect(captured).toBe(false);
  });
});
