import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CharacterPortrait from './CharacterPortrait';

describe('<CharacterPortrait>', () => {
  it('renders an <img> when imageUrl is provided', () => {
    const { container } = render(
      <CharacterPortrait imageUrl="https://cdn.fal.ai/portrait.png" />
    );
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('img src matches the provided imageUrl', () => {
    const { container } = render(
      <CharacterPortrait imageUrl="https://cdn.fal.ai/portrait.png" />
    );
    expect(container.querySelector('img').getAttribute('src')).toBe('https://cdn.fal.ai/portrait.png');
  });

  it('img has accessible alt text from the label prop', () => {
    const { container } = render(
      <CharacterPortrait imageUrl="https://cdn.fal.ai/portrait.png" label="Your field guide" />
    );
    expect(container.querySelector('img').alt).toBe('Your field guide');
  });

  it('renders <FieldFigure> SVG when imageUrl is null', () => {
    const { container } = render(<CharacterPortrait imageUrl={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders <FieldFigure> SVG when imageUrl is undefined', () => {
    const { container } = render(<CharacterPortrait />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('forwards outfit figureProps to FieldFigure', () => {
    const { container } = render(
      <CharacterPortrait imageUrl={null} figureProps={{ outfit: 'lab' }} />
    );
    // lab outfit body color = #e8e8e0
    const body = container.querySelector('[data-feature="body"]');
    expect(body?.getAttribute('fill')).toBe('#e8e8e0');
  });
});
