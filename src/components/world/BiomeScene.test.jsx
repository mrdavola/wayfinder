import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BiomeScene from './BiomeScene';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const quest = {
  id: 'q1',
  title: 'Intro to Ecology',
  description: 'Explore ecosystems.',
  biome_id: 'campsite',
  character_image_url: null,
};

const stages = [
  { id: 's1', stage_number: 1, title: 'Observe', status: 'active',  biomeState: 'active' },
  { id: 's2', stage_number: 2, title: 'Analyze', status: 'locked',  biomeState: 'future' },
  { id: 's3', stage_number: 3, title: 'Reflect',  status: 'locked',  biomeState: 'future' },
];

const session = { studentName: 'Alex', studentId: 'sid1', pin: '' };

describe('<BiomeScene>', () => {
  it('renders without crashing', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    expect(document.body).toBeTruthy();
  });

  it('renders hotspot buttons (at least one per campsite config)', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const buttons = document.querySelectorAll('button.hotspot');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('first stage hotspot has data-state=active', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const active = document.querySelector('button.hotspot[data-role="stage"][data-state="active"]');
    expect(active).toBeTruthy();
  });

  it('later stage hotspots have data-state=future', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const future = document.querySelectorAll('button.hotspot[data-state="future"]');
    expect(future.length).toBeGreaterThanOrEqual(1);
  });
});
