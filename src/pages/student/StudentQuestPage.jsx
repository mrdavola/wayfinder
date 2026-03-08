import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, BookOpen, Search, Wrench, FlaskConical, Mic,
  Megaphone, X, Send, Zap, ArrowRight, Loader2, AlertCircle,
  ChevronRight, ChevronLeft, Star, Lock, MessageCircle,
  Paperclip, Video, Download, LogOut, Sparkles, Users,
  Pause, Play, Maximize2, SwitchCamera, ArrowLeft, PenLine,
  Volume2, VolumeX,
} from 'lucide-react';
import SpeakButton from '../../components/ui/SpeakButton';
import { supabase } from '../../lib/supabase';
import { ai, guideMessages as guideMessagesApi, submissionFeedback as feedbackApi, skills as skillsApi, skillSnapshots as snapshotsApi, xp, badgesApi, landmarksApi, interactiveStages, explorerLog, expeditionChallenges, challengeResponses, skillAssessments, buddyPairs, buddyMessages } from '../../lib/api';
import ExpeditionChallenge from '../../components/gamified/ExpeditionChallenge';
import ChallengerEncounter from '../../components/gamified/ChallengerEncounter';
import { getStudentSession, setStudentSession, clearStudentSession } from '../../lib/studentSession';
import TreasureMap from '../../components/map/TreasureMap';
import XPToast from '../../components/xp/XPToast';
import XPBar from '../../components/xp/XPBar';
import ExplorerRankBadge from '../../components/xp/ExplorerRankBadge';
import PuzzleGate from '../../components/stages/PuzzleGate';
import ChoiceFork from '../../components/stages/ChoiceFork';
import EvidenceBoard from '../../components/stages/EvidenceBoard';
import useAmbientSound from '../../hooks/useAmbientSound';
import CampfireChat from '../../components/social/CampfireChat';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';
import TrustBadge from '../../components/ui/TrustBadge';
import ScoreCard, { MASTERY_THRESHOLD } from '../../components/ui/ScoreCard';
import { getTrustTier } from '../../lib/trustDomains';
import BranchingMap from '../../components/map/BranchingMap';
import { stageBranches, studentPaths } from '../../lib/api';
import EnterWorldButton from '../../components/immersive/EnterWorldButton';
const ImmersiveWorldView = lazy(() => import('../../components/immersive/ImmersiveWorldView'));
const MarbleWorldView = lazy(() => import('../../components/immersive/MarbleWorldView'));

// ===================== MARKDOWN HELPER =====================
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n/g, '<br/>');
}

// ===================== STYLES =====================
const injectStyles = () => {
  if (document.getElementById('student-quest-styles')) return;
  const el = document.createElement('style');
  el.id = 'student-quest-styles';
  el.textContent = `
    @keyframes sq-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(184,134,11,0.4); }
      50% { box-shadow: 0 0 0 10px rgba(184,134,11,0); }
    }
    @keyframes sq-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes sq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes sq-pop {
      0% { transform: scale(0.8); opacity: 0; }
      70% { transform: scale(1.05); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes sq-confetti {
      0%   { transform: scale(0) rotate(0deg); opacity: 1; }
      60%  { transform: scale(1.3) rotate(20deg); opacity: 1; }
      100% { transform: scale(1.8) rotate(45deg); opacity: 0; }
    }
    @keyframes sq-rec-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .sq-rec-dot { animation: sq-rec-pulse 1.2s ease-in-out infinite; }
    .sq-node-hover:hover { opacity: 0.82; cursor: pointer; }
    .sq-btn-hover:hover { opacity: 0.88; }
    .sq-card { animation: sq-fade-in 220ms ease; }
    .sq-pop { animation: sq-pop 280ms ease; }
    .sq-spin { animation: sq-spin 1s linear infinite; }
    .sq-pulse { animation: sq-pulse 2s ease-in-out infinite; }
    @keyframes sq-gentle-pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.08); opacity: 1; }
    }
    .sq-confetti-piece { animation: sq-confetti 700ms ease forwards; }
    .sq-journal-input:focus { border-color: var(--compass-gold) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(184,134,11,0.12) !important; }
    .sq-name-input:focus { border-color: var(--compass-gold) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(184,134,11,0.15) !important; }
    @keyframes sq-border-pulse {
      0%, 100% { border-left-color: rgba(184,134,11,1); }
      50% { border-left-color: rgba(184,134,11,0.6); }
    }
    @keyframes sq-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sq-complete-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }
    .sq-stage-active {
      border-left: 4px solid var(--compass-gold) !important;
      animation: sq-border-pulse 2s ease-in-out infinite;
    }
    .sq-stage-next-locked {
      background: linear-gradient(90deg, var(--chalk) 40%, rgba(184,134,11,0.04) 50%, var(--chalk) 60%) !important;
      background-size: 200% 100% !important;
      animation: sq-shimmer 3s ease-in-out infinite;
    }
    .sq-stage-completed {
      animation: sq-complete-pop 300ms ease-out;
    }
    @media (max-width: 767px) {
      .sq-topbar-badge { display: none !important; }
      .sq-topbar-title { display: none !important; }
      .sq-quest-header-hook { font-size: 12px !important; }
    }
  `;
  document.head.appendChild(el);
};

// ===================== ICON MAP =====================
function StageIcon({ type, size = 18, color = 'currentColor' }) {
  const p = { size, color, strokeWidth: 2 };
  switch (type) {
    case 'research':   return <Search {...p} />;
    case 'build':      return <Wrench {...p} />;
    case 'experiment': return <FlaskConical {...p} />;
    case 'simulate':   return <Mic {...p} />;
    case 'reflect':    return <BookOpen {...p} />;
    case 'present':    return <Megaphone {...p} />;
    default:           return <Zap {...p} />;
  }
}

// ===================== CONFETTI =====================
const CONFETTI_COLORS = ['#B8860B', '#2D6A4F', '#1B4965', '#C0392B', '#B8860B'];
function ConfettiBurst({ active }) {
  if (!active) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
      {CONFETTI_COLORS.map((color, i) => (
        <div key={i} className="sq-confetti-piece" style={{
          position: 'absolute',
          top: `${35 + i * 8}%`, left: `${20 + i * 14}%`,
          width: 10, height: 10,
          borderRadius: i % 2 === 0 ? '50%' : '3px',
          background: color,
          animationDelay: `${i * 80}ms`,
        }} />
      ))}
    </div>
  );
}

// ===================== WELCOME SCREEN =====================
function WelcomeScreen({ quest, assignedStudents, onEnter }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null); // { name, id, pin } | null
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const inputRef = useRef(null);
  const pinRef = useRef(null);

  const needsPin = selected?.pin; // only require code if student has a pin

  const handleStart = () => {
    const finalName = selected?.name || name.trim();
    if (!finalName) return;

    // Verify PIN for assigned students
    if (needsPin) {
      if (pinInput.trim() !== selected.pin) {
        setPinError('That code doesn\u2019t match. Try again.');
        return;
      }
    }

    onEnter(finalName, selected?.id || null);
  };

  // Focus pin input when student is selected
  useEffect(() => {
    if (selected?.pin && pinRef.current) {
      setTimeout(() => pinRef.current?.focus(), 100);
    }
  }, [selected]);

  const canStart = needsPin
    ? (selected?.name && pinInput.trim())
    : (selected?.name || name.trim());

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', fontFamily: 'var(--font-body)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <WayfinderLogoIcon size={28} color="var(--compass-gold)" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          Wayfinder
        </span>
      </div>

      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Quest info */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.3)',
            borderRadius: 100, padding: '4px 14px', marginBottom: 16,
          }}>
            <Star size={12} color="var(--compass-gold)" fill="var(--compass-gold)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Project
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.2 }}>
            {quest.title}
          </h1>
          {quest.subtitle && (
            <p style={{ fontSize: 14, color: 'var(--graphite)', lineHeight: 1.6, margin: 0 }}>
              {quest.subtitle}
            </p>
          )}
        </div>

        {/* Name section */}
        <div style={{
          background: 'var(--chalk)', border: '1px solid var(--pencil)',
          borderRadius: 16, padding: '28px 28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
            Who are you?
          </h2>
          <p style={{ fontSize: 13, color: 'var(--graphite)', margin: '0 0 20px' }}>
            Pick your name to get started.
          </p>

          {/* Assigned student picker */}
          {assignedStudents.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {assignedStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelected({ name: s.name, id: s.id, pin: s.pin }); setName(''); setPinInput(''); setPinError(''); }}
                  className="sq-pop"
                  style={{
                    padding: '8px 16px', borderRadius: 100,
                    border: `2px solid ${selected?.name === s.name ? 'var(--compass-gold)' : 'var(--pencil)'}`,
                    background: selected?.name === s.name ? 'rgba(184,134,11,0.1)' : 'transparent',
                    color: selected?.name === s.name ? 'var(--compass-gold)' : 'var(--ink)',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* PIN verification for assigned students */}
          {needsPin && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                Enter your student code
              </label>
              <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 8px' }}>
                Your guide gave you a 4-digit code.
              </p>
              <input
                ref={pinRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="0000"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: 8,
                  border: `1.5px solid ${pinError ? 'var(--specimen-red)' : 'var(--pencil)'}`,
                  fontSize: 20, fontFamily: 'var(--font-mono)',
                  color: 'var(--ink)', background: 'var(--chalk)',
                  textAlign: 'center', letterSpacing: '0.3em',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
              />
              {pinError && (
                <p style={{ fontSize: 12, color: 'var(--specimen-red)', margin: '6px 0 0' }}>{pinError}</p>
              )}
            </div>
          )}

          {/* Custom name input — only show if no assigned student selected */}
          {!selected && assignedStudents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--pencil)' }} />
              <span style={{ fontSize: 11, color: 'var(--pencil)', fontFamily: 'var(--font-mono)' }}>or type your name</span>
              <div style={{ flex: 1, height: 1, background: 'var(--pencil)' }} />
            </div>
          )}

          {!selected && (
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSelected(null); }}
              placeholder="Type your name..."
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              className="sq-name-input"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', borderRadius: 8,
                border: '1.5px solid var(--pencil)',
                fontSize: 14, fontFamily: 'var(--font-body)',
                color: 'var(--ink)', background: 'var(--chalk)',
                transition: 'border-color 150ms, box-shadow 150ms',
                marginBottom: 16,
              }}
            />
          )}

          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 10, border: 'none',
              background: !canStart ? 'var(--pencil)' : 'var(--compass-gold)',
              color: !canStart ? 'var(--graphite)' : 'var(--ink)',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)',
              cursor: !canStart ? 'not-allowed' : 'pointer',
              transition: 'all 150ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Start Project <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== SVG JOURNEY MAP =====================
const NODE_SPACING = 130;
const NODE_RADIUS = 22;
const SVG_CENTER = 160;
const OFFSETS = [-36, 36, 0, -36, 36];

