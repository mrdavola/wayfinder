// src/components/world/FieldFigure.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FieldFigure from './FieldFigure';

describe('<FieldFigure>', () => {
  it('renders an SVG element', () => {
    const { container } = render(<FieldFigure />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('has an accessible label', () => {
    const { container } = render(<FieldFigure label="Your field guide" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Your field guide');
  });

  it('uses provided size', () => {
    const { container } = render(<FieldFigure size={120} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('mood=happy renders a smile arc', () => {
    const { container } = render(<FieldFigure mood="happy" />);
    const smile = container.querySelector('[data-feature="mouth-happy"]');
    expect(smile).toBeTruthy();
  });

  it('mood=neutral renders a straight mouth', () => {
    const { container } = render(<FieldFigure mood="neutral" />);
    const mouth = container.querySelector('[data-feature="mouth-neutral"]');
    expect(mouth).toBeTruthy();
  });

  it('outfit=lab renders lab-coat color body', () => {
    const { container } = render(<FieldFigure outfit="lab" />);
    const body = container.querySelector('[data-feature="body"]');
    expect(body).toHaveAttribute('fill', '#e8e8e0');
  });

  it('outfit=field renders field-vest color body', () => {
    const { container } = render(<FieldFigure outfit="field" />);
    const body = container.querySelector('[data-feature="body"]');
    expect(body).toHaveAttribute('fill', '#8a7050');
  });
});
