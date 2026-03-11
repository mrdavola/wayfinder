// DEPRECATED: Replaced by CampHub.jsx as of 2026-03-10 World Engine redesign
// Keeping for rollback. Remove after World Engine is stable.

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle, Clock, ChevronRight,
  LogOut, Loader2, AlertCircle, Lock, Sparkles, Plus, X, Sliders, GitBranch,
  ShoppingBag, Trophy, Flame,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { explorerLog, skills as skillsApi, explorations as explorationsApi, xp, tokens, inventory, leaderboard } from '../../lib/api';
import ExplorerRankBadge from '../../components/xp/ExplorerRankBadge';
import XPBar from '../../components/xp/XPBar';
import { STBadge } from '../../components/xp/STBadge';
import { generateExploration } from '../../lib/explorationPipeline';
import { getStudentSession, clearStudentSession } from '../../lib/studentSession';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

const PATHWAY_COLORS = {
  biology: '#2D6A4F',
  material_science: '#1B4965',
  healthcare: '#C0392B',
  engineering: '#7C3AED',
  technology: '#0369A1',
  math: '#B8860B',
  writing: '#92400E',
  default: '#6B7280',
};

function pathwayColor(pathway) {
  return PATHWAY_COLORS[pathway] || PATHWAY_COLORS.default;
}

const PROFICIENCY_LABELS = [
  { value: 'emerging', label: 'Just starting' },
  { value: 'developing', label: 'Getting better' },
  { value: 'proficient', label: 'Pretty good' },
  { value: 'advanced', label: 'Really strong' },
];

