import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ChevronLeft, ArrowRight } from 'lucide-react';
import { invites } from '../../lib/api';
import { setStudentSession } from '../../lib/studentSession';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

// ── Constants ────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  '🦊', '🐻', '🦁', '🐼', '🦉', '🐸', '🦋', '🐙',
  '🌻', '🌈', '⭐', '🔥', '🎨', '🎵', '🚀', '⚡',
  '🧩', '🎮', '🏔️', '🌊', '🦜', '🐢', '🌸', '💎',
];

const INTEREST_BUBBLES = [
  'Music', 'Animals', 'Building', 'Space', 'Sports', 'Art',
  'Coding', 'Nature', 'Food', 'Stories', 'Science', 'Games',
];

const T = {
  ink: '#F0F0F0', paper: '#1A1A2E', parchment: 'rgba(255,255,255,0.08)',
  graphite: 'rgba(240,240,240,0.6)', pencil: 'rgba(240,240,240,0.3)', chalk: 'rgba(255,255,255,0.06)',
  fieldGreen: '#2D6A4F', labBlue: '#1B4965', compassGold: '#B8860B',
  specimenRed: '#C0392B',
  cardBg: 'rgba(255,255,255,0.05)', cardBorder: 'rgba(255,255,255,0.1)',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function LearnerIntakeForm() {
  const { code } = useParams();
  const navigate = useNavigate();

  // 0 = "Who are you?", 1 = "What lights you up?"
  const [screen, setScreen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Invite validation
  const [inviteData, setInviteData] = useState(null);

  // Form data
  const [name, setName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [passions, setPassions] = useState('');

  // Validate invite code on mount
  useEffect(() => {
    validateCode();
  }, [code]);

  async function validateCode() {
    setLoading(true);
    setError('');
    const { data } = await invites.validate(code);
    if (!data?.valid) {
      setError(data?.error || 'Invalid invite code');
    } else {
      setInviteData(data);
    }
    setLoading(false);
  }

  function toggleInterest(interest) {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }

  async function handleSubmit() {
    if (selectedInterests.length < 2) {
      setError('Pick at least 2 interests.');
      return;
    }

    setSubmitting(true);
    setError('');

    const { data } = await invites.submitIntake({
      code,
      name: name.trim(),
      interests: selectedInterests,
      passions: passions.trim() ? [passions.trim()] : [],
      avatarEmoji,
      // grade_band comes from the invite — pass null so DB keeps whatever default
      gradeBand: inviteData?.grade_band || null,
    });

    if (!data?.success) {
      setError(data?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    // Set student session
    if (data.student_id) {
      setStudentSession({ studentId: data.student_id, studentName: data.student_name });
    }

    // Jump straight into project creation with their interests
    navigate('/student/project/new?from=intake');
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Loader2 size={28} color={T.fieldGreen} style={{ animation: 'lif-spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 14 }}>
            Checking invite link...
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Invalid invite ─────────────────────────────────────────────────────────

  if (error && !inviteData) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <AlertCircle size={36} color={T.specimenRed} style={{ marginBottom: 12 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, marginBottom: 8 }}>
            Invite Not Found
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, maxWidth: 340, margin: '0 auto' }}>
            {error}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.pencil, marginTop: 16 }}>
            Ask your guide for a new invite link.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Submitting state (atmospheric loading) ─────────────────────────────────

  if (submitting) {
    return <LoadingGame />;
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* Progress dots — 2 screens */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
        {[0, 1].map(i => (
          <div
            key={i}
            style={{
              width: screen === i ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i <= screen ? T.fieldGreen : T.parchment,
              transition: 'all 300ms ease',
            }}
          />
        ))}
      </div>

      {/* Inline error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)',
          borderRadius: 8, marginBottom: 16, fontSize: 13, color: T.specimenRed,
          fontFamily: 'var(--font-body)',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {screen === 0 && (
        <WhoAreYouScreen
          name={name}
          setName={setName}
          avatarEmoji={avatarEmoji}
          setAvatarEmoji={setAvatarEmoji}
          inviteData={inviteData}
          onNext={() => {
            if (!name.trim()) {
              setError('What should we call you?');
              return;
            }
            setError('');
            setScreen(1);
          }}
        />
      )}

      {screen === 1 && (
        <WhatLightsYouUpScreen
          selectedInterests={selectedInterests}
          toggleInterest={toggleInterest}
          passions={passions}
          setPassions={setPassions}
          onBack={() => { setError(''); setScreen(0); }}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}

// ── Loading Mini-Game: Explorer Runner ────────────────────────────────────────

const RUN_W = 340;
const RUN_H = 160;
const GROUND_Y = 120;
const PLAYER_SIZE = 28;
const GRAVITY = 0.45;
const JUMP_VEL = -9;
const OBSTACLES = ['🪨', '🌵', '🔥', '🌊', '⚡'];

function LoadingGame() {
  const [playerY, setPlayerY] = useState(GROUND_Y);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const velRef = useRef(0);
  const jumpingRef = useRef(false);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const frameRef = useRef();
  const nextId = useRef(0);
  const lastSpawn = useRef(0);
  const gameOverRef = useRef(false);
  const playerYRef = useRef(GROUND_Y);

  const jump = useCallback(() => {
    if (gameOverRef.current) {
      // Restart
      gameOverRef.current = false;
      setGameOver(false);
      scoreRef.current = 0;
      setScore(0);
      obstaclesRef.current = [];
      playerYRef.current = GROUND_Y;
      setPlayerY(GROUND_Y);
      velRef.current = 0;
      jumpingRef.current = false;
      return;
    }
    if (!jumpingRef.current) {
      velRef.current = JUMP_VEL;
      jumpingRef.current = true;
    }
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  useEffect(() => {
    let running = true;
    const tick = (now) => {
      if (!running) return;
      if (gameOverRef.current) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Player physics
      velRef.current += GRAVITY;
      playerYRef.current = Math.min(GROUND_Y, playerYRef.current + velRef.current);
      if (playerYRef.current >= GROUND_Y) {
        playerYRef.current = GROUND_Y;
        velRef.current = 0;
        jumpingRef.current = false;
      }
      setPlayerY(playerYRef.current);

      // Spawn obstacles
      if (now - lastSpawn.current > 1400 + Math.random() * 800) {
        obstaclesRef.current.push({
          id: nextId.current++,
          x: RUN_W + 20,
          emoji: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)],
        });
        lastSpawn.current = now;
      }

      // Move obstacles
      obstaclesRef.current = obstaclesRef.current
        .map(o => ({ ...o, x: o.x - 3 }))
        .filter(o => o.x > -30);

      // Collision detection
      const playerX = 50;
      for (const o of obstaclesRef.current) {
        if (
          o.x < playerX + 18 && o.x + 20 > playerX &&
          playerYRef.current > GROUND_Y - 22
        ) {
          gameOverRef.current = true;
          setGameOver(true);
          break;
        }
      }

      // Score
      if (!gameOverRef.current) {
        scoreRef.current += 1;
        if (scoreRef.current % 8 === 0) setScore(Math.floor(scoreRef.current / 8));
      }

      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1A1A2E',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px',
        userSelect: 'none',
      }}
      onClick={jump}
    >
      <style>{`
        @keyframes lif-pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>

      {/* Compass logo */}
      <div style={{ marginBottom: 16, animation: 'lif-pulse-glow 2s ease-in-out infinite' }}>
        <WayfinderLogoIcon size={36} color="#2D6A4F" />
      </div>

      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 24,
        color: '#FFFFFF', marginBottom: 4, textAlign: 'center',
      }}>
        Building your world...
      </h2>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 13,
        color: 'rgba(240,240,240,0.5)', textAlign: 'center', marginBottom: 16,
      }}>
        Tap or press space to jump!
      </p>

      {/* Score */}
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 13,
        color: '#B8860B', marginBottom: 10,
      }}>
        {score} m explored
      </div>

      {/* Game area */}
      <div style={{
        position: 'relative',
        width: RUN_W, height: RUN_H + 20,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        touchAction: 'manipulation',
      }}>
        {/* Ground line */}
        <div style={{
          position: 'absolute', bottom: RUN_H - GROUND_Y - 6,
          left: 0, right: 0, height: 1,
          background: 'rgba(255,255,255,0.1)',
        }} />

        {/* Ground dots */}
        {[...Array(20)].map((_, i) => (
          <div key={`g${i}`} style={{
            position: 'absolute',
            bottom: RUN_H - GROUND_Y - 8 - Math.random() * 4,
            left: `${(i * 5.2) % 100}%`,
            width: 1, height: 1, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
        ))}

        {/* Player */}
        <div style={{
          position: 'absolute',
          left: 50,
          top: playerY - PLAYER_SIZE + 8,
          fontSize: PLAYER_SIZE,
          lineHeight: 1,
          transition: jumpingRef.current ? 'none' : 'top 0.05s',
        }}>
          🧭
        </div>

        {/* Obstacles */}
        {obstaclesRef.current.map(o => (
          <div key={o.id} style={{
            position: 'absolute',
            left: o.x,
            top: GROUND_Y - 18,
            fontSize: 22,
            lineHeight: 1,
          }}>
            {o.emoji}
          </div>
        ))}

        {/* Game over overlay */}
        {gameOver && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,26,46,0.85)',
          }}>
            <p style={{
              fontSize: 16, fontFamily: 'var(--font-display)',
              color: '#FFFFFF', marginBottom: 4,
            }}>
              {score} meters!
            </p>
            <p style={{
              fontSize: 12, color: 'rgba(240,240,240,0.5)',
              fontFamily: 'var(--font-body)',
            }}>
              Tap to try again
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Shell ───────────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.paper,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '32px 20px 64px',
    }}>
      <style>{`
        @keyframes lif-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lif-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .lif-input:focus { border-color: ${T.fieldGreen} !important; outline: none !important; box-shadow: 0 0 0 3px rgba(45,106,79,0.2) !important; }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <WayfinderLogoIcon size={28} color={T.fieldGreen} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.ink, marginTop: 4 }}>
          Wayfinder
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 520,
        background: T.cardBg, borderRadius: 16,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        padding: '32px 28px',
        animation: 'lif-fade 300ms ease',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Screen 1: Who are you? ───────────────────────────────────────────────────

function WhoAreYouScreen({ name, setName, avatarEmoji, setAvatarEmoji, inviteData, onNext }) {
  const canProceed = name.trim().length > 0;

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 28, color: T.ink,
        marginBottom: 6, textAlign: 'center',
      }}>
        Who are you?
      </h1>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 15, color: T.graphite,
        marginBottom: 28, lineHeight: 1.6, textAlign: 'center',
      }}>
        {inviteData?.guide_name
          ? `${inviteData.guide_name} invited you.`
          : "Your guide invited you."
        } Let's get you set up.
      </p>

      {/* Name input */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>
          What's your first name?
        </label>
        <input
          className="lif-input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          style={inputStyle}
          onKeyDown={e => { if (e.key === 'Enter' && canProceed) onNext(); }}
        />
      </div>

      {/* Avatar picker */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Pick an avatar</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 8,
        }}>
          {AVATAR_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setAvatarEmoji(emoji)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 12,
                border: `2px solid ${avatarEmoji === emoji ? T.fieldGreen : T.cardBorder}`,
                background: avatarEmoji === emoji ? `${T.fieldGreen}30` : T.cardBg,
                fontSize: 22, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
                transform: avatarEmoji === emoji ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        style={{
          ...btnPrimary,
          width: '100%',
          justifyContent: 'center',
          opacity: canProceed ? 1 : 0.4,
          cursor: canProceed ? 'pointer' : 'default',
        }}
      >
        Next <ArrowRight size={18} />
      </button>
    </div>
  );
}

// ── Screen 2: What lights you up? ────────────────────────────────────────────

function WhatLightsYouUpScreen({ selectedInterests, toggleInterest, passions, setPassions, onBack, onSubmit }) {
  const canSubmit = selectedInterests.length >= 2;

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 28, color: T.ink,
        marginBottom: 6, textAlign: 'center',
      }}>
        What lights you up?
      </h1>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 15, color: T.graphite,
        marginBottom: 28, lineHeight: 1.6, textAlign: 'center',
      }}>
        Pick at least 2 things you're into. There are no wrong answers!
      </p>

      {/* Interest bubbles */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
        justifyContent: 'center', marginBottom: 28,
      }}>
        {INTEREST_BUBBLES.map(interest => {
          const selected = selectedInterests.includes(interest);
          return (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              style={{
                padding: '10px 20px',
                borderRadius: 24,
                border: `2px solid ${selected ? T.fieldGreen : T.cardBorder}`,
                background: selected ? T.fieldGreen : T.cardBg,
                color: selected ? '#FFFFFF' : T.ink,
                fontSize: 15,
                fontWeight: selected ? 600 : 400,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                transition: 'all 180ms ease',
                transform: selected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {interest}
            </button>
          );
        })}
      </div>

      {/* Count indicator */}
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 13, color: T.pencil,
        textAlign: 'center', marginBottom: 20,
      }}>
        {selectedInterests.length === 0
          ? 'Tap to select'
          : selectedInterests.length === 1
            ? '1 picked — choose at least 1 more'
            : `${selectedInterests.length} picked`
        }
      </p>

      {/* Curiosity textarea */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>
          What's something you're curious about right now?
        </label>
        <textarea
          className="lif-input"
          placeholder="e.g. How do rockets land themselves? Can dogs understand words? What's inside a volcano?"
          value={passions}
          onChange={e => setPassions(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <button onClick={onBack} style={btnSecondary}>
          <ChevronLeft size={15} /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          style={{
            ...btnPrimary,
            flex: 1,
            justifyContent: 'center',
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          Let's go <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 14, fontWeight: 600, color: T.ink,
  fontFamily: 'var(--font-body)', marginBottom: 8,
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '12px 16px',
  borderRadius: 10, border: `1.5px solid ${T.cardBorder}`,
  fontSize: 15, fontFamily: 'var(--font-body)', color: T.ink,
  background: T.cardBg, outline: 'none', transition: 'border-color 150ms',
};

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '14px 28px', borderRadius: 12,
  background: T.fieldGreen, color: '#FFFFFF',
  fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-body)',
  border: 'none', cursor: 'pointer', transition: 'opacity 150ms',
};

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '14px 18px', borderRadius: 12,
  background: 'transparent', color: T.graphite,
  fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
  border: `1.5px solid ${T.pencil}`, cursor: 'pointer', transition: 'all 150ms',
};
