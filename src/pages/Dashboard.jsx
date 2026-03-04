import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  BookOpen,
  Compass,
  Calendar,
  TrendingUp,
  X,
  CheckCircle,
  Zap,
  MapPin,
  MoreHorizontal,
  Link as LinkIcon,
  Archive,
  Trash2,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import TopBar from '../components/layout/TopBar';

// ── Constants ─────────────────────────────────────────────────────────────────

const INTEREST_CHIPS = [
  'Minecraft', 'Animals', 'Space', 'Cooking',
  'Sports', 'Music', 'Building', 'Art', 'Gaming', 'Robotics',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTabColor(pathway) {
  if (pathway === 'material_science') return 'var(--lab-blue)';
  if (pathway === 'biology') return 'var(--field-green)';
  if (pathway === 'healthcare') return 'var(--specimen-red)';
  return 'var(--graphite)';
}

function calcProgress(stages) {
  if (!stages || stages.length === 0) return { pct: 0, done: 0, total: 0 };
  const done = stages.filter((s) => s.status === 'completed').length;
  return { pct: Math.round((done / stages.length) * 100), done, total: stages.length };
}

function getInitials(fullName) {
  if (!fullName) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function getFirstName(fullName) {
  if (!fullName) return 'there';
  return fullName.trim().split(/\s+/)[0];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function stagesCompletedThisWeek(quests) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  let count = 0;
  for (const q of quests) {
    for (const s of q.quest_stages || []) {
      if (s.completed_at && new Date(s.completed_at) >= since) count++;
    }
  }
  return count;
}

function pathwayCounts(quests) {
  const counts = {};
  for (const q of quests) {
    const p = q.career_pathway || 'none';
    counts[p] = (counts[p] || 0) + 1;
  }
  return counts;
}

const PATHWAY_LABELS = {
  material_science: 'Material Science',
  biology: 'Biology',
  healthcare: 'Healthcare',
  none: 'No Pathway',
};

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function QuestSkeleton() {
  return (
    <div
      style={{
        background: 'var(--parchment)',
        border: '1px solid var(--pencil)',
        borderRadius: 8,
        padding: 'var(--space-6)',
        paddingLeft: 'calc(var(--space-6) + 8px)',
        marginBottom: 'var(--space-4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Fake tab */}
      <div
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: 'var(--pencil)',
          borderRadius: '8px 0 0 8px',
        }}
      />
      <PulseLine width="60%" height={16} mb={10} />
      <PulseLine width="90%" height={12} mb={16} />
      <PulseLine width="40%" height={11} mb={12} />
      <div style={{ height: 3, background: 'var(--pencil)', borderRadius: 100, marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <PulseLine width={60} height={20} />
        <PulseLine width={60} height={20} />
      </div>
    </div>
  );
}

function PulseLine({ width, height, mb = 0 }) {
  return (
    <div
      style={{
        width,
        height,
        background: 'var(--pencil)',
        borderRadius: 4,
        marginBottom: mb,
        animation: 'pulse 1.5s ease-in-out infinite',
        opacity: 0.5,
      }}
    />
  );
}

// ── Quest Card ────────────────────────────────────────────────────────────────

function QuestCard({ quest, onArchive, onDelete }) {
  const navigate = useNavigate();
  const { pct, done, total } = calcProgress(quest.quest_stages);
  const tabColor = getTabColor(quest.career_pathway);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const copyStudentLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/q/${quest.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setMenuOpen(false);
  };

  const students = (quest.quest_students || [])
    .map((qs) => qs.students?.name)
    .filter(Boolean);

  const studentLabel = students.length > 0 ? students.join(', ') : 'No students assigned';

  const standards = quest.academic_standards || [];

  const createdDate = quest.created_at
    ? new Date(quest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <div
      className="specimen-card"
      onClick={() => navigate(`/quest/${quest.id}`)}
      style={{
        '--tab-color': tabColor,
        cursor: 'pointer',
        marginBottom: 'var(--space-4)',
        position: 'relative',
      }}
    >
      {/* Title + actions row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 }}>
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--ink)', lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          {quest.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}>
          {quest.status === 'completed' ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--field-green)', background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.25)', borderRadius: 100, padding: '2px 8px', fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle size={10} />Done
            </span>
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--compass-gold)', background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.25)', borderRadius: 100, padding: '2px 8px', fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
              Active
            </span>
          )}
          {/* Copy link indicator */}
          {copied && (
            <span style={{ fontSize: 10, color: 'var(--field-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Copied!</span>
          )}
          {/* More menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, color: 'var(--graphite)', display: 'flex', alignItems: 'center' }}
              aria-label="Project options"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--chalk)', border: '1px solid var(--pencil)',
                  borderRadius: 8, padding: '4px 0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  zIndex: 50, minWidth: 170,
                }}
              >
                <button
                  onClick={copyStudentLink}
                  style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-body)', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--parchment)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Copy size={13} color="var(--graphite)" /> Copy student link
                </button>
                <div style={{ height: 1, background: 'var(--pencil)', margin: '3px 0', opacity: 0.4 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(quest.id); }}
                  style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--graphite)', fontFamily: 'var(--font-body)', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--parchment)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Archive size={13} /> Archive project
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(quest.id, quest.title); }}
                  style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--specimen-red)', fontFamily: 'var(--font-body)', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 size={13} /> Delete project
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtitle */}
      {quest.subtitle && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--graphite)',
            marginBottom: 'var(--space-3)',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {quest.subtitle}
        </p>
      )}

      {/* Students */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <Users size={13} color="var(--graphite)" />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--graphite)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {studentLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)' }}>
            {done}/{total} stages
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)' }}>
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 3,
            background: 'var(--pencil)',
            borderRadius: 100,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--field-green)',
              borderRadius: 100,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Footer: tags + date */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
          {standards.slice(0, 2).map((std) => {
            const short = std.split('.').slice(-1)[0];
            return (
              <span key={std} className="skill-tag default">
                {short}
              </span>
            );
          })}
        </div>
        {createdDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Calendar size={11} color="var(--pencil)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--pencil)' }}>
              {createdDate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active Projects Column ──────────────────────────────────────────────────────

function ActiveQuestsColumn({ user }) {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, title }

  useEffect(() => {
    if (!user?.id) return;

    async function fetchQuests() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('quests')
        .select('*, quest_stages(*), quest_students(student_id, students(id, name))')
        .eq('guide_id', user.id)
        .in('status', ['active', 'draft'])
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        setQuests(data || []);
      }
      setLoading(false);
    }

    fetchQuests();
  }, [user?.id]);

  const handleArchive = async (questId) => {
    await supabase.from('quests').update({ status: 'archived' }).eq('id', questId);
    setQuests(prev => prev.filter(q => q.id !== questId));
  };

  const handleDelete = (questId, questTitle) => {
    setDeleteConfirm({ id: questId, title: questTitle });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await supabase.from('quests').delete().eq('id', deleteConfirm.id);
    setQuests(prev => prev.filter(q => q.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h2
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 'var(--text-lg)',
              color: 'var(--ink)',
            }}
          >
            Active Projects
          </h2>
          {!loading && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--compass-gold)',
                background: 'var(--parchment)',
                border: '1px solid var(--pencil)',
                borderRadius: 100,
                padding: '2px 8px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
              }}
            >
              {quests.filter(q => q.status === 'active').length}
            </span>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate('/quest/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <>
          <QuestSkeleton />
          <QuestSkeleton />
          <QuestSkeleton />
        </>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          style={{
            background: 'rgba(192,57,43,0.06)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: 8,
            padding: 'var(--space-4)',
            color: 'var(--specimen-red)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Failed to load projects: {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && quests.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-6)',
            background: 'var(--parchment)',
            border: '1px solid var(--pencil)',
            borderRadius: 8,
          }}
        >
          <Compass size={40} color="var(--pencil)" style={{ margin: '0 auto 16px' }} />
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              color: 'var(--ink)',
              marginBottom: 8,
            }}
          >
            No active projects yet.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--graphite)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Projects help you connect learner interests to real-world careers and standards.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/quest/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Plus size={15} />
            Create your first project
          </button>
        </div>
      )}

      {/* Active quest list */}
      {!loading && !error && quests.filter(q => q.status === 'active').map((q) => (
        <QuestCard key={q.id} quest={q} onArchive={handleArchive} onDelete={handleDelete} />
      ))}

      {/* Drafts section */}
      {!loading && !error && quests.filter(q => q.status === 'draft').length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--graphite)', margin: 0 }}>
              Drafts
            </h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', background: 'var(--parchment)', border: '1px solid var(--pencil)', borderRadius: 100, padding: '1px 6px' }}>
              {quests.filter(q => q.status === 'draft').length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quests.filter(q => q.status === 'draft').map((q) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--chalk)', border: '1px dashed var(--pencil)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.title}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Draft · {q.quest_stages?.length || 0} stages
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <Link
                    to={`/quest/${q.id}`}
                    style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--compass-gold)', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Continue →
                  </Link>
                  <button
                    onClick={() => handleDelete(q.id, q.title)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pencil)', padding: 4, display: 'flex', borderRadius: 4, flexShrink: 0 }}
                    title="Delete draft"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--chalk)', borderRadius: 14, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: '0 0 8px' }}>Delete this project?</h3>
            <p style={{ fontSize: 13, color: 'var(--graphite)', lineHeight: 1.6, margin: '0 0 20px' }}>
              "<strong>{deleteConfirm.title}</strong>" and all its stages, reflections, and simulation data will be permanently deleted. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--pencil)', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--specimen-red)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--chalk)' }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quick Quest Generator Card ────────────────────────────────────────────────

