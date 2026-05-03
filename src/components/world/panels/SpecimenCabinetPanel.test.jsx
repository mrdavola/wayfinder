import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpecimenCabinetPanel from './SpecimenCabinetPanel';

const skills = [
  { id: 'sk1', name: 'Observation',   category: 'science', proficiency: 'proficient'  },
  { id: 'sk2', name: 'Teamwork',      category: 'social',  proficiency: 'emerging'    },
  { id: 'sk3', name: 'Data Analysis', category: 'science', proficiency: null          },
];

describe('<SpecimenCabinetPanel>', () => {
  it('renders skill names', () => {
    render(<SpecimenCabinetPanel skills={skills} />);
    expect(screen.getByText('Observation')).toBeInTheDocument();
    expect(screen.getByText('Teamwork')).toBeInTheDocument();
    expect(screen.getByText('Data Analysis')).toBeInTheDocument();
  });

  it('marks earned skills (proficient/advanced) with data-tier=earned', () => {
    const { container } = render(<SpecimenCabinetPanel skills={skills} />);
    const earned = container.querySelectorAll('[data-tier="earned"]');
    expect(earned.length).toBe(1);
  });

  it('marks in-progress skills (emerging/developing) with data-tier=progress', () => {
    const { container } = render(<SpecimenCabinetPanel skills={skills} />);
    const progress = container.querySelectorAll('[data-tier="progress"]');
    expect(progress.length).toBe(1);
  });

  it('marks locked skills (null/missing) with data-tier=locked', () => {
    const { container } = render(<SpecimenCabinetPanel skills={skills} />);
    const locked = container.querySelectorAll('[data-tier="locked"]');
    expect(locked.length).toBe(1);
  });

  it('shows empty state when no skills', () => {
    render(<SpecimenCabinetPanel skills={[]} />);
    expect(screen.getByText(/no skills yet/i)).toBeInTheDocument();
  });
});
