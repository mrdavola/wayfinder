import { useMemo, useRef, useEffect } from 'react';
import MapLandmark from './MapLandmark';
import MapPath from './MapPath';
import ExplorerToken from './ExplorerToken';
import FogOverlay from './FogOverlay';
import { CheckCircle, Lock, ChevronRight } from 'lucide-react';

// ── Linear layout constants ──
const NODE_SPACING = 160;
const SVG_HEIGHT = 160;
const SVG_CENTER_Y = SVG_HEIGHT / 2;
const OFFSETS = [0, -14, 14, -8, 8];
const NODE_RADIUS = 28;

function getNodeX(i) { return 80 + i * NODE_SPACING; }
function getNodeY(i) { return SVG_CENTER_Y + OFFSETS[i % OFFSETS.length]; }

// ── Tier detection ──
function hasTierData(stages) {
  return stages.some(s => s.tier != null && s.tier > 0);
}

function buildTiers(stages) {
  const tiers = {};
  for (const s of stages) {
    const t = s.tier || 1;
    if (!tiers[t]) tiers[t] = { number: t, stages: [], label: null, requiredToAdvance: null };
    tiers[t].stages.push(s);
    if (s.tier_label) tiers[t].label = s.tier_label;
    if (s.required_to_advance) tiers[t].requiredToAdvance = s.required_to_advance;
  }
  const tierList = Object.values(tiers).sort((a, b) => a.number - b.number);
  const defaultLabels = ['Explore', 'Create', 'Share', 'Reflect'];
  tierList.forEach((tier, i) => {
    if (!tier.label) tier.label = defaultLabels[i] || `Tier ${tier.number}`;
    if (!tier.requiredToAdvance) tier.requiredToAdvance = tier.stages.length;
    tier.completed = tier.stages.filter(s => s.status === 'completed').length;
    tier.unlocked = tier.stages.some(s => s.status !== 'locked');
  });
  return tierList;
}

