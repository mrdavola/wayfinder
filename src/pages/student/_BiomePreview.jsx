// src/pages/student/_BiomePreview.jsx
import { useParams } from 'react-router-dom';
import { getBiome } from '../../biomes';
import ParallaxScene from '../../components/world/ParallaxScene';
import Hotspot from '../../components/world/Hotspot';
import Specimen from '../../components/world/Specimen';
import { WorldStateProvider, useWorldState } from '../../components/world/WorldStateContext';

const ROLE_LABELS = {
  trailheadSign: 'Trailhead — driving question',
  stage:         'Stage location',
  guide:         'Talk to your guide',
  bulletinSubmit:'Pin a deliverable',
  mailbox:       'Read your mail',
  challenger:    'Stranger by the path',
  reflection:    'Open your journal',
  stretch:       'Side trail',
  teammate:      'Teammate camp',
  parentLetter:  'Letter from home',
};

function PreviewInner() {
  const { questId } = useParams();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();
  const cfg = getBiome('campsite');
  return (
    <ParallaxScene layers={cfg.layers}>
      {cfg.hotspots.map((h, i) => (
        <Hotspot
          key={i}
          id={`${h.role}-${i}`}
          role={h.role}
          x={h.x}
          y={h.y}
          label={ROLE_LABELS[h.role] || h.role}
          state={h.role === 'stage' && h.stageIndex > 0 ? 'future' : 'active'}
          onActivate={() => zoomTo(`${h.role}-${i}`)}
        />
      ))}
      {zoomedHotspot && (
        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10 }}>
          <Specimen id={zoomedHotspot} pin="pin">
            <strong>Zoomed:</strong> {zoomedHotspot}
            <button onClick={zoomOut} style={{ marginLeft: 12 }}>back</button>
          </Specimen>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 16, right: 16, color: '#5a4a30' }}>
        Quest preview: {questId}
      </div>
    </ParallaxScene>
  );
}

export default function BiomePreview() {
  return (
    <WorldStateProvider>
      <PreviewInner />
    </WorldStateProvider>
  );
}
