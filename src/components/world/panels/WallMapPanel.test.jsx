import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WallMapPanel from './WallMapPanel';

const projects = [
  { id: 'q1', title: 'Wetlands Study',  status: 'active',    biome_id: 'campsite' },
  { id: 'q2', title: 'Cell Biology',    status: 'active',    biome_id: 'lab'      },
  { id: 'q3', title: 'No Biome Quest',  status: 'active',    biome_id: null       },
];

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('<WallMapPanel>', () => {
  it('renders project titles', () => {
    wrap(<WallMapPanel projects={projects} completedProjects={[]} />);
    expect(screen.getByText('Wetlands Study')).toBeInTheDocument();
    expect(screen.getByText('Cell Biology')).toBeInTheDocument();
  });

  it('groups active projects under their biome', () => {
    wrap(<WallMapPanel projects={projects} completedProjects={[]} />);
    expect(screen.getByText(/campsite/i)).toBeInTheDocument();
    expect(screen.getByText(/lab/i)).toBeInTheDocument();
  });

  it('shows unassigned section for null-biome projects', () => {
    wrap(<WallMapPanel projects={projects} completedProjects={[]} />);
    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
    expect(screen.getByText('No Biome Quest')).toBeInTheDocument();
  });

  it('renders an empty state when no projects', () => {
    wrap(<WallMapPanel projects={[]} completedProjects={[]} />);
    expect(screen.getByText(/no active projects/i)).toBeInTheDocument();
  });

  it('each active project is a link', () => {
    wrap(<WallMapPanel projects={[projects[0]]} completedProjects={[]} />);
    const link = screen.getByRole('link', { name: /Wetlands Study/i });
    expect(link).toHaveAttribute('href', '/world/q1');
  });

  it('project without biome_id links to legacy /q/:id', () => {
    wrap(<WallMapPanel projects={[projects[2]]} completedProjects={[]} />);
    const link = screen.getByRole('link', { name: /No Biome Quest/i });
    expect(link).toHaveAttribute('href', '/q/q3');
  });
});
