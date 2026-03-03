import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowRight, LogIn } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { setStudentSession, getStudentSession } from '../../lib/studentSession';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('return') || '/student';

  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect
  useEffect(() => {
    const session = getStudentSession();
    if (session?.studentId) {
      navigate(returnTo, { replace: true });
    }
  }, [navigate, returnTo]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcErr } = await supabase.rpc('student_login', {
        p_name: name.trim(),
        p_pin: pin.trim(),
      });

      if (rpcErr) throw rpcErr;

      if (!data) {
        setError("We couldn't find a match. Check your name and code, then try again.");
        setLoading(false);
        return;
      }

      setStudentSession({
        studentId: data.id,
        studentName: data.name,
      });

      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--paper)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <style>{`
        @keyframes sl-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sl-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .sl-input:focus { border-color: var(--compass-gold) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(184,134,11,0.15) !important; }
        .sl-btn:hover:not(:disabled) { opacity: 0.88; }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 420,
        animation: 'sl-fade 300ms ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <WayfinderLogoIcon size={36} color="var(--compass-gold)" style={{ display: 'block', margin: '0 auto' }} />
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 26,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            marginTop: 10,
          }}>
            Wayfinder
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--graphite)',
            marginTop: 6,
          }}>
            Student sign-in
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--chalk)',
          border: '1px solid var(--pencil)',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 4px 24px rgba(26,26,46,0.07)',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--ink)',
            marginBottom: 6,
            letterSpacing: '-0.01em',
          }}>
            Welcome back!
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--graphite)',
            marginBottom: 28,
            lineHeight: 1.5,
          }}>
            Enter your name and the 4-digit code your guide gave you.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Name */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 6,
              }}>
                Your name
              </label>
              <input
                className="input sl-input"
                type="text"
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                autoFocus
                autoComplete="off"
                style={{ width: '100%', fontSize: 16 }}
              />
            </div>

            {/* PIN */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 6,
              }}>
                Your 4-digit code
              </label>
              <input
                className="input sl-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="e.g. 4821"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                  setError('');
                }}
                style={{
                  width: '100%',
                  fontSize: 22,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 14px',
                background: '#FDECEA',
                borderRadius: 8,
                border: '1px solid #FBBCB8',
              }}>
                <AlertCircle size={15} color="var(--specimen-red)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--specimen-red)', lineHeight: 1.4 }}>
                  {error}
                </span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !name.trim() || pin.length < 4}
              className="sl-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                padding: '13px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--compass-gold)',
                color: 'var(--chalk)',
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading || !name.trim() || pin.length < 4 ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() || pin.length < 4 ? 0.6 : 1,
                transition: 'opacity 150ms ease',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? (
                <Loader2 size={17} style={{ animation: 'sl-spin 1s linear infinite' }} />
              ) : (
                <>
                  <LogIn size={17} />
                  Enter Wayfinder
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help text */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--graphite)',
          marginTop: 20,
          lineHeight: 1.6,
        }}>
          Don't have a code yet? Ask your guide — they'll find it in the Students page.
        </p>

        {/* Sign up link */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
            New student?{' '}
          </span>
          <Link to="/student/signup" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--field-green)', textDecoration: 'none', fontWeight: 600 }}>
            Create an account
          </Link>
        </div>

        {/* Guide login link */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Link
            to="/login"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--graphite)',
              textDecoration: 'none',
            }}
          >
            Are you a guide? Sign in here →
          </Link>
        </div>
      </div>
    </div>
  );
}
