import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, LogOut, ChevronRight, Plus, Compass, Loader2, Check, Copy, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { xp, ai } from '../../lib/api';
import { getStudentSession, clearStudentSession } from '../../lib/studentSession';
import ExplorerRankBadge from '../../components/xp/ExplorerRankBadge';

/* ── ember particle animation (injected once) ───────────────────────── */
const EMBER_STYLE_ID = 'camphub-ember-style';

function injectEmberStyles() {
  if (document.getElementById(EMBER_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = EMBER_STYLE_ID;
  style.textContent = `
    @keyframes ember-rise {
      0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
      15%  { opacity: 0.8; }
      50%  { transform: translateY(-35vh) translateX(20px) scale(0.7); opacity: 0.5; }
      100% { transform: translateY(-70vh) translateX(-15px) scale(0.3); opacity: 0; }
    }
    @keyframes ember-sway {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(12px); }
    }
    .camphub-ember {
      position: fixed;
      pointer-events: none;
      font-size: 6px;
      color: #e8933a;
      animation: ember-rise var(--dur) ease-in infinite;
      animation-delay: var(--delay);
      left: var(--x);
      bottom: -10px;
      z-index: 0;
      text-shadow: 0 0 6px rgba(232,147,58,0.6);
    }
  `;
  document.head.appendChild(style);
}

function EmberParticles() {
  useEffect(() => { injectEmberStyles(); }, []);

  const embers = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      dur: `${5 + Math.random() * 6}s`,
    })), []);

  return (
    <>
      {embers.map(e => (
        <span
          key={e.id}
          className="camphub-ember"
          style={{ '--x': e.x, '--delay': e.delay, '--dur': e.dur }}
        >
          {'\u25CF'}
        </span>
      ))}
    </>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function questHref(quest) {
  if (quest._hasBlueprint) return `/world/${quest.id}`;
  return `/q/${quest.id}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const PATHWAY_ACCENTS = {
  biology: '#2D6A4F',
  material_science: '#1B4965',
  healthcare: '#C0392B',
  engineering: '#7C3AED',
  technology: '#0369A1',
  math: '#B8860B',
  writing: '#92400E',
  self_directed: '#B8860B',
};

function accentFor(quest) {
  if (quest._paletteAccent) return quest._paletteAccent;
  return PATHWAY_ACCENTS[quest.career_pathway] || 'var(--compass-gold)';
}

/* ── section components ──────────────────────────────────────────────── */

function JourneyWall({ quests }) {
  if (quests.length === 0) {
    return (
      <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <h2 style={sectionTitle}>Journey Wall</h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14, color: 'rgba(255,220,180,0.4)',
          fontStyle: 'italic', marginTop: 8,
        }}>
          Your journey is just beginning...
        </p>
      </section>
    );
  }

  return (
    <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
      <h2 style={sectionTitle}>Journey Wall</h2>
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,220,180,0.15) transparent',
      }}>
        {quests.map(q => (
          <Link
            key={q.id}
            to={questHref(q)}
            style={{
              flex: '0 0 160px', height: 120, borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,220,180,0.1)',
              borderLeft: `3px solid ${accentFor(q)}`,
              padding: '14px 12px', display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', textDecoration: 'none',
              transition: 'transform 200ms, border-color 200ms',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              color: 'rgba(255,220,180,0.85)',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            }}>
              {q.title}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'rgba(255,220,180,0.35)',
            }}>
              {formatDate(q.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HorizonSection({ quests, navigate }) {
  return (
    <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
      <h2 style={sectionTitle}>The Horizon</h2>

      {quests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {quests.map(q => (
            <div
              key={q.id}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,220,180,0.1)',
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,220,180,0.4)',
                  margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  A new world is calling...
                </p>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: 18,
                  color: 'rgba(255,220,180,0.9)', margin: 0,
                }}>
                  {q.title}
                </p>
              </div>
              <button
                onClick={() => navigate(questHref(q))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--compass-gold)', color: '#1a1510',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                Enter World <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {quests.length === 0 && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'rgba(255,220,180,0.4)', marginBottom: 16,
        }}>
          No assigned projects right now.
        </p>
      )}

      <button
        onClick={() => navigate('/student/project/new')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 8,
          background: 'rgba(255,220,180,0.08)',
          border: '1px dashed rgba(255,220,180,0.2)',
          color: 'rgba(255,220,180,0.7)',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
          cursor: 'pointer', transition: 'background 200ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,220,180,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,220,180,0.08)'; }}
      >
        <Plus size={16} /> Chart your own course
      </button>
    </section>
  );
}

/* ── campfire reflection ──────────────────────────────────────────────── */

function CampfireSection({ completedQuests, studentId }) {
  const [campfireQuest, setCampfireQuest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loadingQ, setLoadingQ] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  /* find a recently-completed quest that hasn't been reflected on */
  useEffect(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const eligible = (completedQuests || []).filter(q => {
      if (!q.completed_at && !q.updated_at) return false;
      const ts = q.completed_at || q.updated_at;
      return ts >= sevenDaysAgo && !localStorage.getItem(`campfire_reflected_${q.id}`);
    });
    if (eligible.length > 0) setCampfireQuest(eligible[0]);
  }, [completedQuests]);

  /* load AI reflection questions when campfireQuest is set */
  const loadQuestions = useCallback(async () => {
    if (!campfireQuest) return;
    setLoadingQ(true);
    try {
      /* fetch stages + submissions for this quest */
      const [stageRes, subRes, profileRes] = await Promise.all([
        supabase.from('quest_stages').select('*').eq('quest_id', campfireQuest.id).order('order_index'),
        supabase.from('quest_submissions').select('*').eq('quest_id', campfireQuest.id).eq('student_id', studentId),
        supabase.from('students').select('name, age, interests, passions, about_me').eq('id', studentId).single(),
      ]);
      const stages = stageRes.data || [];
      const submissions = (subRes.data || []).map(s => ({
        ...s,
        stage_title: stages.find(st => st.id === s.stage_id)?.title || stages.find(st => st.id === s.stage_id)?.location_name || 'Unknown',
      }));
      const profile = profileRes.data || {};

      const qs = await ai.generateCampfireReflection({
        quest: campfireQuest,
        stages,
        submissions,
        studentProfile: profile,
      });
      setQuestions(Array.isArray(qs) ? qs : []);
    } catch (err) {
      console.error('Campfire reflection error:', err);
      setQuestions([
        'What part of this project made you think the hardest?',
        'If you could go back and change one decision, what would it be?',
        'What would you tell someone just starting this project?',
      ]);
    } finally {
      setLoadingQ(false);
    }
  }, [campfireQuest, studentId]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  /* save responses */
  async function handleSubmit() {
    if (!campfireQuest || questions.length === 0) return;
    const unanswered = questions.filter((_, i) => !answers[i]?.trim());
    if (unanswered.length > 0) return;

    setSaving(true);
    try {
      const rows = questions.map((q, i) => ({
        quest_id: campfireQuest.id,
        student_id: studentId,
        entry_type: 'campfire_reflection',
        question: q,
        content: answers[i].trim(),
      }));
      const { error } = await supabase.from('reflection_entries').insert(rows);
      if (error) throw error;
      localStorage.setItem(`campfire_reflected_${campfireQuest.id}`, 'true');
      setDone(true);
    } catch (err) {
      console.error('Campfire save error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!campfireQuest) return null;

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i]?.trim());

  if (done) {
    return (
      <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{
          background: 'rgba(232, 147, 58, 0.08)',
          border: '1px solid rgba(232, 147, 58, 0.25)',
          borderRadius: 14, padding: '28px 24px', textAlign: 'center',
          boxShadow: '0 0 30px rgba(232, 147, 58, 0.08)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔥</div>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 20,
            color: 'var(--compass-gold)', margin: '0 0 6px',
          }}>
            Well reflected, explorer.
          </p>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'rgba(255,220,180,0.5)', margin: 0,
          }}>
            Your thoughts have been added to your journey.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
      <div style={{
        background: 'rgba(232, 147, 58, 0.06)',
        border: '1px solid rgba(232, 147, 58, 0.2)',
        borderRadius: 14, padding: '24px 20px',
        boxShadow: '0 0 40px rgba(232, 147, 58, 0.06)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
            color: 'var(--compass-gold)', margin: 0,
          }}>
            Campfire
          </h2>
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, fontStyle: 'italic',
          color: 'rgba(255,220,180,0.5)', margin: '0 0 18px',
        }}>
          The campfire crackles... sit with your thoughts from <span style={{ color: 'rgba(255,220,180,0.75)', fontStyle: 'normal', fontWeight: 500 }}>{campfireQuest.title}</span>.
        </p>

        {loadingQ ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
            <Loader2 size={16} style={{ color: 'var(--compass-gold)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(255,220,180,0.4)' }}>
              The fire stirs a question...
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questions.map((q, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(232, 147, 58, 0.12)',
                borderRadius: 10, padding: '14px 16px',
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                  color: 'rgba(255,220,180,0.85)', margin: '0 0 10px',
                }}>
                  {q}
                </p>
                <textarea
                  value={answers[i] || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  placeholder="Share what's on your mind..."
                  rows={3}
                  style={{
                    width: '100%', resize: 'vertical',
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(232, 147, 58, 0.1)',
                    borderRadius: 8, padding: '10px 12px',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    color: 'rgba(255,220,180,0.8)', lineHeight: 1.5,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(232, 147, 58, 0.3)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(232, 147, 58, 0.1)'; }}
                />
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: allAnswered ? 'var(--compass-gold)' : 'rgba(255,220,180,0.1)',
                color: allAnswered ? '#1a1510' : 'rgba(255,220,180,0.3)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                cursor: allAnswered ? 'pointer' : 'default',
                transition: 'background 200ms, color 200ms',
                alignSelf: 'flex-end',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : (
                <><Check size={14} /> Share your thoughts</>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveWorldsSection({ quests, navigate }) {
  if (quests.length === 0) return null;

  return (
    <section style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
      <h2 style={sectionTitle}>Active Worlds</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {quests.map(q => {
          const total = Number(q.total_stages) || 0;
          const done = Number(q.stages_completed) || 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const accent = accentFor(q);
          const locationLabel = q._currentLocationName
            ? `Return to ${q._currentLocationName}`
            : 'Continue';

          return (
            <div
              key={q.id}
              onClick={() => navigate(questHref(q))}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,220,180,0.1)',
                borderLeft: `3px solid ${accent}`,
                borderRadius: 12, padding: '16px 20px',
                cursor: 'pointer', transition: 'transform 200ms, background 200ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 18,
                  color: 'rgba(255,220,180,0.9)',
                }}>
                  {q.title}
                </span>
                <ChevronRight size={16} style={{ color: 'rgba(255,220,180,0.4)' }} />
              </div>

              {/* progress bar */}
              <div style={{
                height: 4, borderRadius: 2, background: 'rgba(255,220,180,0.1)',
                overflow: 'hidden', marginBottom: 8,
              }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: accent,
                  width: `${pct}%`, transition: 'width 400ms ease',
                }} />
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'rgba(255,220,180,0.4)',
                }}>
                  {done} / {total} stages
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
                  color: accent, display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {locationLabel} <Compass size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── shared style tokens ─────────────────────────────────────────────── */

const sectionTitle = {
  fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
  color: 'var(--compass-gold)', margin: '0 0 12px', letterSpacing: 0.3,
};

/* ── PIN overlay (first-visit) ───────────────────────────────────────── */

function PinOverlay({ studentName, studentId, onDismiss }) {
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('students')
          .select('pin')
          .eq('id', studentId)
          .single();
        if (data?.pin) setPin(data.pin);
      } catch (err) {
        console.error('Failed to fetch PIN:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  function handleCopy() {
    if (!pin) return;
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDismiss() {
    localStorage.setItem(`wayfinder_seen_pin_${studentId}`, 'true');
    onDismiss();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2d2215 0%, #3a2c1a 100%)',
        border: '1px solid rgba(232, 147, 58, 0.3)',
        borderRadius: 16, padding: '36px 32px', maxWidth: 400, width: '90%',
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(232, 147, 58, 0.08)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400,
          color: 'var(--compass-gold)', margin: '0 0 8px',
        }}>
          Welcome to Camp, {studentName}
        </h2>

        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: 'rgba(255,220,180,0.55)', margin: '0 0 24px',
        }}>
          Your explorer key:
        </p>

        {loading ? (
          <div style={{ padding: '20px 0' }}>
            <Loader2
              size={24}
              style={{ color: 'var(--compass-gold)', animation: 'spin 1s linear infinite' }}
            />
          </div>
        ) : pin ? (
          <>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '2.4rem', fontWeight: 700,
              color: 'rgba(255,220,180,0.95)', letterSpacing: '0.25em',
              margin: '0 0 16px', userSelect: 'all',
            }}>
              {pin}
            </div>

            <button
              onClick={handleCopy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: 'rgba(255,220,180,0.08)',
                color: copied ? 'var(--compass-gold)' : 'rgba(255,220,180,0.5)',
                fontFamily: 'var(--font-body)', fontSize: 13,
                cursor: 'pointer', transition: 'background 200ms, color 200ms',
                marginBottom: 28,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,220,180,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,220,180,0.08)'; }}
            >
              {copied ? <><CheckCheck size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </>
        ) : (
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 13,
            color: 'rgba(255,220,180,0.4)', margin: '0 0 28px',
          }}>
            No PIN found. Ask your guide for help.
          </p>
        )}

        <div>
          <button
            onClick={handleDismiss}
            style={{
              padding: '10px 32px', borderRadius: 8, border: 'none',
              background: 'var(--compass-gold)', color: '#1a1510',
              fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────── */

export default function CampHub() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [xpData, setXpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [showPinOverlay, setShowPinOverlay] = useState(false);

  /* load session + data */
  useEffect(() => {
    const s = getStudentSession();
    if (!s?.studentId) {
      navigate('/student/login', { replace: true });
      return;
    }
    setSession(s);

    /* show PIN overlay on first visit */
    if (!localStorage.getItem(`wayfinder_seen_pin_${s.studentId}`)) {
      setShowPinOverlay(true);
    }

    (async () => {
      setLoading(true);
      try {
        /* fetch quests */
        const { data: questData, error: questErr } = await supabase.rpc('get_student_quests', {
          p_student_id: s.studentId,
        });
        if (questErr) throw questErr;
        const raw = Array.isArray(questData) ? questData : [];

        /* fetch world_blueprint + current location for each quest in one query */
        let blueprintMap = {};
        let locationMap = {};
        if (raw.length > 0) {
          const ids = raw.map(q => q.id);

          const [bpRes, stageRes] = await Promise.all([
            supabase
              .from('quests')
              .select('id, world_blueprint')
              .in('id', ids),
            supabase
              .from('quest_stages')
              .select('quest_id, location_name, status, order_index')
              .in('quest_id', ids)
              .order('order_index', { ascending: true }),
          ]);

          if (bpRes.data) {
            for (const row of bpRes.data) {
              blueprintMap[row.id] = row.world_blueprint;
            }
          }

          /* find current (first non-completed) stage per quest */
          if (stageRes.data) {
            const byQuest = {};
            for (const st of stageRes.data) {
              if (!byQuest[st.quest_id]) byQuest[st.quest_id] = [];
              byQuest[st.quest_id].push(st);
            }
            for (const [qid, stages] of Object.entries(byQuest)) {
              const current = stages.find(s2 => s2.status !== 'completed');
              if (current?.location_name) locationMap[qid] = current.location_name;
            }
          }
        }

        /* enrich quests */
        const enriched = raw.map(q => ({
          ...q,
          _hasBlueprint: !!blueprintMap[q.id],
          _paletteAccent: blueprintMap[q.id]?.palette?.accent || null,
          _currentLocationName: locationMap[q.id] || null,
        }));

        setQuests(enriched);

        /* fetch XP */
        xp.getStudentXP(s.studentId).then(setXpData).catch(console.error);
      } catch (err) {
        console.error('CampHub load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* derive quest buckets */
  const completedQuests = useMemo(
    () => quests.filter(q => q.status === 'completed'),
    [quests],
  );
  const activeWithProgress = useMemo(
    () => quests.filter(q => q.status === 'active' && Number(q.stages_completed) > 0),
    [quests],
  );
  const waitingQuests = useMemo(
    () => quests.filter(q => q.status === 'active' && Number(q.stages_completed) === 0),
    [quests],
  );

  /* sign out */
  function handleSignOut() {
    clearStudentSession();
    navigate('/student/login');
  }

  const displayName = session?.studentName || '';
  const rank = xpData?.rank || 'apprentice';

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1a1510 0%, #2d2215 40%, #1a1510 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <EmberParticles />

      {/* ── PIN overlay (first visit) ────────────────────────────── */}
      {showPinOverlay && session && (
        <PinOverlay
          studentName={displayName}
          studentId={session.studentId}
          onDismiss={() => setShowPinOverlay(false)}
        />
      )}

      {/* ── top bar ──────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem', position: 'relative', zIndex: 10,
      }}>
        {/* left: camp icon + label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={20} style={{ color: 'var(--compass-gold)' }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 18,
            color: 'rgba(255,220,180,0.8)',
          }}>
            Camp
          </span>
        </div>

        {/* center: student name */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
            color: 'rgba(255,220,180,0.85)',
          }}>
            {displayName}
          </span>
        </div>

        {/* right: rank badge + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ExplorerRankBadge rank={rank} size="sm" />
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none',
              color: 'rgba(255,220,180,0.4)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 12,
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* ── main content ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '50vh',
        }}>
          <Loader2
            size={28}
            style={{
              color: 'var(--compass-gold)', animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <main style={{
          maxWidth: 640, margin: '0 auto', paddingTop: '1.5rem', paddingBottom: '3rem',
          position: 'relative', zIndex: 1,
        }}>
          <JourneyWall quests={completedQuests} />
          <CampfireSection completedQuests={completedQuests} studentId={session?.studentId} />
          <HorizonSection quests={waitingQuests} navigate={navigate} />
          <ActiveWorldsSection quests={activeWithProgress} navigate={navigate} />
        </main>
      )}
    </div>
  );
}
