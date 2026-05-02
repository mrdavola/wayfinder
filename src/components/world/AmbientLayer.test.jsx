// src/components/world/AmbientLayer.test.jsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AmbientLayer from './AmbientLayer';

describe('<AmbientLayer>', () => {
  it('renders without crashing with campsite ambient array', () => {
    const { container } = render(
      <AmbientLayer ambient={['lanternFlicker', 'mothFlutter', 'leafFall', 'paperCurl']} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders nothing when ambient is empty', () => {
    const { container } = render(<AmbientLayer ambient={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('adds data-calm attribute when calmMode is true', () => {
    const { container } = render(
      <AmbientLayer ambient={['lanternFlicker']} calmMode />
    );
    expect(container.firstChild).toHaveAttribute('data-calm', 'true');
  });

  it('renders a lanternFlicker element for campsite', () => {
    const { container } = render(<AmbientLayer ambient={['lanternFlicker']} />);
    expect(container.querySelector('[data-ambient="lanternFlicker"]')).toBeTruthy();
  });
});
