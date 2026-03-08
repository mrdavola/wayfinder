import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, Search, Wrench, FlaskConical, Mic,
  Megaphone, X, Send, CheckCircle, HelpCircle,
  Zap, ArrowRight, Loader2, AlertCircle, ChevronRight,
  Share2, List, Download, Calendar, Printer, MessageCircle,
  ChevronDown,
} from 'lucide-react';
import SpeakButton from '../components/ui/SpeakButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ai, guidePlaybook as guidePlaybookApi, landmarksApi, communityProjects } from '../lib/api';
import TreasureMap from '../components/map/TreasureMap';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';

// ===================== CONSTANTS =====================
const NODE_SPACING = 140;
const NODE_RADIUS = 24;
const SVG_CENTER_X = 180;
const NODE_OFFSET = 40;

const FIELD_ANNOTATIONS = [
  "You're making progress...",
  "Next: an experiment awaits",
  "Career connection ahead →",
  "Almost there!",
];

// ===================== CSS INJECTION =====================
const injectStyles = () => {
  if (document.getElementById('quest-map-styles')) return;
  const el = document.createElement('style');
  el.id = 'quest-map-styles';
  el.textContent = `
    @keyframes pulse-gold {
      0%, 100% { box-shadow: 0 0 0 0 rgba(184,134,11,0.5); }
      50% { box-shadow: 0 0 0 8px rgba(184,134,11,0); }
    }
    @keyframes qm-pulse {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(184,134,11,0.6)); }
      50% { filter: drop-shadow(0 0 12px rgba(184,134,11,0.9)); }
    }
    @keyframes qm-glow-green {
      0%, 100% { filter: drop-shadow(0 0 3px rgba(45,106,79,0.5)); }
      50% { filter: drop-shadow(0 0 6px rgba(45,106,79,0.8)); }
    }
    @keyframes qm-dash-flow {
      from { stroke-dashoffset: 10; }
      to   { stroke-dashoffset: 0; }
    }
    @keyframes qm-node-enter {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes confetti-pop {
      0%   { transform: scale(0) rotate(0deg); opacity: 1; }
      60%  { transform: scale(1.4) rotate(20deg); opacity: 1; }
      100% { transform: scale(1.8) rotate(45deg); opacity: 0; }
    }
    @keyframes skeleton-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @keyframes slide-in-right {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .node-pulse { animation: pulse-gold 2s ease-in-out infinite; }
    .skeleton-el { animation: skeleton-pulse 1.4s ease-in-out infinite; }
    .journal-panel { animation: slide-in-right 250ms ease; }
    .card-fade-in { animation: fade-in 200ms ease; }
    .spin-icon { animation: spin 1s linear infinite; }
    .confetti-piece { animation: confetti-pop 600ms ease forwards; }
    .back-link:hover { color: var(--ink) !important; }
    .field-btn:hover { background: var(--parchment) !important; }
    .complete-btn:hover { opacity: 0.88 !important; }
    .help-btn:hover { border-color: var(--lab-blue) !important; }
    .node-hover:hover { opacity: 0.85; cursor: pointer; }
    .journal-input:focus { border-color: var(--lab-blue) !important; box-shadow: 0 0 0 3px rgba(27,73,101,0.12) !important; outline: none !important; }
  `;
  document.head.appendChild(el);
};

// ===================== ICON MAP =====================
function StageIcon({ type, size = 20, color = 'currentColor' }) {
  const props = { size, color, strokeWidth: 2 };
  switch (type) {
    case 'research':   return <Search {...props} />;
    case 'build':      return <Wrench {...props} />;
    case 'experiment': return <FlaskConical {...props} />;
    case 'simulate':   return <Mic {...props} />;
    case 'reflect':    return <BookOpen {...props} />;
    case 'present':    return <Megaphone {...props} />;
    default:           return <Zap {...props} />;
  }
}

// ===================== CONFETTI =====================
const CONFETTI_POSITIONS = [
  { top: '35%', left: '25%' },
  { top: '45%', left: '60%' },
  { top: '30%', left: '50%' },
  { top: '55%', left: '35%' },
  { top: '40%', left: '70%' },
];

