import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import WorldSnapshotCard from './WorldSnapshotCard';

describe('<WorldSnapshotCard>', () => {
  it('renders without crashing for a campsite quest', () => {
    const quest = { career_pathway: 'history' };
    const { container } = render(<WorldSnapshotCard quest={quest} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with data-biome="campsite" for an unknown pathway', () => {
    const { container } = render(<WorldSnapshotCard quest={{ career_pathway: 'art' }} />);
    expect(container.firstChild).toHaveAttribute('data-biome', 'campsite');
  });

  it('renders with data-biome="lab" for a biology pathway', () => {
    const { container } = render(<WorldSnapshotCard quest={{ career_pathway: 'biology' }} />);
    expect(container.firstChild).toHaveAttribute('data-biome', 'lab');
  });

  it('renders with data-biome="workshop" for an engineering pathway', () => {
    const { container } = render(<WorldSnapshotCard quest={{ career_pathway: 'engineering' }} />);
    expect(container.firstChild).toHaveAttribute('data-biome', 'workshop');
  });

  it('shows a human-readable biome label', () => {
    const { container } = render(<WorldSnapshotCard quest={{ career_pathway: 'biology' }} />);
    const label = container.querySelector('.world-snapshot-card__label');
    expect(label?.textContent).toBe('Research Lab');
  });

  it('renders null for a null quest gracefully', () => {
    const { container } = render(<WorldSnapshotCard quest={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('respects an explicit biome_id when set', () => {
    const { container } = render(<WorldSnapshotCard quest={{ biome_id: 'lab', career_pathway: 'engineering' }} />);
    expect(container.firstChild).toHaveAttribute('data-biome', 'lab');
  });

  it('falls back to campsite for cabin biome_id (cabin is hub, not quest biome)', () => {
    const { container } = render(<WorldSnapshotCard quest={{ biome_id: 'cabin' }} />);
    expect(container.firstChild).toHaveAttribute('data-biome', 'campsite');
  });
});
