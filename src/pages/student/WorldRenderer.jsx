import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Compass, MessageCircle, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { xp } from '../../lib/api';
import { blueprintToCSSVars, AMBIENT_PRESETS, getParticleCSS } from '../../lib/worldEngine';
import { getStudentSession } from '../../lib/studentSession';
import useAmbientSound from '../../hooks/useAmbientSound';
import WorldChat from '../../components/world/WorldChat';
import XPToast from '../../components/xp/XPToast';
import ExplorerRankBadge from '../../components/xp/ExplorerRankBadge';

// Map blueprint ambientAudio presets → useAmbientSound sound types
const PRESET_TO_SOUND = {
  'underwater-deep': 'ocean',
  'forest-canopy': 'birds',
  'mountain-summit': 'wind',
  'space-station': null,       // no matching sound
  'desert-ruins': 'wind',
  'urban-night': 'rain',
  'volcanic-cave': 'campfire',
  'arctic-ice': 'wind',
  'jungle-river': 'river',
  'storm-coast': 'ocean',
};

// ===================== ATMOSPHERE LAYER =====================
function AtmosphereLayer({ particleType }) {
  const config = getParticleCSS(particleType);
  const count = config.count || 15;

  // Stable animation name scoped to particle type to avoid keyframe collisions
  const animName = `world-particle-${particleType || 'dust'}`;

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 6 + Math.random() * 10,
      delay: Math.random() * 8,
      duration: parseFloat(config.speed) + Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.3,
    }));
  }, [particleType, count, config.speed]);

  const keyframesCSS = useMemo(() => {
    const dir = config.direction || 'none';

    let dirFrom, dirTo;
    if (dir === 'up') {
      dirFrom = 'translateY(20vh)';
      dirTo = 'translateY(-20vh)';
    } else if (dir === 'down') {
      dirFrom = 'translateY(-20vh)';
      dirTo = 'translateY(20vh)';
    } else if (dir === 'right') {
      dirFrom = 'translateX(-20vw)';
      dirTo = 'translateX(20vw)';
    } else {
      dirFrom = 'scale(0.8)';
      dirTo = 'scale(1.2)';
    }

    // When sway is enabled, overlay a sinusoidal cross-axis oscillation
    // at 25% and 75% keyframe stops so it combines with the main direction
    if (config.sway) {
      const swayAxis = (dir === 'up' || dir === 'down') ? 'translateX' : 'translateY';
      const swayAmount = (dir === 'up' || dir === 'down') ? '25px' : '15px';

      // Interpolate the directional transform at 25%, 50%, 75% marks
      // We approximate by splitting the from/to path into segments
      return `
        @keyframes ${animName} {
          0%   { transform: ${dirFrom}; opacity: 0; }
          10%  { opacity: 1; }
          25%  { transform: ${swayAxis}(${swayAmount}); }
          50%  { transform: ${swayAxis}(0); }
          75%  { transform: ${swayAxis}(-${swayAmount}); }
          90%  { opacity: 1; }
          100% { transform: ${dirTo}; opacity: 0; }
        }
      `;
    }

    return `
      @keyframes ${animName} {
        0%   { transform: ${dirFrom}; opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: ${dirTo}; opacity: 0; }
      }
    `;
  }, [config.direction, config.sway, animName]);

  // Clean up injected style on unmount
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-atmosphere', particleType || 'dust');
    styleEl.textContent = keyframesCSS;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, [keyframesCSS, particleType]);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map(p => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            fontSize: p.size,
            opacity: p.opacity,
            color: 'var(--world-accent, #4ecdc4)',
            animation: `${animName} ${p.duration}s ease-in-out ${p.delay}s infinite`,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {config.char}
        </span>
      ))}
    </div>
  );
}

