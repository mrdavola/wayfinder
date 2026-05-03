import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useViewMode } from './useViewMode';

function Probe() {
  const { mode, isList, isWorld } = useViewMode();
  return <div data-testid="mode">{mode}|{String(isList)}|{String(isWorld)}</div>;
}

function renderAt(url) {
  return render(<MemoryRouter initialEntries={[url]}><Probe/></MemoryRouter>);
}

describe('useViewMode', () => {
  it('defaults to list when no query param (world view is opt-in for now)', () => {
    renderAt('/q/abc');
    expect(screen.getByTestId('mode')).toHaveTextContent('list|true|false');
  });

  it('returns world when view=world', () => {
    renderAt('/q/abc?view=world');
    expect(screen.getByTestId('mode')).toHaveTextContent('world|false|true');
  });

  it('returns list when view=list', () => {
    renderAt('/q/abc?view=list');
    expect(screen.getByTestId('mode')).toHaveTextContent('list|true|false');
  });

  it('falls back to list for unknown values', () => {
    renderAt('/q/abc?view=zebra');
    expect(screen.getByTestId('mode')).toHaveTextContent('list|true|false');
  });
});
