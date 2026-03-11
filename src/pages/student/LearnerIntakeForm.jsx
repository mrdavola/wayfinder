import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ChevronLeft, ArrowRight, Sparkles } from 'lucide-react';
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
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', labBlue: '#1B4965', compassGold: '#B8860B',
  specimenRed: '#C0392B',
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

    // Navigate to Camp
    navigate('/student');
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
    return (
      <div style={{
        minHeight: '100vh',
        background: T.ink,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px',
      }}>
        <style>{`
          @keyframes lif-pulse-glow {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
          }
          @keyframes lif-drift {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(-120px) rotate(180deg); opacity: 0; }
          }
        `}</style>

        {/* Floating particles */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 6, height: 6, borderRadius: '50%',
                background: T.fieldGreen,
                left: `${20 + i * 18}%`,
                bottom: 0,
                animation: `lif-drift ${2.5 + i * 0.4}s ease-in-out ${i * 0.5}s infinite`,
              }}
            />
          ))}
          <Sparkles
            size={48}
            color={T.fieldGreen}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'lif-pulse-glow 2s ease-in-out infinite',
            }}
          />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 26,
          color: T.chalk, marginBottom: 8, textAlign: 'center',
        }}>
          Building your world...
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: T.pencil, textAlign: 'center',
        }}>
          This will only take a moment
        </p>
      </div>
    );
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
          background: `${T.specimenRed}10`, border: `1px solid ${T.specimenRed}30`,
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
        .lif-input:focus { border-color: var(--field-green) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(45,106,79,0.12) !important; }
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
        background: T.chalk, borderRadius: 16,
        border: `1px solid ${T.parchment}`,
        boxShadow: '0 4px 24px rgba(26,26,46,0.06)',
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
                border: `2px solid ${avatarEmoji === emoji ? T.fieldGreen : T.parchment}`,
                background: avatarEmoji === emoji ? `${T.fieldGreen}14` : T.chalk,
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
                border: `2px solid ${selected ? T.fieldGreen : T.parchment}`,
                background: selected ? T.fieldGreen : T.chalk,
                color: selected ? T.chalk : T.ink,
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
  borderRadius: 10, border: `1.5px solid ${T.pencil}`,
  fontSize: 15, fontFamily: 'var(--font-body)', color: T.ink,
  background: T.chalk, outline: 'none', transition: 'border-color 150ms',
};

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '14px 28px', borderRadius: 12,
  background: T.fieldGreen, color: T.chalk,
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
