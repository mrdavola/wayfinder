import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulletinBoardPanel from './BulletinBoardPanel';

const messages = [
  { id: 'm1', source: 'guide',    content: 'Great observation!',  created_at: '2026-05-01T10:00:00Z', read_at: null,  sortKey: '2026-05-01T10:00:00Z' },
  { id: 'm2', source: 'feedback', warm_feedback: 'Strong work.',  created_at: '2026-04-28T09:00:00Z', sortKey: '2026-04-28T09:00:00Z' },
  { id: 'm3', source: 'parent',   expectations: 'Very proud of you!', onboarded_at: '2026-04-27T08:00:00Z', sortKey: '2026-04-27T08:00:00Z' },
];

describe('<BulletinBoardPanel>', () => {
  it('renders all message cards', () => {
    render(<BulletinBoardPanel messages={messages} onMarkRead={() => {}} />);
    expect(screen.getByText('Great observation!')).toBeInTheDocument();
    expect(screen.getByText('Strong work.')).toBeInTheDocument();
    expect(screen.getByText('Very proud of you!')).toBeInTheDocument();
  });

  it('labels sources correctly', () => {
    render(<BulletinBoardPanel messages={messages} onMarkRead={() => {}} />);
    expect(screen.getByText(/from guide/i)).toBeInTheDocument();
    expect(screen.getByText(/feedback/i)).toBeInTheDocument();
    expect(screen.getByText(/from home/i)).toBeInTheDocument();
  });

  it('calls onMarkRead when a guide message is clicked', async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    render(<BulletinBoardPanel messages={[messages[0]]} onMarkRead={onMarkRead} />);
    await user.click(screen.getByText('Great observation!'));
    expect(onMarkRead).toHaveBeenCalledWith('m1');
  });

  it('shows empty state when no messages', () => {
    render(<BulletinBoardPanel messages={[]} onMarkRead={() => {}} />);
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });
});
