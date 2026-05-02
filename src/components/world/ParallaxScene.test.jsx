import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ParallaxScene from './ParallaxScene';

const layers = { back: '/back.svg', mid: '/mid.svg', fore: '/fore.svg' };

describe('<ParallaxScene>', () => {
  it('renders three positioned layer elements', () => {
    const { container } = render(<ParallaxScene layers={layers} />);
    expect(container.querySelectorAll('[data-layer="back"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-layer="mid"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-layer="fore"]')).toHaveLength(1);
  });

  it('renders children above the foreground layer', () => {
    const { container } = render(
      <ParallaxScene layers={layers}>
        <div data-testid="child" />
      </ParallaxScene>
    );
    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it('exposes data-reduced-motion when calmMode is true', () => {
    const { container } = render(<ParallaxScene layers={layers} calmMode />);
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true');
  });
});