function QuickQuestCard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState([]);

  function toggleChip(chip) {
    setSelected((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  }

  function handleGenerate() {
    const params = new URLSearchParams();
    if (selected.length > 0) params.set('interests', selected.join(','));
    if (prompt.trim()) params.set('prompt', prompt.trim());
    navigate(`/quest/new?${params.toString()}`);
  }

  const rows = [INTEREST_CHIPS.slice(0, 5), INTEREST_CHIPS.slice(5)];

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <Plus size={16} color="var(--ink)" />
        <h3
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
          }}
        >
          New Project
        </h3>
      </div>

      <textarea
        className="input"
        rows={4}
        placeholder="What are your students interested in right now?"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{
          resize: 'vertical',
          minHeight: 80,
          marginBottom: 'var(--space-3)',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
        }}
      />

      {/* Interest chips */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginBottom: ri === 0 ? 'var(--space-2)' : 'var(--space-4)',
          }}
        >
          {row.map((chip) => {
            const active = selected.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                style={{
                  background: active ? 'var(--ink)' : 'var(--parchment)',
                  color: active ? 'var(--chalk)' : 'var(--ink)',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--pencil)'}`,
                  borderRadius: 100,
                  padding: '4px 12px',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                }}
              >
                {chip}
              </button>
            );
          })}
        </div>
      ))}

      <button
        className="btn btn-primary"
        onClick={handleGenerate}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Generate Project
      </button>
    </div>
  );
}

