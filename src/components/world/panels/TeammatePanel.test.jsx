import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeammatePanel from './TeammatePanel';

const teammate = { student_id: 'sid1', name: 'Jordan', role: 'Lead Researcher', avatar_emoji: '🦊' };

describe('<TeammatePanel>', () => {
  it('renders the teammate name', () => {
    render(<TeammatePanel teammate={teammate} />);
    expect(screen.getByText('Jordan')).toBeInTheDocument();
  });

  it('renders the group role when provided', () => {
    render(<TeammatePanel teammate={teammate} />);
    expect(screen.getByText('Lead Researcher')).toBeInTheDocument();
  });

  it('renders avatar_emoji when provided', () => {
    render(<TeammatePanel teammate={teammate} />);
    expect(screen.getByText('🦊')).toBeInTheDocument();
  });

  it('renders a fallback avatar when avatar_emoji is null', () => {
    render(<TeammatePanel teammate={{ ...teammate, avatar_emoji: null }} />);
    // First letter of name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders a graceful empty state when teammate is null', () => {
    render(<TeammatePanel teammate={null} />);
    expect(screen.getByText(/no teammate/i)).toBeInTheDocument();
  });

  it('renders a friendly description paragraph', () => {
    render(<TeammatePanel teammate={teammate} />);
    expect(screen.getByText(/working on this project/i)).toBeInTheDocument();
  });
});
