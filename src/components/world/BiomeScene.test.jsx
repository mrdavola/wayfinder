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

  it('renders an <img> at the guide hotspot when quest.character_image_url is set', () => {
    const questWithPortrait = { ...quest, character_image_url: 'https://cdn.fal.ai/portrait.png' };
    render(<BiomeScene quest={questWithPortrait} stages={stages} studentSession={session} />);
    // guide hotspot container is aria-hidden; use { hidden: true } to reach inside it
    const img = screen.getByRole('img', { name: 'Your field guide', hidden: true });
    expect(img.tagName.toLowerCase()).toBe('img');
    expect(img).toHaveAttribute('src', 'https://cdn.fal.ai/portrait.png');
  });

  it('renders CharacterPortrait SVG fallback at the guide hotspot when character_image_url is null', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    // guide hotspot container is aria-hidden; use { hidden: true } to reach inside it
    const svg = screen.getByRole('img', { name: 'Your field guide', hidden: true });
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });
});
