import { useState, useCallback, useEffect } from 'react';
import { X, Volume2, VolumeX, Send } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';

export default function MarbleWorldView({
  marbleUrl,
  hotspots,
  stages,
  activeStageId,
  onStageSelect,
  onStageSubmit,
  onExit,
  isMobile,
  sceneDescription,
  feedbackText,
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [submission, setSubmission] = useState('');
  const { speak, stop, speaking, loading: voiceLoading } = useSpeech();
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
  const [lastFeedback, setLastFeedback] = useState(null);

  // Narrate scene on entry
  useEffect(() => {
    if (sceneDescription && !hasSpokenIntro) {
      const timer = setTimeout(() => {
        speak(`Welcome to your world. ${sceneDescription}`);
        setHasSpokenIntro(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sceneDescription, hasSpokenIntro, speak]);

  // Narrate feedback when it arrives
  useEffect(() => {
    if (feedbackText && feedbackText !== lastFeedback) {
      setLastFeedback(feedbackText);
      setTimeout(() => speak(feedbackText), 500);
    }
  }, [feedbackText, lastFeedback, speak]);

  const handleHotspotClick = useCallback((stageNumber) => {
    const stage = stages.find(s => s.stage_number === stageNumber);
    if (!stage || stage.status === 'locked') return;
    setSelectedStage(stage);
    setSubmission('');
    onStageSelect?.(stage.id);
    if (stage.description) {
      stop();
      setTimeout(() => speak(stage.title + '. ' + stage.description), 300);
    }
  }, [stages, onStageSelect, speak, stop]);

  const handleSubmit = useCallback(() => {
    if (!submission.trim() || !selectedStage) return;
    onStageSubmit?.(selectedStage.id, submission.trim());
    setSubmission('');
  }, [submission, selectedStage, onStageSubmit]);

  // Position hotspots in a circle around viewport edges
  const hotspotPositions = (hotspots || []).map((h, i) => {
    const total = hotspots.length;
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const rx = isMobile ? 38 : 42;
    const ry = isMobile ? 36 : 40;
    return {
      ...h,
      left: `${50 + rx * Math.cos(angle)}%`,
      top: `${50 + ry * Math.sin(angle)}%`,
    };
  });

  const STATUS_COLORS = {
    active: 'var(--compass-gold)',
    completed: 'var(--field-green)',
    locked: 'var(--graphite)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000',
    }}>
      {/* Marble iframe */}
      <iframe
        src={marbleUrl}
        title="Immersive World"
        allow="accelerometer; gyroscope; fullscreen"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          border: 'none',
        }}
      />

      {/* HUD overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1001,
        pointerEvents: 'none',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: isMobile ? 12 : 16,
        }}>
          <button
            onClick={onExit}
            style={{
              pointerEvents: 'auto',
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(8px)',
            }}
          >
            <X size={14} /> Exit World
          </button>

          <button
            onClick={() => speaking ? stop() : speak(sceneDescription || 'Look around and explore.')}
            style={{
              pointerEvents: 'auto',
              width: 40, height: 40, borderRadius: '50%',
              background: speaking ? 'var(--compass-gold)' : 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: speaking ? 'var(--ink)' : 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Floating hotspot circles */}
        {hotspotPositions.map((h) => {
          const stage = stages.find(s => s.stage_number === h.stage_number) || stages[h.stage_number - 1];
          const status = stage?.status || 'locked';
          const isActive = stage?.id === selectedStage?.id;
          const color = STATUS_COLORS[status];

          return (
            <button
              key={h.stage_number}
              onClick={() => handleHotspotClick(h.stage_number)}
              style={{
                pointerEvents: status === 'locked' ? 'none' : 'auto',
                position: 'absolute',
                left: h.left, top: h.top,
                transform: 'translate(-50%, -50%)',
                width: isActive ? 56 : 48, height: isActive ? 56 : 48,
                borderRadius: '50%',
                background: color,
                border: isActive ? '3px solid white' : '2px solid rgba(255,255,255,0.6)',
                cursor: status === 'locked' ? 'default' : 'pointer',
                opacity: status === 'locked' ? 0.3 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: status === 'active'
                  ? `0 0 20px ${color}, 0 0 40px rgba(212,160,23,0.3)`
                  : '0 4px 12px rgba(0,0,0,0.4)',
                transition: 'all 200ms',
                animation: status === 'active' ? 'marblePulse 2s ease-in-out infinite' : 'none',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                {h.stage_number}
              </span>
            </button>
          );
        })}

        {/* Hotspot labels */}
        {hotspotPositions.map((h) => {
          const stage = stages.find(s => s.stage_number === h.stage_number) || stages[h.stage_number - 1];
          if (stage?.status === 'locked') return null;
          return (
            <div
              key={`label-${h.stage_number}`}
              style={{
                position: 'absolute',
                left: h.left, top: h.top,
                transform: 'translate(-50%, 32px)',
                background: 'rgba(0,0,0,0.7)',
                color: 'white', padding: '2px 8px', borderRadius: 4,
                fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap', maxWidth: 120,
                overflow: 'hidden', textOverflow: 'ellipsis',
                pointerEvents: 'none',
              }}
            >
              {h.label}
            </div>
          );
        })}

        {/* Bottom hint */}
        {!selectedStage && (
          <div style={{
            position: 'absolute', bottom: isMobile ? 24 : 24, left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px', borderRadius: 20,
            background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)',
            fontSize: 12, fontFamily: 'var(--font-body)',
            backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          }}>
            Use WASD or drag to explore — tap a circle to start a challenge
          </div>
        )}

        {/* Stage panel */}
        {selectedStage && (
          <>
            <div
              onClick={() => setSelectedStage(null)}
              style={{
                position: 'absolute', inset: 0, zIndex: 1002,
                pointerEvents: 'auto',
              }}
            />
            <div
              style={{
                position: 'absolute', zIndex: 1003,
                pointerEvents: 'auto',
                ...(isMobile
                  ? { bottom: 0, left: 0, right: 0, maxHeight: '65vh', borderRadius: '16px 16px 0 0' }
                  : { top: 0, right: 0, width: 400, height: '100%' }
                ),
                background: 'rgba(255,255,255,0.95)',
                overflowY: 'auto',
                boxShadow: '-4px 0 30px rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                animation: isMobile ? 'slideUp 300ms ease-out' : 'slideInRight 300ms ease-out',
              }}
            >
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--pencil)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', zIndex: 1,
                backdropFilter: 'blur(12px)',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: 'var(--graphite)', textTransform: 'uppercase',
                }}>
                  Stage {selectedStage.stage_number} — {selectedStage.stage_type || 'Challenge'}
                </span>
                <button
                  onClick={() => setSelectedStage(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={16} color="var(--graphite)" />
                </button>
              </div>

              <div style={{ padding: '20px 22px' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)', fontSize: 20,
                  color: 'var(--ink)', margin: '0 0 12px',
                }}>
                  {selectedStage.title}
                </h3>

                {selectedStage.description && (
                  <p style={{
                    fontSize: 14, color: 'var(--graphite)',
                    lineHeight: 1.7, margin: '0 0 16px',
                  }}>
                    {selectedStage.description}
                  </p>
                )}

                {selectedStage.guiding_questions?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--graphite)',
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      marginBottom: 8,
                    }}>
                      Think about
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedStage.guiding_questions.map((q, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedStage.deliverable && (
                  <div style={{
                    background: 'var(--parchment)', borderRadius: 10,
                    padding: '12px 16px', borderLeft: '3px solid var(--compass-gold)',
                    marginBottom: 16,
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)',
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      marginBottom: 4,
                    }}>
                      What to make
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
                      {selectedStage.deliverable}
                    </p>
                  </div>
                )}

                {selectedStage.status === 'active' && (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      value={submission}
                      onChange={e => setSubmission(e.target.value)}
                      placeholder="Type your response here..."
                      style={{
                        width: '100%', minHeight: 100, padding: 12,
                        borderRadius: 8, border: '1px solid var(--pencil)',
                        fontFamily: 'var(--font-body)', fontSize: 14,
                        resize: 'vertical', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!submission.trim()}
                      style={{
                        marginTop: 8, width: '100%',
                        padding: '10px 16px', borderRadius: 8,
                        background: submission.trim() ? 'var(--ink)' : 'var(--pencil)',
                        color: 'white', border: 'none',
                        fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
                        cursor: submission.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <Send size={14} /> Submit
                    </button>
                  </div>
                )}

                {selectedStage.status === 'completed' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(45,139,78,0.1)', border: '1px solid var(--field-green)',
                    color: 'var(--field-green)', fontSize: 13, fontWeight: 600,
                    textAlign: 'center',
                  }}>
                    Completed
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes marblePulse {
          0%, 100% { box-shadow: 0 0 12px rgba(212,160,23,0.4), 0 4px 12px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 24px rgba(212,160,23,0.7), 0 4px 16px rgba(0,0,0,0.4); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