function SkillEditorModal({ studentId, onClose, onExploreSkill }) {
  const [catalog, setCatalog] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      // Get student grade band
      const { data: student } = await supabase.from('students').select('grade_band').eq('id', studentId).single();
      // Load catalog + existing ratings in parallel
      const [catalogRes, existingRes] = await Promise.all([
        skillsApi.listCatalog(student?.grade_band || null),
        supabase.from('student_skills').select('skill_id, proficiency').eq('student_id', studentId),
      ]);
      setCatalog(catalogRes.data || []);
      const map = {};
      (existingRes.data || []).forEach(r => { map[r.skill_id] = r.proficiency; });
      setRatings(map);
      setLoading(false);
    })();
  }, [studentId]);

  async function handleSave() {
    setSaving(true);
    const entries = Object.entries(ratings).map(([skillId, proficiency]) => ({
      studentId, skillId, proficiency, source: 'self',
    }));
    if (entries.length > 0) {
      await skillsApi.bulkUpsert(entries);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => onClose(), 800);
  }

  const categories = [
    { key: 'core', label: 'Core Skills', description: 'Academic foundations' },
    { key: 'soft', label: 'People Skills', description: 'How you work with others' },
    { key: 'interest', label: 'Interest Skills', description: 'Things you can get better at' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(26,26,46,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--chalk)', borderRadius: 16, width: '100%',
        maxWidth: 560, maxHeight: '85vh', overflow: 'auto',
        padding: '28px 24px', position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, background: 'none',
          border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 4,
        }}>
          <X size={18} />
        </button>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
          Update My Skills
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', marginBottom: 20 }}>
          Rate how you feel about each skill — be honest, there's no wrong answer!
        </p>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'sh-spin 1s linear infinite' }} />
          </div>
        ) : (
          <>
            {categories.map(cat => {
              const catSkills = catalog.filter(s => s.category === cat.key);
              if (catSkills.length === 0) return null;
              return (
                <div key={cat.key} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                    {cat.label}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--pencil)', fontFamily: 'var(--font-body)', marginBottom: 10 }}>
                    {cat.description}
                  </p>
                  {catSkills.map(skill => (
                    <div key={skill.id} style={{ marginBottom: 10, padding: '10px 14px', background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--parchment)' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                        {skill.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {PROFICIENCY_LABELS.map(p => {
                          const selected = ratings[skill.id] === p.value;
                          return (
                            <button
                              key={p.value}
                              onClick={() => setRatings(prev => ({ ...prev, [skill.id]: p.value }))}
                              style={{
                                padding: '5px 12px', borderRadius: 8,
                                border: `1.5px solid ${selected ? '#2D6A4F' : 'var(--pencil)'}`,
                                background: selected ? 'rgba(45,106,79,0.07)' : 'var(--chalk)',
                                color: selected ? '#2D6A4F' : 'var(--graphite)',
                                fontSize: 12, fontWeight: selected ? 600 : 400,
                                fontFamily: 'var(--font-body)', cursor: 'pointer',
                                transition: 'all 150ms',
                              }}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                        {onExploreSkill && (
                          <button
                            onClick={() => onExploreSkill(skill.name)}
                            style={{
                              fontSize: 11, color: '#2D6A4F', background: 'none',
                              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                              fontWeight: 600, padding: '4px 6px', borderRadius: 4,
                              marginLeft: 2, transition: 'all 150ms',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(45,106,79,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                          >
                            Explore &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: saved ? '#2D6A4F' : 'var(--ink)', color: 'var(--chalk)',
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
                cursor: saving || saved ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 200ms',
              }}
            >
              {saving ? (
                <><Loader2 size={15} style={{ animation: 'sh-spin 1s linear infinite' }} /> Saving…</>
              ) : saved ? (
                <><CheckCircle size={15} /> Saved!</>
              ) : (
                'Save My Ratings'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const EXPLORE_LOADING_MESSAGES = [
  'Designing your learning tree...',
  'Finding the best videos...',
  'Building challenges...',
  'Gathering resources...',
  'Almost there...',
];

function ExploreModal({ studentId, onClose, onCreated, prefilledSkill }) {
  const [skillInput, setSkillInput] = useState(prefilledSkill || '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(EXPLORE_LOADING_MESSAGES[0]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!generating) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % EXPLORE_LOADING_MESSAGES.length;
      setLoadingMsg(EXPLORE_LOADING_MESSAGES[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

  async function handleGenerate() {
    if (!skillInput.trim()) return;
    setGenerating(true);
    setError('');
    setLoadingMsg(EXPLORE_LOADING_MESSAGES[0]);
    try {
      const { data: student } = await supabase.from('students')
        .select('age, grade_band, interests').eq('id', studentId).single();
      const explorationId = await generateExploration({
        studentId,
        skillName: skillInput.trim(),
        level: student?.grade_band || 'middle',
        studentAge: student?.age || null,
        studentInterests: student?.interests || [],
      });
      if (onCreated) onCreated();
      navigate(`/student/explore/${explorationId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setGenerating(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(26,26,46,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget && !generating) onClose(); }}>
      <div style={{
        background: 'var(--chalk)', borderRadius: 16, width: '100%',
        maxWidth: 480, padding: '28px 24px', position: 'relative',
      }}>
        {!generating && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, background: 'none',
            border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 4,
          }}>
            <X size={18} />
          </button>
        )}

        {generating ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(45,106,79,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <Loader2 size={24} color="#2D6A4F" style={{ animation: 'sh-spin 1s linear infinite' }} />
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              {loadingMsg}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
              Building your "{skillInput}" exploration
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GitBranch size={18} color="#2D6A4F" />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)' }}>
                Explore a Skill
              </h2>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', marginBottom: 20 }}>
              Pick any skill and we'll create a learning tree with videos, reading, and challenges.
            </p>

            <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
              What skill do you want to explore?
            </label>
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              placeholder="e.g., Game Design, Creative Writing, Fractions..."
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--pencil)', background: 'var(--paper)',
                fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--ink)',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2D6A4F'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--pencil)'; }}
            />

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 14px', background: '#FDECEA', borderRadius: 8, border: '1px solid #FBBCB8' }}>
                <AlertCircle size={14} color="var(--specimen-red)" />
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--specimen-red)', flex: 1 }}>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!skillInput.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: skillInput.trim() ? '#2D6A4F' : 'var(--pencil)',
                color: 'var(--chalk)', fontSize: 14, fontWeight: 700,
                fontFamily: 'var(--font-body)', cursor: skillInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 16, transition: 'all 200ms',
              }}
            >
              <GitBranch size={15} />
              Build My Learning Tree
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function QuestCard({ quest, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const total = Number(quest.total_stages) || 0;
  const done = Number(quest.stages_completed) || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = quest.status === 'completed';
  const isSelfCreated = quest.career_pathway === 'self_directed';
  const color = isSelfCreated ? '#B8860B' : pathwayColor(quest.career_pathway);

  return (
    <div style={{
      background: 'var(--chalk)',
      border: '1px solid var(--pencil)',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 150ms ease',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,26,46,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: color }} />

      <div style={{ padding: '20px 20px 16px', flex: 1 }}>
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {isSelfCreated ? (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--compass-gold)', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Sparkles size={11} /> My Project
            </span>
          ) : quest.career_pathway && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color,
              textTransform: 'uppercase',
            }}>
              {quest.career_pathway.replace(/_/g, ' ')}
            </span>
          )}
          {isComplete ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--field-green)', fontWeight: 600 }}>
              <CheckCircle size={12} />
              Completed
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)' }}>
              <Clock size={12} />
              {quest.total_duration_days}d project
            </span>
          )}
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: 6,
          lineHeight: 1.2,
        }}>
          {quest.title}
        </h2>

        {quest.subtitle && (
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--graphite)',
            lineHeight: 1.5,
            marginBottom: 14,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {quest.subtitle}
          </p>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)' }}>
                {done}/{total} stages
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--parchment)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: isComplete ? 'var(--field-green)' : color,
                borderRadius: 3,
                transition: 'width 600ms ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Enter button + delete */}
      <div style={{ padding: '0 20px 16px' }}>
        {confirmDelete ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--specimen-red)', fontWeight: 600, marginBottom: 8 }}>
              Delete this project? This can't be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8,
                  border: '1px solid var(--pencil)', background: 'transparent',
                  fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  await supabase.from('quest_stages').delete().eq('quest_id', quest.id);
                  await supabase.from('quest_students').delete().eq('quest_id', quest.id);
                  await supabase.from('career_simulations').delete().eq('quest_id', quest.id);
                  await supabase.from('quests').delete().eq('id', quest.id);
                  if (onDelete) onDelete(quest.id);
                }}
                disabled={deleting}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                  background: 'var(--specimen-red)', color: 'var(--chalk)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                  cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {deleting ? <><Loader2 size={12} style={{ animation: 'sh-spin 1s linear infinite' }} /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              to={`/q/${quest.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                flex: 1,
                padding: '10px',
                borderRadius: 8,
                background: isComplete ? 'var(--parchment)' : color,
                color: isComplete ? 'var(--graphite)' : 'var(--chalk)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'opacity 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {isComplete ? 'View Project' : 'Continue Project'}
              <ChevronRight size={15} />
            </Link>
            {isSelfCreated && onDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete project"
                style={{
                  padding: '10px', borderRadius: 8,
                  border: '1px solid var(--pencil)', background: 'transparent',
                  color: 'var(--graphite)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--specimen-red)'; e.currentTarget.style.color = 'var(--specimen-red)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--pencil)'; e.currentTarget.style.color = 'var(--graphite)'; }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function StudentHome() {
  const navigate = useNavigate();
  const session = getStudentSession();

  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logEntries, setLogEntries] = useState([]);
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [prefilledSkill, setPrefilledSkill] = useState('');
  const [studentExplorations, setStudentExplorations] = useState([]);
  const [xpData, setXpData] = useState(null);
  const [stBalance, setStBalance] = useState(0);
  const [activeItems, setActiveItems] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  // PIN-only auth: redirect if no session
  useEffect(() => {
    if (!session?.studentId) {
      navigate('/student/login', { replace: true });
    }
  }, []);

  useEffect(() => {
    if (session?.studentId) loadQuests();
  }, []);

  async function loadQuests() {
    const studentId = session?.studentId;
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_student_quests', {
        p_student_id: studentId,
      });
      if (rpcErr) throw rpcErr;
      setQuests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  // Load explorer log for the student's school
  useEffect(() => {
    if (!session?.studentId) return;
    (async () => {
      const { data: student } = await supabase.from('students').select('school_id').eq('id', session.studentId).single();
      if (student?.school_id) {
        explorerLog.getForSchool(student.school_id, 20).then(setLogEntries);
      }
    })();
  }, [session?.studentId]);

  // Load skill explorations
  useEffect(() => {
    if (!session?.studentId) return;
    (async () => {
      const { data } = await explorationsApi.listForStudent(session.studentId);
      setStudentExplorations(data || []);
    })();
  }, [session?.studentId]);

  // Load gamification data
  useEffect(() => {
    if (!session?.studentId) return;
    const studentId = session.studentId;

    xp.getStudentXP(studentId).then(setXpData).catch(console.error);
    tokens.getBalance(studentId).then(d => setStBalance(d.balance)).catch(console.error);
    inventory.getActiveItems(studentId).then(setActiveItems).catch(console.error);

    (async () => {
      const { data: student } = await supabase.from('students').select('school_id').eq('id', studentId).single();
      if (student?.school_id) {
        leaderboard.getWeekly(student.school_id).then(setLeaderboardData).catch(console.error);
        supabase.from('schools').select('enable_leaderboard').eq('id', student.school_id).single()
          .then(({ data }) => {
            if (data) setShowLeaderboard(data.enable_leaderboard !== false);
          }).catch(console.error);
      }
    })();
  }, [session?.studentId]);

  async function handleSignOut() {
    clearStudentSession();
    await supabase.auth.signOut();
    navigate('/student/login', { replace: true });
  }

  const displayName = session?.studentName || '...';

  const active = quests.filter((q) => q.status === 'active');
  const completed = quests.filter((q) => q.status === 'completed');
  const guideActive = active.filter(q => q.career_pathway !== 'self_directed');
  const myActive = active.filter(q => q.career_pathway === 'self_directed');
  const guideCompleted = completed.filter(q => q.career_pathway !== 'self_directed');
  const myCompleted = completed.filter(q => q.career_pathway === 'self_directed');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes sh-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sh-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* Top bar */}
      <header style={{
        background: 'var(--chalk)',
        borderBottom: '1px solid var(--pencil)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WayfinderLogoIcon size={20} color="var(--ink)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Wayfinder
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--compass-gold)', background: 'rgba(184,134,11,0.1)',
            padding: '3px 8px', borderRadius: 4,
          }}>
            Learner View
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>
            Hi, <strong style={{ color: 'var(--ink)' }}>{displayName}</strong>
          </span>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--pencil)',
              borderRadius: 6, padding: '5px 10px',
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--graphite)', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--parchment)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--graphite)'; }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '32px 24px 48px', animation: 'sh-fade 300ms ease' }}>

        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>
            Your Projects
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)' }}>
            Pick up where you left off or explore what's next.
          </p>
        </div>

        {/* Explorer Profile Card */}
        {xpData && (
          <div style={{
            background: 'var(--paper)', border: '1.5px solid var(--pencil)',
            borderRadius: 16, padding: 20, marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {activeItems.find(i => i.reward_items?.category === 'companion') && (
                <span style={{ fontSize: '1.5rem' }}>
                  {activeItems.find(i => i.reward_items?.category === 'companion').reward_items.icon}
                </span>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <ExplorerRankBadge rank={xpData.current_rank} size="sm" />
                  <STBadge balance={stBalance} size="sm" />
                  {xpData.current_streak > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontSize: '0.75rem', color: 'var(--specimen-red)', fontWeight: 600,
                    }}>
                      <Flame size={14} /> {xpData.current_streak}d streak
                    </span>
                  )}
                </div>
                {activeItems.find(i => i.reward_items?.category === 'title') && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--graphite)', fontStyle: 'italic', marginTop: 2 }}>
                    {activeItems.find(i => i.reward_items?.category === 'title').reward_items.name}
                  </div>
                )}
              </div>
            </div>
            <XPBar totalPoints={xpData.total_points} currentRank={xpData.current_rank} />
          </div>
        )}

        {/* Shop + Collection buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/student/shop')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ShoppingBag size={16} /> Explorer Shop
          </button>
          <button onClick={() => navigate('/student/collection')} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Trophy size={16} /> My Collection
          </button>
        </div>

        {/* Create my own project CTA */}
        {!loading && (
          <button
            onClick={() => navigate('/student/project/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '16px 20px', marginBottom: 28,
              background: 'rgba(184,134,11,0.06)', border: '1.5px dashed var(--compass-gold)',
              borderRadius: 12, cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,134,11,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(184,134,11,0.06)'; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(184,134,11,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Plus size={18} color="var(--compass-gold)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Create My Own Project
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
                Choose what you want to learn — AI will design a project just for you
              </div>
            </div>
            <Sparkles size={16} color="var(--compass-gold)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </button>
        )}

        {/* Update My Skills button */}
        {!loading && (
          <button
            onClick={() => setShowSkillEditor(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '14px 20px', marginBottom: 28,
              background: 'rgba(27,73,101,0.04)', border: '1.5px solid rgba(27,73,101,0.2)',
              borderRadius: 12, cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(27,73,101,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(27,73,101,0.04)'; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(27,73,101,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Sliders size={18} color="var(--lab-blue)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Update My Skills
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
                Rate how you're doing in each skill area
              </div>
            </div>
            <ChevronRight size={16} color="var(--lab-blue)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </button>
        )}

        {/* Explore a Skill CTA */}
        {!loading && (
          <button
            onClick={() => { setPrefilledSkill(''); setShowExploreModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '16px 20px', marginBottom: 28,
              background: 'rgba(45,106,79,0.06)', border: '1.5px dashed var(--field-green)',
              borderRadius: 12, cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(45,106,79,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(45,106,79,0.06)'; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(45,106,79,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <GitBranch size={18} color="var(--field-green)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Explore a Skill
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>
                Dive deep into any skill with videos, reading, and challenges
              </div>
            </div>
            <GitBranch size={16} color="var(--field-green)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </button>
        )}

        {/* Skill Explorations section */}
        {!loading && studentExplorations.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitBranch size={12} color="var(--field-green)" />
              Skill Explorations
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {studentExplorations.map(exp => {
                const nodes = exp.exploration_nodes || [];
                const totalNodes = nodes.length;
                const completedNodes = nodes.filter(n => n.status === 'completed').length;
                const pct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
                const isComplete = exp.status === 'completed';
                return (
                  <Link
                    key={exp.id}
                    to={`/student/explore/${exp.id}`}
                    style={{
                      background: 'var(--chalk)', border: '1px solid var(--pencil)',
                      borderRadius: 12, padding: '16px 18px', textDecoration: 'none',
                      transition: 'box-shadow 150ms ease', display: 'block',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,26,46,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>
                        {exp.skill_name}
                      </span>
                      {isComplete ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--field-green)', background: 'rgba(45,106,79,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                          COMPLETE
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--graphite)', background: 'var(--parchment)', padding: '2px 8px', borderRadius: 4 }}>
                          IN PROGRESS
                        </span>
                      )}
                    </div>
                    {totalNodes > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)' }}>
                            {completedNodes}/{totalNodes} nodes
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ height: 5, background: 'var(--parchment)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: isComplete ? 'var(--field-green)' : '#2D6A4F',
                            borderRadius: 3, transition: 'width 600ms ease',
                          }} />
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Skill Editor Modal */}
        {showSkillEditor && (
          <SkillEditorModal
            studentId={session?.studentId}
            onClose={() => setShowSkillEditor(false)}
            onExploreSkill={(skillName) => {
              setShowSkillEditor(false);
              setPrefilledSkill(skillName);
              setShowExploreModal(true);
            }}
          />
        )}

        {/* Explore Modal */}
        {showExploreModal && (
          <ExploreModal
            studentId={session?.studentId}
            prefilledSkill={prefilledSkill}
            onClose={() => setShowExploreModal(false)}
            onCreated={() => {
              // Refresh explorations list
              explorationsApi.listForStudent(session.studentId).then(({ data }) => setStudentExplorations(data || []));
            }}
          />
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, justifyContent: 'center' }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'sh-spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>Loading your projects…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#FDECEA', borderRadius: 10, border: '1px solid #FBBCB8', marginBottom: 24 }}>
            <AlertCircle size={16} color="var(--specimen-red)" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--specimen-red)' }}>{error}</span>
          </div>
        )}

        {/* Guide-assigned projects in progress */}
        {!loading && guideActive.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Assigned Projects — In Progress
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {guideActive.map((q) => <QuestCard key={q.id} quest={q} />)}
            </div>
          </div>
        )}

        {/* Self-created projects in progress */}
        {!loading && myActive.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={12} color="var(--compass-gold)" />
              My Projects — In Progress
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {myActive.map((q) => <QuestCard key={q.id} quest={q} onDelete={(qId) => setQuests(prev => prev.filter(p => p.id !== qId))} />)}
            </div>
          </div>
        )}

        {/* Completed projects */}
        {!loading && completed.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Completed
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {completed.map((q) => <QuestCard key={q.id} quest={q} onDelete={q.career_pathway === 'self_directed' ? (qId) => setQuests(prev => prev.filter(p => p.id !== qId)) : undefined} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && quests.length === 0 && !error && (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--chalk)', borderRadius: 16,
            border: '1px solid var(--pencil)',
          }}>
            <Lock size={36} color="var(--pencil)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
              No projects yet
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', maxWidth: 320, margin: '0 auto', marginBottom: 16 }}>
              Your guide hasn't assigned any projects to you yet — or create your own!
            </p>
          </div>
        )}

        {/* Weekly Leaderboard */}
        {showLeaderboard && leaderboardData.length > 0 && (
          <div style={{
            background: 'var(--paper)', border: '1.5px solid var(--pencil)',
            borderRadius: 16, padding: 20, marginBottom: 24,
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', marginBottom: 12 }}>
              This Week's Top Explorers
            </h3>
            {leaderboardData.map((entry, i) => (
              <div key={entry.student_id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                borderBottom: i < leaderboardData.length - 1 ? '1px solid var(--pencil)' : 'none',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem',
                  color: i === 0 ? 'var(--compass-gold)' : 'var(--graphite)', minWidth: 24,
                }}>
                  #{i + 1}
                </span>
                <span style={{ fontSize: '1.25rem' }}>{entry.student_emoji || '\u{1F9ED}'}</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{entry.student_name}</span>
                <ExplorerRankBadge rank={entry.current_rank} size="sm" />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--field-green)' }}>
                  +{entry.ep_this_week} EP
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Explorer Log */}
        {!loading && logEntries.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Explorer Log
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logEntries.slice(0, 10).map(entry => (
                <div key={entry.id} style={{
                  padding: '8px 14px', borderRadius: 8, background: 'var(--parchment)',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>{entry.students?.avatar_emoji || '\u{1F9ED}'}</span>
                  <span>{entry.message}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--pencil)', flexShrink: 0 }}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* "What's next" after completed projects */}
        {!loading && completed.length > 0 && (
          <div style={{
            textAlign: 'center', padding: '24px', marginTop: 8,
            background: 'rgba(184,134,11,0.04)', borderRadius: 12,
            border: '1px solid rgba(184,134,11,0.15)',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', margin: '0 0 12px' }}>
              Finished a project? Keep exploring!
            </p>
            <button
              onClick={() => navigate('/student/project/new')}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: 'var(--compass-gold)', color: 'var(--ink)',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <Sparkles size={14} /> Create My Next Project
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
