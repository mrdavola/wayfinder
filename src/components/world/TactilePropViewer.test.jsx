import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock R3F — Canvas becomes a plain div, useFrame is a no-op.
// jsdom has no WebGL; R3F's Canvas would crash without this.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
}));

import TactilePropViewer, { TactilePropFallback } from './TactilePropViewer';

describe('<TactilePropViewer>', () => {
  it('renders without crashing for each of the five prop types', () => {
    const props = ['lantern', 'journal', 'specimenJar', 'mailbox', 'tent'];
    props.forEach(propId => {
      const { unmount } = render(<TactilePropViewer propId={propId} />);
      expect(screen.getByTestId('tactile-prop-viewer')).toBeInTheDocument();
      unmount();
    });
  });

  it('sets data-prop attribute to the given propId', () => {
    render(<TactilePropViewer propId="lantern" />);
    expect(screen.getByTestId('tactile-prop-viewer')).toHaveAttribute('data-prop', 'lantern');
  });

  it('has an accessible role=img and aria-label derived from prop metadata', () => {
    render(<TactilePropViewer propId="journal" />);
    const el = screen.getByRole('img');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('journal'));
  });

  it('is focusable (tabIndex=0)', () => {
    render(<TactilePropViewer propId="tent" />);
    expect(screen.getByTestId('tactile-prop-viewer')).toHaveAttribute('tabindex', '0');
  });

  it('renders the R3F canvas wrapper', () => {
    render(<TactilePropViewer propId="mailbox" />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('returns null for an unknown propId', () => {
    const { container } = render(<TactilePropViewer propId="unknown-thing" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('<TactilePropFallback>', () => {
  it('renders an img-role element with an aria-label', () => {
    render(<TactilePropFallback propId="lantern" />);
    const el = screen.getByRole('img');
    expect(el).toHaveAttribute('aria-label', expect.stringContaining('lantern'));
  });

  it('exposes data-fallback=true', () => {
    const { container } = render(<TactilePropFallback propId="specimenJar" />);
    expect(container.firstChild).toHaveAttribute('data-fallback', 'true');
  });

  it('sets data-prop to the given propId', () => {
    const { container } = render(<TactilePropFallback propId="tent" />);
    expect(container.firstChild).toHaveAttribute('data-prop', 'tent');
  });

  it('is focusable and keyboard-operable', () => {
    render(<TactilePropFallback propId="mailbox" />);
    const el = screen.getByRole('img');
    expect(el).toHaveAttribute('tabindex', '0');
  });

  it('applies rotY style change on ArrowRight key', () => {
    render(<TactilePropFallback propId="journal" />);
    const el = screen.getByRole('img');
    el.focus();
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    const svgWrapper = el.querySelector('.tactile-prop-fallback__svg');
    expect(svgWrapper.style.transform).toContain('rotateY(25deg)');
  });

  it('applies rotY style change on ArrowLeft key', () => {
    render(<TactilePropFallback propId="journal" />);
    const el = screen.getByRole('img');
    el.focus();
    fireEvent.keyDown(el, { key: 'ArrowLeft' });
    const svgWrapper = el.querySelector('.tactile-prop-fallback__svg');
    expect(svgWrapper.style.transform).toContain('rotateY(-25deg)');
  });

  it('rotates on ArrowUp (negative X tilt)', () => {
    render(<TactilePropFallback propId="tent" />);
    const el = screen.getByRole('img');
    el.focus();
    fireEvent.keyDown(el, { key: 'ArrowUp' });
    const svgWrapper = el.querySelector('.tactile-prop-fallback__svg');
    expect(svgWrapper.style.transform).toContain('rotateX(-15deg)');
  });

  it('renders the correct SVG for each prop', () => {
    ['lantern', 'journal', 'specimenJar', 'mailbox', 'tent'].forEach(propId => {
      const { container, unmount } = render(<TactilePropFallback propId={propId} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      unmount();
    });
  });
});