// ── Add Student Inline Form ───────────────────────────────────────────────────

function AddStudentForm({ userId, onAdded, onCancel }) {
  const [form, setForm] = useState({ name: '', age: '', grade_band: '', interests: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function handleChange(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setErr('Name is required.');
      return;
    }
    setSaving(true);
    setErr(null);

    const interests = form.interests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from('students')
      .insert({
        name: form.name.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        grade_band: form.grade_band || null,
        interests,
        guide_id: userId,
      })
      .select()
      .single();

    if (error) {
      setErr(error.message);
    } else {
      onAdded(data);
    }
    setSaving(false);
  }

  const inputStyle = {
    background: 'var(--chalk)',
    border: '1px solid var(--pencil)',
    borderRadius: 6,
    padding: '6px 10px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--ink)',
    width: '100%',
    outline: 'none',
    marginBottom: 8,
  };

  return (
    <div
      style={{
        background: 'var(--chalk)',
        border: '1px solid var(--pencil)',
        borderRadius: 8,
        padding: 'var(--space-4)',
        marginTop: 'var(--space-3)',
      }}
    >
      <input
        style={inputStyle}
        placeholder="Full name *"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 }}>
        <input
          style={{ ...inputStyle, marginBottom: 0 }}
          placeholder="Age"
          type="number"
          value={form.age}
          onChange={(e) => handleChange('age', e.target.value)}
        />
        <select
          style={{ ...inputStyle, marginBottom: 0 }}
          value={form.grade_band}
          onChange={(e) => handleChange('grade_band', e.target.value)}
        >
          <option value="">Grade band</option>
          <option value="K-2">K–2</option>
          <option value="3-5">3–5</option>
          <option value="6-8">6–8</option>
        </select>
      </div>
      <input
        style={{ ...inputStyle, marginTop: 8 }}
        placeholder="Interests (comma-separated)"
        value={form.interests}
        onChange={(e) => handleChange('interests', e.target.value)}
      />
      {err && (
        <p style={{ color: 'var(--specimen-red)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', marginBottom: 8 }}>
          {err}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          className="btn btn-ghost"
          onClick={onCancel}
          style={{ fontSize: 'var(--text-sm)', padding: '6px 12px' }}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ fontSize: 'var(--text-sm)', padding: '6px 14px' }}
        >
          {saving ? 'Saving…' : 'Add Student'}
        </button>
      </div>
    </div>
  );
}

