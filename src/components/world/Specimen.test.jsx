import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Specimen from './Specimen';

describe('<Specimen>', () => {
  it('renders children', () => {
    render(<Specimen id="t1">hello</Specimen>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('applies seeded jitter rotation as CSS variable', () => {
    const { container } = render(<Specimen id="t1">x</Specimen>);
    const root = container.firstChild;
    expect(root).toHaveAttribute('style', expect.stringMatching(/--specimen-jitter:\s*-?\d+(\.\d+)?deg/));
  });

  it('does not jitter when id is missing', () => {
    const { container } = render(<Specimen>x</Specimen>);
    const root = container.firstChild;
    expect(root.style.getPropertyValue('--specimen-jitter')).toBe('0deg');
  });

  it('exposes data-pin attribute when pin prop set', () => {
    const { container } = render(<Specimen id="t1" pin="tape">x</Specimen>);
    expect(container.firstChild).toHaveAttribute('data-pin', 'tape');
  });

  it('supports size variants', () => {
    const { container } = render(<Specimen id="t1" size="lg">x</Specimen>);
    expect(container.firstChild).toHaveAttribute('data-size', 'lg');
  });
});
