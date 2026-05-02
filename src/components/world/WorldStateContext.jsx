import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const WorldStateCtx = createContext(null);

/** @returns {{
 *   zoomedHotspot: string | null,
 *   zoomTo: (id: string) => void,
 *   zoomOut: () => void,
 *   calmMode: boolean,
 *   toggleCalmMode: () => void,
 * }} */
export function useWorldState() {
  const ctx = useContext(WorldStateCtx);
  if (!ctx) throw new Error('useWorldState must be used inside <WorldStateProvider>');
  return ctx;
}

export function WorldStateProvider({ children, initialCalmMode = false }) {
  const [zoomedHotspot, setZoomed] = useState(null);
  const [calmMode, setCalmMode] = useState(initialCalmMode);

  const zoomTo = useCallback((id) => setZoomed(id), []);
  const zoomOut = useCallback(() => setZoomed(null), []);
  const toggleCalmMode = useCallback(() => setCalmMode(v => !v), []);

  const value = useMemo(
    () => ({ zoomedHotspot, zoomTo, zoomOut, calmMode, toggleCalmMode }),
    [zoomedHotspot, zoomTo, zoomOut, calmMode, toggleCalmMode],
  );

  return <WorldStateCtx.Provider value={value}>{children}</WorldStateCtx.Provider>;
}