// ── Students Card ─────────────────────────────────────────────────────────────

function StudentsCard({ user }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchStudents() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('guide_id', user.id)
        .order('name');

      if (err) {
        setError(err.message);
      } else {
        setStudents(data || []);
      }
      setLoading(false);
    }

    fetchStudents();
  }, [user?.id]);

  function handleStudentAdded(newStudent) {
    setStudents((prev) => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
  }

  return (
    <div className="card">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
          }}
        >
          Students
        </h3>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/students')}
          style={{ fontSize: 'var(--text-sm)', padding: '4px 10px' }}
        >
          <Plus size={13} />
          Add Student
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <AddStudentForm
          userId={user.id}
          onAdded={handleStudentAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--pencil)', opacity: 0.4 }} />
              <div>
                <PulseLine width={80} height={12} mb={4} />
                <PulseLine width={50} height={10} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p style={{ color: 'var(--specimen-red)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
          Failed to load students.
        </p>
      )}

      {/* Empty */}
      {!loading && !error && students.length === 0 && !showForm && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--graphite)', textAlign: 'center', padding: 'var(--space-4) 0' }}>
          No students yet. Add your first student above.
        </p>
      )}

      {/* Student list */}
      {!loading && !error && students.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {students.map((student, idx) => (
            <div
              key={student.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: idx < students.length - 1 ? 'var(--space-3)' : 0,
                borderBottom: idx < students.length - 1 ? '1px solid var(--pencil)' : 'none',
              }}
            >
              {/* Left: avatar + info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--parchment)',
                    border: '1px solid var(--pencil)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--graphite)',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(student.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 700,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {student.name}
                    </span>
                    {student.grade_band && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: 'var(--graphite)',
                          background: 'var(--parchment)',
                          border: '1px solid var(--pencil)',
                          borderRadius: 100,
                          padding: '1px 6px',
                          flexShrink: 0,
                        }}
                      >
                        {student.grade_band}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(student.interests || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="skill-tag default">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manage button */}
              <button
                className="btn btn-ghost"
                onClick={() => navigate(`/students?edit=${student.id}`)}
                style={{ fontSize: 'var(--text-xs)', padding: '3px 8px', flexShrink: 0, marginLeft: 8 }}
              >
                Manage
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Weekly Snapshot Card ──────────────────────────────────────────────────────

function WeeklySnapshotCard({ quests, loading }) {
  if (loading) {
    return (
      <div className="card">
        <PulseLine width="40%" height={16} mb={16} />
        <PulseLine width="70%" height={12} mb={10} />
        <PulseLine width="70%" height={12} mb={10} />
        <PulseLine width="50%" height={12} />
      </div>
    );
  }

  const completedThisWeek = stagesCompletedThisWeek(quests);
  const counts = pathwayCounts(quests);
  const entries = Object.entries(counts);
  const maxCount = entries.length > 0 ? Math.max(...entries.map(([, c]) => c)) : 1;

  const pathwayColors = {
    material_science: 'var(--lab-blue)',
    biology: 'var(--field-green)',
    healthcare: 'var(--specimen-red)',
    none: 'var(--graphite)',
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <TrendingUp size={15} color="var(--graphite)" />
        <h3
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
          }}
        >
          Weekly Snapshot
        </h3>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {[
          { label: 'active projects', value: quests.length },
          { label: 'stages completed this week', value: completedThisWeek },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'var(--parchment)',
              borderRadius: 6,
              padding: 'var(--space-3)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                color: 'var(--ink)',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--graphite)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Career pathway bar chart */}
      {entries.length > 0 && (
        <>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--graphite)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 'var(--space-3)',
            }}
          >
            Career Pathways
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map(([pathway, count]) => {
              const pct = Math.round((count / maxCount) * 100);
              const color = pathwayColors[pathway] || 'var(--graphite)';
              return (
                <div key={pathway}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--graphite)',
                      }}
                    >
                      {PATHWAY_LABELS[pathway] || pathway}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--graphite)',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: 'var(--pencil)',
                      borderRadius: 100,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 100,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {entries.length === 0 && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--graphite)',
            textAlign: 'center',
          }}
        >
          No pathway data yet.
        </p>
      )}
    </div>
  );
}

