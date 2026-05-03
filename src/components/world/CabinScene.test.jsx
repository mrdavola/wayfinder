import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadCabinData: vi.fn().mockResolvedValue({
      projects: [
        { id: 'q1', title: 'Wetlands Study', status: 'active', biome_id: 'campsite', completed_at: null },
      ],
      completedProjects: [],
      skills: [],
      messages: [],
    }),
  };
});

import CabinScene from './CabinScene';

function wrap() {
  return render(<MemoryRouter><CabinScene studentId="stu-1" /></MemoryRouter>);
}

describe('<CabinScene>', () => {
  it('renders without crashing', () => {
    wrap();
    expect(document.body).toBeTruthy();
  });

  it('renders three hotspot buttons after data loads', async () => {
    wrap();
    await waitFor(() => {
      const hotspots = document.querySelectorAll('button.hotspot');
      expect(hotspots.length).toBe(3);
    });
  });

  it('each hotspot has a data-role matching cabin config', async () => {
    wrap();
    await waitFor(() => {
      expect(document.querySelector('[data-role="wallMap"]')).toBeTruthy();
      expect(document.querySelector('[data-role="specimenCabinet"]')).toBeTruthy();
      expect(document.querySelector('[data-role="bulletinBoard"]')).toBeTruthy();
    });
  });
});