function ConfettiBurst({ active }) {
  if (!active) return null;
  const pieces = ['#B8860B', '#2D6A4F', '#1B4965', '#C0392B', '#B8860B'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {pieces.map((color, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            position: 'absolute',
            top: CONFETTI_POSITIONS[i].top,
            left: CONFETTI_POSITIONS[i].left,
            width: 8,
            height: 8,
            borderRadius: i % 2 === 0 ? '50%' : '2px',
            background: color,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ===================== LOADING SKELETON =====================
function QuestSkeleton() {
  return (
    <div style={{ padding: '24px', maxWidth: '760px', margin: '0 auto' }}>
      {/* Header skeleton */}
      <div className="skeleton-el" style={{ height: 32, width: '60%', borderRadius: 8, background: 'var(--parchment)', marginBottom: 12 }} />
      <div className="skeleton-el" style={{ height: 18, width: '40%', borderRadius: 6, background: 'var(--parchment)', marginBottom: 8 }} />
      <div className="skeleton-el" style={{ height: 80, borderRadius: 8, background: 'var(--parchment)', marginBottom: 32 }} />
      {/* Node skeletons */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div className="skeleton-el" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--parchment)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-el" style={{ height: 16, width: '50%', borderRadius: 4, background: 'var(--parchment)', marginBottom: 6 }} />
            <div className="skeleton-el" style={{ height: 12, width: '30%', borderRadius: 4, background: 'var(--parchment)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== SVG JOURNEY MAP =====================
function JourneyMap({ stages, activeCard, onNodeClick, confettiNode }) {
  const nodeCount = stages.length;
  const svgHeight = nodeCount * NODE_SPACING + 80;
  const svgWidth = 360;

  const getNodeX = (i) => {
    const offsets = [-NODE_OFFSET, NODE_OFFSET, 0, -NODE_OFFSET, NODE_OFFSET];
    return SVG_CENTER_X + offsets[i % offsets.length];
  };

  const getNodeY = (i) => 60 + i * NODE_SPACING;

  const getNodeStroke = (stage) => {
    if (stage.status === 'completed') return 'var(--field-green)';
    if (stage.status === 'active')    return 'var(--compass-gold)';
    return 'var(--pencil)';
  };

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
        {/* Path lines between nodes */}
        {stages.map((stage, i) => {
          if (i === stages.length - 1) return null;
          const x1 = getNodeX(i);
          const y1 = getNodeY(i);
          const x2 = getNodeX(i + 1);
          const y2 = getNodeY(i + 1);
          const isDone = stage.status === 'completed';
          const nextIsActive = stages[i + 1]?.status === 'active';
          return (
            <line
              key={`line-${i}`}
              x1={x1} y1={y1 + NODE_RADIUS}
              x2={x2} y2={y2 - NODE_RADIUS}
              stroke={isDone ? 'var(--field-green)' : nextIsActive ? 'var(--compass-gold)' : 'var(--pencil)'}
              strokeWidth={isDone ? 2.5 : 1.5}
              strokeDasharray={isDone ? 'none' : '6 4'}
              opacity={nextIsActive ? 0.8 : 0.6}
              style={nextIsActive ? { animation: 'qm-dash-flow 0.8s linear infinite' } : undefined}
            />
          );
        })}

        {/* Field annotations */}
        {stages.map((stage, i) => {
          if (i === 0 || i >= stages.length) return null;
          const annotation = FIELD_ANNOTATIONS[(i - 1) % FIELD_ANNOTATIONS.length];
          const x = getNodeX(i);
          const y = getNodeY(i) - NODE_SPACING / 2;
          const isRight = x > SVG_CENTER_X;
          return (
            <text
              key={`ann-${i}`}
              x={isRight ? x + NODE_RADIUS + 6 : x - NODE_RADIUS - 6}
              y={y + 4}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--pencil)"
              textAnchor={isRight ? 'start' : 'end'}
              opacity={0.7}
            >
              {annotation}
            </text>
          );
        })}

        {/* Nodes */}
        {stages.map((stage, i) => {
          const cx = getNodeX(i);
          const cy = getNodeY(i);
          const isActive = stage.status === 'active';
          const isCompleted = stage.status === 'completed';
          const isLocked = stage.status === 'locked';
          const isSelected = activeCard === stage.id;

          return (
            <g
              key={stage.id}
              className={!isLocked ? 'node-hover' : ''}
              onClick={() => !isLocked && onNodeClick(stage.id)}
              role={!isLocked ? 'button' : undefined}
              tabIndex={!isLocked ? 0 : undefined}
              onKeyDown={(e) => { if (!isLocked && (e.key === 'Enter' || e.key === ' ')) onNodeClick(stage.id); }}
              aria-label={`${stage.title} — ${stage.status}`}
              style={{
                animation: `qm-node-enter 400ms ease-out ${i * 80}ms both${isActive ? ', qm-pulse 2s ease-in-out infinite' : ''}${isCompleted ? ', qm-glow-green 3s ease-in-out infinite' : ''}`,
              }}
            >
              {/* Pulse ring for active */}
              {isActive && (
                <circle
                  className="node-pulse"
                  cx={cx} cy={cy}
                  r={NODE_RADIUS + 8}
                  fill="none"
                  stroke="var(--compass-gold)"
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )}

              {/* Selected ring */}
              {isSelected && (
                <circle
                  cx={cx} cy={cy}
                  r={NODE_RADIUS + 5}
                  fill="none"
                  stroke="var(--lab-blue)"
                  strokeWidth={2}
                  opacity={0.8}
                />
              )}

              {/* Main circle */}
              <circle
                cx={cx} cy={cy}
                r={NODE_RADIUS}
                fill={isCompleted ? 'var(--field-green)' : isActive ? 'var(--compass-gold)' : 'var(--parchment)'}
                stroke={getNodeStroke(stage)}
                strokeWidth={2}
                opacity={isLocked ? 0.4 : 1}
              />

              {/* Icon */}
              <foreignObject
                x={cx - 10} y={cy - 10}
                width={20} height={20}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20,
                  color: isCompleted ? 'var(--chalk)' : isActive ? 'var(--ink)' : 'var(--pencil)',
                  opacity: isLocked ? 0.5 : 1,
                }}>
                  {isCompleted
                    ? <CheckCircle size={14} color="var(--chalk)" strokeWidth={2.5} />
                    : <StageIcon type={stage.stage_type || stage.type} size={14} />
                  }
                </div>
              </foreignObject>

              {/* Stage number label */}
              <text
                x={cx}
                y={cy + NODE_RADIUS + 16}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill={isLocked ? 'var(--pencil)' : 'var(--graphite)'}
                textAnchor="middle"
                opacity={isLocked ? 0.5 : 0.9}
              >
                {stage.stage_number}
              </text>

              {/* Confetti */}
              {confettiNode === stage.id && (
                <foreignObject x={cx - 60} y={cy - 60} width={120} height={120}>
                  <ConfettiBurst active />
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Simulation node at end */}
        {stages.length > 0 && (
          <g>
            <line
              x1={getNodeX(stages.length - 1)}
              y1={getNodeY(stages.length - 1) + NODE_RADIUS}
              x2={SVG_CENTER_X}
              y2={getNodeY(stages.length - 1) + NODE_SPACING - NODE_RADIUS}
              stroke="var(--lab-blue)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.5}
            />
            <circle
              cx={SVG_CENTER_X}
              cy={getNodeY(stages.length - 1) + NODE_SPACING}
              r={NODE_RADIUS}
              fill="var(--lab-blue)"
              stroke="var(--lab-blue)"
              strokeWidth={2}
              opacity={0.8}
            />
            <foreignObject
              x={SVG_CENTER_X - 10}
              y={getNodeY(stages.length - 1) + NODE_SPACING - 10}
              width={20} height={20}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, color: 'var(--chalk)' }}>
                <Mic size={14} color="var(--chalk)" strokeWidth={2} />
              </div>
            </foreignObject>
            <text
              x={SVG_CENTER_X}
              y={getNodeY(stages.length - 1) + NODE_SPACING + NODE_RADIUS + 16}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--lab-blue)"
              textAnchor="middle"
            >
              Simulation
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ===================== SUBMISSION ENTRY (guide view) =====================
const TYPE_COLORS = {
  text: 'var(--lab-blue)',
  audio: 'var(--field-green)',
  video: 'var(--compass-gold)',
  file: 'var(--graphite)',
};

function SubmissionEntry({ sub }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[sub.submission_type] || 'var(--graphite)';
  const timestamp = new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      background: 'var(--parchment)', borderRadius: 8,
      padding: '10px 12px', borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>
          {sub.student_name}
        </span>
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.04em', color, background: `${color}18`, padding: '2px 6px', borderRadius: 4,
        }}>
          {sub.submission_type}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--pencil)', fontFamily: 'var(--font-mono)' }}>
          {timestamp}
        </span>
      </div>

      {sub.submission_type === 'text' && sub.content && (
        <div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink)', lineHeight: 1.55, margin: 0 }}>
            {expanded ? sub.content : sub.content.substring(0, 120)}
            {sub.content.length > 120 && !expanded && '…'}
          </p>
          {sub.content.length > 120 && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ fontSize: 10, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 0', fontFamily: 'var(--font-body)' }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {sub.submission_type === 'audio' && sub.file_url && (
        <audio controls src={sub.file_url} style={{ width: '100%', height: 32, marginTop: 4 }} />
      )}

      {sub.submission_type === 'video' && sub.file_url && (
        <video controls src={sub.file_url} style={{ width: '100%', borderRadius: 5, marginTop: 4 }} />
      )}

      {sub.submission_type === 'file' && sub.file_url && (
        <a
          href={sub.file_url}
          download={sub.file_name || 'submission'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--lab-blue)', fontFamily: 'var(--font-body)', marginTop: 4 }}
        >
          <Download size={11} />
          {sub.file_name || 'Download file'}
        </a>
      )}
    </div>
  );
}

// ===================== STAGE CARD =====================
function StageCard({ stage, onComplete, completing, onNavigateToSim, submissions = [] }) {
  const [helpText, setHelpText] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpResponse, setHelpResponse] = useState('');

  const readText = [
    stage.title,
    stage.description || '',
    ...(stage.guiding_questions?.slice(0, 2) || []),
  ].filter(Boolean).join('. ');

  const isSimulate = stage.stage_type === 'simulate' || stage.type === 'simulate';
  const isCompleting = completing === stage.id;

  const handleHelp = async () => {
    if (!helpText.trim()) return;
    setHelpLoading(true);
    try {
      const response = await ai.questHelp({
        stageDescription: stage.description || '',
        guidingQuestions: stage.guiding_questions || [],
        helpRequest: helpText,
      });
      setHelpResponse(response);
    } catch {
      setHelpResponse("I'm having trouble connecting right now. Try exploring your guiding questions first!");
    }
    setHelpLoading(false);
  };

  return (
    <div className="card-fade-in" style={{
      background: 'var(--chalk)',
      border: '1px solid var(--pencil)',
      borderRadius: 14,
      padding: '24px 28px',
      width: '100%',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    }}>
      {/* Stage header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: stage.status === 'completed' ? 'var(--field-green)' : 'var(--parchment)',
            border: `2px solid ${stage.status === 'completed' ? 'var(--field-green)' : 'var(--compass-gold)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {stage.status === 'completed'
              ? <CheckCircle size={18} color="var(--chalk)" strokeWidth={2.5} />
              : <StageIcon type={stage.stage_type || stage.type} size={18} color="var(--ink)" />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Stage {stage.stage_number}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '0.04em', fontWeight: 600,
                color: stage.status === 'completed' ? 'var(--field-green)' : stage.status === 'active' ? 'var(--compass-gold)' : 'var(--pencil)',
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

      {/* Description */}
      {stage.description && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)', lineHeight: 1.7, margin: '0 0 20px' }}>
          {stage.description}
        </p>
      )}

      {/* Duration */}
      {stage.duration && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', marginBottom: 14 }}>
          Estimated: {stage.duration} {stage.duration === 1 ? 'day' : 'days'}
        </div>
      )}

      {/* Divider */}
      {stage.description && stage.guiding_questions?.length > 0 && (
        <hr style={{ border: 'none', borderTop: '1px solid var(--pencil)', margin: '0 0 20px', opacity: 0.4 }} />
      )}

      {/* Guiding questions */}
      {stage.guiding_questions?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Guiding Questions
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
        <div style={{ background: 'var(--parchment)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, borderLeft: '3px solid var(--compass-gold)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Your deliverable</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{stage.deliverable}</p>
        </div>
      )}

      {/* Actions */}
      {stage.status === 'active' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isSimulate ? (
            <button
              onClick={() => onNavigateToSim && onNavigateToSim()}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none',
                background: 'var(--lab-blue)', color: 'var(--chalk)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Mic size={14} />
              Enter Simulation
            </button>
          ) : (
            <button
              className="complete-btn"
              onClick={() => onComplete(stage.id)}
              disabled={isCompleting}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 6, border: 'none',
                background: 'var(--field-green)', color: 'var(--chalk)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
                cursor: isCompleting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: isCompleting ? 0.7 : 1, transition: 'opacity 150ms',
              }}
            >
              {isCompleting
                ? <><Loader2 size={14} className="spin-icon" /> Saving...</>
                : <><CheckCircle size={14} /> Mark Complete</>
              }
            </button>
          )}

          <button
            className="help-btn"
            onClick={() => setHelpOpen((v) => !v)}
            style={{
              padding: '10px 14px', borderRadius: 6,
              border: '1px solid var(--pencil)', background: 'transparent',
              color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'border-color 150ms',
            }}
          >
            <HelpCircle size={14} />
            Get Help
          </button>
        </div>
      )}

      {/* Help panel */}
      {helpOpen && stage.status === 'active' && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--pencil)', paddingTop: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', marginBottom: 8 }}>
            What are you stuck on?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Describe what you need help with..."
              onKeyDown={(e) => { if (e.key === 'Enter') handleHelp(); }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 6,
                border: '1px solid var(--pencil)', background: 'var(--chalk)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
            <button
              onClick={handleHelp}
              disabled={helpLoading || !helpText.trim()}
              style={{
                padding: '8px 14px', borderRadius: 6,
                border: 'none', background: 'var(--ink)', color: 'var(--chalk)',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                opacity: helpLoading ? 0.6 : 1,
              }}
            >
              {helpLoading ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
            </button>
          </div>

          {helpResponse && (
            <div style={{ marginTop: 12, background: 'var(--parchment)', borderRadius: 6, padding: '12px 14px', borderLeft: '3px solid var(--lab-blue)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--lab-blue)', marginBottom: 6 }}>
                Wayfinder asks...
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>
                {helpResponse}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Student Work — guide view */}
      {submissions.length > 0 && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--pencil)', paddingTop: 14 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Student Work ({submissions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {submissions.map((sub) => (
              <SubmissionEntry key={sub.id} sub={sub} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== SIMULATION ENTRY CARD =====================
function SimulationEntryCard({ simulation, onEnter }) {
  return (
    <div className="card-fade-in" style={{
      background: 'var(--lab-blue)',
      borderRadius: 14,
      padding: '24px 28px',
      width: '100%',
      boxShadow: '0 4px 20px rgba(27,73,101,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mic size={18} color="var(--chalk)" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Career Simulation
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--chalk)', margin: 0 }}>
            {simulation?.scenario_title || simulation?.title || 'Final Simulation'}
          </h3>
        </div>
      </div>

      {simulation?.context && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: 16 }}>
          {simulation.context}
        </p>
      )}

      {simulation?.role && (
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, display: 'inline-block' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.7)' }}>Your role: </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--chalk)', fontWeight: 600 }}>{simulation.role}</span>
        </div>
      )}

      <button
        onClick={onEnter}
        style={{
          width: '100%', padding: '12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.15)', color: 'var(--chalk)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 150ms',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
      >
        Enter Simulation
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ===================== REFLECTION JOURNAL =====================
function ReflectionJournal({ reflections, onAdd, onClose }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reflections]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setSaving(true);
    await onAdd(trimmed);
    setContent('');
    setSaving(false);
  };

  return (
    <div
      className="journal-panel"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        background: 'var(--chalk)', borderLeft: '1px solid var(--pencil)',
        display: 'flex', flexDirection: 'column', zIndex: 200,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={16} color="var(--ink)" strokeWidth={2} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--ink)' }}>Field Notes</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--graphite)', display: 'flex', padding: 4, borderRadius: 4 }}
          aria-label="Close journal"
        >
          <X size={18} />
        </button>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reflections.length === 0 && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--pencil)', textAlign: 'center', marginTop: 32, lineHeight: 1.7 }}>
            Your field notes will appear here as you complete stages.
          </div>
        )}
        {reflections.map((r) => (
          <div key={r.id} style={{
            background: r.entry_type === 'auto' ? 'var(--parchment)' : 'var(--chalk)',
            border: '1px solid var(--pencil)', borderRadius: 8,
            padding: '12px 14px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--pencil)', marginBottom: 4 }}>
              {r.entry_type === 'auto' ? 'Auto-logged' : 'Your note'} ·{' '}
              {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
              {r.content}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Add note */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--pencil)' }}>
        <textarea
          className="journal-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a field note..."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 6,
            border: '1px solid var(--pencil)', background: 'var(--chalk)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)',
            resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box',
            transition: 'border-color 150ms, box-shadow 150ms',
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleSave(); }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          style={{
            marginTop: 8, width: '100%', padding: '10px', borderRadius: 6,
            border: 'none', background: 'var(--ink)', color: 'var(--chalk)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
            cursor: saving || !content.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !content.trim() ? 0.6 : 1, transition: 'opacity 150ms',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {saving ? <Loader2 size={14} className="spin-icon" /> : <Send size={14} />}
          Save Note
        </button>
      </div>
    </div>
  );
}

// ===================== GUIDE PLAYBOOK PANEL =====================
function GuidePlaybookPanel({ questId, quest, stages, onClose }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    guidePlaybookApi.list(questId).then(({ data }) => {
      setDays(data || []);
      setLoading(false);
    });
  }, [questId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await ai.generatePlaybook({
        questTitle: quest?.title || '',
        stages: (stages || []).map((s) => ({
          stage_title: s.title,
          description: s.description,
          deliverable: s.deliverable,
          stage_type: s.stage_type || s.type,
        })),
        totalDays: stages?.length ? Math.max(stages.length * 2, 5) : 10,
      });
      const generated = result.days || [];
      setDays(generated);
      // Save to DB
      if (generated.length > 0) {
        await guidePlaybookApi.bulkUpsert(questId, generated);
      }
    } catch (err) {
      console.error('Playbook generation error:', err);
    }
    setGenerating(false);
  };

  // Strip "Day N:" prefix if the AI included it in the title
  const cleanTitle = (d) => {
    const t = d.title || '';
    return t.replace(/^day\s*\d+\s*[:–—-]\s*/i, '').trim() || t;
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    const html = days.map((d) => `
      <div class="day-card">
        <div class="day-header">
          <span class="day-badge">Day ${d.day_number}</span>
          <span class="day-title">${cleanTitle(d)}</span>
        </div>
        ${d.prep_tasks?.length ? `
          <div class="section">
            <div class="section-label">Prep</div>
            <ul>${d.prep_tasks.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>` : ''}
        ${d.materials?.length ? `
          <div class="section">
            <div class="section-label">Materials</div>
            <div class="materials">${d.materials.map(m => `<span class="pill">${m}</span>`).join('')}</div>
          </div>` : ''}
        ${d.time_blocks?.length ? `
          <div class="section">
            <div class="section-label">Schedule</div>
            <table class="schedule">${d.time_blocks.map(tb => `
              <tr>
                <td class="time">${tb.duration_min} min</td>
                <td>${tb.label}${tb.notes ? `<span class="note"> — ${tb.notes}</span>` : ''}</td>
              </tr>`).join('')}
            </table>
          </div>` : ''}
        ${d.facilitation_notes ? `
          <div class="facilitation">${d.facilitation_notes}</div>` : ''}
      </div>
    `).join('');
    printWin.document.write(`<html><head><title>Facilitation Guide — ${quest?.title || 'Project'}</title>
    <style>
      @page { margin: 0.75in; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 720px; margin: 0 auto; color: #1a1a2e; line-height: 1.5; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .subtitle { font-size: 13px; color: #666; margin-bottom: 28px; }
      .day-card { page-break-inside: avoid; margin-bottom: 24px; padding: 16px 20px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa; }
      .day-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
      .day-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px; background: #1b4965; color: #fff; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
      .day-title { font-size: 15px; font-weight: 600; }
      .section { margin-bottom: 10px; }
      .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 3px; }
      ul { margin: 0; padding-left: 18px; font-size: 12px; }
      li { margin-bottom: 2px; }
      .materials { display: flex; flex-wrap: wrap; gap: 4px; }
      .pill { font-size: 10px; padding: 2px 8px; border-radius: 4px; background: #eee; color: #555; }
      .schedule { font-size: 12px; border-collapse: collapse; width: 100%; }
      .schedule td { padding: 3px 8px 3px 0; vertical-align: top; border-bottom: 1px solid #eee; }
      .time { font-weight: 600; white-space: nowrap; min-width: 55px; }
      .note { color: #999; font-style: italic; }
      .facilitation { font-size: 12px; color: #555; font-style: italic; line-height: 1.6; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd; }
    </style></head><body>
      <h1>${quest?.title || 'Facilitation Guide'}</h1>
      <div class="subtitle">Facilitation Guide — ${days.length} days</div>
      ${html}
    </body></html>`);
    printWin.document.close();
    printWin.print();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '90vw',
      background: 'var(--chalk)', borderLeft: '1px solid var(--pencil)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 200,
      display: 'flex', flexDirection: 'column', animation: 'slideInRight 200ms ease',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--pencil)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="var(--ink)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>Facilitation Guide</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {days.length > 0 && (
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--pencil)', background: 'transparent', fontSize: 11, color: 'var(--graphite)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Printer size={12} /> Print
            </button>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={16} color="var(--graphite)" />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : generating ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-body)', marginTop: 8 }}>Generating day-by-day plan...</p>
          </div>
        ) : days.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Calendar size={32} color="var(--pencil)" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: 'var(--graphite)', fontFamily: 'var(--font-body)', marginBottom: 16 }}>
              No playbook yet for this project.
            </p>
            <button
              onClick={handleGenerate}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'var(--ink)', color: 'var(--chalk)',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Calendar size={14} /> Generate Playbook
            </button>
          </div>
        ) : (
          days.map((day) => (
            <div key={day.day_number} style={{ padding: '12px 0', borderBottom: '1px solid var(--parchment)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--lab-blue)', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>
                  Day {day.day_number}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
                  {cleanTitle(day)}
                </span>
              </div>
              {day.prep_tasks?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Prep</span>
                  <ul style={{ margin: '2px 0 0 16px', padding: 0, fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                    {day.prep_tasks.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
              {day.materials?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Materials</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {day.materials.map((m, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-body)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {day.time_blocks?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Schedule</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                    {day.time_blocks.map((tb, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11, fontFamily: 'var(--font-body)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)', minWidth: 40 }}>{tb.duration_min}min</span>
                        <span style={{ color: 'var(--ink)' }}>{tb.label}</span>
                        {tb.notes && <span style={{ color: 'var(--pencil)', fontStyle: 'italic' }}> — {tb.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {day.facilitation_notes && (
                <p style={{ fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontStyle: 'italic', lineHeight: 1.5, margin: '4px 0 0' }}>
                  {day.facilitation_notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===================== PROGRESS SIDEBAR =====================
function ProgressSidebar({ stages, quest, reflections = [], isOverlay = false, onClose, questId }) {
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const totalCount = stages.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const studentEntries = reflections.filter((r) => r.entry_type === 'student');

  // Field Guide conversations
  const [conversations, setConversations] = useState({});
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [convoLoaded, setConvoLoaded] = useState(false);

  useEffect(() => {
    if (!questId || convoLoaded) return;
    supabase
      .from('guide_messages')
      .select('*')
      .eq('quest_id', questId)
      .eq('message_type', 'field_guide')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const grouped = {};
        (data || []).forEach(msg => {
          if (!grouped[msg.student_name]) grouped[msg.student_name] = [];
          grouped[msg.student_name].push(msg);
        });
        setConversations(grouped);
        setConvoLoaded(true);
      });
  }, [questId, convoLoaded]);

  const asideStyle = isOverlay
    ? {
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 280, zIndex: 200,
        background: 'var(--chalk)', borderLeft: '1px solid var(--pencil)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 28px rgba(0,0,0,0.12)',
        animation: 'slide-in-right 220ms ease',
        overflowY: 'auto',
      }
    : {
        width: 220, minWidth: 220, padding: '20px 16px',
        borderLeft: '1px solid var(--pencil)',
        display: 'flex', flexDirection: 'column', gap: 16,
        overflowY: 'auto',
      };

  return (
    <aside style={asideStyle}>
      {/* Overlay header */}
      {isOverlay && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)' }}>Project Progress</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 4, display: 'flex' }}>
            <X size={17} />
          </button>
        </div>
      )}

      <div style={{ padding: isOverlay ? '16px' : 0, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* Progress bar */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--parchment)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--field-green)', borderRadius: 4, transition: 'width 500ms ease' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)' }}>{pct}%</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--graphite)' }}>
            {completedCount} of {totalCount} stages complete
          </div>
        </div>

        {/* Stage list */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Stages
          </div>
          {stages.map((stage) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: stage.status === 'completed' ? 'var(--field-green)' : stage.status === 'active' ? 'var(--compass-gold)' : 'var(--pencil)',
              }} />
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                color: stage.status === 'locked' ? 'var(--pencil)' : 'var(--ink)',
                fontWeight: stage.status === 'active' ? 600 : 400,
                lineHeight: 1.4,
              }}>
                {stage.title}
              </span>
            </div>
          ))}
        </div>

        {/* Student submissions */}
        {studentEntries.length > 0 && (
          <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Student Work ({studentEntries.length})
            </div>
            {studentEntries.map((entry) => {
              const responseMatch = entry.content.match(/^RESPONSE: ([\s\S]*?)(?:\n\nFEEDBACK:|$)/);
              const preview = (responseMatch ? responseMatch[1].trim() : entry.content).substring(0, 90);
              return (
                <div key={entry.id} style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--parchment)', borderRadius: 6, borderLeft: '2px solid var(--compass-gold)' }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--compass-gold)', marginBottom: 3 }}>
                    {entry.student_name || 'Student'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink)', lineHeight: 1.5 }}>
                    {preview}{preview.length === 90 ? '…' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Field Guide Conversations */}
        <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <MessageCircle size={12} color="var(--lab-blue)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              AI Field Guide Chats
            </span>
          </div>
          {Object.keys(conversations).length === 0 ? (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)', fontStyle: 'italic', padding: '4px 0' }}>
              No conversations yet. Chats will appear here when learners use the AI Field Guide.
            </div>
          ) : (
            Object.entries(conversations).map(([studentName, msgs]) => {
              const isExpanded = expandedStudent === studentName;
              const hasFlagged = msgs.some(m => m.flagged);
              return (
                <div key={studentName} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => setExpandedStudent(isExpanded ? null : studentName)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                      padding: '5px 8px', borderRadius: 6,
                      background: isExpanded ? 'rgba(27,73,101,0.06)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <ChevronDown size={10} color="var(--graphite)" style={{
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 150ms',
                    }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                      {studentName}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--graphite)' }}>
                      {msgs.length}
                    </span>
                    {hasFlagged && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--specimen-red)', flexShrink: 0 }} />
                    )}
                  </button>
                  {isExpanded && (
                    <div style={{
                      maxHeight: 200, overflowY: 'auto',
                      padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      {msgs.map((msg, i) => (
                        <div key={i} style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 10, lineHeight: 1.45,
                          background: msg.role === 'user' ? 'var(--parchment)' : 'rgba(27,73,101,0.04)',
                          border: msg.flagged ? '1px solid rgba(192,57,43,0.3)' : 'none',
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 8,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: msg.role === 'user' ? 'var(--graphite)' : 'var(--lab-blue)',
                          }}>
                            {msg.role === 'user' ? studentName : 'AI'}
                          </span>
                          {msg.flagged && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--specimen-red)', marginLeft: 4, fontWeight: 700 }}>FLAGGED</span>
                          )}
                          <div style={{ color: 'var(--ink)', marginTop: 1 }}>
                            {msg.content.length > 120 ? msg.content.substring(0, 120) + '…' : msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }))
          }
        </div>

        {/* Duration */}
        {quest?.total_duration && (
          <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Total Duration
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
              {quest.total_duration} days
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ===================== MOBILE PROGRESS BAR =====================
function MobileProgressBar({ stages }) {
  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const pct = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;
  return (
    <div style={{ padding: '10px 20px', background: 'var(--chalk)', borderTop: '1px solid var(--pencil)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: 'var(--parchment)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--field-green)', borderRadius: 4, transition: 'width 500ms ease' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', whiteSpace: 'nowrap' }}>
          {completedCount}/{stages.length} done
        </span>
      </div>
    </div>
  );
}

function getInitials(n) { if (!n) return '?'; const p = n.trim().split(/\s+/); return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase(); }

// ===================== MAIN COMPONENT =====================
export default function QuestMap() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth(); // profile used for avatar in navbar

  // Inject styles once
  useEffect(() => { injectStyles(); }, []);

  // ---- State ----
  const [quest, setQuest] = useState(null);
  const [stages, setStages] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [activeCard, setActiveCard] = useState(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [confettiNode, setConfettiNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [mapLandmarks, setMapLandmarks] = useState([]);

  const [stageSubmissions, setStageSubmissions] = useState({}); // keyed by stage_id

  const [shareCopied, setShareCopied] = useState(false);
  const copyStudentLink = useCallback(() => {
    const url = `${window.location.origin}/q/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }, [id]);

  const [shared, setShared] = useState(false);
  const handleShareToCommunity = async () => {
    if (!quest || !profile?.school_id || shared) return;
    const result = await communityProjects.share(quest.id, profile.school_id, user.id, {
      title: quest.title,
      description: quest.subtitle || quest.narrative_hook || '',
      tags: quest.academic_standards || [],
      gradeBand: quest.grade_band || null,
      projectMode: quest.project_mode || 'mixed',
      careerPathway: quest.career_pathway || null,
    });
    if (result) setShared(true);
  };

  // ---- Mobile detection ----
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---- Fetch quest data ----
  useEffect(() => {
    const fetchQuest = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('quests')
        .select(`
          *,
          quest_stages(*),
          quest_students(student_id, students(*)),
          career_simulations(*),
          reflection_entries(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message || 'Failed to load project.');
        setLoading(false);
        return;
      }

      setQuest(data);
      const sorted = [...(data.quest_stages || [])].sort((a, b) => a.stage_number - b.stage_number);
      setStages(sorted);
      setReflections([...(data.reflection_entries || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      // Auto-open the first active stage so the user knows where to start
      const firstActive = sorted.find((s) => s.status === 'active');
      if (firstActive) setActiveCard(firstActive.id);

      // Load student submissions for this quest
      const { data: subs } = await supabase.rpc('get_stage_submissions', { p_quest_id: id });
      const subsMap = {};
      (subs || []).forEach((s) => {
        if (!subsMap[s.stage_id]) subsMap[s.stage_id] = [];
        subsMap[s.stage_id].push(s);
      });
      setStageSubmissions(subsMap);

      setLoading(false);
    };

    if (id) fetchQuest();
  }, [id]);

  // Load landmarks for treasure map
  useEffect(() => {
    if (quest?.id) {
      landmarksApi.getForQuest(quest.id).then(setMapLandmarks);
    }
  }, [quest?.id]);

  // ---- Mark stage complete ----
  const completeStage = useCallback(async (stageId) => {
    setCompleting(stageId);

    // Mark stage complete
    await supabase.from('quest_stages')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', stageId);

    // Unlock next stage
    const currentIndex = stages.findIndex((s) => s.id === stageId);
    const nextStage = stages[currentIndex + 1];
    if (nextStage) {
      await supabase.from('quest_stages')
        .update({ status: 'active' })
        .eq('id', nextStage.id);
    }

    // Auto-reflection entry
    const completedStage = stages.find((s) => s.id === stageId);
    if (completedStage) {
      await supabase.from('reflection_entries').insert({
        quest_id: id,
        content: `Stage ${completedStage.stage_number} completed — ${completedStage.title}`,
        entry_type: 'auto',
        stage_id: stageId,
      });
    }

    // Check if all stages done
    const allComplete = stages.every((s) => s.id === stageId || s.status === 'completed');
    if (allComplete) {
      await supabase.from('quests').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', id);
      setQuest((q) => ({ ...q, status: 'completed', completed_at: new Date().toISOString() }));
    }

    // Refresh stages
    const { data: updatedStages } = await supabase.from('quest_stages')
      .select('*').eq('quest_id', id).order('stage_number');
    setStages(updatedStages || []);

    // Refresh reflections
    const { data: updatedReflections } = await supabase.from('reflection_entries')
      .select('*').eq('quest_id', id).order('created_at');
    setReflections(updatedReflections || []);

    // Refresh submissions
    const { data: subs } = await supabase.rpc('get_stage_submissions', { p_quest_id: id });
    const subsMap = {};
    (subs || []).forEach((s) => {
      if (!subsMap[s.stage_id]) subsMap[s.stage_id] = [];
      subsMap[s.stage_id].push(s);
    });
    setStageSubmissions(subsMap);

    setCompleting(null);
    setActiveCard(null);

    // Confetti
    setConfettiNode(stageId);
    setTimeout(() => setConfettiNode(null), 700);
  }, [id, stages]);

  // ---- Add reflection ----
  const addReflection = useCallback(async (content) => {
    await supabase.from('reflection_entries').insert({
      quest_id: id,
      content,
      entry_type: 'student',
    });
    const { data } = await supabase.from('reflection_entries')
      .select('*').eq('quest_id', id).order('created_at');
    setReflections(data || []);
  }, [id]);

  // ---- Node click ----
  const handleNodeClick = useCallback((stageId) => {
    setActiveCard((prev) => (prev === stageId ? null : stageId));
  }, []);

  // ---- Simulation navigation ----
  const simId = quest?.career_simulations?.[0]?.id || id;
  const handleEnterSim = useCallback(() => {
    navigate(`/simulation/${simId}`);
  }, [navigate, simId]);

  // ---- Active stage ----
  const activeStage = activeCard ? stages.find((s) => s.id === activeCard) : null;
  const simulation = quest?.career_simulations?.[0] || null;

  // ---- Render: loading ----
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
        {/* TopBar skeleton */}
        <header style={{ height: 56, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
          <div className="skeleton-el" style={{ width: 120, height: 20, borderRadius: 4, background: 'var(--parchment)' }} />
        </header>
        <QuestSkeleton />
      </div>
    );
  }

  // ---- Render: error ----
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <AlertCircle size={48} color="var(--specimen-red)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--ink)', marginBottom: 8 }}>Project Not Found</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--graphite)', marginBottom: 24 }}>{error}</p>
        <Link to="/dashboard" style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--lab-blue)', textDecoration: 'none' }}>
          ← Return to Dashboard
        </Link>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <header style={{
        height: 56, background: 'var(--chalk)',
        borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            <WayfinderLogoIcon size={20} color="var(--ink)" />
            Wayfinder
          </Link>
          <span style={{ color: 'var(--pencil)', fontSize: 14 }}>/</span>
          <Link to="/dashboard" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', textDecoration: 'none' }}>
            Dashboard
          </Link>
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {quest?.title || 'Quest'}
          </h1>
        </div>

        {/* Share with students button */}
        <button
          onClick={copyStudentLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: shareCopied ? '1.5px solid var(--field-green)' : '1.5px solid var(--compass-gold)',
            background: shareCopied ? 'rgba(45,106,79,0.08)' : 'rgba(184,134,11,0.10)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: shareCopied ? 'var(--field-green)' : 'var(--compass-gold)',
            cursor: 'pointer', flexShrink: 0, transition: 'all 150ms',
          }}
        >
          <Share2 size={14} />
          {shareCopied ? 'Link Copied!' : 'Share with Learners'}
        </button>

        {quest?.status === 'completed' && (
          <button onClick={handleShareToCommunity} disabled={shared} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 8, border: '1px solid var(--pencil)',
            background: shared ? 'rgba(75,139,59,0.06)' : 'var(--chalk)',
            color: shared ? 'var(--field-green)' : 'var(--ink)',
            fontSize: 11, fontWeight: 600, cursor: shared ? 'default' : 'pointer',
            fontFamily: 'var(--font-body)',
          }}>
            <Share2 size={13} /> {shared ? 'Shared!' : 'Share to Community'}
          </button>
        )}

        {/* Stages toggle — mobile only */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6,
              border: `1px solid ${sidebarOpen ? 'var(--compass-gold)' : 'var(--pencil)'}`,
              background: sidebarOpen ? 'rgba(184,134,11,0.08)' : 'transparent',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              color: sidebarOpen ? 'var(--compass-gold)' : 'var(--ink)',
              cursor: 'pointer', flexShrink: 0, transition: 'all 150ms',
            }}
          >
            <List size={14} />
            Stages
          </button>
        )}

        <button
          onClick={() => setPlaybookOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6,
            border: `1px solid ${playbookOpen ? 'var(--lab-blue)' : 'var(--pencil)'}`,
            background: playbookOpen ? 'rgba(59,130,246,0.08)' : 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: playbookOpen ? 'var(--lab-blue)' : 'var(--ink)',
            cursor: 'pointer', flexShrink: 0, transition: 'all 150ms',
          }}
        >
          <Calendar size={14} />
          Playbook
        </button>

        <button
          onClick={() => setJournalOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6,
            border: '1px solid var(--pencil)', background: 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: 'var(--ink)', cursor: 'pointer', flexShrink: 0,
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--parchment)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <BookOpen size={14} />
          Field Notes
          {reflections.filter((r) => r.entry_type === 'student').length > 0 && (
            <span style={{ background: 'var(--compass-gold)', color: 'var(--chalk)', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)' }}>
              {reflections.filter((r) => r.entry_type === 'student').length}
            </span>
          )}
        </button>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--lab-blue)', background: 'rgba(27,73,101,0.08)',
          padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          Guide View
        </span>

        {profile && (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lab-blue)', color: 'var(--chalk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', userSelect: 'none', flexShrink: 0 }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : getInitials(profile.full_name)
            }
          </div>
        )}
      </header>

      {/* QUEST HEADER */}
      <div style={{ background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)', padding: '24px 28px 28px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {quest?.subtitle && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--lab-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {quest.subtitle}
            </div>
          )}
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--ink)', margin: '0 0 8px' }}>
            {quest?.title}
          </h2>
          {quest?.narrative_hook && (
            <div style={{
              background: 'var(--parchment)', borderRadius: 10,
              padding: '16px 20px', borderLeft: '3px solid var(--compass-gold)',
              maxWidth: 640,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.7, margin: 0, flex: 1 }}>
                  {quest.narrative_hook}
                </p>
                <SpeakButton text={`${quest.title}. ${quest.narrative_hook}`} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Scrollable content column */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Trail Map — full width above stage card */}
            <div style={{ width: '100%' }}>
              <TreasureMap
                stages={stages}
                landmarks={mapLandmarks}
                activeCard={activeCard}
                onNodeClick={handleNodeClick}
              />
            </div>

            {/* Card column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Quest completion banner */}
              {quest?.status === 'completed' && (
                <div style={{
                  background: 'linear-gradient(135deg, var(--field-green) 0%, #1a5c3a 100%)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  color: 'var(--chalk)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <CheckCircle size={22} color="var(--chalk)" strokeWidth={2.5} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>Project Complete!</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: '0 0 14px' }}>
                    Every stage finished. Your work is logged and ready for review.
                  </p>
                  <Link
                    to="/dashboard"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
                      borderRadius: 6, padding: '7px 16px',
                      fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
                      color: 'var(--chalk)', textDecoration: 'none',
                    }}
                  >
                    <ChevronLeft size={14} />
                    Back to Dashboard
                  </Link>
                </div>
              )}

              {/* Active stage card */}
              {activeStage && (
                <StageCard
                  stage={activeStage}
                  onComplete={completeStage}
                  completing={completing}
                  onNavigateToSim={handleEnterSim}
                  submissions={stageSubmissions[activeStage.id] || []}
                />
              )}

              {/* Simulation card — entry or debrief */}
              {simulation && (
                simulation.status === 'completed' && simulation.debrief_summary ? (
                  <div style={{
                    background: 'var(--parchment)', border: '1px solid var(--pencil)',
                    borderRadius: 12, padding: '20px 24px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Zap size={15} color="var(--compass-gold)" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Simulation Debrief
                      </span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--field-green)', background: 'rgba(45,106,79,0.1)', border: '1px solid rgba(45,106,79,0.25)', borderRadius: 100, padding: '2px 8px', fontWeight: 600 }}>
                        Completed
                      </span>
                    </div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--ink)', margin: '0 0 8px' }}>
                      {simulation.scenario_title || simulation.title || 'Career Simulation'}
                    </h4>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--graphite)', lineHeight: 1.65, margin: '0 0 12px' }}>
                      {simulation.debrief_summary}
                    </p>
                    <button
                      onClick={handleEnterSim}
                      style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Review full transcript →
                    </button>
                  </div>
                ) : (
                  <SimulationEntryCard simulation={simulation} onEnter={handleEnterSim} />
                )
              )}

              {/* Empty state when no stages */}
              {stages.length === 0 && !loading && (
                <div style={{
                  background: 'var(--parchment)', border: '1px dashed var(--pencil)',
                  borderRadius: 12, padding: '24px 20px', textAlign: 'center',
                }}>
                  <AlertCircle size={28} color="var(--pencil)" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', lineHeight: 1.6, margin: 0 }}>
                    This quest has no stages yet. This can happen if the quest was created before the stage-save was finalized. Try creating a new quest to see all stages.
                  </p>
                </div>
              )}

              {/* Hint when nothing selected */}
              {stages.length > 0 && !activeStage && quest?.status !== 'completed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--pencil)', paddingTop: 16 }}>
                  <ChevronRight size={14} />
                  Select a stage on the map to get started
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Progress sidebar — inline on desktop, overlay on mobile */}
        {(!isMobile || sidebarOpen) && (
          <ProgressSidebar
            stages={stages}
            quest={quest}
            reflections={reflections}
            isOverlay={isMobile}
            onClose={() => setSidebarOpen(false)}
            questId={id}
          />
        )}

        {/* Mobile sidebar backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
              zIndex: 199,
            }}
          />
        )}
      </div>

      {/* Reflection journal slide-over */}
      {journalOpen && (
        <ReflectionJournal
          reflections={reflections}
          onAdd={addReflection}
          onClose={() => setJournalOpen(false)}
        />
      )}

      {/* Guide Playbook slide-over */}
      {playbookOpen && (
        <>
          <div onClick={() => setPlaybookOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 199 }} />
          <GuidePlaybookPanel questId={id} quest={quest} stages={stages} onClose={() => setPlaybookOpen(false)} />
        </>
      )}
    </div>
  );
}