// ── Simulation Debriefs Card ──────────────────────────────────────────────────

function SimulationDebriefsCard({ user }) {
  const navigate = useNavigate();
  const [debriefs, setDebriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    async function fetchDebriefs() {
      const { data } = await supabase
        .from('career_simulations')
        .select('id, quest_id, debrief_summary, created_at, quests(title)')
        .not('debrief_summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);
      setDebriefs(data || []);
      setLoading(false);
    }
    fetchDebriefs();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="card">
        <PulseLine width="50%" height={14} mb={16} />
        <PulseLine width="80%" height={11} mb={8} />
        <PulseLine width="70%" height={11} />
      </div>
    );
  }
  if (debriefs.length === 0) return null;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <Zap size={15} color="var(--compass-gold)" />
        <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--ink)' }}>
          Recent Debriefs
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {debriefs.map((d, idx) => (
          <div
            key={d.id}
            style={{
              paddingBottom: idx < debriefs.length - 1 ? 'var(--space-3)' : 0,
              borderBottom: idx < debriefs.length - 1 ? '1px solid var(--pencil)' : 'none',
            }}
          >
            <button
              onClick={() => navigate(`/simulation/${d.id}`)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: 0,
                width: '100%',
              }}
            >
              <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)', marginBottom: 2 }}>
                {d.quests?.title || 'Untitled Project'}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', lineHeight: 1.4,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {d.debrief_summary}
              </p>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Tour ────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    target: 'tour-active-quests',
    title: 'Your Active Projects',
    body: 'All running projects appear here. Click any project card to open the student journey map.',
  },
  {
    target: 'tour-new-quest',
    title: 'Start a New Project',
    body: 'Use the project generator to build a personalized, standards-aligned project in under 2 minutes.',
  },
  {
    target: 'tour-students',
    title: 'Manage Students',
    body: 'Add your learners here. Their interests drive the AI project generator.',
  },
  {
    target: 'tour-snapshot',
    title: 'Weekly Snapshot',
    body: 'Track project progress and career pathway coverage across your class at a glance.',
  },
];

function DashboardTour({ onDone }) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];

  function advance() {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      onDone();
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 999,
        background: 'var(--ink)',
        color: 'var(--chalk)',
        borderRadius: 12,
        padding: '20px 24px',
        width: 300,
        boxShadow: '0 8px 32px rgba(26,26,46,0.28)',
      }}
    >
      {/* Step dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 18 : 6,
              height: 6,
              borderRadius: 100,
              background: i === step ? 'var(--compass-gold)' : 'rgba(255,255,255,0.25)',
              transition: 'width 200ms ease',
            }}
          />
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 6, lineHeight: 1.3 }}>
        {current.title}
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: 18 }}>
        {current.body}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onDone}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)' }}
        >
          Skip tour
        </button>
        <button
          onClick={advance}
          style={{
            background: 'var(--compass-gold)',
            color: 'var(--ink)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {step < TOUR_STEPS.length - 1 ? 'Next' : 'Got it'}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [allQuests, setAllQuests] = useState([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  // Fetch both active and completed quests
  useEffect(() => {
    if (!user?.id) return;

    async function fetchQuests() {
      setQuestsLoading(true);
      const { data } = await supabase
        .from('quests')
        .select('*, quest_stages(*), quest_students(student_id, students(id, name))')
        .eq('guide_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

      setAllQuests(data || []);
      setQuestsLoading(false);
    }

    fetchQuests();
  }, [user?.id]);

  // Show tour once per guide
  useEffect(() => {
    if (!user?.id) return;
    const key = `wayfinder_dashboard_toured_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowTour(true);
    }
  }, [user?.id]);

  function dismissTour() {
    if (user?.id) {
      localStorage.setItem(`wayfinder_dashboard_toured_${user.id}`, '1');
    }
    setShowTour(false);
  }

  const activeQuests = allQuests.filter((q) => q.status === 'active');
  const completedQuests = allQuests.filter((q) => q.status === 'completed');

  const firstName = getFirstName(profile?.full_name);
  const greeting = getGreeting();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
        }
      `}</style>

      <TopBar />

      <main className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        {/* Page header */}
        <div style={{ marginBottom: 'var(--space-8)', maxWidth: 1120, margin: '0 auto 32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--ink)',
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {greeting}, {firstName}.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--graphite)',
            }}
          >
            Here's what's happening across your projects today.
          </p>
        </div>

        {/* 65/35 responsive grid */}
        <div
          id="tour-active-quests"
          className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '65fr 35fr',
            gap: 32,
            maxWidth: 1120,
            margin: '0 auto',
            alignItems: 'start',
          }}
        >
          {/* Left: Active + Completed Quests */}
          <ActiveQuestsColumnWithSharedData
            user={user}
            activeQuests={activeQuests}
            completedQuests={completedQuests}
            setAllQuests={setAllQuests}
            loading={questsLoading}
            setLoading={setQuestsLoading}
          />

          {/* Right: stacked cards */}
          <div id="tour-new-quest" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <QuickQuestCard />
            <div id="tour-students">
              <StudentsCard user={user} />
            </div>
            <div id="tour-snapshot">
              <WeeklySnapshotCard quests={activeQuests} loading={questsLoading} />
            </div>
            <SimulationDebriefsCard user={user} />
          </div>
        </div>
      </main>

      {showTour && <DashboardTour onDone={dismissTour} />}
    </div>
  );
}

