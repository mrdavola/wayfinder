import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { X, Volume2, VolumeX, Mic, MicOff, Send, CheckCircle, Loader2 } from 'lucide-react';
import PanoramaSphere from './PanoramaSphere';
import CameraController, { GyroPermissionButton } from './CameraController';
import StageHotspot from './StageHotspot';
import useSpeech from '../../hooks/useSpeech';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import VideoEmbed from '../ui/VideoEmbed';

export default function ImmersiveWorldView({
  sceneUrl,
  hotspots,
  stages,
  activeStageId,
  onStageSelect,
  onSubmit,
  onExit,
  isMobile,
  studentName,
  questId,
  xp,
  submissions,
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const { speak, stop, speaking } = useSpeech();
  const [muted, setMuted] = useState(() => {
    try { return sessionStorage.getItem('immersive-muted') === '1'; } catch { return false; }
  });
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState({});
  const textareaRef = useRef(null);

  // Persist mute preference
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try { sessionStorage.setItem('immersive-muted', next ? '1' : '0'); } catch {}
      if (next) stop(); // immediately silence when muting
      return next;
    });
  }, [stop]);

  // Gated speak — only narrates when not muted
  const narrate = useCallback((text) => {
    if (!muted && text) speak(text);
  }, [muted, speak]);

  // Voice dictation
  const { listening, supported: micSupported, start: startListening, stop: stopListening } = useSpeechRecognition({
    onResult: (text) => setResponseText(text),
  });

  // Narrate world description on entry (only if not muted)
  useEffect(() => {
    if (!hasSpokenIntro && !muted) {
      const timer = setTimeout(() => {
        narrate('Welcome to your world. Look around and tap a hotspot to begin.');
        setHasSpokenIntro(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSpokenIntro, muted, narrate]);

  // Reset response text when switching stages
  useEffect(() => {
    setResponseText('');
    if (listening) stopListening();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStage?.id]);

  const handleHotspotClick = useCallback((stageNumber) => {
    const stage = stages.find(s => s.stage_number === stageNumber);
    if (stage && stage.status !== 'locked') {
      setSelectedStage(stage);
      onStageSelect?.(stage.id);
      stop();
      if (stage.description) {
        setTimeout(() => narrate(stage.title + '. ' + stage.description), 300);
      }
    }
  }, [stages, onStageSelect, narrate, stop]);

  const handleSubmitResponse = useCallback(async () => {
    if (!responseText.trim() || !selectedStage || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(selectedStage.id, responseText.trim());
      setSubmitted(prev => ({ ...prev, [selectedStage.id]: responseText.trim() }));
      setResponseText('');
      if (listening) stopListening();
      // Voice feedback
      stop();
      setTimeout(() => narrate('Nice work! Your response has been saved.'), 200);
    } catch (err) {
      console.error('Immersive submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [responseText, selectedStage, submitting, onSubmit, listening, stopListening, stop, narrate]);

  const toggleMic = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      // Stop any TTS narration so mic can hear clearly
      stop();
      startListening();
    }
  }, [listening, startListening, stopListening, stop]);

  const needsGyroPrompt = isMobile &&
    !gyroEnabled &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

  // Check if this stage already has a submission
  const stageHasSubmission = selectedStage && (
    submitted[selectedStage.id] ||
    submissions?.[selectedStage.id]
  );

  const isActive = selectedStage?.status === 'active';
  const isCompleted = selectedStage?.status === 'completed';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#000',
    }}>
      {/* Three.js Canvas */}
      <Suspense fallback={
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'var(--font-body)',
          gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: 'var(--compass-gold)', borderRadius: '50%',
            animation: 'worldSpin 1s linear infinite',
          }} />
          <span style={{ fontSize: 16 }}>Loading your world...</span>
        </div>
      }>
        <Canvas
          camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 0.1] }}
          style={{ width: '100%', height: '100%' }}
        >
          <PanoramaSphere imageUrl={sceneUrl} />
          <CameraController isMobile={isMobile && gyroEnabled} />

          {/* Stage hotspots */}
          {(hotspots || []).map((h) => {
            const stage = stages.find(s => s.stage_number === h.stage_number || s.stage_number === String(h.stage_number))
              || stages[h.stage_number - 1];
            return (
              <StageHotspot
                key={h.stage_number}
                hotspot={h}
                stage={stage}
                onClick={() => handleHotspotClick(h.stage_number)}
              />
            );
          })}

          <ambientLight intensity={0.5} />
        </Canvas>
      </Suspense>

      {/* HUD overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: isMobile ? 12 : 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        pointerEvents: 'none',
      }}>
        {/* Exit button */}
        <button
          onClick={() => { stop(); stopListening(); onExit(); }}
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

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Mute / unmute toggle */}
          <button
            onClick={toggleMute}
            title={muted ? 'Turn narration on' : 'Turn narration off'}
            style={{
              pointerEvents: 'auto',
              width: 36, height: 36, borderRadius: '50%',
              background: muted ? 'rgba(0,0,0,0.6)' : speaking ? 'var(--compass-gold)' : 'rgba(0,0,0,0.6)',
              border: muted ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.2)',
              color: muted ? 'rgba(255,255,255,0.4)' : speaking ? 'var(--ink)' : 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              transition: 'all 200ms',
            }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          {/* XP display */}
          {xp != null && (
            <div style={{
              pointerEvents: 'auto',
              padding: '6px 14px', borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', color: 'var(--compass-gold)',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
              backdropFilter: 'blur(8px)',
            }}>
              {xp} EP
            </div>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      {!selectedStage && (
        <div style={{
          position: 'absolute', bottom: isMobile ? 100 : 24, left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px', borderRadius: 20,
          background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)',
          fontSize: 12, fontFamily: 'var(--font-body)',
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {isMobile ? 'Move your phone to look around' : 'Click and drag to look around'} — tap a hotspot to begin
        </div>
      )}

      {/* Gyroscope permission prompt (mobile iOS) */}
      {needsGyroPrompt && (
        <GyroPermissionButton onGranted={() => setGyroEnabled(true)} />
      )}

      {/* Stage panel (slides in from right on desktop, bottom on mobile) */}
      {selectedStage && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setSelectedStage(null); if (listening) stopListening(); }}
            style={{
              position: 'absolute', inset: 0, zIndex: 1001,
              background: 'rgba(0,0,0,0.3)',
            }}
          />
          <div
            style={{
              position: 'absolute', zIndex: 1002,
              ...(isMobile
                ? { bottom: 0, left: 0, right: 0, maxHeight: '75vh', borderRadius: '16px 16px 0 0' }
                : { top: 0, right: 0, width: 420, height: '100%' }
              ),
              background: 'var(--chalk)',
              overflowY: 'auto',
              boxShadow: '-4px 0 30px rgba(0,0,0,0.3)',
              animation: isMobile ? 'slideUp 300ms ease-out' : 'slideInRight 300ms ease-out',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--pencil)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: 'var(--chalk)', zIndex: 1,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: 'var(--graphite)', textTransform: 'uppercase',
                }}>
                  Stage {selectedStage.stage_number}
                </span>
                {isCompleted && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--field-green)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    background: 'rgba(45,106,79,0.1)', padding: '2px 6px', borderRadius: 4,
                  }}>
                    Complete
                  </span>
                )}
              </div>
              <button
                onClick={() => { setSelectedStage(null); if (listening) stopListening(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} color="var(--graphite)" />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 22px', flex: 1, overflowY: 'auto' }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 20,
                color: 'var(--ink)', margin: '0 0 14px',
              }}>
                {selectedStage.title}
              </h3>
              {selectedStage.description && (
                <p style={{
                  fontSize: 14, color: 'var(--graphite)',
                  lineHeight: 1.7, margin: '0 0 18px',
                }}>
                  {selectedStage.description}
                </p>
              )}
              {selectedStage.guiding_questions?.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--graphite)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    marginBottom: 10,
                  }}>
                    Questions to explore
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedStage.guiding_questions.map((q, i) => (
                      <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedStage.deliverable && (
                <div style={{
                  background: 'var(--parchment)', borderRadius: 10,
                  padding: '14px 18px', borderLeft: '3px solid var(--compass-gold)',
                  marginBottom: 18,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    marginBottom: 5,
                  }}>
                    What to make
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                    {selectedStage.deliverable}
                  </p>
                </div>
              )}

              {/* Videos */}
              {selectedStage.video_urls?.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--graphite)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    marginBottom: 10,
                  }}>
                    Watch
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedStage.video_urls.filter(v => v.url).map((v, vi) => (
                      <VideoEmbed key={vi} url={v.url} title={v.title} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Submission area */}
              {stageHasSubmission ? (
                <div style={{
                  background: 'rgba(45,106,79,0.06)', borderRadius: 10,
                  padding: '14px 18px', border: '1px solid rgba(45,106,79,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <CheckCircle size={14} color="var(--field-green)" />
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--field-green)',
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    }}>
                      Response submitted
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                    {submitted[selectedStage.id] || submissions?.[selectedStage.id]?.content || 'Submitted'}
                  </p>
                </div>
              ) : isActive && onSubmit ? (
                <div style={{
                  background: 'var(--parchment)', borderRadius: 10,
                  padding: '16px 18px',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--ink)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    marginBottom: 10,
                  }}>
                    Your response
                  </div>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      ref={textareaRef}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder={listening ? 'Listening... speak now' : 'Type or tap the mic to speak your response...'}
                      rows={4}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px 12px', paddingRight: 44,
                        borderRadius: 8,
                        border: listening
                          ? '2px solid var(--specimen-red)'
                          : '1px solid var(--pencil)',
                        background: 'var(--chalk)',
                        fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--ink)',
                        resize: 'vertical', lineHeight: 1.5,
                        transition: 'border-color 200ms',
                      }}
                    />
                    {/* Mic button inside textarea */}
                    {micSupported && (
                      <button
                        onClick={toggleMic}
                        title={listening ? 'Stop dictation' : 'Start voice dictation'}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 32, height: 32, borderRadius: '50%',
                          background: listening ? 'var(--specimen-red)' : 'var(--parchment)',
                          border: listening ? 'none' : '1px solid var(--pencil)',
                          color: listening ? 'white' : 'var(--graphite)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          animation: listening ? 'micPulse 1.5s ease-in-out infinite' : 'none',
                        }}
                      >
                        {listening ? <MicOff size={14} /> : <Mic size={14} />}
                      </button>
                    )}
                  </div>

                  {/* Listening indicator */}
                  {listening && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 11, color: 'var(--specimen-red)', fontWeight: 600,
                      marginTop: 6, fontFamily: 'var(--font-mono)',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: 'var(--specimen-red)',
                        animation: 'micPulse 1.5s ease-in-out infinite',
                      }} />
                      Listening... tap mic to stop
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmitResponse}
                    disabled={!responseText.trim() || submitting}
                    style={{
                      marginTop: 10, width: '100%',
                      padding: '10px 16px', borderRadius: 8, border: 'none',
                      background: !responseText.trim() || submitting
                        ? 'var(--pencil)' : 'var(--field-green)',
                      color: !responseText.trim() || submitting
                        ? 'var(--graphite)' : 'white',
                      fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                      cursor: !responseText.trim() || submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {submitting ? (
                      <><Loader2 size={14} style={{ animation: 'worldSpin 1s linear infinite' }} /> Submitting...</>
                    ) : (
                      <><Send size={14} /> Submit Response</>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* CSS keyframes */}
      <style>{`
        @keyframes worldSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes micPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