// ===================== WORLD TOP BAR =====================
function WorldTopBar({ stages, blueprintStages, activeIndex, accentColor, studentSession, onNavigate, audioEnabled, onToggleAudio, xpData }) {
  const navigate = useNavigate();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '10px 12px' : '12px 20px',
      background: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--world-border, rgba(255,255,255,0.1))',
      gap: isMobile ? 8 : 0,
    }}>
      {/* Left group: Camp + Audio toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Camp button */}
        <button
          onClick={() => navigate('/student')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: isMobile ? '8px 10px' : '6px 14px', borderRadius: 8,
            minHeight: isMobile ? 44 : 'auto',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--world-text, #f0f0f0)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 200ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <Compass size={15} />
          {!isMobile && 'Camp'}
        </button>

        {/* Ambient audio toggle */}
        <button
          onClick={onToggleAudio}
          title={audioEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: isMobile ? 44 : 32, height: isMobile ? 44 : 32, borderRadius: 8,
            background: audioEnabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: audioEnabled ? (accentColor || 'var(--world-accent, #4ecdc4)') : 'var(--world-text-muted, rgba(240,240,240,0.4))',
            cursor: 'pointer',
            transition: 'background 200ms, color 200ms',
            padding: 0,
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = audioEnabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
        >
          {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>

      {/* Journey dots — scrollable on mobile */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        flex: isMobile ? '1 1 0' : 'none',
        overflowX: isMobile ? 'auto' : 'visible',
        justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '0 4px' : 0,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {stages.map((stage, i) => {
          const completed = stage.status === 'completed';
          const active = i === activeIndex;
          const locked = !completed && !active;
          const canNavigate = completed || active;

          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {i > 0 && (
                <div style={{
                  width: isMobile ? 14 : 20, height: 2,
                  background: completed || active
                    ? (accentColor || 'var(--world-accent, #4ecdc4)')
                    : 'rgba(255,255,255,0.15)',
                  transition: 'background 400ms',
                  flexShrink: 0,
                }} />
              )}
              <button
                onClick={() => canNavigate && onNavigate(i)}
                disabled={locked}
                title={blueprintStages?.[i]?.location || stage.title}
                style={{
                  width: active ? 28 : 12,
                  height: 12,
                  borderRadius: active ? 6 : '50%',
                  border: 'none',
                  background: completed
                    ? 'var(--field-green, #4caf50)'
                    : active
                      ? (accentColor || 'var(--world-accent, #4ecdc4)')
                      : 'rgba(255,255,255,0.3)',
                  opacity: locked ? 0.3 : 1,
                  cursor: canNavigate ? 'pointer' : 'default',
                  transition: 'all 300ms ease',
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Student name + rank badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8,
        color: 'var(--world-text, #f0f0f0)',
        fontFamily: 'var(--font-body)', fontSize: 13,
        flexShrink: 0,
      }}>
        {studentSession?.avatarEmoji && (
          <span style={{ fontSize: isMobile ? 16 : 18 }}>{studentSession.avatarEmoji}</span>
        )}
        {!isMobile && (
          <span style={{ fontWeight: 500 }}>{studentSession?.studentName || 'Explorer'}</span>
        )}
        <ExplorerRankBadge rank={xpData?.current_rank || 'apprentice'} size="sm" showLabel={false} />
        <span style={{
          padding: '2px 8px', borderRadius: 10,
          background: 'rgba(255,255,255,0.1)',
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
        }}>
          {xpData?.total_points || 0} EP
        </span>
      </div>
    </div>
  );
}

// ===================== LOCATION VIEW =====================
function LocationView({ stage, blueprintStage, accentColor, onOpenChat, mentorName }) {
  const locationName = blueprintStage?.location || stage?.location_name || stage?.title || 'Unknown Location';
  const narrative = blueprintStage?.arrivalNarrative || stage?.location_narrative || '';
  const isCompleted = stage?.status === 'completed';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const guidingQuestions = stage?.guiding_questions || [];
  const questionsArray = Array.isArray(guidingQuestions) ? guidingQuestions
    : typeof guidingQuestions === 'string' ? guidingQuestions.split('\n').filter(Boolean)
    : [];

  const deliverable = stage?.deliverable || stage?.deliverable_description || '';

  return (
    <div style={{
      position: 'relative', zIndex: 2,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: isMobile ? '70px 16px 32px' : '80px 24px 40px',
      maxWidth: isMobile ? '100%' : 680, margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      {/* Location name */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.8rem',
        color: accentColor || 'var(--world-accent, #4ecdc4)',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: '0.01em',
      }}>
        {locationName}
      </h1>

      {/* Arrival narrative */}
      {narrative && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          color: 'var(--world-text, #f0f0f0)',
          opacity: 0.85,
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: 540,
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          {narrative}
        </p>
      )}

      {/* Work area card */}
      <div style={{
        width: '100%',
        background: 'var(--world-surface, rgba(255,255,255,0.08))',
        border: '1px solid var(--world-border, rgba(255,255,255,0.1))',
        borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? '20px 16px 18px' : '28px 28px 24px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxSizing: 'border-box',
      }}>
        {isCompleted ? (
          <div style={{
            textAlign: 'center',
            padding: '20px 0',
            color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          }}>
            Location conquered
          </div>
        ) : (
          <>
            {/* Consider section */}
            {questionsArray.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
                  marginBottom: 10,
                  fontWeight: 600,
                }}>
                  Consider
                </h3>
                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  {questionsArray.map((q, i) => (
                    <li key={i} style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'var(--world-text, #f0f0f0)',
                      lineHeight: 1.5,
                      paddingLeft: 14,
                      position: 'relative',
                    }}>
                      <span style={{
                        position: 'absolute', left: 0, top: 2,
                        color: accentColor || 'var(--world-accent, #4ecdc4)',
                        fontSize: 10,
                      }}>
                        {'\u25C6'}
                      </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Your Challenge section */}
            {deliverable && (
              <div style={{ marginBottom: 22 }}>
                <h3 style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
                  marginBottom: 10,
                  fontWeight: 600,
                }}>
                  Your Challenge
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  color: 'var(--world-text, #f0f0f0)',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {deliverable}
                </p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={onOpenChat}
              style={{
                width: '100%',
                padding: isMobile ? '14px 20px' : '12px 20px',
                minHeight: isMobile ? 48 : 'auto',
                borderRadius: 10,
                border: 'none',
                background: accentColor || 'var(--world-accent, #4ecdc4)',
                color: '#111',
                fontFamily: 'var(--font-body)',
                fontSize: isMobile ? 15 : 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 200ms, transform 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <MessageCircle size={16} />
              Talk to {mentorName || 'your Mentor'}
              <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== TRANSITION OVERLAY =====================
// phase: 'hidden' | 'fade-out' | 'narrative' | 'fade-in'
function TransitionOverlay({ text, phase }) {
  const showOverlay = phase === 'narrative' || phase === 'fade-out';
  const showText = phase === 'narrative';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 15,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.8)',
      opacity: showOverlay ? 1 : 0,
      pointerEvents: showOverlay ? 'auto' : 'none',
      transition: 'opacity 400ms ease',
    }}>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.5rem',
        color: 'var(--world-text, #f0f0f0)',
        textAlign: 'center',
        maxWidth: 520,
        lineHeight: 1.7,
        padding: '0 28px',
        fontStyle: 'italic',
        letterSpacing: '0.01em',
        opacity: showText ? 1 : 0,
        transform: showText ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        transition: 'opacity 400ms ease 100ms, transform 400ms ease 100ms',
      }}>
        {text}
      </p>
    </div>
  );
}

// ===================== MAIN WORLD RENDERER =====================
export default function WorldRenderer() {
  const { id: questId } = useParams();
  const navigate = useNavigate();

  const [quest, setQuest] = useState(null);
  const [stages, setStages] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentSession, setStudentSessionState] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [xpData, setXpData] = useState(null);
  const [xpToast, setXpToast] = useState({ show: false, points: 0, rankUp: false, newRank: null });
  const [transitionText, setTransitionText] = useState('');
  // Transition phases: 'hidden' → 'fade-out' → 'narrative' → 'fade-in' → 'hidden'
  const [transitionPhase, setTransitionPhase] = useState('hidden');

  // Ambient sound
  const { enabled: audioEnabled, toggle: toggleAudio, play: playSound, stop: stopSound } = useAmbientSound();

  // Load student session + XP data
  useEffect(() => {
    const session = getStudentSession();
    setStudentSessionState(session);
    if (session?.studentId) {
      xp.getStudentXP(session.studentId).then(data => setXpData(data));
    }
  }, []);

  // Load quest data
  useEffect(() => {
    if (!questId) return;

    async function loadQuest() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('quests')
          .select('*, quest_stages(*)')
          .eq('id', questId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Project not found');

        // Redirect to standard view if no world blueprint
        if (!data.world_blueprint) {
          navigate(`/q/${questId}`, { replace: true });
          return;
        }

        setQuest(data);
        setBlueprint(data.world_blueprint);

        // Sort stages by stage_number
        const sorted = (data.quest_stages || []).sort(
          (a, b) => (a.stage_number || 0) - (b.stage_number || 0)
        );
        setStages(sorted);

        // Active stage = first non-completed
        const firstActive = sorted.findIndex(s => s.status !== 'completed');
        setActiveStageIndex(firstActive >= 0 ? firstActive : sorted.length - 1);
      } catch (err) {
        console.error('WorldRenderer load error:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    loadQuest();
  }, [questId, navigate]);

  // Play ambient sound when blueprint loads or audio is toggled on
  useEffect(() => {
    if (!blueprint?.ambientAudio || !audioEnabled) return;
    const soundType = PRESET_TO_SOUND[blueprint.ambientAudio];
    if (soundType) playSound(soundType);
    return () => stopSound();
  }, [blueprint?.ambientAudio, audioEnabled, playSound, stopSound]);

  // Derive CSS variables from blueprint palette
  const worldVars = useMemo(() => {
    if (!blueprint?.palette) return {};
    return blueprintToCSSVars(blueprint.palette);
  }, [blueprint]);

  // Background gradient from ambient preset or palette
  const bgGradient = useMemo(() => {
    if (blueprint?.ambientAudio && AMBIENT_PRESETS[blueprint.ambientAudio]) {
      return AMBIENT_PRESETS[blueprint.ambientAudio].bgGradient;
    }
    if (blueprint?.palette?.bg && blueprint?.palette?.bgMid) {
      return `linear-gradient(180deg, ${blueprint.palette.bg} 0%, ${blueprint.palette.bgMid} 50%, ${blueprint.palette.bg} 100%)`;
    }
    return 'linear-gradient(180deg, #1a1a2e 0%, #2d2d4e 50%, #1a1a2e 100%)';
  }, [blueprint]);

  // Particle type from blueprint
  const particleType = useMemo(() => {
    if (blueprint?.ambientAudio && AMBIENT_PRESETS[blueprint.ambientAudio]) {
      return AMBIENT_PRESETS[blueprint.ambientAudio].particle;
    }
    return 'dust';
  }, [blueprint]);

  const accentColor = blueprint?.palette?.accent || 'var(--world-accent, #4ecdc4)';
  const mentorName = blueprint?.mentor?.name || 'Mentor';

  // Current blueprint stage data
  const currentBlueprintStage = blueprint?.stages?.[activeStageIndex] || null;
  const currentStage = stages[activeStageIndex] || null;

  // Handle stage navigation with phased transition
  // Flow: fade-out location (400ms) → show narrative text (1.5s) → fade-in new location (400ms)
  const handleNavigate = useCallback((targetIndex) => {
    if (targetIndex === activeStageIndex) return;
    if (transitionPhase !== 'hidden') return;

    const targetBpStage = blueprint?.stages?.[targetIndex];
    const narrativeText = targetBpStage?.transitionNarrative
      || targetBpStage?.arrivalNarrative
      || 'Traveling to the next location...';

    setTransitionText(narrativeText);

    // Phase 1: Fade out current location (400ms)
    setTransitionPhase('fade-out');

    setTimeout(() => {
      // Phase 2: Show narrative overlay (hold 1.5s)
      setTransitionPhase('narrative');
      // Swap the stage content while overlay is opaque
      setActiveStageIndex(targetIndex);

      setTimeout(() => {
        // Phase 3: Fade in new location (400ms)
        setTransitionPhase('fade-in');

        setTimeout(() => {
          setTransitionPhase('hidden');
        }, 400);
      }, 1500);
    }, 400);
  }, [activeStageIndex, blueprint, transitionPhase]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1a1a2e',
        fontFamily: 'var(--font-body)', color: '#f0f0f0',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: '#4ecdc4',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 14, opacity: 0.7 }}>Entering world...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1a1a2e',
        fontFamily: 'var(--font-body)', color: '#f0f0f0',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <p style={{ fontSize: 16, marginBottom: 12 }}>{error}</p>
          <button
            onClick={() => navigate('/student')}
            style={{
              padding: '8px 20px', borderRadius: 8,
              background: '#4ecdc4', border: 'none',
              color: '#111', fontFamily: 'var(--font-body)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Back to Camp
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: bgGradient,
      overflow: 'auto',
      ...worldVars,
    }}>
      {/* Layer 1: Atmosphere */}
      <AtmosphereLayer particleType={particleType} />

      {/* Top bar */}
      <WorldTopBar
        stages={stages}
        blueprintStages={blueprint?.stages}
        activeIndex={activeStageIndex}
        accentColor={accentColor}
        studentSession={studentSession}
        onNavigate={handleNavigate}
        audioEnabled={audioEnabled}
        onToggleAudio={toggleAudio}
        xpData={xpData}
      />

      {/* Layer 2: Location content */}
      <div style={{
        opacity: (transitionPhase === 'fade-out' || transitionPhase === 'narrative') ? 0 : 1,
        transform: (transitionPhase === 'fade-out' || transitionPhase === 'narrative') ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 400ms ease, transform 400ms ease',
      }}>
        <LocationView
          stage={currentStage}
          blueprintStage={currentBlueprintStage}
          accentColor={accentColor}
          mentorName={mentorName}
          onOpenChat={() => setShowChat(true)}
        />
      </div>

      {/* Transition overlay */}
      <TransitionOverlay text={transitionText} phase={transitionPhase} />

      {/* XP Toast */}
      {xpToast.show && (
        <XPToast
          points={xpToast.points}
          rankUp={xpToast.rankUp}
          newRank={xpToast.newRank}
          onDone={() => setXpToast({ show: false, points: 0, rankUp: false, newRank: null })}
        />
      )}

      {/* Layer 3: Chat panel */}
      {showChat && (
        <WorldChat
          quest={quest}
          stage={currentStage}
          blueprint={blueprint}
          studentSession={studentSession}
          onClose={() => setShowChat(false)}
          onStageComplete={async () => {
            setShowChat(false);
            // Award XP for stage completion
            const studentId = studentSession?.studentId;
            const stageId = currentStage?.id;
            if (studentId) {
              const oldRank = xpData?.current_rank || 'apprentice';
              const result = await xp.award(studentId, 'stage_complete', questId, stageId);
              const updatedXP = await xp.getStudentXP(studentId);
              setXpData(updatedXP);
              const newRank = updatedXP?.current_rank || 'apprentice';
              const rankUp = newRank !== oldRank;
              setXpToast({
                show: true,
                points: result?.points || 50,
                rankUp,
                newRank: rankUp ? newRank : null,
              });
            }
          }}
        />
      )}
    </div>
  );
}
