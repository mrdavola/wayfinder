import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, UserPlus, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { setStudentSession } from '../../lib/studentSession';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

export default function StudentSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = account, 2 = classroom code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2
  const [classCode, setClassCode] = useState('');

  async function handleCreateAccount(e) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpErr) throw signUpErr;
      if (!data.user) throw new Error('Account creation failed. Please try again.');

      // Update profile role to student
      await supabase.from('profiles').update({ role: 'student', full_name: fullName.trim() }).eq('id', data.user.id);

      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinClassroom(e) {
    e.preventDefault();
    if (!classCode.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcErr } = await supabase.rpc('join_classroom', {
        p_classroom_code: classCode.trim().toUpperCase(),
      });
      if (rpcErr) throw rpcErr;
      if (!data?.success) throw new Error(data?.error || 'Could not join classroom');

      // Set the student session so they're auto-logged in
      setStudentSession({
        studentId: data.student_id,
        studentName: data.student_name,
      });

      navigate('/student', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to join classroom');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipCode() {
    // Student created account but will join classroom later
    navigate('/student', { replace: true });
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
        @keyframes ss-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ss-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .ss-input:focus { border-color: var(--field-green) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(45,106,79,0.15) !important; }
        .ss-btn:hover:not(:disabled) { opacity: 0.88; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, animation: 'ss-fade 300ms ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <WayfinderLogoIcon size={32} color="var(--field-green)" />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 10 }}>
            Wayfinder
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', marginTop: 4 }}>
            Create your student account
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                borderColor: step >= s ? 'var(--field-green)' : 'var(--pencil)',
                background: step > s ? 'var(--field-green)' : step === s ? 'rgba(45,106,79,0.1)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                color: step >= s ? 'var(--field-green)' : 'var(--graphite)',
                transition: 'all 200ms ease',
              }}>
                {s}
              </div>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: step === s ? 'var(--ink)' : 'var(--graphite)', fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? 'Create account' : 'Join classroom'}
              </span>
              {s < 2 && <ChevronRight size={14} color="var(--pencil)" />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 16, padding: '28px', boxShadow: '0 4px 24px rgba(26,26,46,0.07)' }}>

          {/* ── STEP 1: Account details ── */}
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--ink)', marginBottom: 6 }}>
                Set up your account
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', marginBottom: 24, lineHeight: 1.5 }}>
                Use the same name your guide uses for you.
              </p>

              <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Your full name
                  </label>
                  <input
                    className="input ss-input"
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(''); }}
                    autoFocus
                    style={{ width: '100%', fontSize: 15 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Email address
                  </label>
                  <input
                    className="input ss-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Password
                  </label>
                  <input
                    className="input ss-input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    style={{ width: '100%' }}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#FDECEA', borderRadius: 8, border: '1px solid #FBBCB8' }}>
                    <AlertCircle size={14} color="var(--specimen-red)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--specimen-red)', lineHeight: 1.4 }}>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !fullName.trim() || !email.trim() || password.length < 6}
                  className="ss-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                    background: 'var(--field-green)', color: 'var(--chalk)',
                    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                    cursor: loading || !fullName.trim() || !email.trim() || password.length < 6 ? 'not-allowed' : 'pointer',
                    opacity: loading || !fullName.trim() || !email.trim() || password.length < 6 ? 0.6 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  {loading
                    ? <Loader2 size={17} style={{ animation: 'ss-spin 1s linear infinite' }} />
                    : <><UserPlus size={17} /> Create account</>
                  }
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Classroom code ── */}
          {step === 2 && (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: 'var(--ink)', marginBottom: 6 }}>
                Join your classroom
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', marginBottom: 24, lineHeight: 1.5 }}>
                Enter the classroom code your guide shared with you. It looks like <strong>ABC-XYZ</strong>.
              </p>

              <form onSubmit={handleJoinClassroom} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                    Classroom code
                  </label>
                  <input
                    className="input ss-input"
                    type="text"
                    placeholder="e.g. ABC-XYZ"
                    value={classCode}
                    onChange={(e) => { setClassCode(e.target.value.toUpperCase()); setError(''); }}
                    autoFocus
                    autoComplete="off"
                    maxLength={7}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 20, letterSpacing: '0.15em', textAlign: 'center' }}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: '#FDECEA', borderRadius: 8, border: '1px solid #FBBCB8' }}>
                    <AlertCircle size={14} color="var(--specimen-red)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--specimen-red)', lineHeight: 1.4 }}>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || classCode.replace('-', '').length < 6}
                  className="ss-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                    background: 'var(--field-green)', color: 'var(--chalk)',
                    fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                    cursor: loading || classCode.replace('-', '').length < 6 ? 'not-allowed' : 'pointer',
                    opacity: loading || classCode.replace('-', '').length < 6 ? 0.6 : 1,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  {loading
                    ? <Loader2 size={17} style={{ animation: 'ss-spin 1s linear infinite' }} />
                    : 'Join Classroom'
                  }
                </button>

                <button
                  type="button"
                  onClick={handleSkipCode}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)', cursor: 'pointer', padding: '4px', textDecoration: 'underline' }}
                >
                  I don't have a code yet — skip for now
                </button>
              </form>
            </>
          )}
        </div>

        {/* Bottom links */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
            Already have an account?{' '}
          </span>
          <Link to="/student/login" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--lab-blue)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Link to="/login" style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)', textDecoration: 'none' }}>
            Are you a guide? Sign in here →
          </Link>
        </div>
      </div>
    </div>
  );
}
