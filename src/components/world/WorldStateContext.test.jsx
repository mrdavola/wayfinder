import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { WorldStateProvider, useWorldState } from './WorldStateContext';

function Probe({ onState }) {
  const s = useWorldState();
  onState(s);
  return null;
}

describe('<WorldStateProvider>', () => {
  it('provides default world state', () => {
    let captured;
    render(
      <WorldStateProvider>
        <Probe onState={(s) => (captured = s)} />
      </WorldStateProvider>
    );
    expect(captured.zoomedHotspot).toBeNull();
    expect(captured.calmMode).toBe(false);
  });

  it('zoomTo / zoomOut updates active hotspot', () => {
    let captured;
    render(
      <WorldStateProvider>
        <Probe onState={(s) => (captured = s)} />
      </WorldStateProvider>
    );
    act(() => captured.zoomTo('hotspot-1'));
    expect(captured.zoomedHotspot).toBe('hotspot-1');
    act(() => captured.zoomOut());
    expect(captured.zoomedHotspot).toBeNull();
  });

  it('toggleCalmMode flips calmMode', () => {
    let captured;
    render(
      <WorldStateProvider>
        <Probe onState={(s) => (captured = s)} />
      </WorldStateProvider>
    );
    act(() => captured.toggleCalmMode());
    expect(captured.calmMode).toBe(true);
  });
});
