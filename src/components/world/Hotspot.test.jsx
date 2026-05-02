import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Hotspot from './Hotspot';

describe('<Hotspot>', () => {
  it('renders a button with role-derived aria-label', () => {
    render(<Hotspot id="h1" role="guide" x="50%" y="70%" label="Talk to your guide" />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAccessibleName('Talk to your guide');
  });

  it('positions absolutely using x/y percentages', () => {
    const { container } = render(<Hotspot id="h1" role="guide" x="50%" y="70%" label="x" />);
    const btn = container.querySelector('button');
    expect(btn).toHaveStyle({ left: '50%', top: '70%' });
  });

  it('marks aria-disabled when state is future', () => {
    render(<Hotspot id="h1" role="stage" x="0%" y="0%" label="x" state="future" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('fires onActivate on click and keyboard Enter', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Hotspot id="h1" role="guide" x="0%" y="0%" label="x" onActivate={onActivate} />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    btn.focus();
    await user.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it('does not fire onActivate when state is future', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Hotspot id="h1" role="guide" x="0%" y="0%" label="x" state="future" onActivate={onActivate} />);
    await user.click(screen.getByRole('button'));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('exposes data-state and data-role for styling', () => {
    const { container } = render(<Hotspot id="h1" role="stage" x="0%" y="0%" label="x" state="active" />);
    expect(container.querySelector('button')).toHaveAttribute('data-role', 'stage');
    expect(container.querySelector('button')).toHaveAttribute('data-state', 'active');
  });
});
