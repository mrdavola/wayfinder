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

  it('auto-suggests lab biome for biology career_pathway when biome_id is absent', () => {
    const labQuest = { id: 'q2', title: 'Ecosystems', career_pathway: 'biology', character_image_url: null };
    const { container } = render(<BiomeScene quest={labQuest} stages={stages} studentSession={session} />);
    const backLayer = container.querySelector('[data-layer="back"]');
    expect(backLayer).toHaveAttribute('src', expect.stringContaining('/biomes/lab/'));
  });

  it('auto-suggests workshop biome for engineering career_pathway when biome_id is absent', () => {
    const workshopQuest = { id: 'q3', title: 'Build It', career_pathway: 'engineering', character_image_url: null };
    const { container } = render(<BiomeScene quest={workshopQuest} stages={stages} studentSession={session} />);
    const backLayer = container.querySelector('[data-layer="back"]');
    expect(backLayer).toHaveAttribute('src', expect.stringContaining('/biomes/workshop/'));
  });

  it('defaults to campsite when quest has no biome_id or career_pathway', () => {
    const bareQuest = { id: 'q4', title: 'Unknown', character_image_url: null };
    const { container } = render(<BiomeScene quest={bareQuest} stages={stages} studentSession={session} />);
    const backLayer = container.querySelector('[data-layer="back"]');
    expect(backLayer).toHaveAttribute('src', expect.stringContaining('/biomes/campsite/'));
  });

  it('renders a teammate hotspot when teammates prop is provided', () => {
    const teammates = [{ student_id: 'sid2', name: 'Jordan', role: 'Lead', avatar_emoji: '🦊' }];
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} teammates={teammates} />);
    const teammateBtn = document.querySelector('button.hotspot[data-role="teammate"]');
    expect(teammateBtn).toBeTruthy();
  });

  it('teammate hotspot has accessible name with teammate name', () => {
    const teammates = [{ student_id: 'sid2', name: 'Jordan', role: '', avatar_emoji: null }];
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} teammates={teammates} />);
    const teammateBtn = document.querySelector('button.hotspot[data-role="teammate"]');
    expect(teammateBtn?.getAttribute('aria-label')).toContain('Jordan');
  });

  it('renders no teammate hotspots when teammates is empty', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} teammates={[]} />);
    const tmBtns = document.querySelectorAll('button.hotspot[data-role="teammate"]');
    expect(tmBtns).toHaveLength(0);
  });

  it('renders no teammate hotspots when teammates prop is omitted', () => {
    render(<BiomeScene quest={quest} stages={stages} studentSession={session} />);
    const tmBtns = document.querySelectorAll('button.hotspot[data-role="teammate"]');
    expect(tmBtns).toHaveLength(0);
  });
});
