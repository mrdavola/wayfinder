import { useCallback, useEffect, useState } from 'react';
import './CabinScene.css';
import { getBiome } from '../../biomes';
import { loadCabinData } from '../../lib/api';
import ParallaxScene from './ParallaxScene';
import Hotspot from './Hotspot';
import AmbientLayer from './AmbientLayer';
import Specimen from './Specimen';
import CabinOverlay from './CabinOverlay';
import { WorldStateProvider, useWorldState } from './WorldStateContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ROLE_LABELS = {
  wallMap:         'Wall map — view your projects',
  specimenCabinet: 'Specimen cabinet — review your skills',
  bulletinBoard:   'Bulletin board — check your messages',
};

function SceneInner({ studentId }) {
  const cfg = getBiome('cabin');
  const systemReduced = useReducedMotion();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState({
    projects: [],
    completedProjects: [],
    skills: [],
    messages: [],
  });

  useEffect(() => {
    let cancelled = false;
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    loadCabinData(studentId)
      .then((res) => {
        if (cancelled) return;
        setData({
          projects:          res?.projects          ?? [],
          completedProjects: res?.completedProjects ?? [],
          skills:            res?.skills            ?? [],
          messages:          res?.messages          ?? [],
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? 'Failed to load cabin');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [studentId]);

  const handleActivate = useCallback((role) => {
    zoomTo(role);
  }, [zoomTo]);

  const handleMarkRead = useCallback((messageId) => {
    setData((prev) => ({
      ...prev,
      messages: prev.messages.filter(m => m.id !== messageId),
    }));
  }, []);

  if (loading) {
    return <div className="cabin-scene__loading">Loading cabin…</div>;
  }
  if (error) {
    return (
      <div className="cabin-scene__error">
        <p>Couldn’t load your cabin.</p>
        <p style={{ fontSize: 12, color: 'var(--graphite)' }}>{error}</p>
      </div>
    );
  }

  const activeRole = zoomedHotspot;
  const { projects, completedProjects, skills, messages } = data;

  return (
    <div className="cabin-scene">
      <ParallaxScene layers={cfg.layers} calmMode={systemReduced}>
        <AmbientLayer ambient={cfg.ambient} calmMode={systemReduced} />

        {cfg.hotspots.map((h, i) => (
          <Hotspot
            key={`${h.role}-${i}`}
            id={h.role}
            role={h.role}
            x={h.x}
            y={h.y}
            label={ROLE_LABELS[h.role] ?? h.role}
            state="active"
            onActivate={() => handleActivate(h.role)}
          />
        ))}

        {completedProjects.length > 0 && (
          <div className="cabin-scene__artifacts">
            {completedProjects.map((p, i) => (
              <Specimen
                key={p.id}
                id={p.id}
                size="sm"
                pin={i % 2 === 0 ? 'pin' : 'tape'}
                className="cabin-scene__artifact"
              >
                {p.title}
              </Specimen>
            ))}
          </div>
        )}
      </ParallaxScene>

      {activeRole && (
        <CabinOverlay
          role={activeRole}
          projects={projects}
          completedProjects={completedProjects}
          skills={skills}
          messages={messages}
          onClose={zoomOut}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}

export default function CabinScene({ studentId }) {
  return (
    <WorldStateProvider>
      <SceneInner studentId={studentId} />
    </WorldStateProvider>
  );
}
