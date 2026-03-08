import { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { X, Map, Volume2, VolumeX } from 'lucide-react';
import PanoramaSphere from './PanoramaSphere';
import CameraController, { GyroPermissionButton } from './CameraController';
import StageHotspot from './StageHotspot';
import useSpeech from '../../hooks/useSpeech';

export default function ImmersiveWorldView({
  sceneUrl,
  hotspots,
  stages,
  activeStageId,
  onStageSelect,
  onExit,
  isMobile,
  studentName,
  xp,
}) {
  const [selectedStage, setSelectedStage] = useState(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const { speak, stop, speaking } = useSpeech();
  const [hasSpokenIntro, setHasSpokenIntro] = useState(false);

  // Narrate world description on entry
  useEffect(() => {
    if (!hasSpokenIntro) {
      const timer = setTimeout(() => {
        speak('Welcome to your world. Look around and tap a hotspot to begin.');
        setHasSpokenIntro(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasSpokenIntro, speak]);

  const handleHotspotClick = useCallback((stageNumber) => {
    const stage = stages.find(s => s.stage_number === stageNumber);
    if (stage && stage.status !== 'locked') {
      setSelectedStage(stage);
      onStageSelect?.(stage.id);
      // Narrate the stage
      stop();
      if (stage.description) {
        setTimeout(() => speak(stage.title + '. ' + stage.description), 300);
      }
    }
  }, [stages, onStageSelect, speak, stop]);

  const needsGyroPrompt = isMobile &&
    !gyroEnabled &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

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
          onClick={() => { stop(); onExit(); }}
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
          {/* Voice toggle */}
          <button
            onClick={() => speaking ? stop() : speak('Look around and tap a hotspot to begin.')}
            style={{
              pointerEvents: 'auto',
              width: 36, height: 36, borderRadius: '50%',
              background: speaking ? 'var(--compass-gold)' : 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: speaking ? 'var(--ink)' : 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
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
            onClick={() => setSelectedStage(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 1001,
              background: 'rgba(0,0,0,0.3)',
            }}
          />
          <div
            style={{
              position: 'absolute', zIndex: 1002,
              ...(isMobile
                ? { bottom: 0, left: 0, right: 0, maxHeight: '60vh', borderRadius: '16px 16px 0 0' }
                : { top: 0, right: 0, width: 420, height: '100%' }
              ),
              background: 'var(--chalk)',
              overflowY: 'auto',
              boxShadow: '-4px 0 30px rgba(0,0,0,0.3)',
              animation: isMobile ? 'slideUp 300ms ease-out' : 'slideInRight 300ms ease-out',
            }}
          >
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--pencil)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'sticky', top: 0, background: 'var(--chalk)', zIndex: 1,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: 'var(--graphite)', textTransform: 'uppercase',
              }}>
                Stage {selectedStage.stage_number}
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
      `}</style>
    </div>
  );
}