// Wrapper that receives shared quest state from parent Dashboard
function ActiveQuestsColumnWithSharedData({ user, activeQuests, completedQuests, setAllQuests, loading, setLoading }) {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleArchive = async (questId) => {
    await supabase.from('quests').update({ status: 'archived' }).eq('id', questId);
    setAllQuests(prev => prev.filter(q => q.id !== questId));
  };

  const handleDelete = (questId, questTitle) => setDeleteConfirm({ id: questId, title: questTitle });

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    await supabase.from('quests').delete().eq('id', deleteConfirm.id);
    setAllQuests(prev => prev.filter(q => q.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  useEffect(() => {
    if (!user?.id) return;

    async function fetchQuests() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('quests')
        .select('*, quest_stages(*), quest_students(student_id, students(id, name))')
        .eq('guide_id', user.id)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        setAllQuests(data || []);
      }
      setLoading(false);
    }

    fetchQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div>
      {/* Active quests header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            Active Projects
          </h2>
          {!loading && (
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--compass-gold)', background: 'var(--parchment)', border: '1px solid var(--pencil)', borderRadius: 100, padding: '2px 8px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
              {activeQuests.length}
            </span>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/quest/new')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Plus size={15} />
          New Project
        </button>
      </div>

      {loading && (<><QuestSkeleton /><QuestSkeleton /><QuestSkeleton /></>)}

      {!loading && error && (
        <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: 'var(--space-4)', color: 'var(--specimen-red)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
          Failed to load projects: {error}
        </div>
      )}

      {!loading && !error && activeQuests.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-6)', background: 'var(--parchment)', border: '1px solid var(--pencil)', borderRadius: 8 }}>
          <Compass size={40} color="var(--pencil)" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            No active projects yet.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--graphite)', marginBottom: 'var(--space-4)' }}>
            Projects help you connect learner interests to real-world careers and standards.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/quest/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Plus size={15} />
            Create your first project
          </button>
        </div>
      )}

      {!loading && !error && activeQuests.map((q) => (
        <QuestCard key={q.id} quest={q} onArchive={handleArchive} onDelete={handleDelete} />
      ))}

      {/* Completed quests section */}
      {!loading && !error && completedQuests.length > 0 && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <CheckCircle size={15} color="var(--field-green)" />
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--graphite)' }}>
              Completed
            </h2>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--field-green)', background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', borderRadius: 100, padding: '2px 8px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
              {completedQuests.length}
            </span>
          </div>
          {completedQuests.map((q) => (
            <QuestCard key={q.id} quest={q} onArchive={handleArchive} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--chalk)', borderRadius: 14, padding: '28px 28px 24px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: '0 0 8px' }}>Delete this project?</h3>
            <p style={{ fontSize: 13, color: 'var(--graphite)', lineHeight: 1.6, margin: '0 0 20px' }}>
              "<strong>{deleteConfirm.title}</strong>" and all its stages will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--pencil)', background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--specimen-red)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--chalk)' }}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
