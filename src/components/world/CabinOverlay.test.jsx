import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CabinOverlay from './CabinOverlay';

const defaultProps = {
  role: 'wallMap',
  projects: [],
  completedProjects: [],
  skills: [],
  messages: [],
  onClose: vi.fn(),
  onMarkRead: vi.fn(),
};

function wrap(props = {}) {
  return render(
    <MemoryRouter>
      <CabinOverlay {...defaultProps} {...props} />
    </MemoryRouter>
  );
}

describe('<CabinOverlay>', () => {
  it('renders a dialog with aria-modal', () => {
    wrap();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders close button', () => {
    wrap();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap({ onClose });
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap({ onClose });
    await user.click(document.querySelector('.cabin-overlay__backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders WallMapPanel for wallMap role', () => {
    wrap({ role: 'wallMap' });
    expect(screen.getByText(/no active projects/i)).toBeInTheDocument();
  });

  it('renders SpecimenCabinetPanel for specimenCabinet role', () => {
    wrap({ role: 'specimenCabinet', skills: [] });
    expect(screen.getByText(/no skills yet/i)).toBeInTheDocument();
  });

  it('renders BulletinBoardPanel for bulletinBoard role', () => {
    wrap({ role: 'bulletinBoard', messages: [] });
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });
});