function JourneyMap({ stages, activeCard, onNodeClick }) {
  const nodeCount = stages.length;
  const svgHeight = nodeCount * NODE_SPACING + 80;

  const nx = (i) => SVG_CENTER + OFFSETS[i % OFFSETS.length];
  const ny = (i) => 50 + i * NODE_SPACING;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={320} height={svgHeight} style={{ overflow: 'visible' }}>
        {stages.map((stage, i) => {
          if (i === stages.length - 1) return null;
          const done = stage.status === 'completed';
          return (
            <line key={`l${i}`}
              x1={nx(i)} y1={ny(i) + NODE_RADIUS}
              x2={nx(i+1)} y2={ny(i+1) - NODE_RADIUS}
              stroke={done ? 'var(--field-green)' : 'var(--pencil)'}
              strokeWidth={done ? 2.5 : 1.5}
              strokeDasharray={done ? 'none' : '5 4'}
              opacity={0.65}
            />
          );
        })}

        {stages.map((stage, i) => {
          const isActive = stage.status === 'active';
          const isDone = stage.status === 'completed';
          const isLocked = stage.status === 'locked';
          const isSelected = activeCard === stage.id;
          const cx = nx(i), cy = ny(i);

          return (
            <g key={stage.id}
              className="sq-node-hover"
              onClick={() => onNodeClick(stage.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNodeClick(stage.id); }}
              aria-label={`${stage.title} — ${stage.status}`}
            >
              {isActive && <circle className="sq-pulse" cx={cx} cy={cy} r={NODE_RADIUS + 9} fill="none" stroke="var(--compass-gold)" strokeWidth={1.5} opacity={0.45} />}
              {isSelected && <circle cx={cx} cy={cy} r={NODE_RADIUS + 6} fill="none" stroke="var(--lab-blue)" strokeWidth={2} opacity={0.7} />}

              <circle
                cx={cx} cy={cy} r={NODE_RADIUS}
                fill={isDone ? 'var(--field-green)' : isActive ? 'var(--compass-gold)' : 'var(--parchment)'}
                stroke={isDone ? 'var(--field-green)' : isActive ? 'var(--compass-gold)' : 'var(--pencil)'}
                strokeWidth={2}
                opacity={isLocked ? 0.4 : 1}
              />

              <foreignObject x={cx - 10} y={cy - 10} width={20} height={20}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                  {isLocked
                    ? <Lock size={12} color="var(--pencil)" strokeWidth={2} opacity={0.6} />
                    : isDone
                      ? <CheckCircle size={13} color="var(--chalk)" strokeWidth={2.5} />
                      : <StageIcon type={stage.stage_type || stage.type} size={13} color={isActive ? 'var(--ink)' : 'var(--pencil)'} />
                  }
                </div>
              </foreignObject>

              <text x={cx} y={cy + NODE_RADIUS + 14} fontSize="9" fontFamily="var(--font-mono)"
                fill={isLocked ? 'var(--pencil)' : 'var(--graphite)'}
                textAnchor="middle" opacity={isLocked ? 0.4 : 0.85}
              >
                {stage.stage_number}
              </text>
            </g>
          );
        })}

        {/* Final simulation node */}
        {stages.length > 0 && (
          <g>
            <line
              x1={nx(stages.length-1)} y1={ny(stages.length-1) + NODE_RADIUS}
              x2={SVG_CENTER} y2={ny(stages.length-1) + NODE_SPACING - NODE_RADIUS}
              stroke="var(--lab-blue)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.45}
            />
            <circle cx={SVG_CENTER} cy={ny(stages.length-1) + NODE_SPACING} r={NODE_RADIUS}
              fill="var(--lab-blue)" stroke="var(--lab-blue)" strokeWidth={2} opacity={0.75}
            />
            <foreignObject x={SVG_CENTER-10} y={ny(stages.length-1)+NODE_SPACING-10} width={20} height={20}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                <Mic size={12} color="var(--chalk)" strokeWidth={2} />
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  );
}

// ===================== MOBILE STAGE NAV =====================
function MobileStageNav({ stages, activeCard, onNodeClick }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '12px 16px', background: 'var(--chalk)',
      borderBottom: '1px solid var(--pencil)',
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {stages.map((stage, i) => {
        const isDone = stage.status === 'completed';
        const isActive = stage.status === 'active';
        const isLocked = stage.status === 'locked';
        const isSelected = activeCard === stage.id;
        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => onNodeClick(stage.id)}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: isSelected ? '2.5px solid var(--lab-blue)' : '2px solid transparent',
                background: isDone ? 'var(--field-green)' : isActive ? 'var(--compass-gold)' : 'var(--parchment)',
                color: isDone || isActive ? 'var(--chalk)' : 'var(--pencil)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
                opacity: isLocked ? 0.4 : 1,
                transition: 'all 150ms',
                boxShadow: isSelected ? '0 0 0 3px rgba(27,73,101,0.15)' : 'none',
              }}
            >
              {isDone ? <CheckCircle size={15} strokeWidth={2.5} />
                : isLocked ? <Lock size={12} strokeWidth={2} />
                : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{stage.stage_number}</span>
              }
            </button>
            {i < stages.length - 1 && (
              <div style={{
                width: 20, height: 2,
                background: isDone ? 'var(--field-green)' : 'var(--pencil)',
                opacity: isDone ? 0.7 : 0.3,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===================== SUBMISSION PANEL =====================
function SubmissionPanel({ stageId, questId, studentName, onSubmitComplete, initialText = '' }) {
  const [type, setType] = useState('text');
  const [textContent, setTextContent] = useState(initialText);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mediaBlob, setMediaBlob] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [mediaDuration, setMediaDuration] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0); // 3,2,1 countdown
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [previewActive, setPreviewActive] = useState(false); // show camera before recording

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const streamRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Enumerate cameras when video tab selected
  useEffect(() => {
    if (type !== 'video') return;
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    }).catch(() => {});
  }, [type, selectedCamera]);

  const canSubmit =
    (type === 'text' && textContent.trim()) ||
    ((type === 'audio' || type === 'video') && (mediaBlob || file)) ||
    (type === 'file' && file);

  const fmtSecs = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sc = (s % 60).toString().padStart(2, '0');
    return `${m}:${sc}`;
  };

  // Attach stream to video element whenever stream or element changes
  useEffect(() => {
    if (videoPreviewRef.current && streamRef.current && (previewActive || recording)) {
      videoPreviewRef.current.srcObject = streamRef.current;
    }
  }, [previewActive, recording]);

  // Open camera preview (before recording)
  const openCameraPreview = async () => {
    setError('');
    try {
      const videoConstraint = selectedCamera
        ? { deviceId: { exact: selectedCamera } }
        : { facingMode: 'user' };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraint });
      streamRef.current = stream;
      // Set previewActive first so the <video> element renders, then useEffect attaches the stream
      setPreviewActive(true);
      // Re-enumerate cameras now that we have permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
    } catch (err) {
      setError('Could not access camera: ' + (err.message || 'Permission denied'));
    }
  };

  // Switch camera
  const switchCamera = async (deviceId) => {
    setSelectedCamera(deviceId);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { deviceId: { exact: deviceId } },
      });
      streamRef.current = stream;
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      });
    } catch (err) {
      setError('Could not switch camera: ' + (err.message || ''));
    }
  };

  // Start recording with countdown
  const startRecording = async () => {
    setError('');
    try {
      if (type === 'audio') {
        // Audio: no countdown, start immediately
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        _beginRecording(stream);
        return;
      }

      // Video: ensure preview is active, then do 3-2-1 countdown
      if (!previewActive) {
        await openCameraPreview();
      }
      setCountdown(3);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            // Start actual recording using the existing stream
            if (streamRef.current) _beginRecording(streamRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('Could not access microphone/camera: ' + (err.message || 'Permission denied'));
    }
  };

  const _beginRecording = (stream) => {
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
      setMediaBlob(blob);
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      setPreviewActive(false);
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setRecording(true);
    setPaused(false);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setPaused(false);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording' || mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
    clearInterval(timerRef.current);
    setMediaDuration(fmtSecs(seconds));
  };

  const cancelPreview = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    setPreviewActive(false);
    setCountdown(0);
    clearInterval(countdownRef.current);
  };

  const handleSubmit = async () => {
    if (!canSubmit || uploading) return;
    setUploading(true);
    setError('');
    try {
      let fileUrl = null, fileName = null, fileSize = null, mimeType = null;

      const uploadSource = mediaBlob || (type !== 'text' ? file : null);
      if (uploadSource) {
        const isRecorded = !!mediaBlob;
        const ext = isRecorded
          ? (type === 'video' ? 'webm' : 'webm')
          : (file.name.includes('.') ? file.name.split('.').pop() : 'bin');
        const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
        const path = `${questId}/${stageId}/${safeName}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('student-submissions')
          .upload(path, uploadSource, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('student-submissions')
          .getPublicUrl(path);
        fileUrl = publicUrl;
        fileName = isRecorded ? `recording_${Date.now()}.${ext}` : file.name;
        fileSize = uploadSource.size;
        mimeType = uploadSource.type;
      }

      const { data: result, error: rpcError } = await supabase.rpc('submit_stage_work', {
        p_quest_id: questId,
        p_stage_id: stageId,
        p_student_name: studentName,
        p_submission_type: type,
        p_content: type === 'text' ? textContent : null,
        p_file_url: fileUrl,
        p_file_name: fileName,
        p_file_size: fileSize,
        p_mime_type: mimeType,
      });
      if (rpcError) throw new Error(rpcError.message || 'Submission failed');
      if (result?.success === false) throw new Error(result.error || 'Submission failed');

      onSubmitComplete(stageId, type === 'text' ? textContent : `[${type} submission: ${fileName || 'recording'}]`);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const mediaUrl = mediaBlob ? URL.createObjectURL(mediaBlob) : null;

  const tabs = [
    { key: 'text', label: 'Text', Icon: MessageCircle },
    { key: 'audio', label: 'Audio', Icon: Mic },
    { key: 'video', label: 'Video', Icon: Video },
    { key: 'file', label: 'File', Icon: Paperclip },
  ];

  const switchTab = (k) => {
    // Clean up any active preview/recording
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    setType(k);
    setMediaBlob(null);
    setFile(null);
    setRecording(false);
    setPaused(false);
    setPreviewActive(false);
    setCountdown(0);
    setVideoExpanded(false);
    setError('');
  };

  return (
    <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Submit Your Work
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6,
              border: `1px solid ${type === key ? 'var(--compass-gold)' : 'var(--pencil)'}`,
              background: type === key ? 'rgba(184,134,11,0.08)' : 'transparent',
              color: type === key ? 'var(--compass-gold)' : 'var(--graphite)',
              fontSize: 11, fontWeight: type === key ? 700 : 400,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Text */}
      {type === 'text' && (
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Describe what you did, what you learned..."
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 12px', borderRadius: 6,
            border: '1.5px solid var(--ink)', background: 'var(--chalk)',
            fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--ink)',
            resize: 'vertical', lineHeight: 1.6, marginBottom: 8, outline: 'none',
          }}
        />
      )}

      {/* Audio */}
      {type === 'audio' && (
        <div style={{ marginBottom: 8 }}>
          {mediaBlob ? (
            <div>
              <audio controls src={mediaUrl} style={{ width: '100%', marginBottom: 6 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                  {mediaDuration}
                </span>
                <button onClick={() => setMediaBlob(null)} style={{ fontSize: 11, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Re-record
                </button>
              </div>
            </div>
          ) : recording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(192,57,43,0.06)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.2)' }}>
              <div className="sq-rec-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--specimen-red)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{fmtSecs(seconds)}</span>
              <button onClick={stopRecording} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 5, border: 'none', background: 'var(--specimen-red)', color: 'var(--chalk)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Stop
              </button>
            </div>
          ) : file ? (
            <div style={{ padding: '8px 12px', background: 'var(--parchment)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink)' }}>{file.name}</span>
              <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 0, display: 'flex' }}><X size={13} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={startRecording} style={{ flex: 1, padding: '9px', borderRadius: 6, border: 'none', background: 'var(--ink)', color: 'var(--chalk)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Mic size={13} /> Record Audio
              </button>
              <label style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid var(--pencil)', color: 'var(--graphite)', fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Paperclip size={12} /> Upload
                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Video */}
      {type === 'video' && (
        <div style={{ marginBottom: 8 }}>
          {mediaBlob ? (
            <div>
              <video controls src={mediaUrl} style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                  {mediaDuration}
                </span>
                <button onClick={() => setMediaBlob(null)} style={{ fontSize: 11, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Re-record
                </button>
              </div>
            </div>
          ) : (recording || previewActive) ? (
            <div>
              {/* Video preview — expandable */}
              <div style={{
                position: videoExpanded ? 'fixed' : 'relative',
                inset: videoExpanded ? 0 : 'auto',
                zIndex: videoExpanded ? 999 : 'auto',
                background: videoExpanded ? '#000' : 'transparent',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: videoExpanded ? 0 : undefined,
              }}>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: videoExpanded ? '100vh' : 220,
                    objectFit: videoExpanded ? 'contain' : 'cover',
                    borderRadius: videoExpanded ? 0 : 8,
                    marginBottom: videoExpanded ? 0 : 8,
                    background: '#000', transform: 'scaleX(-1)',
                  }}
                />
                {/* Countdown overlay */}
                {countdown > 0 && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', borderRadius: videoExpanded ? 0 : 8,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 64,
                      color: 'var(--chalk)', fontWeight: 700,
                      animation: 'sq-pop 800ms ease',
                    }}>
                      {countdown}
                    </span>
                  </div>
                )}
                {/* Expand/shrink button */}
                <button
                  onClick={() => setVideoExpanded(v => !v)}
                  title={videoExpanded ? 'Exit fullscreen' : 'Expand'}
                  style={{
                    position: 'absolute', top: videoExpanded ? 16 : 8, right: videoExpanded ? 16 : 8,
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    color: 'var(--chalk)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  {videoExpanded ? <X size={16} /> : <Maximize2 size={14} />}
                </button>
                {/* Fullscreen controls — always visible in expanded mode */}
                {videoExpanded && (
                  <div style={{
                    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', borderRadius: 100,
                    background: 'rgba(0,0,0,0.7)', color: 'var(--chalk)',
                  }}>
                    {recording ? (
                      <>
                        <div className={paused ? '' : 'sq-rec-dot'} style={{ width: 10, height: 10, borderRadius: '50%', background: paused ? 'var(--graphite)' : 'var(--specimen-red)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, minWidth: 48 }}>{fmtSecs(seconds)}</span>
                        <button onClick={paused ? resumeRecording : pauseRecording} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'var(--chalk)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}
                        </button>
                        <button onClick={() => { stopRecording(); setVideoExpanded(false); }} style={{ background: 'var(--specimen-red)', border: 'none', color: 'var(--chalk)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Stop
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={startRecording}
                          disabled={countdown > 0}
                          style={{
                            background: countdown > 0 ? 'var(--graphite)' : 'var(--specimen-red)',
                            border: 'none', color: 'var(--chalk)', borderRadius: 8,
                            padding: '8px 20px', cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                            fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--chalk)' }} />
                          {countdown > 0 ? `${countdown}...` : 'Record'}
                        </button>
                        <button
                          onClick={() => { cancelPreview(); setVideoExpanded(false); }}
                          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'var(--chalk)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
                {/* Paused overlay */}
                {paused && !videoExpanded && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)', borderRadius: 8,
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--chalk)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Paused
                    </span>
                  </div>
                )}
              </div>

              {/* Camera selector */}
              {cameras.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <SwitchCamera size={12} color="var(--graphite)" />
                  <select
                    value={selectedCamera}
                    onChange={(e) => switchCamera(e.target.value)}
                    style={{
                      flex: 1, padding: '4px 8px', borderRadius: 5,
                      border: '1px solid var(--pencil)', background: 'var(--chalk)',
                      fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--ink)',
                    }}
                  >
                    {cameras.map((cam, i) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Controls */}
              {recording ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(192,57,43,0.06)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.2)' }}>
                  <div className="sq-rec-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: paused ? 'var(--graphite)' : 'var(--specimen-red)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)', minWidth: 40 }}>{fmtSecs(seconds)}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      onClick={paused ? resumeRecording : pauseRecording}
                      style={{
                        padding: '5px 10px', borderRadius: 5, border: '1px solid var(--pencil)',
                        background: 'var(--chalk)', color: 'var(--ink)',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {paused ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
                    </button>
                    <button onClick={stopRecording} style={{
                      padding: '5px 12px', borderRadius: 5, border: 'none',
                      background: 'var(--specimen-red)', color: 'var(--chalk)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Stop
                    </button>
                  </div>
                </div>
              ) : (
                /* Preview active but not recording yet — show Record + Cancel */
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={startRecording}
                    disabled={countdown > 0}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 6, border: 'none',
                      background: countdown > 0 ? 'var(--graphite)' : 'var(--specimen-red)',
                      color: 'var(--chalk)', fontSize: 12, fontWeight: 600,
                      fontFamily: 'var(--font-body)', cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--chalk)' }} />
                    {countdown > 0 ? `Starting in ${countdown}...` : 'Start Recording'}
                  </button>
                  <button
                    onClick={cancelPreview}
                    style={{
                      padding: '9px 12px', borderRadius: 6, border: '1px solid var(--pencil)',
                      background: 'transparent', color: 'var(--graphite)',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : file ? (
            <div style={{ padding: '8px 12px', background: 'var(--parchment)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink)' }}>{file.name}</span>
              <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 0, display: 'flex' }}><X size={13} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openCameraPreview} style={{ flex: 1, padding: '9px', borderRadius: 6, border: 'none', background: 'var(--ink)', color: 'var(--chalk)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Video size={13} /> Record Video
              </button>
              <label style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid var(--pencil)', color: 'var(--graphite)', fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Paperclip size={12} /> Upload
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* File */}
      {type === 'file' && (
        <div style={{ marginBottom: 8 }}>
          {file ? (
            <div style={{ padding: '8px 12px', background: 'var(--parchment)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 4, display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '20px', borderRadius: 8, border: '2px dashed var(--pencil)',
              color: 'var(--graphite)', fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer',
            }}>
              <Paperclip size={14} />
              Choose file (.pdf, .doc, .ppt, images…)
              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
            </label>
          )}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: 'var(--specimen-red)', marginBottom: 8, padding: '6px 10px', background: 'rgba(192,57,43,0.06)', borderRadius: 5, lineHeight: 1.4 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || uploading}
        className="sq-btn-hover"
        style={{
          width: '100%', padding: '11px', borderRadius: 8, border: 'none',
          background: !canSubmit || uploading ? 'var(--pencil)' : 'var(--field-green)',
          color: !canSubmit || uploading ? 'var(--graphite)' : 'var(--chalk)',
          fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
          cursor: !canSubmit || uploading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'opacity 150ms',
        }}
      >
        {uploading
          ? <><Loader2 size={14} className="sq-spin" /> Submitting…</>
          : <><CheckCircle size={14} /> Submit &amp; Complete Stage</>
        }
      </button>
    </div>
  );
}

// ===================== SUBMISSION VIEW (read-only) =====================
function SubmissionView({ submission }) {
  if (!submission) return null;
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = submission.revision_history || [];
  const typeBadgeColor = {
    text: 'var(--lab-blue)',
    audio: 'var(--field-green)',
    video: 'var(--compass-gold)',
    file: 'var(--graphite)',
  }[submission.submission_type] || 'var(--graphite)';

  const renderSubmissionContent = (sub) => {
    const st = sub.submission_type;
    if (st === 'text' && sub.content) return (
      <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.65, margin: 0, background: 'var(--parchment)', padding: '10px 12px', borderRadius: 6 }}>
        {sub.content}
      </p>
    );
    if (st === 'audio' && sub.file_url) return <audio controls src={sub.file_url} style={{ width: '100%' }} />;
    if (st === 'video' && sub.file_url) return <video controls src={sub.file_url} style={{ width: '100%', borderRadius: 6 }} />;
    if (st === 'file' && sub.file_url) return (
      <a href={sub.file_url} download={sub.file_name || 'submission'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--lab-blue)', fontFamily: 'var(--font-body)' }}>
        <Download size={13} /> {sub.file_name || 'Download file'}
      </a>
    );
    return null;
  };

  return (
    <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Your Submission
        </div>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: typeBadgeColor, background: `${typeBadgeColor}18`, padding: '2px 6px', borderRadius: 4 }}>
          {submission.submission_type}
        </span>
        {history.length > 0 && (
          <span style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
            (attempt {history.length + 1})
          </span>
        )}
      </div>
      {renderSubmissionContent(submission)}

      {/* Previous attempts */}
      {history.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <ChevronRight size={12} style={{ transform: historyOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
            {history.length} previous attempt{history.length > 1 ? 's' : ''}
          </button>
          {historyOpen && (
            <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid var(--pencil)' }}>
              {[...history].reverse().map((prev, i) => (
                <div key={i} style={{ marginBottom: 10, opacity: 0.7 }}>
                  <div style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                    Attempt {history.length - i} — {prev.submitted_at ? new Date(prev.submitted_at).toLocaleDateString() : ''}
                  </div>
                  {renderSubmissionContent(prev)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== FEEDBACK CARD =====================
function FeedbackCard({ feedback }) {
  if (!feedback) return null;
  return (
    <div className="sq-card" style={{
      background: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.2)',
      borderRadius: 10, padding: '14px 16px', marginTop: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--field-green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Star size={11} fill="var(--field-green)" color="var(--field-green)" /> Field Guide Feedback
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.65, margin: '0 0 10px' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(feedback.feedback_text || feedback.feedback) }}
      />
      {(feedback.skills_demonstrated?.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {feedback.skills_demonstrated.map((s, i) => (
            <span key={i} style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 100,
              background: 'rgba(45,106,79,0.1)', color: 'var(--field-green)',
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            }}>{s}</span>
          ))}
        </div>
      )}
      {feedback.encouragement && (
        <div style={{ fontSize: 11, color: 'var(--field-green)', fontWeight: 600, margin: '0 0 6px', lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(feedback.encouragement) }}
        />
      )}
      {(feedback.next_steps) && (
        <div style={{ background: 'rgba(184,134,11,0.06)', borderRadius: 6, padding: '8px 10px', borderLeft: '2px solid var(--compass-gold)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>What to explore next</div>
          <div style={{ fontSize: 11, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(feedback.next_steps) }}
          />
        </div>
      )}
    </div>
  );
}

// ===================== STRETCH CHALLENGE =====================
function StretchChallenge({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: 'rgba(27,73,101,0.04)', border: '1px solid rgba(27,73,101,0.15)',
      borderRadius: 8, padding: '10px 14px', marginBottom: 14,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--lab-blue)', fontSize: 12, fontWeight: 600,
          fontFamily: 'var(--font-body)',
        }}
      >
        <Zap size={12} />
        Ready for more?
        <span style={{ marginLeft: 'auto', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, margin: '8px 0 0', paddingTop: 8, borderTop: '1px solid rgba(27,73,101,0.1)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
      )}
    </div>
  );
}

// ===================== CHALLENGER CARD =====================
function ChallengerCard({ challenge, questId, stageId, studentName, studentId, onRespond, initialResponse, initialSubmitted }) {
  const [response, setResponse] = useState(initialResponse || '');
  const [submitted, setSubmitted] = useState(initialSubmitted || false);

  const handleSubmit = () => {
    if (!response.trim()) return;
    // Persist challenger response
    guideMessagesApi.add({
      questId, stageId, studentId, studentName,
      role: 'user', content: response.trim(),
      messageType: 'devil_advocate',
    });
    setSubmitted(true);
    if (onRespond) onRespond(response.trim());
  };

  return (
    <div className="sq-pop" style={{
      background: 'rgba(192,57,43,0.04)', border: '1px solid rgba(192,57,43,0.25)',
      borderRadius: 10, padding: '14px 16px', marginTop: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Zap size={13} color="var(--specimen-red)" fill="var(--specimen-red)" />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--specimen-red)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          The Challenger
        </span>
        {submitted && (
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 600, color: 'var(--field-green)',
            fontFamily: 'var(--font-mono)',
          }}>
            <CheckCircle size={11} color="var(--field-green)" /> Responded
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: submitted ? 'var(--graphite)' : 'var(--ink)', lineHeight: 1.65, margin: '0 0 10px', fontStyle: 'italic' }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(challenge) }}
      />
      {submitted ? (
        <div style={{
          background: 'var(--parchment)', borderRadius: 6, padding: '8px 10px',
          borderLeft: '2px solid var(--field-green)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--field-green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Your response</div>
          <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>{response}</p>
        </div>
      ) : (
        <>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Defend your thinking..."
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: 6,
              border: '1px solid rgba(192,57,43,0.2)', background: 'var(--chalk)',
              fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--ink)',
              resize: 'vertical', lineHeight: 1.5, marginBottom: 8,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!response.trim()}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: !response.trim() ? 'var(--pencil)' : 'var(--specimen-red)',
              color: !response.trim() ? 'var(--graphite)' : 'var(--chalk)',
              fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: !response.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Zap size={11} /> Respond to Challenge
          </button>
        </>
      )}
    </div>
  );
}

// ===================== STAGE CARD =====================
function StageCard({ stage, onComplete, questId, studentName, existingSubmission, studentProfile, groupRole, onReloadSubmissions, onChallengerTriggered, onSuggestEdit, landmark, interactiveData, expeditionChallenge, expeditionResponse, onChallengeEvaluate, isNextLocked }) {
  const isDone = stage.status === 'completed';
  const isActive = stage.status === 'active';
  const isLocked = stage.status === 'locked';

  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [revising, setRevising] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestText, setSuggestText] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestResult, setSuggestResult] = useState(null);

  // Load existing feedback for completed stages
  useEffect(() => {
    if (!isDone || !questId || !studentName) return;
    feedbackApi.listForQuest(questId, studentName).then(({ data }) => {
      const match = (data || []).find(f => f.stage_id === stage.id);
      if (match) setFeedback(match);
    });
  }, [isDone, questId, studentName, stage.id]);

  const handleSuggestEdit = async () => {
    if (!suggestText.trim() || suggestLoading) return;
    setSuggestLoading(true);
    try {
      const result = await ai.proposeStageEdit({
        stage: { title: stage.title, description: stage.description, deliverable: stage.deliverable, guiding_questions: stage.guiding_questions },
        studentRequest: suggestText.trim(),
        questContext: { title: '', standards: '', skills: [] },
        studentProfile: studentProfile || { name: studentName },
      });
      setSuggestResult(result);
    } catch {
      setSuggestResult({ explanation: 'Could not generate a suggestion right now. Try again later.' });
    }
    setSuggestLoading(false);
  };

  const handleAcceptEdit = async () => {
    if (!suggestResult) return;
    const updates = {};
    if (suggestResult.modified_title) updates.title = suggestResult.modified_title;
    if (suggestResult.modified_description) updates.description = suggestResult.modified_description;
    if (suggestResult.modified_deliverable) updates.deliverable = suggestResult.modified_deliverable;
    if (suggestResult.modified_guiding_questions) updates.guiding_questions = suggestResult.modified_guiding_questions;

    // Save edit history
    await supabase.from('stage_edit_history').insert({
      stage_id: stage.id,
      student_name: studentName,
      original_content: { title: stage.title, description: stage.description, deliverable: stage.deliverable, guiding_questions: stage.guiding_questions },
      proposed_content: updates,
      student_request: suggestText,
      accepted: true,
    });

    // Update stage
    if (Object.keys(updates).length > 0) {
      await supabase.from('quest_stages').update(updates).eq('id', stage.id);
    }

    setSuggestOpen(false);
    setSuggestText('');
    setSuggestResult(null);
    if (onSuggestEdit) onSuggestEdit();
  };

  const readText = [
    stage.title,
    stage.description || '',
    ...(stage.guiding_questions?.slice(0, 2) || []),
  ].filter(Boolean).join('. ');

  return (
    <div className={`sq-card${isActive ? ' sq-stage-active' : ''}${isDone ? ' sq-stage-completed' : ''}${isNextLocked ? ' sq-stage-next-locked' : ''}`} style={{
      background: 'var(--chalk)', border: '1px solid var(--pencil)',
      borderRadius: 14, padding: '24px 28px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: isDone ? 'var(--field-green)' : 'var(--parchment)',
            border: `2px solid ${isDone ? 'var(--field-green)' : 'var(--compass-gold)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isDone
              ? <CheckCircle size={18} color="var(--chalk)" strokeWidth={2.5} />
              : <StageIcon type={stage.stage_type || stage.type} size={18} color="var(--ink)" />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Stage {stage.stage_number}
              </span>
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                letterSpacing: '0.04em', fontWeight: 600,
                color: isDone ? 'var(--field-green)' : isActive ? 'var(--compass-gold)' : 'var(--pencil)',
              }}>
                {stage.status}
              </span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>
              {stage.title}
            </h3>
          </div>
        </div>
        <SpeakButton text={readText} />
      </div>

      {isLocked && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 20,
          background: 'var(--parchment)', border: '1px solid var(--pencil)',
          fontSize: 11, fontWeight: 600, color: 'var(--graphite)',
          fontFamily: 'var(--font-body)', marginBottom: 8,
        }}>
          <Lock size={11} /> Locked
        </div>
      )}

      {isLocked ? (
        <div style={{ opacity: 0.55, pointerEvents: 'none' }}>
          {stage.description && (
            <p style={{ fontSize: 14, color: 'var(--graphite)', lineHeight: 1.7, fontFamily: 'var(--font-body)', margin: '0 0 16px' }}>
              {stage.description}
            </p>
          )}
          {stage.sources?.length > 0 && (
            <div style={{ padding: '10px 12px', background: 'rgba(27,73,101,0.04)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Sources
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stage.sources.map((src, i) => (
                  <TrustBadge key={i} tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title || src.domain} verified={src.verified} />
                ))}
              </div>
            </div>
          )}
          {stage.guiding_questions?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
                Questions to explore
              </div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {stage.guiding_questions.map((q, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--graphite)', fontFamily: 'var(--font-body)', marginBottom: 6, lineHeight: 1.6 }}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {stage.deliverable && (
            <div style={{ background: 'var(--parchment)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-mono)' }}>
                Deliverable
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-body)', margin: 0, lineHeight: 1.6 }}>
                {stage.deliverable}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Narrative hook from landmark */}
      {landmark?.narrative_hook && !isLocked && (
        <div style={{
          padding: '12px 16px', marginBottom: 16, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--parchment) 0%, #EDE8DC 100%)',
          borderLeft: '3px solid var(--compass-gold)',
          fontFamily: 'var(--font-display)', fontSize: 15, fontStyle: 'italic',
          color: 'var(--ink)', lineHeight: 1.5,
        }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(landmark.narrative_hook) }}
        />
      )}

      {/* Expedition Challenge */}
      {expeditionChallenge && (
        <ExpeditionChallenge
          challenge={expeditionChallenge}
          existingResponse={isDone
            ? (expeditionResponse || { is_successful: true, ai_feedback: 'Challenge cleared.', ep_awarded: 0 })
            : expeditionResponse
          }
          onEvaluate={onChallengeEvaluate}
          disabled={isDone}
        />
      )}

      {/* Description */}
      {stage.description && (
        <p style={{ fontSize: 14, color: 'var(--graphite)', lineHeight: 1.7, margin: '0 0 20px' }}>
          {stage.description}
        </p>
      )}

      {/* Sources */}
      {stage.sources?.length > 0 && (
        <div style={{ padding: '10px 12px', background: 'rgba(27,73,101,0.04)', borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Sources
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {stage.sources.map((src, i) => (
              <TrustBadge key={i} tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title || src.domain} verified={src.verified} />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {stage.description && stage.guiding_questions?.length > 0 && (
        <hr style={{ border: 'none', borderTop: '1px solid var(--pencil)', margin: '0 0 20px', opacity: 0.4 }} />
      )}

      {/* Guiding questions */}
      {stage.guiding_questions?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Questions to explore
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stage.guiding_questions.map((q, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Deliverable */}
      {stage.deliverable && (
        <div style={{
          background: 'var(--parchment)', borderRadius: 10,
          padding: '14px 18px', marginBottom: 20,
          borderLeft: '3px solid var(--compass-gold)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            What to make
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
            {stage.deliverable}
          </p>
        </div>
      )}

      {/* Suggest a change — active stages only */}
      {isActive && (
        <div style={{ marginBottom: 14 }}>
          {!suggestOpen ? (
            <button
              onClick={() => setSuggestOpen(true)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--pencil)',
                background: 'transparent', color: 'var(--graphite)', fontSize: 11,
                fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <Sparkles size={11} /> Suggest a change
            </button>
          ) : (
            <div style={{
              background: 'rgba(184,134,11,0.04)', border: '1px solid rgba(184,134,11,0.2)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Suggest a change to this stage
              </div>
              {!suggestResult ? (
                <>
                  <textarea
                    value={suggestText}
                    onChange={e => setSuggestText(e.target.value)}
                    placeholder="What would you like to change? e.g. 'I want to focus on marine biology instead of general ecology'"
                    rows={2}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 6,
                      border: '1px solid rgba(184,134,11,0.2)', background: 'var(--chalk)',
                      fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--ink)',
                      resize: 'vertical', lineHeight: 1.5, marginBottom: 8,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={handleSuggestEdit}
                      disabled={!suggestText.trim() || suggestLoading}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: !suggestText.trim() || suggestLoading ? 'var(--pencil)' : 'var(--compass-gold)',
                        color: !suggestText.trim() || suggestLoading ? 'var(--graphite)' : 'var(--ink)',
                        fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
                        cursor: !suggestText.trim() || suggestLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {suggestLoading ? <><Loader2 size={11} className="sq-spin" /> Thinking...</> : <><Sparkles size={11} /> Submit suggestion</>}
                    </button>
                    <button onClick={() => { setSuggestOpen(false); setSuggestText(''); }} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--graphite)', fontSize: 11, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, margin: '0 0 10px' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(suggestResult.explanation) }}
                  />
                  {suggestResult.modified_title && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>NEW TITLE: </span>
                      <span style={{ fontSize: 12, color: 'var(--ink)' }}>{suggestResult.modified_title}</span>
                    </div>
                  )}
                  {suggestResult.modified_description && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>NEW DESCRIPTION: </span>
                      <span style={{ fontSize: 12, color: 'var(--ink)' }}>{suggestResult.modified_description}</span>
                    </div>
                  )}
                  {suggestResult.modified_deliverable && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>NEW DELIVERABLE: </span>
                      <span style={{ fontSize: 12, color: 'var(--ink)' }}>{suggestResult.modified_deliverable}</span>
                    </div>
                  )}
                  {suggestResult.skills_covered === false && (
                    <p style={{ fontSize: 11, color: 'var(--specimen-red)', fontStyle: 'italic', margin: '6px 0' }}>
                      Note: Some academic skills may not be fully covered by this change.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      onClick={handleAcceptEdit}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: 'var(--field-green)', color: 'var(--chalk)',
                        fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <CheckCircle size={11} /> Accept changes
                    </button>
                    <button
                      onClick={() => { setSuggestResult(null); setSuggestText(''); setSuggestOpen(false); }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--graphite)', fontSize: 11, cursor: 'pointer' }}
                    >
                      Nevermind
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stretch challenge */}
      {stage.stretch_challenge && isActive && (
        <StretchChallenge text={stage.stretch_challenge} />
      )}

      {/* Interactive stage types */}
      {stage.stage_type === 'puzzle_gate' && interactiveData?.config && (
        <PuzzleGate config={interactiveData.config} onComplete={() => onComplete?.(stage.id)} />
      )}
      {stage.stage_type === 'choice_fork' && interactiveData?.config && (
        <ChoiceFork config={interactiveData.config} onChoose={(idx) => onComplete?.(stage.id)} />
      )}
      {stage.stage_type === 'evidence_board' && interactiveData?.config && (
        <EvidenceBoard config={interactiveData.config} onComplete={() => onComplete?.(stage.id)} />
      )}

      {/* Work submission — show for active stage OR completed stage if this student hasn't submitted */}
      {isDone && !existingSubmission && !revising && (
        <div style={{
          fontSize: 11, color: 'var(--lab-blue)', fontWeight: 600,
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          letterSpacing: '0.06em', marginBottom: 6, marginTop: 8,
        }}>
          You haven't submitted work yet — add yours below!
        </div>
      )}
      {(isActive || (isDone && !existingSubmission && !revising)) && (
        <SubmissionPanel
          stageId={stage.id}
          questId={questId}
          studentName={studentName}
          onSubmitComplete={async (stageId, submissionContent) => {
            const currentAttempt = attemptNumber;

            // AI review chain — determines if mastery is passed before advancing
            setFeedbackLoading(true);
            try {
              const result = await ai.reviewSubmission({
                stageTitle: stage.title,
                stageDescription: stage.description || '',
                deliverable: stage.deliverable || '',
                submissionContent: submissionContent || '',
                studentProfile: studentProfile || { name: studentName },
              });
              // Merge attempt number into feedback for ScoreCard display
              const enrichedResult = { ...result, attempt_number: currentAttempt };
              setFeedback(enrichedResult);

              // Gate stage advancement on mastery threshold
              const passed = (result.score ?? 50) >= MASTERY_THRESHOLD;
              if (passed) {
                if (!isDone) onComplete(stageId);
                else if (onReloadSubmissions) onReloadSubmissions();
              } else {
                // Submission saved but stage not advanced — student must resubmit
                if (onReloadSubmissions) onReloadSubmissions();
              }

              // Persist feedback with score + hints + attempt
              try {
                feedbackApi.add({
                  questId, stageId: stage.id, studentName,
                  feedbackText: result.feedback,
                  skillsDemonstrated: result.skills_demonstrated,
                  encouragement: result.encouragement,
                  nextSteps: result.next_steps,
                  score: result.score,
                  hints: result.hints,
                  attemptNumber: currentAttempt,
                });
              } catch (e) { console.error('Failed to persist feedback:', e); }
              // Silently log skill assessments from submission review
              if (result?.skill_ratings?.length > 0 && studentProfile?.id) {
                try {
                  const assessments = result.skill_ratings.map(sr => ({
                    student_id: studentProfile.id,
                    skill_name: sr.skill_name,
                    quest_id: questId,
                    stage_id: stage.id,
                    assessment_type: 'submission_review',
                    rating: sr.rating,
                    evidence: sr.evidence,
                  }));
                  skillAssessments.bulkLog(assessments);
                } catch (e) { console.error('Failed to log skill assessments:', e); }
              }
              // Chain mastery assessment (non-blocking)
              if (result.skills_demonstrated?.length && studentProfile?.id) {
                try {
                  const studentSkillsData = await skillsApi.getStudentSkills(studentProfile.id);
                  const mastery = await ai.assessMastery({
                    stageTitle: stage.title,
                    submissionContent: submissionContent || '',
                    skillsDemonstrated: result.skills_demonstrated,
                    studentSkills: studentSkillsData?.data || [],
                    score: result.score,
                  });
                  if (mastery.updates?.length) {
                    for (const update of mastery.updates) {
                      const allSkills = studentSkillsData?.data || [];
                      const match = allSkills.find(s => s.skill_name?.toLowerCase() === update.skill_name?.toLowerCase());
                      if (match) {
                        await skillsApi.upsertStudentSkill({
                          studentId: studentProfile.id,
                          skillId: match.skill_id,
                          proficiency: update.new_proficiency,
                          source: 'ai',
                        });
                        await snapshotsApi.add({
                          studentId: studentProfile.id,
                          skillId: match.skill_id,
                          proficiency: update.new_proficiency,
                          source: 'ai',
                          questId,
                        });
                      }
                    }
                  }
                } catch (e) { console.error('Mastery assessment failed (best-effort):', e); }
              }
              // Trigger Devil's Advocate at checkpoints
              const isShortResponse = (submissionContent || '').length < 100;
              const isCheckpoint = stage.stage_number % 2 === 0;
              if (isShortResponse || isCheckpoint) {
                try {
                  const challenge = await ai.devilsAdvocate({
                    stageTitle: stage.title,
                    stageDescription: stage.description || '',
                    studentWork: submissionContent || '',
                    studentProfile: studentProfile || { name: studentName },
                  });
                  if (onChallengerTriggered) onChallengerTriggered(challenge);
                  guideMessagesApi.add({
                    questId, stageId: stage.id,
                    studentId: studentProfile?.id || null, studentName,
                    role: 'challenger', content: challenge,
                    messageType: 'devil_advocate',
                  });
                } catch (e) { console.error('Challenger failed (optional):', e); }
              }
            } catch (e) {
              console.error('AI review failed — submission was saved successfully:', e);
            } finally {
              setFeedbackLoading(false);
            }
          }}
        />
      )}

      {/* Read-only submission for completed stages */}
      {isDone && existingSubmission && !revising && (
        <SubmissionView submission={existingSubmission} />
      )}

      {/* AI Feedback */}
      {feedbackLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', fontSize: 11, color: 'var(--graphite)', fontStyle: 'italic' }}>
          <Loader2 size={12} className="sq-spin" /> Getting feedback from your Field Guide...
        </div>
      )}
      {feedback && (
        feedback.score != null
          ? <ScoreCard
              feedback={feedback}
              onResubmit={() => {
                setAttemptNumber(n => n + 1);
                setRevising(true);
                setFeedback(null);
              }}
            />
          : <FeedbackCard feedback={feedback} />
      )}

      {/* Revise & Resubmit (for legacy feedback without score, or mastery-passed stages) */}
      {isDone && feedback && !revising && feedback.score == null && (
        <button
          onClick={() => setRevising(true)}
          style={{
            marginTop: 10, padding: '8px 16px', borderRadius: 8,
            border: '1.5px solid var(--lab-blue)', background: 'rgba(59,130,246,0.06)',
            color: 'var(--lab-blue)', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 150ms',
          }}
        >
          <ArrowRight size={13} /> Revise & Resubmit
        </button>
      )}
      {revising && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--lab-blue)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Revised Submission
            </span>
            <button onClick={() => setRevising(false)} style={{ fontSize: 11, color: 'var(--graphite)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
          <SubmissionPanel
            stageId={stage.id}
            questId={questId}
            studentName={studentName}
            initialText={existingSubmission?.submission_type === 'text' ? existingSubmission.content : ''}
            onSubmitComplete={(stageId, content) => {
              const revisedAttempt = attemptNumber;
              setRevising(false);
              setFeedback(null);
              setFeedbackLoading(true);
              // Reload submissions to get updated history
              if (onReloadSubmissions) onReloadSubmissions();
              ai.reviewSubmission({
                stageTitle: stage.title,
                stageDescription: stage.description || '',
                deliverable: stage.deliverable || '',
                submissionContent: content || '',
                studentProfile: studentProfile || { name: studentName },
              }).then((result) => {
                const enrichedResult = { ...result, attempt_number: revisedAttempt };
                setFeedback(enrichedResult);
                // Gate stage advancement on mastery for revisions too
                const passed = (result.score ?? 50) >= MASTERY_THRESHOLD;
                if (passed && !isDone) {
                  onComplete(stageId);
                }
                feedbackApi.add({
                  questId, stageId: stage.id, studentName,
                  feedbackText: result.feedback,
                  skillsDemonstrated: result.skills_demonstrated,
                  encouragement: result.encouragement,
                  nextSteps: result.next_steps,
                  score: result.score,
                  hints: result.hints,
                  attemptNumber: revisedAttempt,
                });
                // Silently log skill assessments from submission review
                if (result?.skill_ratings?.length > 0 && studentProfile?.id) {
                  const assessments = result.skill_ratings.map(sr => ({
                    student_id: studentProfile.id,
                    skill_name: sr.skill_name,
                    quest_id: questId,
                    stage_id: stage.id,
                    assessment_type: 'submission_review',
                    rating: sr.rating,
                    evidence: sr.evidence,
                  }));
                  skillAssessments.bulkLog(assessments);
                }
              }).catch(() => {}).finally(() => setFeedbackLoading(false));
            }}
          />
        </div>
      )}

        </>
      )}
    </div>
  );
}

// ===================== AI SIDEBAR =====================
function AISidebar({ activeStage, questId, studentName, studentProfile, groupRole,
  guideMessages, guideInput, guideSending, onSendGuide, onGuideInputChange,
  challengerText, challengerResponse, challengerSubmitted, onChallengerRespond,
  visible, onClose, isMobileSheet,
}) {
  const guideBottomRef = useRef(null);
  useEffect(() => { guideBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [guideMessages]);

  if (!visible) return null;

  return (
    <aside style={{
      width: isMobileSheet ? '100%' : 360,
      flexShrink: 0, background: 'var(--chalk)',
      borderLeft: isMobileSheet ? 'none' : '1px solid var(--pencil)',
      display: 'flex', flexDirection: 'column',
      ...(isMobileSheet ? { flex: 1 } : { height: 'calc(100vh - 48px)', overflowY: 'auto' }),
      zIndex: 50,
    }}>
      {/* Field Guide section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--pencil)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <MessageCircle size={13} color="var(--lab-blue)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lab-blue)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI Field Guide
          </span>
          <span style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', marginLeft: 'auto', opacity: 0.7 }}>
            may make mistakes
          </span>
          {/* Close button */}
          <button onClick={onClose} style={{
            display: 'flex', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--graphite)', padding: 2,
          }}>
            <X size={14} />
          </button>
        </div>
        <div style={{
          flex: 1, overflowY: 'auto', padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {!activeStage && (
            <p style={{ fontSize: 12, color: 'var(--pencil)', margin: 0, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>
              Select a stage to chat with your Field Guide.
            </p>
          )}
          {activeStage && guideMessages.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--graphite)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
              Need help? Ask your AI Field Guide a question — it'll help you explore and think deeper, not just give you answers. Always double-check important facts with your teacher.
            </p>
          )}
          {guideMessages.map((msg, i) => (
            <div key={i} style={{
              fontSize: 12, lineHeight: 1.55,
              padding: '6px 10px', borderRadius: 8,
              background: msg.role === 'user' ? 'var(--parchment)' : 'rgba(27,73,101,0.06)',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
            }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: msg.role === 'user' ? 'var(--graphite)' : 'var(--lab-blue)', marginBottom: 2 }}>
                {msg.role === 'user' ? 'You' : 'Field Guide'}
              </div>
              {msg.role === 'user' ? (
                <div style={{ color: 'var(--ink)' }}>{msg.content}</div>
              ) : (
                <div style={{ color: 'var(--lab-blue)' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              )}
            </div>
          ))}
          {guideSending && (
            <div style={{ fontSize: 11, color: 'var(--graphite)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Loader2 size={11} className="sq-spin" /> Field Guide is thinking...
            </div>
          )}
          <div ref={guideBottomRef} />
        </div>
        {activeStage && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid rgba(27,73,101,0.1)' }}>
            <input
              type="text"
              value={guideInput}
              onChange={e => onGuideInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSendGuide()}
              placeholder="Ask a question..."
              disabled={guideSending}
              className="sq-journal-input"
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(27,73,101,0.2)',
                background: 'var(--chalk)', fontSize: 12,
                fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none',
              }}
            />
            <button
              onClick={onSendGuide}
              disabled={guideSending || !guideInput.trim()}
              style={{
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: guideSending || !guideInput.trim() ? 'var(--parchment)' : 'var(--lab-blue)',
                color: guideSending || !guideInput.trim() ? 'var(--pencil)' : 'var(--chalk)',
                cursor: guideSending || !guideInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              {guideSending ? <Loader2 size={12} className="sq-spin" /> : <Send size={12} />}
            </button>
          </div>
        )}
      </div>

      {/* Challenger section */}
      {challengerText && (
        <div style={{ borderTop: '1px solid var(--pencil)', flexShrink: 0 }}>
          <ChallengerCard
            challenge={challengerText}
            questId={questId}
            stageId={activeStage?.id}
            studentName={studentName}
            studentId={studentProfile?.id || null}
            onRespond={onChallengerRespond}
            initialResponse={challengerResponse || ''}
            initialSubmitted={challengerSubmitted}
          />
        </div>
      )}

      {/* Campfire Chat for group projects */}
      {groupRole && activeStage && (
        <div style={{ borderTop: '1px solid var(--pencil)', padding: 12, flexShrink: 0 }}>
          <CampfireChat
            questId={questId}
            stageId={activeStage.id}
            studentName={studentName}
            studentId={studentProfile?.id}
          />
        </div>
      )}
    </aside>
  );
}

// ===================== FIELD NOTES PANEL =====================
function FieldNotesPanel({ reflections, onAdd, onClose, studentName }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [reflections]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    await onAdd(trimmed);
    setContent('');
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 340,
      background: 'var(--chalk)', borderLeft: '1px solid var(--pencil)',
      display: 'flex', flexDirection: 'column', zIndex: 200,
      boxShadow: '-4px 0 28px rgba(0,0,0,0.1)',
      animation: 'sq-fade-in 220ms ease',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={15} color="var(--ink)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)' }}>Field Notes</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 4, display: 'flex', borderRadius: 4 }}>
          <X size={17} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reflections.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--pencil)', marginTop: 28, lineHeight: 1.7 }}>
            Your notes will appear here as you explore each stage.
          </p>
        )}
        {reflections.map((r) => (
          <div key={r.id} style={{
            background: r.entry_type === 'auto' ? 'var(--parchment)' : 'var(--chalk)',
            border: '1px solid var(--pencil)', borderRadius: 8, padding: '10px 13px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--pencil)', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
              {r.entry_type === 'auto' ? 'Progress log' : studentName || 'Your note'} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{r.content}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--pencil)' }}>
        <textarea
          className="sq-journal-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note about what you're exploring..."
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 12px', borderRadius: 6,
            border: '1px solid var(--pencil)', background: 'var(--chalk)',
            fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--ink)',
            resize: 'vertical', lineHeight: 1.6, transition: 'border-color 150ms, box-shadow 150ms',
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleSave(); }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          style={{
            marginTop: 8, width: '100%', padding: '9px',
            borderRadius: 6, border: 'none',
            background: saving || !content.trim() ? 'var(--parchment)' : 'var(--ink)',
            color: saving || !content.trim() ? 'var(--pencil)' : 'var(--chalk)',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: saving || !content.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 150ms',
          }}
        >
          {saving ? <><Loader2 size={13} className="sq-spin" /> Saving...</> : <><Send size={13} /> Save Note</>}
        </button>
      </div>
    </div>
  );
}

// ===================== QUEST REFLECTION =====================
function QuestReflectionSection({ questions, answers, onAnswer, onSave, loading, saved }) {
  if (!questions?.length) return null;

  const TYPE_LABELS = { growth: 'Growth', connection: 'Connection', challenge: 'Challenge', transfer: 'Transfer' };
  const TYPE_COLORS = { growth: 'var(--field-green)', connection: 'var(--lab-blue)', challenge: 'var(--specimen-red)', transfer: 'var(--compass-gold)' };

  return (
    <div className="sq-card" style={{
      background: 'rgba(184,134,11,0.04)', border: '1px solid rgba(184,134,11,0.25)',
      borderRadius: 14, padding: '20px 22px', marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <BookOpen size={16} color="var(--compass-gold)" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)' }}>Project Reflection</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--graphite)', lineHeight: 1.5, margin: '0 0 16px' }}>
        Take a moment to think about your journey. There are no wrong answers — this is about what YOU discovered.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map((q, i) => (
          <div key={i} style={{
            background: 'var(--chalk)', border: '1px solid var(--pencil)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: TYPE_COLORS[q.type] || 'var(--graphite)',
                background: `${TYPE_COLORS[q.type] || 'var(--graphite)'}12`,
                padding: '2px 8px', borderRadius: 4,
              }}>
                {TYPE_LABELS[q.type] || q.type}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 8px', fontWeight: 500 }}>
              {q.question}
            </p>
            <textarea
              value={answers[i] || ''}
              onChange={(e) => onAnswer(i, e.target.value)}
              placeholder="Your reflection..."
              rows={2}
              disabled={saved}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px', borderRadius: 6,
                border: '1px solid var(--pencil)', background: saved ? 'var(--parchment)' : 'var(--chalk)',
                fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--ink)',
                resize: 'vertical', lineHeight: 1.5,
              }}
            />
          </div>
        ))}
      </div>
      {!saved && (
        <button
          onClick={onSave}
          disabled={loading || Object.values(answers).every(a => !a?.trim())}
          style={{
            marginTop: 14, width: '100%', padding: '11px',
            borderRadius: 8, border: 'none',
            background: loading ? 'var(--pencil)' : 'var(--compass-gold)',
            color: loading ? 'var(--graphite)' : 'var(--ink)',
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {loading ? <><Loader2 size={13} className="sq-spin" /> Saving...</> : <><CheckCircle size={13} /> Save Reflections</>}
        </button>
      )}
      {saved && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--field-green)', fontWeight: 600 }}>
          Reflections saved! Your guide can see them.
        </div>
      )}
    </div>
  );
}

// ===================== PROGRESS BAR =====================
function ProgressBar({ stages }) {
  const done = stages.filter(s => s.status === 'completed').length;
  const total = stages.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--parchment)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--field-green)', borderRadius: 4, transition: 'width 500ms ease' }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', flexShrink: 0 }}>
        {done}/{total}
      </span>
    </div>
  );
}

// ===================== MAIN =====================
export default function StudentQuestPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  const [quest, setQuest] = useState(null);
  const [stages, setStages] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [studentName, setStudentName] = useState(() => sessionStorage.getItem(`wayfinder_student_${id}`) || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [submissions, setSubmissions] = useState({}); // keyed by stage_id
  const [studentProfile, setStudentProfile] = useState(null);
  const [groupRole, setGroupRole] = useState(null);
  const [reflectionQuestions, setReflectionQuestions] = useState(null);
  const [reflectionAnswers, setReflectionAnswers] = useState({});
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // AI Sidebar state (lifted from StageCard)
  const [guideMessages, setGuideMessages] = useState([]);
  const [guideInput, setGuideInput] = useState('');
  const [guideSending, setGuideSending] = useState(false);
  const [guideLoaded, setGuideLoaded] = useState(null); // track which stage was loaded
  const [challengerText, setChallengerText] = useState(null);
  const [challengerResponse, setChallengerResponse] = useState('');
  const [challengerSubmitted, setChallengerSubmitted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024); // auto-open on desktop
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [worldRegenerating, setWorldRegenerating] = useState(false);
  const [immersiveFeedback, setImmersiveFeedback] = useState('');

  // Boss encounter (full-screen challenger modal)
  const [bossEncounterActive, setBossEncounterActive] = useState(false);
  const [bossEncounterData, setBossEncounterData] = useState(null); // { text, stageId }
  const [bossEncounterResult, setBossEncounterResult] = useState(null); // { success, feedback, epAwarded }

  // XP & Gamification state
  const [xpData, setXpData] = useState({ total_points: 0, current_rank: 'apprentice', current_streak: 0 });
  const [xpToast, setXpToast] = useState(null);
  const [mapLandmarks, setMapLandmarks] = useState([]);
  const [interactiveData, setInteractiveData] = useState(null);
  const { enabled: soundEnabled, toggle: toggleSound, play: playSound, stop: stopSound } = useAmbientSound();

  // Expedition challenge state
  const [stageChallenges, setStageChallenges] = useState({});
  const [challengeResponseMap, setChallengeResponseMap] = useState({});

  // Buddy state
  const [buddy, setBuddy] = useState(null);
  const [buddyPair, setBuddyPair] = useState(null);
  const [buddyMsgs, setBuddyMsgs] = useState([]);
  const [nudgeMessage, setNudgeMessage] = useState('');
  const [showBuddyChat, setShowBuddyChat] = useState(false);

  // Branching quest state
  const [questBranches, setQuestBranches] = useState([]);
  const [studentChoices, setStudentChoices] = useState([]);
  const [isBranchingQuest, setIsBranchingQuest] = useState(false);

  // Load quest
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('quests')
        .select(`*, quest_stages(*), quest_students(student_id, students(id, name, pin)), career_simulations(*), reflection_entries(*)`)
        .eq('id', id)
        .single();

      if (err || !data) {
        setError(err?.message || 'Project not found.');
        setLoading(false);
        return;
      }

      setQuest(data);
      const sortedStages = [...(data.quest_stages || [])].sort((a, b) => a.stage_number - b.stage_number);
      setStages(sortedStages);
      setReflections([...(data.reflection_entries || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      const names = (data.quest_students || []).map(qs => qs.students).filter(Boolean);
      setAssignedStudents(names);

      // Auto-select the current active stage so students see it immediately
      const currentActive = sortedStages.find(s => s.status === 'active');
      if (currentActive) setActiveCard(currentActive.id);

      // Auto-enter if student is logged in and assigned to this quest
      const session = getStudentSession();
      if (session?.studentId && !sessionStorage.getItem(`wayfinder_student_${id}`)) {
        const isAssigned = names.some((s) => s.id === session.studentId);
        if (isAssigned) {
          sessionStorage.setItem(`wayfinder_student_${id}`, session.studentName);
          setStudentName(session.studentName);
        }
      }

      setLoading(false);
    };
    load();
  }, [id]);

  // Load submissions when student is known
  const loadSubmissions = useCallback(async (currentStudentName) => {
    const name = currentStudentName || studentName;
    if (!id || !name) return;
    const { data } = await supabase.rpc('get_stage_submissions_for_student', {
      p_quest_id: id,
      p_student_name: name,
    });
    const map = {};
    (data || []).forEach((s) => { map[s.stage_id] = s; });
    setSubmissions(map);
  }, [id, studentName]);

  useEffect(() => {
    if (studentName) loadSubmissions();
  }, [studentName, loadSubmissions]);

  // Load student profile and group role when student is identified
  useEffect(() => {
    if (!studentName || !id) return;
    const loadProfile = async () => {
      // Find student by name among assigned students
      const matched = assignedStudents.find(s => s.name === studentName);
      if (matched?.id) {
        const { data: profile } = await supabase
          .from('students')
          .select('id, name, age, grade_band, interests, passions, about_me, self_assessment, avatar_emoji, allow_ai_guide')
          .eq('id', matched.id)
          .single();
        if (profile) setStudentProfile(profile);

        // Check for group role
        const { data: groupMember } = await supabase
          .from('quest_group_members')
          .select('role, quest_groups!inner(quest_id)')
          .eq('student_id', matched.id)
          .eq('quest_groups.quest_id', id)
          .maybeSingle();
        if (groupMember?.role) setGroupRole(groupMember.role);
      }
    };
    loadProfile();
  }, [studentName, assignedStudents, id]);

  // Load XP data + landmarks when student and quest are known
  useEffect(() => {
    if (!studentProfile?.id) return;
    xp.getStudentXP(studentProfile.id).then(setXpData);
  }, [studentProfile?.id]);

  // Load buddy pair
  useEffect(() => {
    const studentId = studentProfile?.id;
    if (!studentId) return;
    const loadBuddy = async () => {
      const pair = await buddyPairs.getForStudent(studentId);
      if (pair) {
        setBuddyPair(pair);
        const buddyStudent = pair.student_a_id === studentId ? pair.student_b : pair.student_a;
        setBuddy(buddyStudent);
        const msgs = await buddyMessages.getForPair(pair.id);
        setBuddyMsgs(msgs);
      }
    };
    loadBuddy();
  }, [studentProfile?.id]);

  const handleSendNudge = async (msg) => {
    const studentId = studentProfile?.id;
    if (!buddyPair || !msg.trim() || !studentId) return;
    const sent = await buddyMessages.send(buddyPair.id, studentId, msg);
    if (sent) {
      setBuddyMsgs(prev => [...prev, sent]);
      setNudgeMessage('');
    }
  };

  // Load branching data
  useEffect(() => {
    if (!quest?.id || !quest?.is_branching) return;
    setIsBranchingQuest(true);
    const studentId = studentProfile?.id;
    const loadBranches = async () => {
      const [branches, choices] = await Promise.all([
        stageBranches.getForQuest(quest.id),
        studentId ? studentPaths.getForQuest(studentId, quest.id) : Promise.resolve([]),
      ]);
      setQuestBranches(branches);
      setStudentChoices(choices);
    };
    loadBranches();
  }, [quest?.id, quest?.is_branching, studentProfile?.id]);

  useEffect(() => {
    if (!quest?.id) return;
    landmarksApi.getForQuest(quest.id).then(setMapLandmarks);
  }, [quest?.id]);

  // Load guide messages when active stage changes
  useEffect(() => {
    const stageId = activeCard;
    if (!id || !stageId || !studentName) return;
    if (guideLoaded === stageId) return;
    setGuideMessages([]);
    setChallengerText(null);
    setChallengerResponse('');
    setChallengerSubmitted(false);
    guideMessagesApi.list(id, stageId, studentName).then(({ data }) => {
      if (data?.length) {
        const fieldGuideMessages = data.filter(m => m.message_type === 'field_guide').map(m => ({ role: m.role, content: m.content }));
        setGuideMessages(fieldGuideMessages);
        // Check for existing challenger messages
        const challengerMsg = data.find(m => m.message_type === 'devil_advocate' && m.role === 'challenger');
        const challengerResp = data.find(m => m.message_type === 'devil_advocate' && m.role === 'user');
        if (challengerMsg) {
          setChallengerText(challengerMsg.content);
          if (challengerResp) {
            setChallengerResponse(challengerResp.content);
            setChallengerSubmitted(true);
          }
        }
      }
      setGuideLoaded(stageId);
    });
  }, [id, activeCard, studentName, guideLoaded]);

  // Load interactive data for active stage
  useEffect(() => {
    if (!activeCard) { setInteractiveData(null); return; }
    const activeStg = stages.find(s => s.id === activeCard);
    if (activeStg && ['puzzle_gate', 'choice_fork', 'evidence_board'].includes(activeStg.stage_type)) {
      interactiveStages.get(activeCard).then(setInteractiveData);
    } else {
      setInteractiveData(null);
    }
  }, [activeCard, stages]);

  // Load expedition challenges for all stages
  useEffect(() => {
    if (!stages || stages.length === 0) return;
    const studentId = studentProfile?.id || null;
    const loadChallenges = async () => {
      const challengeMap = {};
      const responseMap = {};
      await Promise.all(stages.map(async (stage) => {
        const challenge = await expeditionChallenges.getForStage(stage.id);
        if (challenge) {
          challengeMap[stage.id] = challenge;
          if (studentId) {
            const resp = await challengeResponses.get(challenge.id, studentId);
            if (resp) responseMap[challenge.id] = resp;
          }
        }
      }));
      setStageChallenges(challengeMap);
      setChallengeResponseMap(responseMap);
    };
    loadChallenges();
  }, [stages, studentProfile?.id]);

  // Play ambient sound for active stage's landmark
  useEffect(() => {
    if (!activeCard) { stopSound(); return; }
    const landmark = mapLandmarks.find(l => l.stage_id === activeCard);
    if (landmark?.ambient_sound) {
      playSound(landmark.ambient_sound);
    } else {
      stopSound();
    }
  }, [activeCard, mapLandmarks, soundEnabled]);

  // Client-side safety filter for student messages
  const UNSAFE_PATTERNS = /\b(kill|murder|suicide|bomb|weapon|gun|shoot|drug|cocaine|heroin|meth|sex|porn|nude|naked|rape|assault|hate|racist|slur)\b/i;

  const handleSendToGuide = useCallback(async () => {
    const trimmed = guideInput.trim();
    if (!trimmed || guideSending || !activeCard) return;
    const stageId = activeCard;
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    setGuideInput('');
    setGuideSending(true);

    const studentId = studentProfile?.id || null;
    const isFlagged = UNSAFE_PATTERNS.test(trimmed);

    guideMessagesApi.add({ questId: id, stageId, studentId, studentName, role: 'user', content: trimmed, flagged: isFlagged });

    if (isFlagged) {
      const redirect = "That's not something I can help with. Let's get back to your project! What were you working on?";
      const updated = [...guideMessages, { role: 'user', content: trimmed }, { role: 'assistant', content: redirect }];
      setGuideMessages(updated);
      guideMessagesApi.add({ questId: id, stageId, studentId, studentName, role: 'assistant', content: redirect });
      setGuideSending(false);
      return;
    }

    const updated = [...guideMessages, { role: 'user', content: trimmed }];
    setGuideMessages(updated);

    try {
      const rawReply = await ai.questHelp({
        stageTitle: stage.title,
        stageDescription: stage.description || '',
        guidingQuestions: stage.guiding_questions || [],
        deliverable: stage.deliverable || '',
        studentProfile: {
          ...(studentProfile || {}),
          name: studentName,
          groupRole: groupRole || null,
        },
        messages: updated,
      });

      // Strip hidden assessment from Field Guide response
      let displayMessage = rawReply;
      let conversationAssessments = [];
      const assessmentDelimiter = '---ASSESSMENT---';
      if (typeof displayMessage === 'string' && displayMessage.includes(assessmentDelimiter)) {
        const parts = displayMessage.split(assessmentDelimiter);
        displayMessage = parts[0].trim();
        try {
          const assessmentData = JSON.parse(parts[1].trim());
          conversationAssessments = assessmentData.skill_observations || [];
        } catch { /* ignore parse errors */ }
      }

      setGuideMessages([...updated, { role: 'assistant', content: displayMessage }]);
      guideMessagesApi.add({ questId: id, stageId, studentId, studentName, role: 'assistant', content: displayMessage });

      // Silently log skill observations from conversation
      if (conversationAssessments.length > 0) {
        const assessments = conversationAssessments.map(obs => ({
          student_id: studentId,
          skill_name: obs.skill_name,
          quest_id: id,
          stage_id: stageId,
          assessment_type: 'conversation',
          rating: obs.rating,
          evidence: obs.evidence,
        }));
        skillAssessments.bulkLog(assessments);
      }
    } catch {
      const fallback = "That's a great observation! What evidence from the stage supports that? What might challenge your thinking?";
      setGuideMessages([...updated, { role: 'assistant', content: fallback }]);
      guideMessagesApi.add({ questId: id, stageId, studentId, studentName, role: 'assistant', content: fallback });
    }
    setGuideSending(false);
  }, [guideInput, guideSending, activeCard, stages, guideMessages, studentProfile, studentName, groupRole, id]);

  const handleChallengeEvaluate = async (challenge, responseText) => {
    const studentId = studentProfile?.id || null;
    const studentProf = { name: studentName, age: studentProfile?.age, grade: studentProfile?.grade_band };
    const evalResult = await ai.evaluateChallenge(challenge, responseText, studentProf);

    const saved = await challengeResponses.submit({
      challenge_id: challenge.id,
      student_id: studentId,
      response_text: responseText,
      is_successful: evalResult.is_successful,
      ep_awarded: evalResult.ep_awarded || 0,
      ai_feedback: evalResult.narrative_feedback,
    });

    if (saved) {
      setChallengeResponseMap(prev => ({ ...prev, [challenge.id]: saved }));
    }

    // Silently log skill assessments
    if (evalResult.skill_ratings?.length > 0) {
      const assessments = evalResult.skill_ratings.map(sr => ({
        student_id: studentId,
        skill_name: sr.skill_name,
        quest_id: quest?.id,
        stage_id: challenge.stage_id,
        assessment_type: 'expedition_challenge',
        rating: sr.rating,
        evidence: sr.evidence,
      }));
      skillAssessments.bulkLog(assessments);
    }

    // Award EP
    try {
      await supabase.rpc('award_xp', {
        p_student_id: studentId,
        p_event_type: 'stage_complete',
        p_points: evalResult.ep_awarded || 0,
        p_quest_id: quest?.id,
        p_stage_id: challenge.stage_id,
        p_metadata: { source: 'expedition_challenge', challenge_type: challenge.challenge_type },
      });
    } catch (e) { /* XP system may not be migrated */ }

    return evalResult;
  };

  const handleChallengerTriggered = useCallback((challenge) => {
    const stageId = activeCard;
    // Set sidebar state (for history / past challenges display)
    setChallengerText(challenge);
    setChallengerResponse('');
    setChallengerSubmitted(false);
    // Launch boss encounter modal
    setBossEncounterData({ text: challenge, stageId });
    setBossEncounterActive(true);
    setBossEncounterResult(null);
    // Persist challenger message
    guideMessagesApi.add({
      questId: id, stageId,
      studentId: studentProfile?.id || null, studentName,
      role: 'challenger', content: challenge,
      messageType: 'devil_advocate',
    });
  }, [activeCard, id, studentProfile, studentName]);

  const handleChallengerRespond = useCallback(async (responseText) => {
    // Update sidebar state
    setChallengerResponse(responseText);
    setChallengerSubmitted(true);
    if (studentProfile?.id) {
      const result = await xp.award(studentProfile.id, 'challenger_response', id, activeCard);
      if (result) {
        setXpData(prev => ({ ...prev, total_points: result.total_points, current_rank: result.new_rank }));
        setXpToast({ points: xp.EP_VALUES.challenger_response });
      }
    }
  }, [studentProfile?.id, id, activeCard]);

  const handleBossEncounterRespond = useCallback(async (responseText) => {
    if (!bossEncounterData) return;
    try {
      const parsed = await ai.evaluateChallenge({
        challengeText: bossEncounterData.text,
        studentResponse: responseText,
      });
      const epAwarded = parsed.success ? (parsed.ep || 30) : 0;
      setBossEncounterResult({
        success: parsed.success,
        feedback: parsed.feedback,
        epAwarded,
      });
      // Award EP if successful
      if (parsed.success && studentProfile?.id) {
        try {
          const result = await xp.award(studentProfile.id, 'challenger_response', id, bossEncounterData.stageId);
          if (result) {
            setXpData(prev => ({ ...prev, total_points: result.total_points, current_rank: result.new_rank }));
            setXpToast({ points: epAwarded });
          }
        } catch (e) { console.error('EP award failed:', e); }
      }
      // Update sidebar state too
      setChallengerResponse(responseText);
      setChallengerSubmitted(true);
      // Save the student's response
      guideMessagesApi.add({
        questId: id, stageId: bossEncounterData.stageId,
        studentId: studentProfile?.id || null, studentName,
        role: 'user', content: responseText,
        messageType: 'devil_advocate',
      });
    } catch (err) {
      console.error('Challenger evaluation failed:', err);
      setBossEncounterResult({ success: true, feedback: 'Solid response! Keep thinking critically.', epAwarded: 20 });
      setChallengerResponse(responseText);
      setChallengerSubmitted(true);
    }
  }, [bossEncounterData, studentProfile, id, studentName]);

  const handleStageEdited = useCallback(async () => {
    // Reload stages after edit
    const { data: updated } = await supabase.from('quest_stages').select('*').eq('quest_id', id).order('stage_number');
    setStages(updated || []);

    // Regenerate world scene in background if quest has one
    if (quest?.world_scene_url && updated?.length > 0) {
      setWorldRegenerating(true);
      ai.generateFullWorldScene({
        questId: id,
        questTitle: quest.title,
        stages: updated,
        studentInterests: studentProfile?.passions,
        careerPathway: quest.career_pathway,
        gradeBand: quest.grade_band,
      }).then(result => {
        if (result?.sceneUrl) {
          setQuest(prev => prev ? { ...prev, world_scene_url: result.sceneUrl, world_hotspots: result.hotspots } : prev);
        }
      }).catch(() => {}).finally(() => setWorldRegenerating(false));
    }
  }, [id, quest, studentProfile]);

  const handleEnter = (name, studentId) => {
    sessionStorage.setItem(`wayfinder_student_${id}`, name);
    // Persist to localStorage if student has an account
    if (studentId) {
      setStudentSession({ studentId, studentName: name });
    }
    setStudentName(name);
  };

  const handleNodeClick = useCallback((stageId) => {
    setActiveCard(prev => prev === stageId ? null : stageId);
  }, []);

  const handleBranchChoice = async (stageId, branchIndex) => {
    const studentId = studentProfile?.id;
    if (studentId) {
      await studentPaths.recordChoice(studentId, quest.id, stageId, branchIndex);
    }
    setStudentChoices(prev => [...prev.filter(c => c.stage_id !== stageId), { stage_id: stageId, chosen_branch_index: branchIndex }]);

    const branch = questBranches.find(b => b.stage_id === stageId && b.branch_index === branchIndex);
    if (branch?.next_stage_id) {
      await supabase.from('quest_stages').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', stageId);
      await supabase.from('quest_stages').update({ status: 'active' }).eq('id', branch.next_stage_id);
      const { data: refreshed } = await supabase.from('quest_stages').select('*').eq('quest_id', quest.id).order('stage_number');
      setStages(refreshed || []);
    }
  };

  const completeStage = useCallback(async (stageId) => {
    await supabase.from('quest_stages').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', stageId);

    // Dependency-aware unlock
    const completedIds = new Set(
      stages.filter(s => s.status === 'completed' || s.id === stageId).map(s => s.id)
    );
    const toUnlock = stages.filter(s => {
      if (s.status !== 'locked') return false;
      const deps = s.dependencies || [];
      if (deps.length === 0) return false;
      return deps.every(depId => completedIds.has(depId));
    });

    if (toUnlock.length > 0) {
      await supabase.from('quest_stages').update({ status: 'active' }).in('id', toUnlock.map(s => s.id));
    } else {
      // Linear fallback
      const currentIdx = stages.findIndex(s => s.id === stageId);
      const next = stages[currentIdx + 1];
      if (next && next.status === 'locked') await supabase.from('quest_stages').update({ status: 'active' }).eq('id', next.id);
    }

    const completedStage = stages.find(s => s.id === stageId);
    if (completedStage) {
      await supabase.from('reflection_entries').insert({
        quest_id: id, content: `${studentName || 'Student'} completed Stage ${completedStage.stage_number}: ${completedStage.title}`,
        entry_type: 'auto', stage_id: stageId,
      });
    }

    const allDone = stages.every(s => s.id === stageId || s.status === 'completed');
    if (allDone) {
      await supabase.from('quests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    }

    const { data: updated } = await supabase.from('quest_stages').select('*').eq('quest_id', id).order('stage_number');
    setStages(updated || []);
    const { data: refs } = await supabase.from('reflection_entries').select('*').eq('quest_id', id).order('created_at');
    setReflections(refs || []);

    await loadSubmissions();

    // Auto-select next active stage after completion
    const nextActive = (updated || []).find(s => s.status === 'active');
    setActiveCard(nextActive ? nextActive.id : null);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 800);

    // Award XP
    if (studentProfile?.id) {
      const result = await xp.award(studentProfile.id, 'stage_complete', id, stageId);
      if (result) {
        setXpData(prev => ({ ...prev, total_points: result.total_points, current_rank: result.new_rank, current_streak: result.current_streak }));
        setXpToast({ points: xp.EP_VALUES.stage_complete, rankUp: result.rank_changed, newRank: result.new_rank });
        if (result.rank_changed) {
          explorerLog.add(studentProfile.id, 'rank_up',
            `${studentName} reached the rank of ${result.new_rank.replace('_', ' ')}!`
          );
        }
        explorerLog.add(studentProfile.id, 'stage_complete',
          `${studentName} completed a stage in "${quest.title}"`
        );
        const newBadges = await badgesApi.checkAndAward(studentProfile.id);
        if (newBadges.length > 0) {
          setXpToast(prev => prev ? { ...prev, badgeEarned: newBadges[0].badges?.name } : null);
          explorerLog.add(studentProfile.id, 'badge_earned',
            `${studentName} earned the "${newBadges[0].badges?.name}" badge!`
          );
        }
      }
      // Log if quest completed
      if (allDone) {
        await xp.award(studentProfile.id, 'project_complete', id, null);
        explorerLog.add(studentProfile.id, 'project_complete', `${studentName} completed "${quest.title}"!`);
      }
    }
  }, [id, stages, studentName, loadSubmissions, studentProfile, quest]);

  const addReflection = useCallback(async (content) => {
    await supabase.from('reflection_entries').insert({ quest_id: id, content, entry_type: 'student' });
    const { data } = await supabase.from('reflection_entries').select('*').eq('quest_id', id).order('created_at');
    setReflections(data || []);
  }, [id]);

  // Generate reflection questions when quest completes
  useEffect(() => {
    if (quest?.status !== 'completed' || reflectionQuestions || reflectionLoading) return;
    // Check if reflections already exist
    const existing = reflections.filter(r => r.entry_type === 'student' && r.content?.startsWith('[reflection]'));
    if (existing.length > 0) {
      setReflectionSaved(true);
      return;
    }
    setReflectionLoading(true);
    ai.generateReflectionQuestions({
      questTitle: quest.title,
      stages,
      studentProfile: studentProfile || { name: studentName },
      submissions: Object.values(submissions),
    }).then(result => {
      setReflectionQuestions(result.questions || []);
    }).catch(() => {
      // Fallback questions
      setReflectionQuestions([
        { type: 'growth', question: 'What did you discover about yourself during this project?' },
        { type: 'connection', question: 'How does what you learned connect to something you care about?' },
        { type: 'challenge', question: 'What was the hardest part, and how did you push through it?' },
        { type: 'transfer', question: 'Where else in your life could you use what you learned?' },
      ]);
    }).finally(() => setReflectionLoading(false));
  }, [quest?.status, reflectionQuestions, reflectionLoading, stages, studentProfile, studentName, submissions, reflections, quest?.title]);

  const handleSaveReflections = useCallback(async () => {
    if (!reflectionQuestions?.length) return;
    setReflectionLoading(true);
    for (const [i, q] of reflectionQuestions.entries()) {
      const answer = reflectionAnswers[i]?.trim();
      if (answer) {
        await supabase.from('reflection_entries').insert({
          quest_id: id, content: `[reflection] ${q.question}\n${answer}`, entry_type: 'student',
        });
      }
    }
    const { data } = await supabase.from('reflection_entries').select('*').eq('quest_id', id).order('created_at');
    setReflections(data || []);
    setReflectionSaved(true);
    setReflectionLoading(false);
  }, [id, reflectionQuestions, reflectionAnswers]);

  const simulation = quest?.career_simulations?.[0] || null;
  const simId = simulation?.id || id;
  const handleEnterSim = useCallback(() => navigate(`/simulation/${simId}`), [navigate, simId]);

  // Auto-select first active stage on mobile (so students see content immediately)
  const isMobile = window.innerWidth < 768;
  const isDesktop = window.innerWidth > 1024;

  // Lock body scroll when immersive 3D world is active
  useEffect(() => {
    if (immersiveMode) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [immersiveMode]);

  // Background upgrade from Marble Mini to Marble Plus when entering immersive mode
  useEffect(() => {
    if (immersiveMode && quest?.marble_world_url && quest?.marble_model === 'Marble 0.1-mini') {
      ai.upgradeMarbleWorld({
        questId: quest.id,
        textPrompt: quest.world_scene_prompt,
        imageUrl: quest.marble_pano_url,
        displayName: quest.title,
      }).then(result => {
        if (result?.operationId) {
          const poll = async () => {
            try {
              const op = await ai.pollMarbleStatus(result.operationId);
              if (op.done && !op.error) {
                const world = op.response;
                await supabase.from('quests').update({
                  marble_world_url: world.world_marble_url,
                  marble_world_id: world.id,
                  marble_model: 'Marble 0.1-plus',
                  marble_pano_url: world.assets?.imagery?.pano_url,
                  marble_thumbnail_url: world.assets?.thumbnail_url,
                }).eq('id', quest.id);
                console.log('Marble Plus upgrade complete');
                return;
              }
              if (!op.done) setTimeout(poll, 10000);
            } catch { /* silent */ }
          };
          setTimeout(poll, 10000);
        }
      }).catch(() => {});
    }
  }, [immersiveMode]);

  useEffect(() => {
    if (!isMobile || activeCard || stages.length === 0) return;
    const firstActive = stages.find(s => s.status === 'active') || stages.find(s => s.status !== 'locked') || stages[0];
    if (firstActive) setActiveCard(firstActive.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.length]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <WayfinderLogoIcon size={36} color="var(--compass-gold)" />
      <Loader2 size={20} color="var(--graphite)" className="sq-spin" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <AlertCircle size={44} color="var(--specimen-red)" strokeWidth={1.5} style={{ marginBottom: 14 }} />
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>Project Not Found</h2>
      <p style={{ fontSize: 14, color: 'var(--graphite)' }}>{error}</p>
    </div>
  );

  // Show welcome screen if no name yet
  if (!studentName) return (
    <WelcomeScreen quest={quest} assignedStudents={assignedStudents} onEnter={handleEnter} />
  );

  const activeStage = activeCard ? stages.find(s => s.id === activeCard) : null;

  // Determine the first locked stage after the active one (for shimmer animation)
  const nextLockedId = (() => {
    const activeIdx = stages.findIndex(s => s.status === 'active');
    if (activeIdx === -1) return null;
    const next = stages.slice(activeIdx + 1).find(s => s.status === 'locked');
    return next ? next.id : null;
  })();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      {/* Boss encounter — full-screen challenger modal */}
      {bossEncounterActive && bossEncounterData && (
        <ChallengerEncounter
          challengeText={bossEncounterData.text}
          epReward={30}
          studentName={studentName}
          defeated={bossEncounterResult}
          onRespond={handleBossEncounterRespond}
          onDismiss={() => {
            setBossEncounterActive(false);
            setBossEncounterData(null);
            setBossEncounterResult(null);
          }}
        />
      )}

      <ConfettiBurst active={confetti} />

      {/* Top bar */}
      <header className="sq-topbar" style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', position: 'sticky', top: 0, zIndex: 100,
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {getStudentSession()?.studentId ? (
            <button
              onClick={() => navigate('/student')}
              title="Back to dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 6px', borderRadius: 6, color: 'var(--graphite)',
                transition: 'color 150ms', fontSize: 12, fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--graphite)'}
            >
              <ArrowLeft size={14} />
              <span className="sq-topbar-title">Dashboard</span>
            </button>
          ) : (
            <>
              <WayfinderLogoIcon size={16} color="var(--compass-gold)" />
              <span className="sq-topbar-title" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Wayfinder
              </span>
            </>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 280, minWidth: 60 }}>
          <ExplorerRankBadge rank={xpData.current_rank} size="sm" showLabel={!isMobile} />
          <div style={{ flex: 1, minWidth: 60 }}>
            <XPBar totalPoints={xpData.total_points} currentRank={xpData.current_rank} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {buddy && (
            <button onClick={() => setShowBuddyChat(!showBuddyChat)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 20, border: '1px solid var(--pencil)', background: showBuddyChat ? 'rgba(184,134,11,0.06)' : 'var(--chalk)',
              color: 'var(--ink)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              <span>{buddy.avatar_emoji || '🧭'}</span> Buddy: {buddy.name}
            </button>
          )}
          <span className="sq-topbar-badge" style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--compass-gold)', background: 'rgba(184,134,11,0.1)',
            padding: '3px 8px', borderRadius: 4,
          }}>
            Learner View
          </span>
          <span className="sq-topbar-name" style={{ fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {studentName}
          </span>
          <button
            onClick={() => {
              clearStudentSession();
              sessionStorage.removeItem(`wayfinder_student_${id}`);
              setStudentName('');
              setSubmissions({});
              setStudentProfile(null);
              setGroupRole(null);
              setActiveCard(null);
            }}
            title="Switch student"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%',
              border: '1px solid var(--pencil)', background: 'transparent',
              color: 'var(--graphite)', cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <LogOut size={12} />
          </button>
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: '50%',
              border: '1px solid var(--pencil)', background: 'transparent',
              color: 'var(--graphite)', cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>
          <button
            onClick={() => setJournalOpen(v => !v)}
            title="Notes"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 8px', borderRadius: 6,
              border: '1px solid var(--pencil)', background: 'transparent',
              fontSize: 11, color: 'var(--ink)', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <BookOpen size={13} />
            <span className="sq-topbar-badge">{/* hidden on mobile */}Notes</span>
          </button>
        </div>
      </header>

      {/* Buddy chat panel */}
      {showBuddyChat && buddy && (
        <div style={{
          margin: '8px 16px 16px', padding: 12, background: 'var(--chalk)',
          border: '1px solid var(--pencil)', borderRadius: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            Messages with {buddy.name}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {['Hey, your expedition misses you!', 'Want to work on our projects together?', 'I just finished a stage — you got this!'].map(tmpl => (
              <button key={tmpl} onClick={() => handleSendNudge(tmpl)} style={{
                padding: '4px 10px', borderRadius: 14, border: '1px solid var(--pencil)',
                background: 'var(--paper)', color: 'var(--graphite)', fontSize: 10,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>
                {tmpl}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
            {buddyMsgs.map(msg => (
              <div key={msg.id} style={{
                padding: '4px 0', fontSize: 11, color: 'var(--ink)',
                textAlign: msg.sender_id === studentProfile?.id ? 'right' : 'left',
              }}>
                <span style={{ fontWeight: 600, fontSize: 10, color: 'var(--graphite)' }}>
                  {msg.sender?.name || (msg.sender_id === studentProfile?.id ? 'You' : buddy.name)}
                </span>
                <div>{msg.message}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={nudgeMessage} onChange={e => setNudgeMessage(e.target.value)}
              placeholder="Send encouragement..." onKeyDown={e => e.key === 'Enter' && handleSendNudge(nudgeMessage)}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--pencil)',
                fontSize: 11, fontFamily: 'var(--font-body)', outline: 'none',
              }}
            />
            <button onClick={() => handleSendNudge(nudgeMessage)} style={{
              padding: '6px 12px', borderRadius: 6, border: 'none',
              background: 'var(--compass-gold)', color: 'white', fontSize: 11,
              fontWeight: 600, cursor: 'pointer',
            }}>Send</button>
          </div>
        </div>
      )}

      {/* Quest header */}
      <div style={{ background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)', padding: isMobile ? '12px 14px' : '18px 22px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {quest?.subtitle && (
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--lab-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {quest.subtitle}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: quest?.narrative_hook ? (isMobile ? 8 : 12) : 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, color: 'var(--ink)', margin: 0, lineHeight: 1.25 }}>
              {quest?.title}
            </h1>
            {quest?.narrative_hook && (
              <SpeakButton
                text={`${quest.title}. ${quest.narrative_hook}`}
                size="md"
              />
            )}
          </div>
          {quest?.narrative_hook && (
            <div className="sq-quest-header-hook" style={{
              background: 'var(--parchment)', borderRadius: 8,
              padding: isMobile ? '8px 12px' : '12px 16px', borderLeft: '3px solid var(--compass-gold)',
              maxWidth: 600,
            }}>
              <p style={{ fontSize: isMobile ? 12 : 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
                {quest.narrative_hook}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enter World button — shown when quest has a world scene */}
      {(quest?.marble_world_url || quest?.world_scene_url) && !immersiveMode && (
        <div style={{ padding: isMobile ? '8px 14px 0' : '12px 22px 0', position: 'relative' }}>
          <EnterWorldButton
            sceneUrl={quest?.marble_thumbnail_url || quest?.world_scene_url}
            sceneDescription={quest?.marble_world_url ? '3D World Ready — Enter to explore' : quest?.world_scene_prompt}
            onClick={() => setImmersiveMode(true)}
          />
          {worldRegenerating && (
            <div style={{
              position: 'absolute', bottom: 8, right: isMobile ? 22 : 30,
              padding: '4px 12px', borderRadius: 12,
              background: 'rgba(0,0,0,0.7)', color: 'var(--compass-gold)',
              fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Loader2 size={12} style={{ animation: 'sq-spin 1s linear infinite' }} />
              Updating your world...
            </div>
          )}
        </div>
      )}

      {/* Mobile stage navigator */}
      {isMobile && stages.length > 0 && (
        <MobileStageNav stages={stages} activeCard={activeCard} onNodeClick={handleNodeClick} />
      )}

      {/* Horizontal trail map — full width, above content */}
      {!isMobile && stages.length > 0 && (
        <div style={{ padding: '12px 22px 0', flexShrink: 0 }}>
          {isBranchingQuest ? (
            <BranchingMap
              stages={stages}
              branches={questBranches}
              studentChoices={studentChoices}
              landmarks={mapLandmarks}
              activeStageId={stages.find(s => s.status === 'active')?.id}
              onStageClick={(stage) => {
                handleNodeClick(stage.id);
              }}
            />
          ) : (
            <TreasureMap
              stages={stages}
              landmarks={mapLandmarks}
              activeCard={activeCard}
              onNodeClick={handleNodeClick}
              studentName={studentName}
              studentEmoji={studentProfile?.avatar_emoji}
              recentlyCompleted={confetti ? activeCard : null}
            />
          )}
        </div>
      )}

      {/* Main content — two-column on desktop */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '28px 22px' }}>
          <div style={{ maxWidth: isDesktop ? 'none' : 680, margin: '0 auto' }}>
            {/* Stage card + hint */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Completion banner */}
              {quest?.status === 'completed' && (
                <div style={{
                  background: 'linear-gradient(135deg, var(--field-green) 0%, #1a5c3a 100%)',
                  borderRadius: 14, padding: '22px 24px', color: 'var(--chalk)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <CheckCircle size={22} color="var(--chalk)" strokeWidth={2.5} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Project Complete!</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: 0 }}>
                    Amazing work, {studentName}! You've completed every stage. Your guide can see your progress.
                  </p>
                </div>
              )}

              {/* Quest reflection */}
              {quest?.status === 'completed' && reflectionQuestions && (
                <QuestReflectionSection
                  questions={reflectionQuestions}
                  answers={reflectionAnswers}
                  onAnswer={(i, v) => setReflectionAnswers(prev => ({ ...prev, [i]: v }))}
                  onSave={handleSaveReflections}
                  loading={reflectionLoading}
                  saved={reflectionSaved}
                />
              )}

              {/* Next project suggestion after completion */}
              {quest?.status === 'completed' && (
                <div className="sq-card" style={{
                  background: 'rgba(184,134,11,0.04)', border: '1px solid rgba(184,134,11,0.2)',
                  borderRadius: 14, padding: '20px 22px', marginTop: 16, textAlign: 'center',
                }}>
                  <Sparkles size={20} color="var(--compass-gold)" style={{ marginBottom: 8 }} />
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', margin: '0 0 6px' }}>
                    What's next?
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 14px', lineHeight: 1.5 }}>
                    You finished this project — keep exploring by creating your own!
                  </p>
                  <button
                    onClick={() => navigate('/student')}
                    style={{
                      padding: '10px 20px', borderRadius: 8, border: 'none',
                      background: 'var(--compass-gold)', color: 'var(--ink)',
                      fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Sparkles size={13} /> Create My Next Project
                  </button>
                </div>
              )}

              {/* Group role badge */}
              {groupRole && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 100,
                  background: 'rgba(27,73,101,0.08)', border: '1px solid rgba(27,73,101,0.2)',
                  fontSize: 12, fontWeight: 600, color: 'var(--lab-blue)',
                  fontFamily: 'var(--font-body)', alignSelf: 'flex-start',
                }}>
                  <Users size={13} /> Your Role: {groupRole}
                </div>
              )}

              {activeStage ? (
                <>
                <StageCard
                  stage={activeStage}
                  onComplete={completeStage}
                  questId={id}
                  studentName={studentName}
                  existingSubmission={submissions[activeStage.id] || null}
                  studentProfile={studentProfile}
                  groupRole={groupRole}
                  onReloadSubmissions={loadSubmissions}
                  onChallengerTriggered={handleChallengerTriggered}
                  onSuggestEdit={handleStageEdited}
                  landmark={mapLandmarks.find(l => l.stage_id === activeStage.id)}
                  interactiveData={interactiveData}
                  expeditionChallenge={stageChallenges[activeStage.id] || null}
                  expeditionResponse={stageChallenges[activeStage.id] ? challengeResponseMap[stageChallenges[activeStage.id]?.id] : null}
                  onChallengeEvaluate={handleChallengeEvaluate}
                  isNextLocked={activeStage.id === nextLockedId}
                />
                {activeStage.stage_type === 'choice_fork' && isBranchingQuest && activeStage.status === 'active' && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    {questBranches
                      .filter(b => b.stage_id === activeStage.id)
                      .sort((a, b) => a.branch_index - b.branch_index)
                      .map(branch => (
                        <button key={branch.id} onClick={() => handleBranchChoice(activeStage.id, branch.branch_index)}
                          style={{
                            padding: '14px 18px', borderRadius: 10, textAlign: 'left',
                            border: '1.5px solid var(--compass-gold)', background: 'rgba(184,134,11,0.04)',
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                            {branch.branch_label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--graphite)', lineHeight: 1.4 }}>
                            {branch.branch_description}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
                </>
              ) : (
                <div style={{
                  background: 'var(--parchment)', border: '1.5px dashed var(--compass-gold)',
                  borderRadius: 12, padding: '28px 24px', textAlign: 'center',
                }}>
                  {stages.length > 0 ? (
                    <>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(196,167,103,0.12)', border: '2px solid var(--compass-gold)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 10px',
                        animation: 'sq-gentle-pulse 2s ease-in-out infinite',
                      }}>
                        <ChevronLeft size={18} color="var(--compass-gold)" />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
                        Tap a stage on the map to get started
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--graphite)', margin: 0 }}>
                        Each circle is a step in your project.
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
                        Your guide is setting up the stages
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--graphite)', margin: 0 }}>
                        Check back soon!
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Simulation entry card */}
              {simulation && (
                simulation.status === 'completed' && simulation.debrief_summary ? (
                  <div style={{
                    background: 'var(--parchment)', border: '1px solid var(--pencil)',
                    borderRadius: 12, padding: '18px 20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Zap size={14} color="var(--compass-gold)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simulation Complete</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, margin: '0 0 10px' }}>{simulation.debrief_summary}</p>
                    <button
                      onClick={handleEnterSim}
                      style={{ fontSize: 12, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Review transcript →
                    </button>
                  </div>
                ) : (
                  <div className="sq-card" style={{
                    background: 'var(--lab-blue)', borderRadius: 12, padding: '18px 20px',
                    boxShadow: '0 4px 16px rgba(27,73,101,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mic size={16} color="var(--chalk)" strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Career Simulation</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--chalk)' }}>
                          {simulation.scenario_title || simulation.title || 'Final Simulation'}
                        </div>
                      </div>
                    </div>
                    {simulation.context && (
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, margin: '0 0 14px' }}>
                        {simulation.context}
                      </p>
                    )}
                    {simulation.role && (
                      <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 5, padding: '5px 10px', marginBottom: 14, display: 'inline-block' }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.7)' }}>Your role: </span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--chalk)', fontWeight: 600 }}>{simulation.role}</span>
                      </div>
                    )}
                    <button
                      onClick={handleEnterSim}
                      style={{
                        width: '100%', padding: '10px', borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.3)',
                        background: 'rgba(255,255,255,0.15)', color: 'var(--chalk)',
                        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >
                      Enter Simulation
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </main>

        {/* AI Sidebar — desktop (inside flex row) */}
        {!isMobile && sidebarOpen && (
          <AISidebar
            activeStage={activeStage}
            questId={id}
            studentName={studentName}
            studentProfile={studentProfile}
            groupRole={groupRole}
            guideMessages={guideMessages}
            guideInput={guideInput}
            guideSending={guideSending}
            onSendGuide={handleSendToGuide}
            onGuideInputChange={setGuideInput}
            challengerText={challengerText}
            challengerResponse={challengerResponse}
            challengerSubmitted={challengerSubmitted}
            onChallengerRespond={handleChallengerRespond}
            visible={true}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Desktop FAB — show when sidebar is closed */}
      {!isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="AI Field Guide"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 150,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--lab-blue)', color: 'var(--chalk)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(27,73,101,0.35)',
            transition: 'transform 150ms, box-shadow 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(27,73,101,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(27,73,101,0.35)'; }}
        >
          <MessageCircle size={22} />
          {challengerText && !challengerSubmitted && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              width: 14, height: 14, borderRadius: '50%',
              background: 'var(--specimen-red)', border: '2px solid var(--chalk)',
            }} />
          )}
        </button>
      )}

      {/* Mobile FAB + bottom sheet */}
      {isMobile && (
        <>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 150,
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--lab-blue)', color: 'var(--chalk)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(27,73,101,0.3)',
              }}
            >
              <MessageCircle size={20} />
              {challengerText && !challengerSubmitted && (
                <div style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'var(--specimen-red)', border: '2px solid var(--chalk)',
                }} />
              )}
            </button>
          )}
          {sidebarOpen && (
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              height: '70vh', zIndex: 200,
              background: 'var(--chalk)',
              borderTop: '1px solid var(--pencil)',
              borderRadius: '16px 16px 0 0',
              boxShadow: '0 -4px 28px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--pencil)' }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AISidebar
                  activeStage={activeStage}
                  questId={id}
                  studentName={studentName}
                  studentProfile={studentProfile}
                  groupRole={groupRole}
                  guideMessages={guideMessages}
                  guideInput={guideInput}
                  guideSending={guideSending}
                  onSendGuide={handleSendToGuide}
                  onGuideInputChange={setGuideInput}
                  challengerText={challengerText}
                  challengerResponse={challengerResponse}
                  challengerSubmitted={challengerSubmitted}
                  onChallengerRespond={handleChallengerRespond}
                  visible={true}
                  onClose={() => setSidebarOpen(false)}
                  isMobileSheet
                />
              </div>
            </div>
          )}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 199,
                background: 'rgba(0,0,0,0.3)',
              }}
            />
          )}
        </>
      )}

      {/* Field notes panel */}
      {journalOpen && (
        <FieldNotesPanel
          reflections={reflections}
          onAdd={addReflection}
          onClose={() => setJournalOpen(false)}
          studentName={studentName}
        />
      )}

      {/* XP Toast */}
      {xpToast && (
        <XPToast
          points={xpToast.points}
          rankUp={xpToast.rankUp}
          newRank={xpToast.newRank}
          badgeEarned={xpToast.badgeEarned}
          onDone={() => setXpToast(null)}
        />
      )}

      {/* Immersive 3D World */}
      {immersiveMode && (quest?.marble_world_url || quest?.world_scene_url) && (
        <Suspense fallback={null}>
          {quest.marble_world_url ? (
            <MarbleWorldView
              marbleUrl={quest.marble_world_url}
              hotspots={quest.world_hotspots}
              stages={stages}
              activeStageId={activeCard}
              onStageSelect={(stageId) => {
                const s = stages.find(st => st.id === stageId);
                if (s) setActiveCard(stageId);
              }}
              onStageSubmit={async (stageId, text) => {
                const stage = stages.find(s => s.id === stageId);
                if (!stage) return;
                // Save submission
                await supabase.rpc('submit_student_work', {
                  p_quest_id: id,
                  p_stage_id: stageId,
                  p_student_name: studentName,
                  p_content: text,
                });
                // AI review
                try {
                  const result = await ai.reviewSubmission({
                    stageTitle: stage.title,
                    stageDescription: stage.description || '',
                    deliverable: stage.deliverable || '',
                    submissionContent: text,
                    studentProfile: studentProfile || { name: studentName },
                  });
                  if (result?.feedback) {
                    setImmersiveFeedback(result.feedback);
                  }
                } catch (e) {
                  console.error('Immersive review failed:', e);
                }
              }}
              onExit={() => setImmersiveMode(false)}
              isMobile={isMobile}
              sceneDescription={quest.world_scene_prompt}
              feedbackText={immersiveFeedback}
            />
          ) : (
            <ImmersiveWorldView
              sceneUrl={quest.world_scene_url}
              hotspots={quest.world_hotspots || []}
              stages={stages}
              activeStageId={activeCard}
              onStageSelect={(stageId) => {
                setImmersiveMode(false);
                handleNodeClick(stageId);
              }}
              onExit={() => setImmersiveMode(false)}
              isMobile={isMobile}
              studentName={studentName}
              xp={xpData?.total_points}
            />
          )}
        </Suspense>
      )}
    </div>
  );
}
