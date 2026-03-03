import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, School, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// Decorative quest map SVG
function QuestMapIllustration() {
  return (
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Parchment background */}
      <rect x="20" y="20" width="280" height="280" rx="12" fill="var(--parchment)" stroke="var(--pencil)" strokeWidth="1" />

      {/* Grid lines */}
      {[60, 100, 140, 180, 220, 260].map((y) => (
        <line key={`h${y}`} x1="30" y1={y} x2="290" y2={y} stroke="var(--pencil)" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}
      {[60, 100, 140, 180, 220, 260].map((x) => (
        <line key={`v${x}`} x1={x} y1="30" x2={x} y2="290" stroke="var(--pencil)" strokeWidth="0.5" strokeDasharray="4 4" />
      ))}

      {/* Path connecting nodes */}
      <path
        d="M 80 240 C 100 200, 120 180, 140 160 C 160 140, 180 130, 200 110 C 220 90, 230 80, 240 70"
        stroke="var(--lab-blue)"
        strokeWidth="2"
        strokeDasharray="6 4"
        fill="none"
        opacity="0.5"
      />

      {/* Node 1 — Start */}
      <circle cx="80" cy="240" r="14" fill="var(--field-green)" opacity="0.9" />
      <text x="80" y="244" textAnchor="middle" fill="white" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">1</text>

      {/* Node 2 */}
      <circle cx="140" cy="160" r="12" fill="var(--lab-blue)" opacity="0.85" />
      <text x="140" y="164" textAnchor="middle" fill="white" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">2</text>

      {/* Node 3 */}
      <circle cx="200" cy="110" r="12" fill="var(--compass-gold)" opacity="0.85" />
      <text x="200" y="114" textAnchor="middle" fill="white" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">3</text>

      {/* Node 4 — End */}
      <circle cx="240" cy="70" r="14" fill="var(--specimen-red)" opacity="0.8" />
      <text x="240" y="74" textAnchor="middle" fill="white" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">4</text>

      {/* Compass rose in corner */}
      <g transform="translate(260, 250)">
        <circle cx="0" cy="0" r="22" fill="var(--chalk)" stroke="var(--pencil)" strokeWidth="1" />
        <path d="M0 -16 L3 -4 L0 -2 L-3 -4 Z" fill="var(--specimen-red)" />
        <path d="M0 16 L3 4 L0 2 L-3 4 Z" fill="var(--graphite)" opacity="0.4" />
        <path d="M-16 0 L-4 -3 L-2 0 L-4 3 Z" fill="var(--graphite)" opacity="0.4" />
        <path d="M16 0 L4 -3 L2 0 L4 3 Z" fill="var(--graphite)" opacity="0.4" />
        <circle cx="0" cy="0" r="2" fill="var(--ink)" />
        <text x="0" y="-24" textAnchor="middle" fill="var(--graphite)" fontSize="7" fontFamily="var(--font-mono)">N</text>
      </g>

      {/* Legend */}
      <rect x="30" y="30" width="80" height="22" rx="4" fill="var(--chalk)" stroke="var(--pencil)" strokeWidth="0.5" />
      <text x="38" y="45" fill="var(--graphite)" fontSize="8" fontFamily="var(--font-mono)">QUEST MAP</text>

      {/* Small dots along path */}
      {[[95, 220], [110, 200], [125, 178]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--lab-blue)" opacity="0.3" />
      ))}
      {[[158, 138], [175, 122], [190, 113]].map(([x, y], i) => (
        <circle key={i + 3} cx={x} cy={y} r="3" fill="var(--compass-gold)" opacity="0.3" />
      ))}
    </svg>
  );
}

// Step progress indicator
function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: i < current
              ? 'var(--field-green)'
              : i === current
                ? 'var(--ink)'
                : 'var(--pencil)',
            transition: 'all 300ms ease',
          }}
        />
      ))}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: 'var(--graphite)',
        marginLeft: '8px',
      }}>
        Step {current + 1} of {total}
      </span>
    </div>
  );
}

const ROLE_OPTIONS = [
  {
    value: 'guide',
    label: 'Guide',
    description: 'I work directly with students, designing their learning journeys.',
    icon: User,
  },
  {
    value: 'school_leader',
    label: 'School Leader',
    description: 'I oversee curriculum and support guides across the school.',
    icon: School,
  },
];

const STANDARDS_OPTIONS = [
  { value: 'common_core', label: 'Common Core' },
  { value: 'ngss', label: 'NGSS' },
  { value: 'custom', label: 'Custom / Other' },
];

