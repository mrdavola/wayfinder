import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
    </svg>
  );
}


function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ animation: 'signupSpin 0.8s linear infinite', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const BENEFITS = [
  'Turn student interests into structured quests',
  'Connect learning to real career pathways',
  'AI-powered curriculum generation in minutes',
];

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setGoogleLoading(false);
    }
    // On success: browser redirects to Google
  };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await signUp({ email, password, fullName });

    if (signUpError) {
      setError(signUpError.message || 'Something went wrong. Please try again.');
      setLoading(false);
    } else {
      navigate('/onboarding', { replace: true });
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes signupSpin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .signup-left { display: none !important; }
          .signup-left-mobile { display: flex !important; }
          .signup-right { width: 100% !important; padding: 32px 24px !important; }
        }
        @media (min-width: 769px) {
          .signup-left-mobile { display: none !important; }
        }
      `}</style>

      {/* Left panel — desktop */}
      <div
        className="signup-left"
        style={{
          width: '50%',
          background: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ maxWidth: '360px', width: '100%' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              color: 'var(--paper)',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Wayfinder
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--pencil)',
              fontSize: 'var(--text-base)',
              marginTop: '8px',
            }}>
              Find your way forward.
            </p>
          </div>

          <div style={{ marginBottom: '40px', opacity: 0.9 }}>
            <WayfinderLogoIcon size={80} color="var(--compass-gold)" />
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {BENEFITS.map((benefit) => (
              <li key={benefit} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(184, 134, 11, 0.2)',
                  border: '1px solid rgba(184, 134, 11, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <Check size={11} color="var(--compass-gold)" strokeWidth={2.5} />
                </span>
                <span style={{ color: 'var(--paper)', fontSize: 'var(--text-sm)', lineHeight: 1.5, opacity: 0.9 }}>
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--graphite)',
            letterSpacing: '0.04em',
          }}>
            For learner-driven schools
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="signup-right"
        style={{
          width: '50%',
          background: 'var(--chalk)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 40px',
          overflowY: 'auto',
        }}
      >
        {/* Mobile top bar */}
        <div
          className="signup-left-mobile"
          style={{
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--ink)',
            width: 'calc(100% + 48px)',
            marginLeft: '-24px',
            marginRight: '-24px',
            marginTop: '-32px',
            marginBottom: '32px',
            padding: '20px 24px',
            height: '80px',
            justifyContent: 'center',
          }}
        >
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--paper)',
            margin: 0,
          }}>
            Wayfinder
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--pencil)',
            fontSize: 'var(--text-xs)',
            margin: 0,
          }}>
            Find your way forward.
          </p>
        </div>

        {/* Form card */}
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              color: 'var(--ink)',
              lineHeight: 1.2,
              margin: '0 0 8px',
            }}>
              Create your account
            </h2>
            <p style={{ color: 'var(--graphite)', fontSize: 'var(--text-sm)', margin: 0 }}>
              Join thousands of guides in learner-driven schools
            </p>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px 24px',
              background: 'var(--chalk)',
              border: '1px solid #dadce0',
              borderRadius: '8px',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              opacity: googleLoading ? 0.7 : 1,
              marginBottom: '20px',
              transition: 'box-shadow 150ms ease',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--pencil)' }} />
            <span style={{ color: 'var(--pencil)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>or sign up with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--pencil)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="fullName" style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--ink)',
              }}>
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
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--ink)',
              }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label htmlFor="password" style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}>
                  Password
                </label>
                <span
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'default' }}
                  onMouseEnter={() => setShowPasswordHint(true)}
                  onMouseLeave={() => setShowPasswordHint(false)}
                  onFocus={() => setShowPasswordHint(true)}
                  onBlur={() => setShowPasswordHint(false)}
                  tabIndex={0}
                >
                  <Info size={13} color="var(--pencil)" />
                  {showPasswordHint && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: 0,
                      marginBottom: '6px',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'var(--font-mono)',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}>
                      8+ characters
                    </div>
                  )}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--graphite)',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Inline strength indicator */}
              {password.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: '3px',
                        flex: 1,
                        borderRadius: '2px',
                        background: password.length >= (i + 1) * 3
                          ? password.length >= 8
                            ? 'var(--field-green)'
                            : 'var(--compass-gold)'
                          : 'var(--pencil)',
                        transition: 'background 200ms ease',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="confirmPassword" style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--ink)',
              }}>
                Confirm password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className="input"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    paddingRight: '44px',
                    borderColor: confirmPassword.length > 0 && password !== confirmPassword
                      ? 'var(--specimen-red)'
                      : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--graphite)',
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background: 'rgba(192, 57, 43, 0.08)',
                border: '1px solid rgba(192, 57, 43, 0.3)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'var(--specimen-red)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 24px',
                fontSize: 'var(--text-base)',
                marginTop: '4px',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Spinner />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign in link */}
          <p style={{
            textAlign: 'center',
            color: 'var(--graphite)',
            fontSize: 'var(--text-sm)',
            margin: '0 0 16px',
          }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--lab-blue)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
