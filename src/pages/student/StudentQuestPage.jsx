import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, BookOpen, Search, Wrench, FlaskConical, Mic,
  Megaphone, X, Send, Zap, ArrowRight, Loader2, AlertCircle,
  Volume2, VolumeX, ChevronRight, Star, Lock, MessageCircle,
  Paperclip, Video, Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ai } from '../../lib/api';
import { getStudentSession, setStudentSession } from '../../lib/studentSession';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

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
    .sq-confetti-piece { animation: sq-confetti 700ms ease forwards; }
    .sq-journal-input:focus { border-color: var(--compass-gold) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(184,134,11,0.12) !important; }
    .sq-name-input:focus { border-color: var(--compass-gold) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(184,134,11,0.15) !important; }
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

// ===================== WEB SPEECH TTS =====================
function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((text) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    // Prefer a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Moira') || v.name.includes('Google US English')
    ) || voices.find(v => v.lang === 'en-US') || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, stop, speaking, supported };
}

function SpeakButton({ text, size = 'sm' }) {
  const { speak, stop, speaking, supported } = useSpeech();
  if (!supported) return null;
  const isSmall = size === 'sm';
  return (
    <button
      onClick={() => speaking ? stop() : speak(text)}
      title={speaking ? 'Stop reading' : 'Read aloud'}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: isSmall ? '4px 8px' : '6px 12px',
        borderRadius: 20,
        border: `1px solid ${speaking ? 'var(--compass-gold)' : 'var(--pencil)'}`,
        background: speaking ? 'rgba(184,134,11,0.08)' : 'transparent',
        color: speaking ? 'var(--compass-gold)' : 'var(--graphite)',
        fontSize: isSmall ? 11 : 12,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms',
        flexShrink: 0,
      }}
    >
      {speaking
        ? <VolumeX size={isSmall ? 12 : 14} />
        : <Volume2 size={isSmall ? 12 : 14} />}
      {speaking ? 'Stop' : 'Listen'}
    </button>
  );
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
  const [selected, setSelected] = useState(null); // { name, id } | null
  const inputRef = useRef(null);

  const handleStart = () => {
    const finalName = selected?.name || name.trim();
    if (!finalName) return;
    onEnter(finalName, selected?.id || null);
  };

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
              Quest
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
                  onClick={() => { setSelected({ name: s.name, id: s.id }); setName(''); }}
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

          {/* Custom name input */}
          {assignedStudents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--pencil)' }} />
              <span style={{ fontSize: 11, color: 'var(--pencil)', fontFamily: 'var(--font-mono)' }}>or type your name</span>
              <div style={{ flex: 1, height: 1, background: 'var(--pencil)' }} />
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSelected(null); setError?.(''); }}
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

          <button
            onClick={handleStart}
            disabled={!selected?.name && !name.trim()}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 10, border: 'none',
              background: (!selected?.name && !name.trim()) ? 'var(--pencil)' : 'var(--compass-gold)',
              color: (!selected?.name && !name.trim()) ? 'var(--graphite)' : 'var(--ink)',
              fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)',
              cursor: (!selected?.name && !name.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 150ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Start Quest <ArrowRight size={16} />
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
              className={!isLocked ? 'sq-node-hover' : ''}
              onClick={() => !isLocked && onNodeClick(stage.id)}
              role={!isLocked ? 'button' : undefined}
              tabIndex={!isLocked ? 0 : undefined}
              onKeyDown={(e) => { if (!isLocked && (e.key === 'Enter' || e.key === ' ')) onNodeClick(stage.id); }}
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

// ===================== SUBMISSION PANEL =====================
function SubmissionPanel({ stageId, questId, studentName, onSubmitComplete, initialText = '' }) {
  const [type, setType] = useState('text');
  const [textContent, setTextContent] = useState(initialText);
  const [recording, setRecording] = useState(false);
  const [mediaBlob, setMediaBlob] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [mediaDuration, setMediaDuration] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, []);

  const canSubmit =
    (type === 'text' && textContent.trim()) ||
    ((type === 'audio' || type === 'video') && (mediaBlob || file)) ||
    (type === 'file' && file);

  const fmtSecs = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sc = (s % 60).toString().padStart(2, '0');
    return `${m}:${sc}`;
  };

  const startRecording = async () => {
    setError('');
    try {
      const constraints = type === 'video' ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
        setMediaBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError('Could not access microphone/camera: ' + (err.message || 'Permission denied'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    setMediaDuration(fmtSecs(seconds));
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

      const { data: result } = await supabase.rpc('submit_stage_work', {
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
      if (result?.error) throw new Error(result.error);

      onSubmitComplete(stageId);
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
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
    setType(k);
    setMediaBlob(null);
    setFile(null);
    setRecording(false);
    clearInterval(timerRef.current);
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
  const typeBadgeColor = {
    text: 'var(--lab-blue)',
    audio: 'var(--field-green)',
    video: 'var(--compass-gold)',
    file: 'var(--graphite)',
  }[submission.submission_type] || 'var(--graphite)';

  return (
    <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Your Submission
        </div>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: typeBadgeColor, background: `${typeBadgeColor}18`, padding: '2px 6px', borderRadius: 4 }}>
          {submission.submission_type}
        </span>
      </div>
      {submission.submission_type === 'text' && submission.content && (
        <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.65, margin: 0, background: 'var(--parchment)', padding: '10px 12px', borderRadius: 6 }}>
          {submission.content}
        </p>
      )}
      {submission.submission_type === 'audio' && submission.file_url && (
        <audio controls src={submission.file_url} style={{ width: '100%' }} />
      )}
      {submission.submission_type === 'video' && submission.file_url && (
        <video controls src={submission.file_url} style={{ width: '100%', borderRadius: 6 }} />
      )}
      {submission.submission_type === 'file' && submission.file_url && (
        <a
          href={submission.file_url}
          download={submission.file_name || 'submission'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--lab-blue)', fontFamily: 'var(--font-body)' }}
        >
          <Download size={13} />
          {submission.file_name || 'Download file'}
        </a>
      )}
    </div>
  );
}

// ===================== STAGE CARD =====================
function StageCard({ stage, onComplete, questId, studentName, existingSubmission }) {
  const isDone = stage.status === 'completed';
  const isActive = stage.status === 'active';

  const [guideOpen, setGuideOpen] = useState(false);
  const [guideMessages, setGuideMessages] = useState([]);
  const [guideInput, setGuideInput] = useState('');
  const [guideSending, setGuideSending] = useState(false);
  const guideBottomRef = useRef(null);

  useEffect(() => {
    guideBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [guideMessages]);

  const handleSendToGuide = async () => {
    const trimmed = guideInput.trim();
    if (!trimmed || guideSending) return;
    setGuideInput('');
    setGuideSending(true);
    const updated = [...guideMessages, { role: 'user', content: trimmed }];
    setGuideMessages(updated);
    const systemPrompt = `You are a Field Guide helping a student explore the learning stage: "${stage.title}". Use Socratic questioning — never give direct answers. Ask 1-2 follow-up questions to help the student think deeper. Keep replies under 3 sentences. Context: ${stage.description || ''}`;
    try {
      const reply = await ai.chat(updated, systemPrompt);
      setGuideMessages([...updated, { role: 'assistant', content: reply }]);
    } catch {
      setGuideMessages([...updated, { role: 'assistant', content: "That's a great observation! What evidence from the stage supports that? What might challenge your thinking?" }]);
    }
    setGuideSending(false);
  };

  const readText = [
    stage.title,
    stage.description || '',
    ...(stage.guiding_questions?.slice(0, 2) || []),
  ].filter(Boolean).join('. ');

  return (
    <div className="sq-card" style={{
      background: 'var(--chalk)', border: '1px solid var(--pencil)',
      borderRadius: 14, padding: '20px 22px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: isDone ? 'var(--field-green)' : 'var(--parchment)',
            border: `2px solid ${isDone ? 'var(--field-green)' : 'var(--compass-gold)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isDone
              ? <CheckCircle size={16} color="var(--chalk)" strokeWidth={2.5} />
              : <StageIcon type={stage.stage_type || stage.type} size={16} color="var(--ink)" />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>
              {stage.title}
            </h3>
          </div>
        </div>
        <SpeakButton text={readText} />
      </div>

      {/* Description */}
      {stage.description && (
        <p style={{ fontSize: 13, color: 'var(--graphite)', lineHeight: 1.7, margin: '0 0 14px' }}>
          {stage.description}
        </p>
      )}

      {/* Guiding questions */}
      {stage.guiding_questions?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Questions to explore
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stage.guiding_questions.map((q, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5 }}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Field Guide chat */}
      {isActive && (
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setGuideOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: 'none',
              color: 'var(--lab-blue)', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer', padding: '4px 0',
              transition: 'opacity 150ms',
            }}
          >
            <MessageCircle size={13} />
            Ask the Field Guide {guideOpen ? '↑' : '↓'}
          </button>
          {guideOpen && (
            <div style={{
              marginTop: 8,
              background: 'rgba(27,73,101,0.04)',
              border: '1px solid rgba(27,73,101,0.15)',
              borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{
                maxHeight: 200, overflowY: 'auto', padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {guideMessages.length === 0 && (
                  <p style={{ fontSize: 11, color: 'var(--graphite)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                    Ask a question — your Field Guide will help you explore, not just answer.
                  </p>
                )}
                {guideMessages.map((msg, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.55 }}>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: msg.role === 'user' ? 'var(--graphite)' : 'var(--lab-blue)', marginBottom: 2 }}>
                      {msg.role === 'user' ? 'You' : 'Field Guide'}
                    </div>
                    <div style={{ color: msg.role === 'user' ? 'var(--ink)' : 'var(--lab-blue)' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {guideSending && (
                  <div style={{ fontSize: 11, color: 'var(--graphite)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Loader2 size={11} className="sq-spin" /> Field Guide is thinking...
                  </div>
                )}
                <div ref={guideBottomRef} />
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid rgba(27,73,101,0.1)' }}>
                <input
                  type="text"
                  value={guideInput}
                  onChange={e => setGuideInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendToGuide()}
                  placeholder="Ask a question..."
                  disabled={guideSending}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 5,
                    border: '1px solid rgba(27,73,101,0.2)',
                    background: 'var(--chalk)', fontSize: 12,
                    fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none',
                  }}
                />
                <button
                  onClick={handleSendToGuide}
                  disabled={guideSending || !guideInput.trim()}
                  style={{
                    padding: '6px 10px', borderRadius: 5, border: 'none',
                    background: guideSending || !guideInput.trim() ? 'var(--parchment)' : 'var(--lab-blue)',
                    color: guideSending || !guideInput.trim() ? 'var(--pencil)' : 'var(--chalk)',
                    cursor: guideSending || !guideInput.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {guideSending ? <Loader2 size={12} className="sq-spin" /> : <Send size={12} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deliverable */}
      {stage.deliverable && (
        <div style={{
          background: 'var(--parchment)', borderRadius: 8,
          padding: '10px 14px', marginBottom: 14,
          borderLeft: '3px solid var(--compass-gold)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
            What to make
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
            {stage.deliverable}
          </p>
        </div>
      )}

      {/* Work submission */}
      {isActive && (
        <SubmissionPanel
          stageId={stage.id}
          questId={questId}
          studentName={studentName}
          onSubmitComplete={onComplete}
        />
      )}

      {/* Read-only submission for completed stages */}
      {isDone && existingSubmission && (
        <SubmissionView submission={existingSubmission} />
      )}
    </div>
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

  // Load quest
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('quests')
        .select(`*, quest_stages(*), quest_students(student_id, students(id, name)), career_simulations(*), reflection_entries(*)`)
        .eq('id', id)
        .single();

      if (err || !data) {
        setError(err?.message || 'Quest not found.');
        setLoading(false);
        return;
      }

      setQuest(data);
      setStages([...(data.quest_stages || [])].sort((a, b) => a.stage_number - b.stage_number));
      setReflections([...(data.reflection_entries || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      const names = (data.quest_students || []).map(qs => qs.students).filter(Boolean);
      setAssignedStudents(names);

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

  const completeStage = useCallback(async (stageId) => {
    await supabase.from('quest_stages').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', stageId);

    const currentIdx = stages.findIndex(s => s.id === stageId);
    const next = stages[currentIdx + 1];
    if (next) await supabase.from('quest_stages').update({ status: 'active' }).eq('id', next.id);

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

    setActiveCard(null);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 800);
  }, [id, stages, studentName, loadSubmissions]);

  const addReflection = useCallback(async (content) => {
    await supabase.from('reflection_entries').insert({ quest_id: id, content, entry_type: 'student' });
    const { data } = await supabase.from('reflection_entries').select('*').eq('quest_id', id).order('created_at');
    setReflections(data || []);
  }, [id]);

  const simulation = quest?.career_simulations?.[0] || null;
  const simId = simulation?.id || id;
  const handleEnterSim = useCallback(() => navigate(`/simulation/${simId}`), [navigate, simId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <WayfinderLogoIcon size={36} color="var(--compass-gold)" />
      <Loader2 size={20} color="var(--graphite)" className="sq-spin" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <AlertCircle size={44} color="var(--specimen-red)" strokeWidth={1.5} style={{ marginBottom: 14 }} />
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>Quest Not Found</h2>
      <p style={{ fontSize: 14, color: 'var(--graphite)' }}>{error}</p>
    </div>
  );

  // Show welcome screen if no name yet
  if (!studentName) return (
    <WelcomeScreen quest={quest} assignedStudents={assignedStudents} onEnter={handleEnter} />
  );

  const activeStage = activeCard ? stages.find(s => s.id === activeCard) : null;
  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <ConfettiBurst active={confetti} />

      {/* Top bar */}
      <header style={{
        height: 54, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', position: 'sticky', top: 0, zIndex: 100,
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WayfinderLogoIcon size={18} color="var(--compass-gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Wayfinder
          </span>
        </div>

        <div style={{ flex: 1, maxWidth: 280 }}>
          <ProgressBar stages={stages} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Who am I indicator */}
          <span style={{ fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
            {studentName}
          </span>
          <button
            onClick={() => setJournalOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 6,
              border: '1px solid var(--pencil)', background: 'transparent',
              fontSize: 12, color: 'var(--ink)', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <BookOpen size={13} />
            Notes
            {reflections.filter(r => r.entry_type === 'student').length > 0 && (
              <span style={{ background: 'var(--compass-gold)', color: 'var(--chalk)', borderRadius: '50%', width: 15, height: 15, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {reflections.filter(r => r.entry_type === 'student').length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Quest header */}
      <div style={{ background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)', padding: '18px 22px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {quest?.subtitle && (
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--lab-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {quest.subtitle}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: quest?.narrative_hook ? 12 : 0 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', margin: 0, lineHeight: 1.25 }}>
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
            <div style={{
              background: 'var(--parchment)', borderRadius: 8,
              padding: '12px 16px', borderLeft: '3px solid var(--compass-gold)',
              maxWidth: 600,
            }}>
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>
                {quest.narrative_hook}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 22px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 36, alignItems: 'flex-start' }}>
            {/* SVG map */}
            <div style={{ flexShrink: 0, width: isMobile ? '100%' : 320 }}>
              {stages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--pencil)', fontSize: 13 }}>
                  No stages yet — check back soon!
                </div>
              ) : (
                <JourneyMap stages={stages} activeCard={activeCard} onNodeClick={handleNodeClick} />
              )}
            </div>

            {/* Stage card + hint */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Completion banner */}
              {quest?.status === 'completed' && (
                <div style={{
                  background: 'linear-gradient(135deg, var(--field-green) 0%, #1a5c3a 100%)',
                  borderRadius: 14, padding: '22px 24px', color: 'var(--chalk)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <CheckCircle size={22} color="var(--chalk)" strokeWidth={2.5} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Quest Complete!</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: 0 }}>
                    Amazing work, {studentName}! You've completed every stage. Your guide can see your progress.
                  </p>
                </div>
              )}

              {activeStage ? (
                <StageCard
                  stage={activeStage}
                  onComplete={completeStage}
                  questId={id}
                  studentName={studentName}
                  existingSubmission={submissions[activeStage.id] || null}
                />
              ) : (
                <div style={{
                  background: 'var(--parchment)', border: '1px dashed var(--pencil)',
                  borderRadius: 12, padding: '24px', textAlign: 'center',
                }}>
                  <ChevronRight size={20} color="var(--pencil)" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: 'var(--graphite)', margin: 0 }}>
                    {stages.length > 0 ? 'Tap a circle on the map to view that stage.' : 'Your guide is setting up the stages — check back soon!'}
                  </p>
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
      </div>

      {/* Field notes panel */}
      {journalOpen && (
        <FieldNotesPanel
          reflections={reflections}
          onAdd={addReflection}
          onClose={() => setJournalOpen(false)}
          studentName={studentName}
        />
      )}
    </div>
  );
}