const GRADE_BANDS = [
  { value: 'K-2', label: 'K–2' },
  { value: '3-5', label: '3–5' },
  { value: '6-8', label: '6–8' },
  { value: '9-12', label: '9–12' },
];

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name?.split(' ')[0]
    || 'there';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 state
  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || ''
  );
  const [role, setRole] = useState('guide');

  // Step 2 state
  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState('');
  const [standards, setStandards] = useState('common_core');
  const [gradeBands, setGradeBands] = useState([]);

  const toggleGradeBand = (value) => {
    setGradeBands((prev) =>
      prev.includes(value) ? prev.filter((b) => b !== value) : [...prev, value]
    );
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setError('');
    setStep(1);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setError('Please enter your school name.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (!user?.id) throw new Error('Not signed in. Please refresh and try again.');

      // 1. Create school record
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: schoolName.trim(),
          location: location.trim() || null,
          standards_framework: standards,
          grade_bands: gradeBands,
        })
        .select()
        .single();

      if (schoolError) throw schoolError;

      // 2. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          role,
          school_id: schoolData.id,
          onboarding_complete: true,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Refresh profile in context then navigate
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      display: 'flex',
      fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        .role-card { cursor: pointer; transition: all 150ms ease; }
        .role-card:hover { border-color: var(--lab-blue) !important; }
        .grade-chip { cursor: pointer; transition: all 150ms ease; user-select: none; }
        .grade-chip:hover { border-color: var(--lab-blue) !important; }
        @media (max-width: 900px) {
          .onboarding-illustration { display: none !important; }
          .onboarding-form-col { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      {/* Form column */}
      <div
        className="onboarding-form-col"
        style={{
          flex: 1,
          maxWidth: '600px',
          padding: '48px 48px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Wordmark */}
        <div style={{ marginBottom: '48px' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            color: 'var(--ink)',
          }}>
            Wayfinder
          </span>
        </div>

        {/* Progress */}
        <StepIndicator current={step} total={2} />

        {/* Step 1 */}
        {step === 0 && (
          <form onSubmit={handleStep1Next} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                color: 'var(--ink)',
                margin: '0 0 8px',
                lineHeight: 1.2,
              }}>
                Welcome to Wayfinder, {firstName}!
              </h2>
              <p style={{ color: 'var(--graphite)', margin: 0, fontSize: 'var(--text-sm)' }}>
                Let's set up your account. This takes less than two minutes.
              </p>
            </div>

            {/* Full name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="fullName" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                className="input"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            {/* Role selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Your role
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ROLE_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                  <label
                    key={value}
                    className="role-card"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '8px',
                      border: role === value
                        ? '2px solid var(--lab-blue)'
                        : '2px solid var(--pencil)',
                      background: role === value ? 'rgba(27, 73, 101, 0.04)' : 'var(--chalk)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => setRole(value)}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: role === value ? 'var(--lab-blue)' : 'var(--parchment)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 150ms ease',
                    }}>
                      <Icon size={18} color={role === value ? 'white' : 'var(--graphite)'} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)', margin: '0 0 4px' }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--graphite)', margin: 0, lineHeight: 1.4 }}>
                        {description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(192, 57, 43, 0.08)',
                border: '1px solid rgba(192, 57, 43, 0.3)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'var(--specimen-red)',
                fontSize: 'var(--text-sm)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          </form>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <form onSubmit={handleStep2Submit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                color: 'var(--ink)',
                margin: '0 0 8px',
                lineHeight: 1.2,
              }}>
                Set up your school
              </h2>
              <p style={{ color: 'var(--graphite)', margin: 0, fontSize: 'var(--text-sm)' }}>
                We'll use this to tailor curriculum suggestions and quest templates.
              </p>
            </div>

            {/* School name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="schoolName" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>
                School name
              </label>
              <input
                id="schoolName"
                type="text"
                className="input"
                placeholder="e.g. Lakeside Learning Community"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Location */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="location" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>
                Location{' '}
                <span style={{ fontWeight: 400, color: 'var(--graphite)' }}>(optional)</span>
              </label>
              <input
                id="location"
                type="text"
                className="input"
                placeholder="e.g. Austin, TX"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Standards framework */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="standards" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>
                Standards framework
              </label>
              <select
                id="standards"
                className="input"
                value={standards}
                onChange={(e) => setStandards(e.target.value)}
                style={{ cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                {STANDARDS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Grade bands */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Grade band focus{' '}
                <span style={{ fontWeight: 400, color: 'var(--graphite)' }}>(select all that apply)</span>
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {GRADE_BANDS.map(({ value, label }) => {
                  const selected = gradeBands.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      className="grade-chip"
                      onClick={() => toggleGradeBand(value)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '100px',
                        border: selected ? '2px solid var(--lab-blue)' : '2px solid var(--pencil)',
                        background: selected ? 'var(--lab-blue)' : 'var(--chalk)',
                        color: selected ? 'white' : 'var(--ink)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(192, 57, 43, 0.08)',
                border: '1px solid rgba(192, 57, 43, 0.3)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'var(--specimen-red)',
                fontSize: 'var(--text-sm)',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setStep(0); setError(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ animation: 'onboardSpin 0.8s linear infinite' }} aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    Launch Wayfinder
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
              <style>{`@keyframes onboardSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </form>
        )}
      </div>

      {/* Illustration column */}
      <div
        className="onboarding-illustration"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--parchment)',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(154,163,175,0.06) 23px, rgba(154,163,175,0.06) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(154,163,175,0.06) 23px, rgba(154,163,175,0.06) 24px)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <QuestMapIllustration />

          <div style={{ textAlign: 'center', maxWidth: '280px' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              color: 'var(--ink)',
              margin: '0 0 8px',
            }}>
              Every learner has a path.
            </p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--graphite)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              Wayfinder helps you map it — turning curiosity into structured, meaningful quests.
            </p>
          </div>

          {/* Step label */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--pencil)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {step === 0 ? 'Your profile' : 'Your school'}
          </div>
        </div>
      </div>
    </div>
  );
}