// ── Tier-based Map (HTML/CSS) ──
function TierMap({ stages, landmarks, activeCard, onNodeClick, studentName, studentEmoji }) {
  const scrollRef = useRef(null);
  const landmarkMap = useMemo(() => {
    const m = {};
    landmarks.forEach(l => { m[l.stage_id || l.stage_number] = l; });
    return m;
  }, [landmarks]);

  const tiers = useMemo(() => buildTiers(stages), [stages]);

  // Auto-scroll to the active tier
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeTierIdx = tiers.findIndex(t => t.unlocked && t.completed < t.stages.length);
    if (activeTierIdx > 0) {
      const tierEls = scrollRef.current.querySelectorAll('[data-tier-cluster]');
      if (tierEls[activeTierIdx]) {
        tierEls[activeTierIdx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [tiers]);

  return (
    <div
      ref={scrollRef}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        borderRadius: 12,
        background: 'rgba(27,73,101,0.03)',
        padding: '12px 16px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        minWidth: 'max-content',
        justifyContent: 'center',
      }}>
        {tiers.map((tier, ti) => {
          const isComplete = tier.completed >= tier.requiredToAdvance;
          return (
            <div key={tier.number} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {/* Tier cluster box */}
              <div
                data-tier-cluster
                style={{
                  background: tier.unlocked
                    ? isComplete ? 'rgba(45,106,79,0.06)' : 'rgba(184,134,11,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  border: tier.unlocked
                    ? isComplete ? '1.5px solid rgba(45,106,79,0.25)' : '1.5px solid rgba(184,134,11,0.2)'
                    : '1.5px dashed var(--pencil)',
                  borderRadius: 16,
                  padding: '10px 16px 8px',
                  opacity: tier.unlocked ? 1 : 0.5,
                  transition: 'all 300ms ease',
                  minWidth: tier.stages.length * 72 + 20,
                }}
              >
                {/* Tier label */}
                <div style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: tier.unlocked ? 'var(--graphite)' : 'var(--pencil)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  textAlign: 'center',
                  marginBottom: 8,
                }}>
                  {tier.label}
                </div>

                {/* Stage nodes */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}>
                  {tier.stages.map((stage) => {
                    const isDone = stage.status === 'completed';
                    const isActive = stage.status === 'active';
                    const isLocked = stage.status === 'locked';
                    const isSelected = activeCard === stage.id;
                    const lm = landmarkMap[stage.id] || landmarkMap[stage.stage_number];

                    return (
                      <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {/* Explorer token on selected/active stage */}
                        {isSelected && studentEmoji && (
                          <div style={{
                            fontSize: 14,
                            lineHeight: 1,
                            textAlign: 'center',
                            animation: 'sq-gentle-pulse 2s ease-in-out infinite',
                          }}>
                            {studentEmoji}
                          </div>
                        )}
                        <button
                          onClick={() => onNodeClick?.(stage.id)}
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            border: isSelected
                              ? '3px solid var(--lab-blue)'
                              : isDone
                                ? '2.5px solid var(--field-green)'
                                : isActive
                                  ? '2.5px solid var(--compass-gold)'
                                  : '2px solid var(--pencil)',
                            background: isDone
                              ? 'var(--field-green)'
                              : isActive
                                ? 'var(--compass-gold)'
                                : 'var(--parchment)',
                            color: isDone || isActive ? 'var(--chalk)' : 'var(--pencil)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                            opacity: isLocked ? 0.45 : 1,
                            transition: 'all 200ms ease',
                            boxShadow: isSelected
                              ? '0 0 0 4px rgba(27,73,101,0.15)'
                              : isActive
                                ? '0 2px 8px rgba(184,134,11,0.2)'
                                : 'none',
                            position: 'relative',
                          }}
                          aria-label={`${lm?.landmark_name || stage.title} — ${stage.status}`}
                        >
                          {isDone
                            ? <CheckCircle size={20} strokeWidth={2.5} />
                            : isLocked
                              ? <Lock size={16} strokeWidth={2} />
                              : <span style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 16,
                                  fontWeight: 700,
                                }}>{stage.stage_number}</span>
                          }
                        </button>
                        <span style={{
                          fontSize: 9,
                          fontFamily: 'var(--font-mono)',
                          color: isLocked ? 'var(--pencil)' : 'var(--graphite)',
                          opacity: isLocked ? 0.5 : 0.8,
                          textAlign: 'center',
                          maxWidth: 70,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {(lm?.landmark_name || stage.title || `Stage ${stage.stage_number}`).slice(0, 18)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress indicator */}
                <div style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: isComplete ? 'var(--field-green)' : 'var(--graphite)',
                  textAlign: 'center',
                  marginTop: 6,
                  opacity: 0.7,
                  fontWeight: isComplete ? 600 : 400,
                }}>
                  {isComplete
                    ? 'Complete'
                    : `${tier.completed} of ${tier.requiredToAdvance} needed`
                  }
                </div>
              </div>

              {/* Arrow connector between tiers */}
              {ti < tiers.length - 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 28,
                    height: 2,
                    background: isComplete ? 'var(--field-green)' : 'var(--pencil)',
                    opacity: isComplete ? 0.6 : 0.25,
                    borderRadius: 1,
                  }} />
                  <ChevronRight
                    size={16}
                    color={isComplete ? 'var(--field-green)' : 'var(--pencil)'}
                    style={{ opacity: isComplete ? 0.7 : 0.3, marginLeft: -4 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Linear Map (original SVG) ──
function LinearMap({
  stages, landmarks, activeCard, onNodeClick,
  studentName, studentEmoji, groupMembers, recentlyCompleted,
}) {
  const scrollRef = useRef(null);
  const landmarkMap = useMemo(() => {
    const m = {};
    landmarks.forEach(l => { m[l.stage_id || l.stage_number] = l; });
    return m;
  }, [landmarks]);

  const svgWidth = stages.length * NODE_SPACING + 100;
  const activeStageIndex = stages.findIndex(s => s.status === 'active');

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

          {activeStageIndex >= 0 && (
            <ExplorerToken
              cx={getNodeX(activeStageIndex)}
              cy={getNodeY(activeStageIndex) - NODE_RADIUS - 16}
              emoji={studentEmoji}
              name={studentName}
            />
          )}

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

// ── Exported component — auto-detects tier vs linear ──
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
  if (hasTierData(stages)) {
    return (
      <TierMap
        stages={stages}
        landmarks={landmarks}
        activeCard={activeCard}
        onNodeClick={onNodeClick}
        studentName={studentName}
        studentEmoji={studentEmoji}
      />
    );
  }

  return (
    <LinearMap
      stages={stages}
      landmarks={landmarks}
      activeCard={activeCard}
      onNodeClick={onNodeClick}
      studentName={studentName}
      studentEmoji={studentEmoji}
      groupMembers={groupMembers}
      recentlyCompleted={recentlyCompleted}
    />
  );
}
