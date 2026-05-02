import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('vitest smoke', () => {
  it('renders a div', () => {
    render(<div data-testid="hi">hello</div>);
    expect(screen.getByTestId('hi')).toHaveTextContent('hello');
  });
});
