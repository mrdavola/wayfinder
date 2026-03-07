import { useMemo, useRef, useEffect } from 'react';
import MapLandmark from './MapLandmark';
import MapPath from './MapPath';
import ExplorerToken from './ExplorerToken';
import FogOverlay from './FogOverlay';

const NODE_SPACING = 160;
const SVG_HEIGHT = 160;
const SVG_CENTER_Y = SVG_HEIGHT / 2;
const OFFSETS = [0, -14, 14, -8, 8];
const NODE_RADIUS = 28;

function getNodeX(i) { return 80 + i * NODE_SPACING; }
function getNodeY(i) { return SVG_CENTER_Y + OFFSETS[i % OFFSETS.length]; }

export default function TreasureMap({
  stages = [],
  landmarks = [],
  activeCard,
  onNodeClick,
  studentName,
  studentEmoji,
  groupMembers = [],
  recentlyCompleted,
  horizontal = true,
}) {
  const scrollRef = useRef(null);
  const landmarkMap = useMemo(() => {
    const m = {};
    landmarks.forEach(l => { m[l.stage_id || l.stage_number] = l; });
    return m;
  }, [landmarks]);

  const svgWidth = stages.length * NODE_SPACING + 100;
  const activeStageIndex = stages.findIndex(s => s.status === 'active');

  // Auto-scroll to active stage
  useEffect(() => {
    if (activeStageIndex >= 0 && scrollRef.current) {
      const targetX = getNodeX(activeStageIndex) - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
    }
  }, [activeStageIndex, stages.length]);

  return (
    <div
      ref={scrollRef}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        borderRadius: 12,
        background: 'rgba(27,73,101,0.03)',
        padding: '4px 0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', minWidth: svgWidth }}>
      <svg
        width={svgWidth}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`}
        style={{ display: 'block' }}
      >
        {/* Connecting paths */}
        {stages.map((stage, i) => {
          if (i === 0) return null;
          const prev = stages[i - 1];
          return (
            <MapPath
              key={`path-${i}`}
              x1={getNodeX(i - 1) + NODE_RADIUS} y1={getNodeY(i - 1)}
              x2={getNodeX(i) - NODE_RADIUS} y2={getNodeY(i)}
              status={prev.status === 'completed' ? 'completed' : 'locked'}
              animated={recentlyCompleted === prev.id}
            />
          );
        })}

        {/* Fog for locked stages */}
        {stages.map((stage, i) => (
          stage.status === 'locked' && (
            <FogOverlay
              key={`fog-${stage.id}`}
              cx={getNodeX(i)} cy={getNodeY(i)}
              radius={50}
              clearing={false}
            />
          )
        ))}

        {/* Stage nodes */}
        {stages.map((stage, i) => (
          <g key={stage.id} style={{ scrollSnapAlign: 'center' }}>
            <MapLandmark
              cx={getNodeX(i)} cy={getNodeY(i)}
              stage={stage}
              landmark={landmarkMap[stage.id] || landmarkMap[stage.stage_number]}
              isSelected={activeCard === stage.id}
              isActive={stage.status === 'active'}
              onClick={() => onNodeClick?.(stage.id)}
            />
          </g>
        ))}

        {/* Explorer token on active stage */}
        {activeStageIndex >= 0 && (
          <ExplorerToken
            cx={getNodeX(activeStageIndex)}
            cy={getNodeY(activeStageIndex) - NODE_RADIUS - 16}
            emoji={studentEmoji}
            name={studentName}
          />
        )}

        {/* Group members */}
        {groupMembers.map((member, idx) => {
          const memberStageIdx = stages.findIndex(s => s.id === member.current_stage_id);
          if (memberStageIdx < 0) return null;
          return (
            <ExplorerToken
              key={member.student_id}
              cx={getNodeX(memberStageIdx)}
              cy={getNodeY(memberStageIdx) + NODE_RADIUS + 14 + (idx * 18)}
              emoji={member.avatar_emoji}
              name={member.name}
            />
          );
        })}
      </svg>
      </div>
    </div>
  );
}
