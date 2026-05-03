import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HotspotOverlay from './HotspotOverlay';

const baseProps = {
  role: 'trailheadSign',
  quest: { id: 'q1', title: 'Intro to Ecology', description: 'Explore local ecosystems.' },
  stage: null,
  studentSession: { studentName: 'Alex', studentId: 'sid1' },
  onClose: vi.fn(),
};

describe('<HotspotOverlay>', () => {
  it('renders without crashing', () => {
    render(<HotspotOverlay {...baseProps} />);
    expect(document.body).toBeTruthy();
  });

  it('shows quest title for trailheadSign role', () => {
    render(<HotspotOverlay {...baseProps} />);
    // Title appears in both the ProjectBanner fallback and the panel header,
    // so use getAllByText to assert at least one match.
    expect(screen.getAllByText('Intro to Ecology').length).toBeGreaterThan(0);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<HotspotOverlay {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders stage title for stage role', () => {
    render(
      <HotspotOverlay
        {...baseProps}
        role="stage"
        stage={{ id: 's1', title: 'Observe the Forest', description: 'Go outside.', challenge: 'What do you notice?', stage_number: 1 }}
      />
    );
    expect(screen.getByText('Observe the Forest')).toBeInTheDocument();
  });

  it('renders mailbox heading for mailbox role', () => {
    render(<HotspotOverlay {...baseProps} role="mailbox" feedback={[]} />);
    expect(screen.getByText(/mailbox/i)).toBeInTheDocument();
  });

  it('adds data-role attribute for styling', () => {
    const { container } = render(<HotspotOverlay {...baseProps} role="guide" />);
    expect(container.querySelector('[data-role="guide"]')).toBeTruthy();
  });
});
