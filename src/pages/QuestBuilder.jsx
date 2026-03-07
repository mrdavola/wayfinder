import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  X,
  Users,
  User,
  BookOpen,
  FlaskConical,
  Presentation,
  NotebookPen,
  Microscope,
  Trophy,
  Plus,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Search,
  Sparkles,
  Calendar,
  Compass,
  Upload,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';
import { supabase } from '../lib/supabase';
import { ai, questGroups as questGroupsApi, guidePlaybook, landmarksApi, interactiveStages, yearPlanItems, expeditionChallenges, stageBranches, generateWorldImage, uploadWorldScene } from '../lib/api';
import { CAREER_PATHWAYS, PATHWAY_CATEGORIES } from '../data/careerPathways';
import { STANDARDS_FRAMEWORKS, findStandardById } from '../data/standardsFrameworks';
import TrustBadge from '../components/ui/TrustBadge';
import { getTrustTier } from '../lib/trustDomains';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const T = {
  ink: '#1A1A2E',
  paper: '#FAF8F5',
  parchment: '#F0EDE6',
  graphite: '#6B7280',
  pencil: '#9CA3AF',
  specimenRed: '#C0392B',
  fieldGreen: '#2D6A4F',
  compassGold: '#B8860B',
  labBlue: '#1B4965',
  chalk: '#FFFFFF',
};




const STEP_LABELS = ['Students', 'Skills', 'Pathway', 'Anything Else?', 'Generating', 'Review', 'Launch'];

const LOADING_TEXTS = [
  'Reading student profiles...',
  'Mapping interests to standards...',
  'Designing challenge sequence...',
  'Connecting to career pathways...',
  'Writing stage descriptions...',
  'Creating guiding questions...',
  'Building deliverables for each stage...',
  'Calibrating difficulty levels...',
  'Finding reliable sources...',
  'Designing expedition challenges...',
  'Reviewing for age-appropriateness...',
  'Polishing the final project...',
  'Almost there — adding finishing touches...',
];

const STAGE_ICONS = {
  research: BookOpen,
  experiment: FlaskConical,
  simulate: Microscope,
  present: Presentation,
  reflect: NotebookPen,
};

const AI_SUGGESTIONS_BY_GRADE = {
  'K-2':  ['CCSS.MATH.K.OA.A.2',        'CCSS.ELA.2.RI.A.1',          'NGSS.K-LS1-1'],
  '3-5':  ['CCSS.MATH.4.NF.B.3',        'CCSS.ELA-LITERACY.W.4.1',    'NGSS.4-PS3-2'],
  '6-8':  ['CCSS.MATH.7.RP.A.2',        'CCSS.ELA-LITERACY.W.6.1',    'NGSS.MS-LS1-1'],
  '9-12': ['CCSS.MATH.8.F.B.4',         'CCSS.ELA-LITERACY.W.8.7',    'NGSS.HS-ETS1-2'],
};


// Intersection of arrays (for shared interests)
function arrayIntersection(arrays) {
  if (!arrays.length) return [];
  return arrays.reduce((acc, arr) => acc.filter((x) => arr.includes(x)));
}

// ── Compass SVG ────────────────────────────────────────────────────────────────
function CompassSpinner() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'spin 3s linear infinite' }}
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" stroke={T.ink} strokeWidth="5" />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="37" stroke={T.ink} strokeWidth="2" />
      {/* Cardinal tick marks */}
      <line x1="50" y1="5"  x2="50" y2="13" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="87" y1="50" x2="95" y2="50" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="50" y1="87" x2="50" y2="95" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="5"  y1="50" x2="13" y2="50" stroke={T.ink} strokeWidth="3.5" strokeLinecap="round" />
      {/* 4-pointed star with hollow center */}
      <path
        d="M 50 18 C 54 36, 64 46, 82 50 C 64 54, 54 64, 50 82 C 46 64, 36 54, 18 50 C 36 46, 46 36, 50 18 Z M 50 44 A 6 6 0 1 0 50 56 A 6 6 0 1 0 50 44 Z"
        fill={T.ink}
        fillRule="evenodd"
      />
    </svg>
  );
}

// ── Animated Checkmark ─────────────────────────────────────────────────────────
function AnimatedCheck() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill={T.fieldGreen} />
      <polyline
        points="24,40 36,52 56,28"
        fill="none"
        stroke={T.chalk}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: 0,
          animation: 'checkDraw 0.6s ease-out forwards',
        }}
      />
    </svg>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 40 }}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;

        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDone ? T.fieldGreen : isActive ? T.ink : 'transparent',
                  border: `2px solid ${isDone ? T.fieldGreen : isActive ? T.ink : T.pencil}`,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {isDone ? (
                  <Check size={14} color={T.chalk} strokeWidth={2.5} />
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isActive ? T.chalk : T.pencil,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {stepNum}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? T.ink : isDone ? T.fieldGreen : T.pencil,
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  height: 2,
                  width: 32,
                  backgroundColor: isDone ? T.fieldGreen : T.parchment,
                  marginTop: 13,
                  flexShrink: 0,
                  transition: 'background-color 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Btn Styles ─────────────────────────────────────────────────────────────────
const btnPrimary = {
  backgroundColor: T.ink,
  color: T.chalk,
  border: 'none',
  borderRadius: 8,
  padding: '12px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  transition: 'opacity 0.15s',
};
const btnSecondary = {
  backgroundColor: T.parchment,
  color: T.ink,
  border: `1.5px solid ${T.pencil}`,
  borderRadius: 8,
  padding: '11px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};
const btnGhost = {
  backgroundColor: 'transparent',
  color: T.graphite,
  border: 'none',
  borderRadius: 8,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

// ── Interest Chip Input ────────────────────────────────────────────────────────
function InterestChipInput({ interests, onChange }) {
  const [input, setInput] = useState('');

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !interests.includes(trimmed)) {
      onChange([...interests, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag) => onChange(interests.filter((i) => i !== tag));

  return (
    <div
      style={{
        border: `1.5px solid ${T.pencil}`,
        borderRadius: 8,
        padding: '8px 10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        backgroundColor: T.chalk,
        minHeight: 44,
      }}
    >
      {interests.map((tag) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: T.parchment,
            border: `1px solid ${T.pencil}`,
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            color: T.ink,
            fontFamily: 'var(--font-body)',
          }}
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <X size={11} color={T.graphite} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          }
          if (e.key === 'Backspace' && !input && interests.length) {
            onChange(interests.slice(0, -1));
          }
        }}
        onBlur={() => { if (input) addTag(input); }}
        placeholder={interests.length ? '' : 'Type interest, press Enter...'}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          color: T.ink,
          backgroundColor: 'transparent',
          minWidth: 120,
          flex: 1,
        }}
      />
    </div>
  );
}

// ── AI Group Suggestion (inline in Step 1) ────────────────────────────────────
function AiGroupSuggestion({ students, selectedIds }) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState(null);
  const [reasoning, setReasoning] = useState('');

  async function handleSuggest() {
    setLoading(true);
    setGroups(null);
    setReasoning('');
    try {
      const sel = students.filter(s => selectedIds.includes(s.id)).map(s => ({
        name: s.name, grade_band: s.grade_band, interests: s.interests || [], skills: [],
      }));
      const result = await ai.suggestGroups({ students: sel, groupSize: Math.min(3, Math.ceil(sel.length / 2)) });
      setGroups(result.groups || []);
      setReasoning(result.reasoning || '');
    } catch (err) {
      console.error('AI group suggestion error:', err);
    }
    setLoading(false);
  }

  const colors = [
    { bg: '#DBEAFE', text: '#1E40AF' }, { bg: '#D1FAE5', text: '#065F46' },
    { bg: '#FEF3C7', text: '#92400E' }, { bg: '#E0E7FF', text: '#3730A3' },
  ];

  return (
    <div style={{ marginBottom: 20, padding: '12px 14px', background: `${T.compassGold}08`, borderRadius: 10, border: `1px solid ${T.compassGold}30` }}>
      <button
        onClick={handleSuggest}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', borderRadius: 8,
          background: T.compassGold, color: '#fff',
          border: 'none', fontSize: 12, fontWeight: 600,
          fontFamily: 'var(--font-body)', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'opacity 150ms',
        }}
      >
        {loading ? (
          <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Suggesting groups...</>
        ) : (
          <><Sparkles size={13} /> AI Suggest Groups</>
        )}
      </button>

      {groups && groups.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {reasoning && (
            <p style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', marginBottom: 8, fontStyle: 'italic' }}>
              {reasoning}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {groups.map((g, gi) => {
              const c = colors[gi % colors.length];
              return (
                <div key={gi} style={{ flex: '1 1 180px', padding: '10px 12px', borderRadius: 8, background: c.bg }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 4 }}>
                    {g.name}
                  </div>
                  {g.members.map((m, mi) => (
                    <div key={mi} style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: T.ink }}>
                      {m.name} {m.role && <span style={{ fontSize: 10, color: c.text }}>({m.role})</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 1: Students ───────────────────────────────────────────────────────────
function Step1Students({
  students,
  studentsLoading,
  questType,
  setQuestType,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudentIds,
  setSelectedStudentIds,
  selectedInterests,
  setSelectedInterests,
  onNext,
}) {
  const [search, setSearch] = useState('');

  const individualStudent = students.find((s) => s.id === selectedStudentId);
  const groupStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  // Shared interests for group
  const sharedInterests =
    groupStudents.length >= 2
      ? arrayIntersection(groupStudents.map((s) => s.interests || []))
      : groupStudents.length === 1
      ? groupStudents[0]?.interests || []
      : [];

  // Pre-fill interests when student selection changes
  useEffect(() => {
    if (questType === 'individual' && individualStudent) {
      setSelectedInterests(individualStudent.interests || []);
    } else if (questType === 'group' && groupStudents.length > 0) {
      setSelectedInterests(sharedInterests.length > 0 ? sharedInterests : groupStudents.flatMap((s) => s.interests || []).filter((v, i, a) => a.indexOf(v) === i));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questType, selectedStudentId, selectedStudentIds.join(',')]);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const canProceed =
    questType === 'individual'
      ? !!selectedStudentId
      : selectedStudentIds.length >= 1;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 24px' }}>
        Who is this project for?
      </h2>

      {studentsLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: T.graphite }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: T.parchment,
            borderRadius: 12,
            color: T.graphite,
          }}
        >
          <Users size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ fontFamily: 'var(--font-body)', marginBottom: 16 }}>
            You haven't added any students yet.
          </p>
          <Link
            to="/dashboard"
            style={{ color: T.labBlue, fontWeight: 600, fontFamily: 'var(--font-body)', textDecoration: 'none' }}
          >
            Go to Dashboard to add students
          </Link>
        </div>
      ) : (
        <>
          {/* Quest type toggle */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 28, border: `1.5px solid ${T.pencil}`, borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
            {[
              { key: 'individual', label: 'Individual', Icon: User },
              { key: 'group', label: 'Group', Icon: Users },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setQuestType(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: questType === key ? T.ink : T.chalk,
                  color: questType === key ? T.chalk : T.graphite,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Individual: searchable dropdown */}
          {questType === 'individual' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                Select student
              </label>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search students..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: `1.5px solid ${T.pencil}`,
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-body)',
                    color: T.ink,
                    backgroundColor: T.chalk,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setSearch(''); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: `1.5px solid ${selectedStudentId === s.id ? T.ink : T.pencil}`,
                      borderRadius: 8,
                      backgroundColor: selectedStudentId === s.id ? T.parchment : T.chalk,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                        {s.grade_band} · {(s.interests || []).slice(0, 3).join(', ')}
                      </div>
                    </div>
                    {selectedStudentId === s.id && <Check size={16} color={T.fieldGreen} />}
                  </button>
                ))}
              </div>

              {/* Selected student card */}
              {individualStudent && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '14px 16px',
                    backgroundColor: T.parchment,
                    borderRadius: 10,
                    border: `1px solid ${T.pencil}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                    {individualStudent.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(individualStudent.interests || []).map((interest) => (
                      <span
                        key={interest}
                        style={{
                          backgroundColor: T.chalk,
                          border: `1px solid ${T.pencil}`,
                          borderRadius: 20,
                          padding: '3px 10px',
                          fontSize: 11,
                          color: T.ink,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group: multi-select */}
          {questType === 'group' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                  Select students
                </label>
                <button
                  onClick={() => {
                    if (selectedStudentIds.length === students.length) setSelectedStudentIds([]);
                    else setSelectedStudentIds(students.map(s => s.id));
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: T.labBlue,
                    fontFamily: 'var(--font-body)', padding: '2px 0',
                  }}
                >
                  {selectedStudentIds.length === students.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {students.map((s) => {
                  const checked = selectedStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        border: `1.5px solid ${checked ? T.ink : T.pencil}`,
                        borderRadius: 8,
                        backgroundColor: checked ? T.parchment : T.chalk,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                          else setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                        }}
                        style={{ width: 16, height: 16, accentColor: T.ink, cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                          {s.grade_band} · {(s.interests || []).slice(0, 3).join(', ')}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Shared interests callout */}
              {groupStudents.length >= 2 && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    backgroundColor: T.parchment,
                    borderRadius: 8,
                    borderLeft: `4px solid ${T.compassGold}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-body)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Shared interests
                  </div>
                  {sharedInterests.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {sharedInterests.map((interest) => (
                        <span
                          key={interest}
                          style={{ backgroundColor: T.chalk, border: `1px solid ${T.pencil}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: T.ink, fontFamily: 'var(--font-body)' }}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>
                      No shared interests found — AI will blend their unique interests.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Group Suggestions */}
          {questType === 'group' && selectedStudentIds.length >= 2 && (
            <AiGroupSuggestion students={students} selectedIds={selectedStudentIds} />
          )}

          {/* Interest override */}
          {(questType === 'individual' ? !!selectedStudentId : selectedStudentIds.length > 0) && (
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                Interests for this project
                <span style={{ fontWeight: 400, color: T.graphite, marginLeft: 6 }}>(add or remove)</span>
              </label>
              <InterestChipInput interests={selectedInterests} onChange={setSelectedInterests} />
            </div>
          )}

          <button
            onClick={onNext}
            disabled={!canProceed}
            style={{ ...btnPrimary, opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'not-allowed', width: '100%' }}
          >
            Next: Choose Skills
          </button>
        </>
      )}
    </div>
  );
}

// ── Step 2: Skills ─────────────────────────────────────────────────────────────
const SUBJECT_TABS = [
  { id: 'math',      label: 'Math' },
  { id: 'ela',       label: 'ELA' },
  { id: 'science',   label: 'Science' },
  { id: 'ss',        label: 'Social Studies' },
  { id: 'practices', label: 'Math Practices' },
];

function Step2Skills({
  selectedStandards,
  setSelectedStandards,
  customTopic,
  setCustomTopic,
  selectedStudents,
  onBack,
  onNext,
}) {
  const [activeSubject, setActiveSubject] = useState('math');
  const [activeGradeBand, setActiveGradeBand] = useState('all');
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState({});
  const [studentProfileStds, setStudentProfileStds] = useState([]);
  const [profileStdsLoading, setProfileStdsLoading] = useState(false);
  const profileStdsLoaded = useRef(false);
  const [aiSkillSuggestions, setAiSkillSuggestions] = useState([]);
  const [aiSkillsLoading, setAiSkillsLoading] = useState(false);
  const aiSkillsRequested = useRef(false);

  // AI-suggest standards based on student interests/passions/parent input
  useEffect(() => {
    if (aiSkillsRequested.current || !selectedStudents?.length) return;
    const hasProfileData = selectedStudents.some(s =>
      s.interests?.length || s.passions?.length || s.about_me || s.parent_child_loves || s.parent_expectations
    );
    if (!hasProfileData) return;
    aiSkillsRequested.current = true;
    setAiSkillsLoading(true);

    // Build compact standards list for the AI prompt
    const gradeBand = selectedStudents[0]?.grade_band;
    const relevantFw = STANDARDS_FRAMEWORKS.filter(fw =>
      !gradeBand || fw.gradeBand === gradeBand
    );
    const stdList = relevantFw.flatMap(fw =>
      fw.categories.flatMap(cat =>
        cat.standards.map(s => `${s.id}: ${s.description}`)
      )
    ).join('\n');

    // Enrich students with parent skill priorities
    const enriched = selectedStudents.map(s => {
      const parentPri = s.parent_access?.[0]?.core_skill_priorities || [];
      return { ...s, parent_skill_priorities: parentPri };
    });

    ai.suggestSkillStandards({ students: enriched, availableStandards: stdList })
      .then(result => {
        setAiSkillSuggestions(result.suggestions || []);
      })
      .catch(() => {
        // Silently fail
      })
      .finally(() => setAiSkillsLoading(false));
  }, [selectedStudents]);

  // Load student standards profiles on mount
  useEffect(() => {
    if (profileStdsLoaded.current || !selectedStudents?.length) return;
    profileStdsLoaded.current = true;
    setProfileStdsLoading(true);

    Promise.all(
      selectedStudents.map(s =>
        supabase
          .from('student_standards')
          .select('*')
          .eq('student_id', s.id)
          .eq('status', 'active')
          .then(({ data }) => ({ studentId: s.id, studentName: s.name, standards: data || [] }))
      )
    ).then(results => {
      setStudentProfileStds(results);
      setProfileStdsLoading(false);
    });
  }, [selectedStudents]);

  // Grade bands available for the current subject
  const gradeBands = ['all', ...new Set(
    STANDARDS_FRAMEWORKS
      .filter((fw) => fw.subject === activeSubject)
      .map((fw) => fw.gradeBand)
  )];

  // Frameworks to show based on subject + grade band filter
  const visibleFrameworks = STANDARDS_FRAMEWORKS.filter((fw) => {
    if (fw.subject !== activeSubject) return false;
    if (activeGradeBand !== 'all' && fw.gradeBand !== activeGradeBand) return false;
    return true;
  });

  // Filter standards by search query
  const searchLower = search.toLowerCase();
  const matchesSearch = (std) =>
    !search ||
    std.label.toLowerCase().includes(searchLower) ||
    std.description.toLowerCase().includes(searchLower);

  const count = selectedStandards.length;
  const usingCustomTopic = customTopic.trim().length > 0;
  const isValid = usingCustomTopic || (count >= 2 && count <= 6);

  // AI suggestions based on grade band of first selected student
  const gradeBand = selectedStudents[0]?.grade_band || '3-5';
  const suggestedIds = AI_SUGGESTIONS_BY_GRADE[gradeBand] || AI_SUGGESTIONS_BY_GRADE['3-5'];
  const suggestions = suggestedIds
    .map((id) => findStandardById(id))
    .filter(Boolean)
    .filter((s) => !selectedStandards.find((sel) => sel.id === s.id));

  const toggleStandard = (standard) => {
    const exists = selectedStandards.find((s) => s.id === standard.id);
    if (exists) {
      setSelectedStandards(selectedStandards.filter((s) => s.id !== standard.id));
    } else {
      setSelectedStandards([...selectedStandards, standard]);
    }
  };

  const toggleCategory = (key) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // When subject changes, reset grade band and search
  const handleSubjectChange = (subj) => {
    setActiveSubject(subj);
    setActiveGradeBand('all');
    setSearch('');
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        What skills should this project build?
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.graphite, margin: '0 0 20px' }}>
        Select 2–6 standards, or describe a custom topic below.
      </p>

      {/* AI-suggested standards based on student interests */}
      {(aiSkillsLoading || aiSkillSuggestions.length > 0) && (
        <div style={{
          marginBottom: 16, padding: 14,
          border: `2px solid ${T.compassGold}`,
          borderRadius: 12,
          background: 'rgba(184,134,11,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Sparkles size={14} color={T.compassGold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)' }}>
              Suggested for {selectedStudents?.length === 1
                ? selectedStudents[0].name?.split(' ')[0]
                : `your ${selectedStudents?.length} students`}
            </span>
          </div>

          {aiSkillsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
              <Loader2 size={12} color={T.graphite} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>
                Finding standards that match student interests...
              </span>
            </div>
          )}

          {!aiSkillsLoading && aiSkillSuggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aiSkillSuggestions.map((sug, i) => {
                const std = findStandardById(sug.standard_id);
                if (!std) return null;
                const alreadySelected = selectedStandards.some(s => s.id === sug.standard_id);
                return (
                  <button
                    key={sug.standard_id || i}
                    onClick={() => toggleStandard(std)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 12px', borderRadius: 8, textAlign: 'left',
                      border: `1px solid ${alreadySelected ? T.fieldGreen : 'rgba(184,134,11,0.25)'}`,
                      background: alreadySelected ? `${T.fieldGreen}10` : T.chalk,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                      border: `1.5px solid ${alreadySelected ? T.fieldGreen : T.pencil}`,
                      background: alreadySelected ? `${T.fieldGreen}20` : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {alreadySelected && <Check size={11} color={T.fieldGreen} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: T.ink }}>
                          {std.label}
                        </span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: T.graphite }}>
                          {std.description}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: T.compassGold, fontFamily: 'var(--font-body)', fontStyle: 'italic', lineHeight: 1.4 }}>
                        {sug.reasoning || sug.student_connection}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* From Student Profile card */}
      {(() => {
        const allProfileStds = studentProfileStds.flatMap(sp => sp.standards);
        const hasProfileStds = allProfileStds.length > 0;
        if (!hasProfileStds && !profileStdsLoading) return null;

        const coreStds = allProfileStds.filter(s => s.priority === 'core');
        const recStds = allProfileStds.filter(s => s.priority === 'recommended');
        const suppStds = allProfileStds.filter(s => s.priority === 'supplementary');
        const studentLabel = selectedStudents?.length === 1
          ? `${selectedStudents[0].name?.split(' ')[0]}'s`
          : `${selectedStudents?.length} students'`;

        // For groups: count how many students share each standard
        const stdCounts = {};
        studentProfileStds.forEach(sp => {
          sp.standards.forEach(s => {
            stdCounts[s.standard_code] = (stdCounts[s.standard_code] || 0) + 1;
          });
        });

        function addProfileStandard(std) {
          if (selectedStandards.find(s => s.id === std.standard_code)) return;
          setSelectedStandards(prev => [...prev, { id: std.standard_code, label: std.standard_label, description: std.standard_description }]);
        }

        function addAllCore() {
          const uniqueCore = [];
          const seen = new Set(selectedStandards.map(s => s.id));
          coreStds.forEach(std => {
            if (!seen.has(std.standard_code)) {
              seen.add(std.standard_code);
              uniqueCore.push({ id: std.standard_code, label: std.standard_label, description: std.standard_description });
            }
          });
          setSelectedStandards(prev => [...prev, ...uniqueCore]);
        }

        return (
          <div style={{ marginBottom: 20, padding: 14, border: `2px solid ${T.labBlue}`, borderRadius: 12, background: `${T.labBlue}08` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color={T.labBlue} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)' }}>
                  From {studentLabel} profile
                </span>
              </div>
              {coreStds.length > 0 && (
                <button
                  onClick={addAllCore}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.labBlue}`,
                    background: T.labBlue, color: T.chalk, fontSize: 11, fontWeight: 600,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  Use All Core ({coreStds.length})
                </button>
              )}
            </div>

            {profileStdsLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                <Loader2 size={12} color={T.graphite} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>Loading standards profile...</span>
              </div>
            )}

            {!profileStdsLoading && [
              { label: 'Core', items: coreStds, color: T.fieldGreen },
              { label: 'Recommended', items: recStds, color: T.labBlue },
              { label: 'Supplementary', items: suppStds, color: T.compassGold },
            ].map(group => {
              if (group.items.length === 0) return null;
              // Deduplicate by standard_code
              const unique = [...new Map(group.items.map(s => [s.standard_code, s])).values()];
              return (
                <div key={group.label} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: group.color, fontFamily: 'var(--font-body)', marginBottom: 4 }}>{group.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {unique.map(std => {
                      const alreadySelected = selectedStandards.some(s => s.id === std.standard_code);
                      const sharedCount = selectedStudents.length > 1 ? stdCounts[std.standard_code] : null;
                      return (
                        <button
                          key={std.standard_code}
                          onClick={() => {
                            if (alreadySelected) {
                              setSelectedStandards(prev => prev.filter(s => s.id !== std.standard_code));
                            } else {
                              addProfileStandard(std);
                            }
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 6,
                            border: `1px solid ${alreadySelected ? T.fieldGreen : T.pencil}`,
                            background: alreadySelected ? `${T.fieldGreen}15` : T.chalk,
                            color: alreadySelected ? T.fieldGreen : T.ink,
                            fontSize: 11, fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            opacity: 1,
                          }}
                        >
                          {alreadySelected && <Check size={10} />}
                          {std.standard_label}
                          {sharedCount && sharedCount > 1 && (
                            <span style={{ fontSize: 9, color: T.compassGold, fontWeight: 600 }}>
                              {sharedCount}/{selectedStudents.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 6 }}>
              {coreStds.length} core, {recStds.length} recommended
              {suppStds.length > 0 && `, ${suppStds.length} supplementary`}
            </div>
          </div>
        );
      })()}

      {/* Divider when profile card is shown */}
      {studentProfileStds.some(sp => sp.standards.length > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: T.parchment }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: T.pencil, whiteSpace: 'nowrap' }}>Or select additional standards</span>
          <div style={{ flex: 1, height: 1, background: T.parchment }} />
        </div>
      )}

      {/* Subject tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {SUBJECT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSubjectChange(tab.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 20,
              border: `1.5px solid ${activeSubject === tab.id ? T.ink : T.pencil}`,
              backgroundColor: activeSubject === tab.id ? T.ink : T.chalk,
              color: activeSubject === tab.id ? T.chalk : T.graphite,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grade band sub-filter (only when > 1 option) */}
      {gradeBands.length > 2 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {gradeBands.map((gb) => (
            <button
              key={gb}
              onClick={() => setActiveGradeBand(gb)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: `1px solid ${activeGradeBand === gb ? T.compassGold : T.pencil}`,
                backgroundColor: activeGradeBand === gb ? `${T.compassGold}15` : 'transparent',
                color: activeGradeBand === gb ? T.compassGold : T.graphite,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {gb === 'all' ? 'All Grades' : gb}
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search
          size={14}
          color={T.pencil}
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search standards by code or keyword..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px 8px 30px',
            borderRadius: 8,
            border: `1px solid ${T.pencil}`,
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: T.ink,
            background: T.chalk,
            outline: 'none',
          }}
        />
      </div>

      {/* AI Suggestions (if no search) */}
      {!search && suggestions.length > 0 && (
        <div
          style={{
            backgroundColor: T.parchment,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
            borderLeft: `4px solid ${T.compassGold}`,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-body)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Suggested for {gradeBand} learners
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((std) => {
              const alreadyAdded = selectedStandards.some(s => s.id === std.id);
              return (
              <div key={std.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <div style={{ lineHeight: 1.5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: T.ink, marginRight: 6 }}>{std.label}</span>
                  <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>{std.description}</span>
                </div>
                {alreadyAdded ? (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    color: T.fieldGreen, fontFamily: 'var(--font-body)',
                  }}>
                    <Check size={11} /> Added
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedStandards([...selectedStandards, std])}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      padding: '4px 10px', borderRadius: 20, marginTop: 1,
                      border: `1px solid ${T.compassGold}`, backgroundColor: 'transparent',
                      color: T.compassGold, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accordion — frameworks + categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
        {visibleFrameworks.map((fw) => {
          // Filter categories/standards by search
          const filteredCats = fw.categories.map((cat) => ({
            ...cat,
            standards: cat.standards.filter(matchesSearch),
          })).filter((cat) => cat.standards.length > 0);

          if (filteredCats.length === 0) return null;

          return filteredCats.map((cat) => {
            const catKey = `${fw.id}_${cat.id}`;
            const isOpen = search ? true : !!openCategories[catKey];
            const selectedInCat = cat.standards.filter((s) => selectedStandards.find((sel) => sel.id === s.id)).length;

            return (
              <div key={catKey} style={{ border: `1px solid ${T.pencil}`, borderRadius: 8 }}>
                <button
                  onClick={() => !search && toggleCategory(catKey)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', boxSizing: 'border-box',
                    justifyContent: 'space-between', padding: '11px 14px',
                    background: isOpen ? T.parchment : T.chalk,
                    border: 'none',
                    borderRadius: isOpen ? '8px 8px 0 0' : 8,
                    cursor: search ? 'default' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, flexShrink: 0, lineHeight: '20px' }}>{cat.label}</span>
                    {fw.gradeBand !== 'All' && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: T.compassGold, background: `${T.compassGold}18`,
                        borderRadius: 100, padding: '2px 7px',
                        border: `1px solid ${T.compassGold}40`, flexShrink: 0, lineHeight: '14px',
                      }}>
                        {fw.gradeBand}
                      </span>
                    )}
                    {selectedInCat > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.chalk, backgroundColor: T.fieldGreen, borderRadius: 20, padding: '2px 6px', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {selectedInCat}
                      </span>
                    )}
                  </div>
                  {!search && (isOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />)}
                </button>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.parchment}`, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                    {cat.standards.map((std) => {
                      const checked = !!selectedStandards.find((s) => s.id === std.id);
                      return (
                        <label
                          key={std.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '9px 14px', cursor: 'pointer',
                            backgroundColor: checked ? '#F0F9F4' : 'transparent',
                            borderBottom: `1px solid ${T.parchment}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStandard(std)}
                            style={{ accentColor: T.fieldGreen, cursor: 'pointer', flexShrink: 0, width: 14, height: 14, marginTop: 3 }}
                          />
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 6px', flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                              {std.label}
                            </span>
                            <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                              {std.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })}
        {visibleFrameworks.every((fw) =>
          fw.categories.every((cat) => cat.standards.filter(matchesSearch).length === 0)
        ) && search && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 13 }}>
            No standards match "{search}"
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selectedStandards.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {selectedStandards.map((std) => (
            <span
              key={std.id}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                backgroundColor: T.ink, color: T.chalk,
                borderRadius: 20, padding: '4px 10px',
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
              }}
            >
              {std.label}
              <button
                onClick={() => toggleStandard(std)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.7 }}
              >
                <X size={11} color={T.chalk} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Counter */}
      {!usingCustomTopic && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, marginBottom: 12,
          color: count >= 2 && count <= 6 ? T.fieldGreen : T.specimenRed,
        }}>
          {count} selected · need 2–6 to continue
        </div>
      )}

      {/* Custom topic divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: T.pencil }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-body)', color: T.graphite, whiteSpace: 'nowrap' }}>
          or describe a custom topic
        </span>
        <div style={{ flex: 1, height: 1, backgroundColor: T.pencil }} />
      </div>

      {/* Custom topic input */}
      <textarea
        value={customTopic}
        onChange={(e) => setCustomTopic(e.target.value)}
        placeholder="e.g. Introduction to personal finance, creative writing through mythology, environmental design..."
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1.5px solid ${customTopic.trim() ? T.compassGold : T.pencil}`,
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: T.ink,
          background: customTopic.trim() ? `${T.compassGold}08` : T.chalk,
          outline: 'none',
          resize: 'none',
          marginBottom: 20,
          lineHeight: 1.5,
          transition: 'border-color 0.2s',
        }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={btnSecondary}>Back</button>
        <button
          onClick={onNext}
          disabled={!isValid}
          style={{ ...btnPrimary, flex: 1, opacity: isValid ? 1 : 0.4, cursor: isValid ? 'pointer' : 'not-allowed' }}
        >
          Next: Career Pathway
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Pathway ────────────────────────────────────────────────────────────
function Step3Pathway({ selectedPathways, setSelectedPathways, customCareer, setCustomCareer, onBack, onNext, onSkip, selectedStudents, selectedStandards }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [pathwaySuggestions, setPathwaySuggestions] = useState(null);
  const [pathwaySuggestionsLoading, setPathwaySuggestionsLoading] = useState(false);
  const suggestionsRequested = useRef(false);

  const MAX_SELECT = 3;

  // Auto-fetch AI pathway suggestions on mount
  useEffect(() => {
    if (suggestionsRequested.current) return;
    if (!selectedStudents?.length) return;
    suggestionsRequested.current = true;
    setPathwaySuggestionsLoading(true);

    // Fetch quest history for selected students
    const studentIds = selectedStudents.map(s => s.id);
    supabase
      .from('quest_students')
      .select('quest_id, quests(title, career_pathway, status)')
      .in('student_id', studentIds)
      .then(({ data: qsData }) => {
        const history = (qsData || [])
          .filter(qs => qs.quests)
          .map(qs => ({ title: qs.quests.title, career_pathway: qs.quests.career_pathway, status: qs.quests.status }));

        const allInterests = [...new Set(selectedStudents.flatMap(s => [...(s.interests || []), ...(s.passions || [])]))];
        const standardsText = (selectedStandards || []).join(', ');

        return ai.suggestPathways({
          students: selectedStudents,
          questHistory: history,
          interests: allInterests,
          standards: standardsText,
        });
      })
      .then(result => {
        setPathwaySuggestions(result.suggestions || []);
      })
      .catch(() => {
        setPathwaySuggestions(null);
      })
      .finally(() => {
        setPathwaySuggestionsLoading(false);
      });
  }, [selectedStudents, selectedStandards]);

  function togglePathway(id) {
    setSelectedPathways((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_SELECT) return prev; // cap at 3
      return [...prev, id];
    });
  }

  const filtered = CAREER_PATHWAYS.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.label.toLowerCase().includes(q) || p.tags.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const studentLabel = selectedStudents?.length === 1
    ? selectedStudents[0].name?.split(' ')[0] || 'this student'
    : `${selectedStudents?.length || 0} students`;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        Connect to a career pathway?
      </h2>
      <p style={{ color: T.graphite, fontSize: 14, fontFamily: 'var(--font-body)', margin: '0 0 16px' }}>
        Optional — choose up to {MAX_SELECT}. The AI will weave them into a real-world simulation.
      </p>

      <button onClick={onSkip} style={{ ...btnGhost, width: '100%', marginBottom: 16, color: T.graphite, border: `1px dashed ${T.pencil}`, borderRadius: 8 }}>
        Skip for now
      </button>

      {/* AI Suggested Pathways */}
      {selectedStudents?.length > 0 && (
        <div style={{
          border: `2px solid ${T.compassGold}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          background: `${T.compassGold}08`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles size={16} color={T.compassGold} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: T.ink }}>
              Suggested for {studentLabel}
            </span>
          </div>

          {pathwaySuggestionsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
              <Loader2 size={14} color={T.graphite} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.graphite }}>
                Finding pathways that fit...
              </span>
            </div>
          )}

          {!pathwaySuggestionsLoading && pathwaySuggestions && pathwaySuggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pathwaySuggestions.map((sug) => {
                const pathway = CAREER_PATHWAYS.find(p => p.id === sug.pathway_id);
                if (!pathway) return null;
                const isSelected = selectedPathways.includes(pathway.id);
                const { Icon } = pathway;
                return (
                  <button
                    key={sug.pathway_id}
                    onClick={() => togglePathway(pathway.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 14px',
                      border: `1.5px solid ${isSelected ? pathway.color : T.pencil}`,
                      borderRadius: 10,
                      backgroundColor: isSelected ? `${pathway.color}10` : T.chalk,
                      cursor: selectedPathways.length >= MAX_SELECT && !isSelected ? 'not-allowed' : 'pointer',
                      textAlign: 'left', transition: 'all 0.12s',
                      opacity: selectedPathways.length >= MAX_SELECT && !isSelected ? 0.45 : 1,
                      width: '100%',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${pathway.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={pathway.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)' }}>
                          {pathway.label}
                        </span>
                        {isSelected && <Check size={14} color={pathway.color} strokeWidth={2.5} />}
                      </div>
                      <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', lineHeight: 1.4, marginTop: 2 }}>
                        {sug.reasoning}
                      </div>
                      {sug.connection_to_interests && (
                        <div style={{ fontSize: 11, color: T.compassGold, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                          Why this fits: {sug.connection_to_interests}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!pathwaySuggestionsLoading && !pathwaySuggestions && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: T.graphite, margin: 0 }}>
              Couldn't load suggestions — browse the catalog below.
            </p>
          )}
        </div>
      )}

      {/* Selected chips */}
      {selectedPathways.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {selectedPathways.map((id) => {
            const p = CAREER_PATHWAYS.find((pw) => pw.id === id);
            if (!p) return null;
            return (
              <span
                key={id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: `${p.color}14`, border: `1.5px solid ${p.color}`,
                  borderRadius: 100, padding: '3px 10px 3px 8px',
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: p.color,
                }}
              >
                <p.Icon size={12} color={p.color} />
                {p.label}
                <button
                  onClick={() => togglePathway(id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: p.color }}
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Divider */}
      {selectedStudents?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: T.parchment }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: T.pencil, whiteSpace: 'nowrap' }}>Or browse all pathways</span>
          <div style={{ flex: 1, height: 1, background: T.parchment }} />
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} color={T.graphite} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search careers…"
          style={{
            width: '100%', padding: '8px 12px 8px 30px',
            border: `1px solid ${T.pencil}`, borderRadius: 8,
            fontFamily: 'var(--font-body)', fontSize: 13, color: T.ink,
            background: T.chalk, outline: 'none',
          }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {PATHWAY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '4px 12px', borderRadius: 100, border: '1px solid',
              borderColor: activeCategory === cat.id ? T.ink : T.pencil,
              background: activeCategory === cat.id ? T.ink : 'transparent',
              color: activeCategory === cat.id ? T.chalk : T.graphite,
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: activeCategory === cat.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pathway grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 8,
          maxHeight: 320,
          overflowY: 'auto',
          marginBottom: 16,
          paddingRight: 2,
        }}
      >
        {filtered.map((pathway) => {
          const isSelected = selectedPathways.includes(pathway.id);
          const { Icon } = pathway;
          return (
            <button
              key={pathway.id}
              onClick={() => togglePathway(pathway.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 6, padding: '10px 12px',
                border: `1.5px solid ${isSelected ? pathway.color : T.pencil}`,
                borderRadius: 10,
                backgroundColor: isSelected ? `${pathway.color}10` : T.chalk,
                cursor: selectedPathways.length >= MAX_SELECT && !isSelected ? 'not-allowed' : 'pointer',
                textAlign: 'left', transition: 'all 0.12s',
                opacity: selectedPathways.length >= MAX_SELECT && !isSelected ? 0.45 : 1,
                position: 'relative',
              }}
            >
              {isSelected && (
                <span
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 16, height: 16, borderRadius: '50%',
                    background: pathway.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check size={10} color="#fff" strokeWidth={3} />
                </span>
              )}
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `${pathway.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={pathway.color} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', lineHeight: 1.3, marginBottom: 3 }}>
                  {pathway.label}
                </div>
                <div style={{ fontSize: 10, color: T.graphite, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', lineHeight: 1.4 }}>
                  {pathway.tags.split(' · ').slice(0, 2).join(' · ')}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 13, padding: '24px 0' }}>
            No careers found. Try a different search.
          </p>
        )}
      </div>

      {/* Custom career input */}
      <div style={{ marginBottom: 16, padding: '12px 14px', border: `1px dashed ${T.pencil}`, borderRadius: 10 }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: T.graphite, marginBottom: 6 }}>
          + Add your own career (optional)
        </label>
        <input
          value={customCareer}
          onChange={(e) => setCustomCareer(e.target.value)}
          placeholder="e.g., Forensic Accountant, Urban Farmer, AI Ethicist…"
          style={{
            width: '100%', padding: '8px 12px',
            border: `1px solid ${customCareer ? T.ink : T.pencil}`, borderRadius: 8,
            fontFamily: 'var(--font-body)', fontSize: 13, color: T.ink,
            background: T.chalk, outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={btnSecondary}>Back</button>
        <button onClick={onNext} style={{ ...btnPrimary, flex: 1 }}>
          Next: Final Details
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Anything Else? ───────────────────────────────────────────────────
function Step4AnythingElse({ additionalContext, setAdditionalContext, useRealWorld, setUseRealWorld, projectMode, setProjectMode, isBranching, setIsBranching, onBack, onNext }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        Anything else?
      </h2>
      <p style={{ fontSize: 14, color: T.graphite, fontFamily: 'var(--font-body)', marginBottom: 28, lineHeight: 1.5 }}>
        Before we generate your project, is there anything specific you'd like to include? This could be materials you have available, time constraints, topics to emphasize, or anything the AI should know.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: 'var(--parchment)', borderRadius: 10, marginBottom: 16,
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
          <input type="checkbox" checked={useRealWorld}
            onChange={(e) => setUseRealWorld(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--field-green)' }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
              Ground in real-world problems
            </div>
            <div style={{ fontSize: 11, color: 'var(--graphite)' }}>
              AI will search for current problems, stakeholders, and data to weave into the project
            </div>
          </div>
        </label>
      </div>

      {/* Project Mode */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Expedition Style
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--pencil)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { value: 'hands_on', label: 'Hands-On', desc: 'Building, fieldwork, experiments' },
            { value: 'mixed', label: 'Mixed', desc: 'AI decides per stage' },
            { value: 'digital', label: 'Digital', desc: 'Research, writing, design' },
          ].map((opt, idx) => (
            <button key={opt.value} onClick={() => setProjectMode(opt.value)}
              style={{
                flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
                background: projectMode === opt.value ? 'var(--ink)' : 'var(--chalk)',
                color: projectMode === opt.value ? 'var(--chalk)' : 'var(--graphite)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                borderRight: idx < 2 ? '1px solid var(--pencil)' : 'none',
                transition: 'all 0.15s ease',
              }}>
              <div>{opt.label}</div>
              <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Branching toggle */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={isBranching} onChange={e => setIsBranching(e.target.checked)}
            style={{ accentColor: 'var(--compass-gold)', width: 16, height: 16 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Branching Narrative</div>
            <div style={{ fontSize: 10, color: 'var(--graphite)' }}>
              Learners choose their own path through the project — different choices lead to different stages
            </div>
          </div>
        </label>
      </div>

      <textarea
        value={additionalContext}
        onChange={(e) => setAdditionalContext(e.target.value)}
        placeholder="e.g. We only have 2 weeks, focus on hands-on experiments, we have access to a 3D printer, make sure to tie in our current novel study..."
        rows={5}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '14px 16px', borderRadius: 10,
          border: `1.5px solid ${T.pencil}`, background: T.paper,
          fontSize: 14, fontFamily: 'var(--font-body)', color: T.ink,
          resize: 'vertical', lineHeight: 1.6, outline: 'none',
          transition: 'border-color 150ms',
        }}
        onFocus={(e) => { e.target.style.borderColor = T.labBlue; }}
        onBlur={(e) => { e.target.style.borderColor = T.pencil; }}
      />

      <p style={{ fontSize: 12, color: T.pencil, fontFamily: 'var(--font-body)', marginTop: 8, marginBottom: 28 }}>
        This is optional — feel free to skip if everything looks good.
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={btnSecondary}>Back</button>
        <button onClick={onNext} style={{ ...btnPrimary, flex: 1 }}>
          {additionalContext.trim() ? 'Generate Project' : 'Skip & Generate Project'}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Generating ─────────────────────────────────────────────────────────
function Step5Generating({ progress, loadingText, error, onRegenerate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
      {error ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={`${T.specimenRed}20`} stroke={T.specimenRed} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke={T.specimenRed} strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12.01" y2="17" stroke={T.specimenRed} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: '0 0 8px' }}>
            Generation failed
          </h3>
          <p style={{ color: T.specimenRed, fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            {error}
          </p>
          <button onClick={onRegenerate} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={15} />
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <CompassSpinner />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: '0 0 8px' }}>
            Generating your project...
          </h3>
          <p
            style={{
              color: T.graphite,
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              marginBottom: 16,
              minHeight: 22,
              transition: 'opacity 0.3s',
            }}
          >
            {loadingText}
          </p>
          <p style={{
            color: T.pencil, fontSize: 11, fontFamily: 'var(--font-mono)',
            marginBottom: 24,
          }}>
            This usually takes 30–60 seconds
          </p>

          {/* Progress bar */}
          <div
            style={{
              height: 6,
              backgroundColor: T.parchment,
              borderRadius: 3,
              overflow: 'hidden',
              width: 300,
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: T.compassGold,
                borderRadius: 3,
                width: `${progress}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'var(--font-mono)', color: T.pencil }}>
            {Math.round(progress)}%
          </div>
        </>
      )}
    </div>
  );
}

// ── Stage Type Icon ────────────────────────────────────────────────────────────
function StageTypeIcon({ type, size = 14 }) {
  const Icon = STAGE_ICONS[type] || BookOpen;
  return <Icon size={size} color={T.graphite} />;
}

// ── Step 6: Review ─────────────────────────────────────────────────────────────
function Step6Review({
  generatedQuest,
  setGeneratedQuest,
  selectedStandards,
  selectedPathways,
  questType,
  selectedStudents,
  allStudents,
  selectedStudentId,
  setSelectedStudentId,
  selectedStudentIds,
  setSelectedStudentIds,
  setQuestType,
  onLaunch,
  onDraft,
  onRegenerate,
  onAddToLibrary,
  launching,
  saveError,
}) {
  const [openStage, setOpenStage] = useState(null);
  const [editingStudents, setEditingStudents] = useState(false);
  const [worldRegenCount, setWorldRegenCount] = useState(0);
  const [worldError, setWorldError] = useState(null);
  const [stageRegenIdx, setStageRegenIdx] = useState(null); // index of stage being regenerated
  const [stageRegenFeedback, setStageRegenFeedback] = useState('');
  const [stageRegenLoading, setStageRegenLoading] = useState(false);
  const worldImageInputRef = useRef(null);
  const playbookDays = generatedQuest?.playbookDays || null;
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [playbookOpen, setPlaybookOpen] = useState(false);

  const setPlaybookDays = (days) => {
    setGeneratedQuest((prev) => ({ ...prev, playbookDays: days }));
  };

  async function handleGeneratePlaybook() {
    if (!generatedQuest) return;
    setPlaybookLoading(true);
    setPlaybookOpen(true);
    try {
      const result = await ai.generatePlaybook({
        questTitle: generatedQuest.quest_title,
        stages: generatedQuest.stages || [],
        totalDays: generatedQuest.total_duration || 10,
        studentProfile: selectedStudents?.[0],
      });
      setPlaybookDays(result.days || []);
    } catch (err) {
      console.error('Playbook generation error:', err);
    }
    setPlaybookLoading(false);
  }

  if (!generatedQuest) return null;

  const stages = generatedQuest.stages || [];

  // Standards coverage
  const standardsCoverage = selectedStandards.map((std) => {
    const coveringStage = stages.find((stage) =>
      (stage.academic_skills_embedded || []).includes(std.id)
    );
    return { ...std, covered: !!coveringStage, coveringStage: coveringStage?.stage_title };
  });

  const updateField = (field, value) => {
    setGeneratedQuest((prev) => ({ ...prev, [field]: value }));
  };

  const updateStage = (index, field, value) => {
    setGeneratedQuest((prev) => {
      const newStages = [...prev.stages];
      newStages[index] = { ...newStages[index], [field]: value };
      return { ...prev, stages: newStages };
    });
  };

  const pathwayObjects = (selectedPathways || []).map((id) => CAREER_PATHWAYS.find((p) => p.id === id)).filter(Boolean);

  const studentNames = selectedStudents.map((s) => s.name).join(', ');

  const toggleStudentForReview = (studentId) => {
    if (questType === 'individual') {
      setSelectedStudentId(selectedStudentId === studentId ? null : studentId);
    } else {
      setSelectedStudentIds((prev) =>
        prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
      );
    }
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 16px' }}>
        Review your project
      </h2>

      {/* Sharing with section */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        marginBottom: 20, padding: '10px 14px',
        background: T.paper, borderRadius: 10, border: `1px solid ${T.parchment}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Sharing with:
        </span>
        {selectedStudents.length > 0 ? (
          selectedStudents.map((s) => (
            <span key={s.id} style={{
              padding: '3px 10px', borderRadius: 20,
              background: `${T.fieldGreen}12`, color: T.fieldGreen,
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            }}>
              {s.name}
            </span>
          ))
        ) : (
          <span style={{ fontSize: 12, color: T.pencil, fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
            No students selected
          </span>
        )}
        <button
          onClick={() => setEditingStudents((v) => !v)}
          style={{
            fontSize: 11, fontWeight: 600, color: T.labBlue,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', padding: '2px 4px',
          }}
        >
          {editingStudents ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Inline student picker */}
      {editingStudents && allStudents && (
        <div style={{
          marginBottom: 20, padding: 14,
          border: `1px solid ${T.pencil}`, borderRadius: 10,
          maxHeight: 200, overflowY: 'auto',
        }}>
          {allStudents.map((s) => {
            const checked = questType === 'individual'
              ? selectedStudentId === s.id
              : selectedStudentIds.includes(s.id);
            return (
              <label
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: checked ? `${T.fieldGreen}08` : 'transparent',
                  transition: 'background 100ms',
                }}
              >
                <input
                  type={questType === 'individual' ? 'radio' : 'checkbox'}
                  checked={checked}
                  onChange={() => toggleStudentForReview(s.id)}
                  style={{ accentColor: T.fieldGreen }}
                />
                <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: T.ink, fontWeight: checked ? 600 : 400 }}>
                  {s.name}
                </span>
                {s.grade_band && (
                  <span style={{ fontSize: 10, color: T.graphite, fontFamily: 'var(--font-mono)' }}>{s.grade_band}</span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* World Preview — shows generating state or actual preview */}
      {!generatedQuest._worldScene && !worldError && (
        <div style={{
          marginBottom: 20, borderRadius: 12, overflow: 'hidden',
          border: `1px dashed ${T.pencil}`, background: T.parchment,
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: T.compassGold }} />
          <span style={{ fontSize: 13, color: T.graphite }}>
            Building your immersive world in the background...
          </span>
        </div>
      )}
      {worldError && !generatedQuest._worldScene?._imageBase64 && (
        <div style={{
          marginBottom: 20, borderRadius: 12, padding: '14px 18px',
          border: `1px solid ${T.pencil}`, background: T.parchment,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={16} color={T.specimenRed || '#c44'} />
          <span style={{ fontSize: 12, color: T.graphite, flex: 1 }}>
            World image failed to generate. You can upload your own image or try again.
          </span>
          <input
            ref={worldImageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                setGeneratedQuest(prev => prev ? ({
                  ...prev,
                  _worldScene: {
                    ...(prev._worldScene || { hotspots: [] }),
                    _imageBase64: base64,
                    _imageMime: file.type,
                    _uploaded: true,
                  },
                }) : prev);
                setWorldError(null);
              };
              reader.readAsDataURL(file);
            }}
          />
          <button
            onClick={() => worldImageInputRef.current?.click()}
            style={{
              padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.pencil}`,
              background: T.chalk, color: T.ink, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Upload size={11} /> Upload Image
          </button>
        </div>
      )}
      {generatedQuest._worldScene && (
        <div style={{
          marginBottom: 20, borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${T.pencil}`, background: T.paper,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${T.parchment}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Immersive World Preview
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                ref={worldImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    setGeneratedQuest(prev => prev ? ({
                      ...prev,
                      _worldScene: {
                        ...(prev._worldScene || { hotspots: [] }),
                        _imageBase64: base64,
                        _imageMime: file.type,
                        _uploaded: true,
                      },
                    }) : prev);
                    setWorldError(null);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <button
                onClick={() => worldImageInputRef.current?.click()}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.pencil}`,
                  background: 'transparent', color: T.graphite, fontSize: 11,
                  fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Upload size={11} /> Upload
              </button>
              {worldRegenCount < 3 && (
                <button
                  onClick={async () => {
                    const si = selectedStudents.flatMap(s => [...(s.interests || []), ...(s.passions || [])]);
                    setGeneratedQuest(prev => ({ ...prev, _worldScene: { ...prev._worldScene, _imageBase64: null } }));
                    setWorldError(null);
                    try {
                      const sceneData = await ai.generateWorldScene({
                        questTitle: generatedQuest.quest_title, stages: generatedQuest.stages,
                        studentInterests: si, careerPathway: selectedPathways[0] || 'none',
                        gradeBand: selectedStudents[0]?.grade_band || '6-8',
                      });
                      if (sceneData) {
                        const image = await generateWorldImage(sceneData.image_prompt);
                        if (!image) throw new Error('Image generation failed');
                        setGeneratedQuest(prev => prev ? ({
                          ...prev, _worldScene: { ...sceneData, _imageBase64: image.base64, _imageMime: image.mimeType },
                        }) : prev);
                      }
                      setWorldRegenCount(c => c + 1);
                    } catch (err) {
                      console.error('World regeneration failed:', err);
                      setWorldError(err.message || 'Failed to generate world image');
                    }
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.pencil}`,
                    background: 'transparent', color: T.graphite, fontSize: 11,
                    fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <RefreshCw size={11} /> Regenerate ({3 - worldRegenCount} left)
                </button>
              )}
            </div>
          </div>
          {generatedQuest._worldScene._imageBase64 ? (
            <div style={{ position: 'relative' }}>
              <img
                src={`data:${generatedQuest._worldScene._imageMime || 'image/png'};base64,${generatedQuest._worldScene._imageBase64}`}
                alt="World preview"
                style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
              />
              <div style={{ position: 'absolute', inset: 0 }}>
                {(generatedQuest._worldScene.hotspots || []).map((h, i) => {
                  const leftPct = ((h.position.yaw + 180) / 360) * 100;
                  const topPct = 50 - (h.position.pitch / 30) * 20;
                  return (
                    <div key={i} style={{
                      position: 'absolute', left: `${leftPct}%`, top: `${topPct}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 22, height: 22, borderRadius: '50%',
                      background: T.compassGold, border: '2px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}>
                      {h.stage_number}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: T.pencil, fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }} />
              World image is generating...
            </div>
          )}
          {generatedQuest._worldScene.scene_description && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: T.graphite, fontStyle: 'italic' }}>
              {generatedQuest._worldScene.scene_description}
            </div>
          )}
        </div>
      )}

      {/* Quest header */}
      <div
        style={{
          backgroundColor: T.chalk,
          border: `1px solid ${T.pencil}`,
          borderRadius: 12,
          padding: '20px',
          marginBottom: 20,
        }}
      >
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updateField('quest_title', e.currentTarget.textContent)}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            color: T.ink,
            margin: '0 0 6px',
            outline: 'none',
            cursor: 'text',
            borderBottom: `1px dashed transparent`,
          }}
          onFocus={(e) => (e.currentTarget.style.borderBottomColor = T.pencil)}
          onBlurCapture={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
        >
          {generatedQuest.quest_title}
        </h1>
        <p
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => updateField('quest_subtitle', e.currentTarget.textContent)}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: T.graphite,
            margin: '0 0 14px',
            outline: 'none',
            cursor: 'text',
          }}
        >
          {generatedQuest.quest_subtitle}
        </p>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          {pathwayObjects.map((pw) => (
            <span
              key={pw.id}
              style={{
                backgroundColor: `${pw.color}15`,
                color: pw.color,
                border: `1px solid ${pw.color}40`,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {pw.label}
            </span>
          ))}
          <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
            {generatedQuest.total_duration} days
          </span>
        </div>

        {/* Narrative hook */}
        <div
          style={{
            backgroundColor: T.parchment,
            borderLeft: `4px solid ${T.compassGold}`,
            borderRadius: '0 8px 8px 0',
            padding: '12px 14px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-body)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Narrative Hook
          </div>
          <textarea
            defaultValue={generatedQuest.narrative_hook}
            onBlur={(e) => updateField('narrative_hook', e.target.value)}
            rows={3}
            style={{
              width: '100%',
              border: 'none',
              backgroundColor: 'transparent',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: T.ink,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Journey map — circles spread evenly across full width */}
      <div style={{ marginBottom: 20 }}>
        {/* Row 1: circles + flex dashes */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {stages.map((stage, i) => {
            const isLast = i === stages.length - 1;
            const isSim = stage.stage_type === 'simulate';
            return (
              <React.Fragment key={i}>
                <div
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => setOpenStage(openStage === i ? null : i)}
                >
                  {isLast ? (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: T.compassGold, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${T.compassGold}30` }}>
                      <Trophy size={15} color={T.chalk} />
                    </div>
                  ) : isSim ? (
                    <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 26, height: 26, transform: 'rotate(45deg)', backgroundColor: T.specimenRed, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                        <span style={{ transform: 'rotate(-45deg)', fontSize: 10, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{i + 1}</span>
                    </div>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div style={{ flex: 1, height: 0, borderTop: `2px dashed ${T.pencil}`, minWidth: 8 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Row 2: stage labels aligned with circles */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 8 }}>
          {stages.map((stage, i) => (
            <React.Fragment key={i}>
              <div
                onClick={() => setOpenStage(openStage === i ? null : i)}
                style={{ flexShrink: 0, width: 36, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 9, color: T.graphite, fontFamily: 'var(--font-body)', textAlign: 'center', lineHeight: 1.3, display: 'block', wordBreak: 'break-word' }}>
                  {stage.stage_title || stage.title}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div style={{ flex: 1, minWidth: 8 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Branching narrative preview */}
      {generatedQuest?.is_branching && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>
            Branching Narrative Preview
          </div>
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, padding: 12 }}>
            <svg viewBox={`0 0 800 ${Math.max(200, 30 + stages.length * 40 + 20)}`} style={{ width: '100%', height: 'auto' }}>
              {stages.map((stage, i) => {
                const y = 30 + i * 40;
                const isFork = stage.stage_type === 'choice_fork';
                return (
                  <g key={stage.stage_id || i}>
                    {i > 0 && (
                      <line x1={400} y1={30 + (i - 1) * 40 + (stages[i - 1]?.stage_type === 'choice_fork' ? 8 : 5)} x2={400} y2={y - (isFork ? 8 : 5)} stroke="var(--pencil)" strokeWidth={1.5} strokeDasharray="4 3" />
                    )}
                    <circle cx={400} cy={y} r={isFork ? 8 : 5}
                      fill={isFork ? 'var(--compass-gold)' : 'var(--lab-blue)'}
                    />
                    <text x={420} y={y + 4} fontSize="10" fill="var(--ink)" fontFamily="var(--font-body)">
                      {stage.stage_id || i + 1}. {stage.stage_title}
                      {isFork ? ' (Branch Point)' : ''}
                    </text>
                    {stage.branches?.map((b, bi) => (
                      <text key={bi} x={440} y={y + 14 + bi * 12} fontSize="8" fill="var(--graphite)" fontStyle="italic">
                        → {b.label} → Stage {b.next_stage}
                      </text>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Stage cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {stages.map((stage, i) => {
          const isOpen = openStage === i;
          return (
            <div
              key={i}
              style={{
                border: `1px solid ${T.pencil}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setOpenStage(isOpen ? null : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: isOpen ? T.parchment : T.chalk,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: T.ink,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 3 }}>
                    {stage.stage_title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StageTypeIcon type={stage.stage_type} size={12} />
                      <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>
                        {stage.stage_type}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
                      {stage.duration} days
                    </span>
                    {stage.branches?.length > 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(184,134,11,0.1)', color: 'var(--compass-gold)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {stage.branches.length} {stage.branches.length === 1 ? 'branch' : 'branches'}
                      </span>
                    )}
                    {(stage.academic_skills_embedded || []).slice(0, 2).map((skill) => {
                      const std = findStandardById(skill);
                      return std ? (
                        <span
                          key={skill}
                          style={{
                            backgroundColor: T.parchment,
                            border: `1px solid ${T.pencil}`,
                            borderRadius: 10,
                            padding: '2px 7px',
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            color: T.graphite,
                          }}
                        >
                          {std.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />}
              </button>

              {isOpen && (
                <div style={{ padding: '14px', borderTop: `1px solid ${T.pencil}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
                        Description
                      </label>
                      <textarea
                        defaultValue={stage.description}
                        onBlur={(e) => updateStage(i, 'description', e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          border: `1px solid ${T.pencil}`,
                          borderRadius: 6,
                          padding: '8px 10px',
                          fontSize: 12,
                          fontFamily: 'var(--font-body)',
                          color: T.ink,
                          lineHeight: 1.6,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {(stage.guiding_questions || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
                          Guiding Questions
                        </label>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {(stage.guiding_questions || []).map((q, qi) => (
                            <li key={qi} style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginBottom: 4 }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {stage.deliverable && (
                    <div
                      style={{
                        backgroundColor: T.parchment,
                        borderRadius: 6,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, fontFamily: 'var(--font-body)' }}>
                        Deliverable
                      </div>
                      <textarea
                        defaultValue={stage.deliverable}
                        onBlur={(e) => updateStage(i, 'deliverable', e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          border: 'none',
                          backgroundColor: 'transparent',
                          fontSize: 12,
                          fontFamily: 'var(--font-body)',
                          color: T.ink,
                          lineHeight: 1.5,
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  {/* Sources — with toggle and edit */}
                  {stage.sources?.length > 0 && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--parchment)', borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Sources
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {stage.sources.map((src, si) => (
                          <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: src._hidden ? 0.4 : 1 }}>
                            <button
                              title={src._hidden ? 'Show this source' : 'Hide this source'}
                              onClick={() => {
                                const newSources = [...stage.sources];
                                newSources[si] = { ...newSources[si], _hidden: !newSources[si]._hidden };
                                updateStage(i, 'sources', newSources);
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                            >
                              {src._hidden ? <EyeOff size={12} color="var(--graphite)" /> : <Eye size={12} color="var(--graphite)" />}
                            </button>
                            <TrustBadge
                              tier={src.trust_level || getTrustTier(src.url)}
                              url={src.url}
                              sourceName={src.title || src.domain}
                            />
                            {src._editing ? (
                              <input
                                autoFocus
                                defaultValue={src.url}
                                onBlur={(e) => {
                                  const newSources = [...stage.sources];
                                  newSources[si] = { ...newSources[si], url: e.target.value, _editing: false };
                                  updateStage(i, 'sources', newSources);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.target.blur();
                                }}
                                style={{
                                  flex: 1, fontSize: 11, padding: '2px 6px', borderRadius: 4,
                                  border: `1px solid ${T.pencil}`, fontFamily: 'var(--font-mono)',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <>
                                <a href={src.url} target="_blank" rel="noopener noreferrer"
                                  style={{ color: src._hidden ? 'var(--graphite)' : 'var(--lab-blue)', fontSize: 11, textDecoration: src._hidden ? 'line-through' : 'none', flex: 1 }}>
                                  {src.title || src.url}
                                </a>
                                <button
                                  title="Edit URL"
                                  onClick={() => {
                                    const newSources = [...stage.sources];
                                    newSources[si] = { ...newSources[si], _editing: true };
                                    updateStage(i, 'sources', newSources);
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                                >
                                  <Pencil size={10} color="var(--graphite)" />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-stage regenerate */}
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {stageRegenIdx === i ? (
                      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          autoFocus
                          placeholder="What should change? (e.g. 'make it more hands-on')"
                          value={stageRegenFeedback}
                          onChange={(e) => setStageRegenFeedback(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { setStageRegenIdx(null); setStageRegenFeedback(''); }
                          }}
                          style={{
                            flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 6,
                            border: `1px solid ${T.pencil}`, fontFamily: 'var(--font-body)',
                            outline: 'none',
                          }}
                        />
                        <button
                          disabled={stageRegenLoading || !stageRegenFeedback.trim()}
                          onClick={async () => {
                            setStageRegenLoading(true);
                            try {
                              const result = await ai.regenerateStage({
                                stage, questTitle: generatedQuest.quest_title,
                                students: selectedStudents, feedback: stageRegenFeedback,
                                allStages: stages,
                              });
                              if (result) {
                                updateStage(i, 'stage_title', result.stage_title || stage.stage_title);
                                updateStage(i, 'description', result.description || stage.description);
                                updateStage(i, 'deliverable', result.deliverable || stage.deliverable);
                                if (result.guiding_questions) updateStage(i, 'guiding_questions', result.guiding_questions);
                                if (result.sources) updateStage(i, 'sources', result.sources);
                              }
                            } catch (err) { console.error('Stage regen failed:', err); }
                            setStageRegenLoading(false);
                            setStageRegenIdx(null);
                            setStageRegenFeedback('');
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 6, border: 'none',
                            background: stageRegenLoading ? T.pencil : T.ink, color: T.chalk,
                            fontSize: 11, fontWeight: 600, cursor: stageRegenLoading ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                          }}
                        >
                          {stageRegenLoading ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Regenerating...</> : <><RefreshCw size={11} /> Regenerate</>}
                        </button>
                        <button
                          onClick={() => { setStageRegenIdx(null); setStageRegenFeedback(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        >
                          <X size={14} color={T.graphite} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setStageRegenIdx(i); setStageRegenFeedback(''); }}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.pencil}`,
                          background: 'transparent', color: T.graphite, fontSize: 11,
                          fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <RefreshCw size={11} /> Regenerate this stage
                      </button>
                    )}
                  </div>

                  {stage.expedition_challenge && (
                    <div style={{
                      marginTop: 10, padding: '10px 12px', borderRadius: 8,
                      border: '1.5px dashed var(--compass-gold)',
                      background: 'rgba(184,134,11,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Compass size={12} color="var(--compass-gold)" />
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Expedition Challenge ({stage.expedition_challenge.challenge_type})
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
                        {stage.expedition_challenge.challenge_text}
                      </p>
                      {stage.expedition_challenge.target_skills?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {stage.expedition_challenge.target_skills.map((skill, i) => (
                            <span key={i} style={{
                              padding: '2px 8px', borderRadius: 10, fontSize: 9,
                              background: 'rgba(184,134,11,0.1)', color: 'var(--compass-gold)',
                              fontFamily: 'var(--font-mono)',
                            }}>{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Standards coverage */}
      <div
        style={{
          border: `1px solid ${T.pencil}`,
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 24,
          backgroundColor: T.chalk,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 12 }}>
          Standards Coverage
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {standardsCoverage.map((std) => (
            <div key={std.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: std.covered ? T.fieldGreen : T.specimenRed,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {std.covered ? (
                  <Check size={10} color={T.chalk} strokeWidth={3} />
                ) : (
                  <X size={10} color={T.chalk} strokeWidth={3} />
                )}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: T.ink, marginRight: 6 }}>{std.label}</span>
                <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>{std.description}</span>
                {std.covered && std.coveringStage && (
                  <div style={{ fontSize: 10, color: T.fieldGreen, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                    Covered in: {std.coveringStage}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#B91C1C', fontSize: 13, fontFamily: 'var(--font-body)' }}>
          {saveError}
        </div>
      )}

      {/* Action buttons */}
      {/* ── Facilitation Guide ─────────────────────────────────────── */}
      <div style={{ marginBottom: 20, border: `1px solid ${T.parchment}`, borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={playbookDays ? () => setPlaybookOpen(!playbookOpen) : handleGeneratePlaybook}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '14px 16px', background: T.chalk, border: 'none', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color={T.labBlue} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)' }}>
              Facilitation Guide
            </span>
          </div>
          {!playbookDays && !playbookLoading && (
            <span style={{ fontSize: 12, color: T.labBlue, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
              Generate Plan
            </span>
          )}
          {playbookLoading && <Loader2 size={14} color={T.graphite} style={{ animation: 'spin 1s linear infinite' }} />}
          {playbookDays && (playbookOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />)}
        </button>

        {playbookOpen && playbookLoading && (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <Loader2 size={20} color={T.graphite} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 8 }}>Generating day-by-day plan...</p>
          </div>
        )}

        {playbookOpen && playbookDays && playbookDays.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            {playbookDays.map((day) => (
              <div
                key={day.day_number}
                style={{
                  padding: '12px 0',
                  borderBottom: `1px solid ${T.parchment}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: T.labBlue, color: T.chalk, fontFamily: 'var(--font-mono)',
                  }}>
                    Day {day.day_number}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                    {day.title}
                  </span>
                </div>

                {/* Prep tasks */}
                {day.prep_tasks?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Prep</span>
                    <ul style={{ margin: '2px 0 0 16px', padding: 0, fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                      {day.prep_tasks.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                )}

                {/* Materials */}
                {day.materials?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Materials</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {day.materials.map((m, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: T.parchment, color: T.graphite, fontFamily: 'var(--font-body)' }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time blocks */}
                {day.time_blocks?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Schedule</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                      {day.time_blocks.map((tb, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11, fontFamily: 'var(--font-body)' }}>
                          <span style={{ fontWeight: 600, color: T.ink, minWidth: 40 }}>{tb.duration_min}min</span>
                          <span style={{ color: T.ink }}>{tb.label}</span>
                          {tb.notes && <span style={{ color: T.pencil, fontStyle: 'italic' }}> — {tb.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facilitation notes */}
                {day.facilitation_notes && (
                  <p style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', fontStyle: 'italic', lineHeight: 1.5, margin: '4px 0 0' }}>
                    {day.facilitation_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onLaunch}
          disabled={launching}
          style={{
            ...btnPrimary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: launching ? 0.7 : 1,
            cursor: launching ? 'not-allowed' : 'pointer',
          }}
        >
          {launching ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {launching ? 'Launching...' : 'Launch Project'}
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDraft} disabled={launching} style={{ ...btnSecondary, flex: 1 }}>
            Save as Draft
          </button>
          <button onClick={onRegenerate} disabled={launching} style={btnGhost}>
            Regenerate
          </button>
          <button onClick={onAddToLibrary} disabled={launching} style={btnGhost}>
            Add to Library
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 7: Launch ─────────────────────────────────────────────────────────────
function Step7Launch({ selectedStudents, questId }) {
  const names = selectedStudents.map((s) => s.name).join(' & ');

  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <style>{`
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
        <AnimatedCheck />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: T.ink, margin: '0 0 8px' }}>
        Project launched!
      </h2>
      <p style={{ color: T.graphite, fontSize: 15, fontFamily: 'var(--font-body)', margin: '0 0 32px' }}>
        {names ? `${names}'s project is ready.` : 'Your project is ready.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {questId && (
          <Link
            to={`/quest/${questId}`}
            style={{
              ...btnPrimary,
              display: 'inline-block',
              textDecoration: 'none',
              textAlign: 'center',
              minWidth: 200,
            }}
          >
            View Project Map
          </Link>
        )}
        <Link
          to="/dashboard"
          style={{
            ...btnSecondary,
            display: 'inline-block',
            textDecoration: 'none',
            textAlign: 'center',
            minWidth: 200,
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function QuestBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  function getInitials(n) { if (!n) return '?'; const p = n.trim().split(/\s+/); return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase(); }

  // ── Session persistence: restore wizard state on refresh ──
  const STORAGE_KEY = 'wayfinder_quest_builder';
  function loadSaved() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  const saved = useRef(loadSaved());
  const yearPlanItemRef = useRef(null);

  // Step state
  const [step, setStep] = useState(() => {
    const s = saved.current;
    // Only restore to step 6 (review) — don't restore mid-generation
    return s?.step === 6 && s?.generatedQuest ? 6 : 1;
  });

  // Step 1
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [questType, setQuestType] = useState(() => saved.current?.questType || 'individual');
  const [selectedStudentId, setSelectedStudentId] = useState(() => saved.current?.selectedStudentId || null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(() => saved.current?.selectedStudentIds || []);
  const [selectedInterests, setSelectedInterests] = useState(() => saved.current?.selectedInterests || []);

  // Step 2
  const [selectedStandards, setSelectedStandards] = useState(() => saved.current?.selectedStandards || []);
  const [customTopic, setCustomTopic] = useState(() => saved.current?.customTopic || '');

  // Step 3
  const [selectedPathways, setSelectedPathways] = useState(() => saved.current?.selectedPathways || []);
  const [customCareer, setCustomCareer] = useState(() => saved.current?.customCareer || '');

  // Step 4 (Anything Else?)
  const [additionalContext, setAdditionalContext] = useState(() => saved.current?.additionalContext || '');
  const [useRealWorld, setUseRealWorld] = useState(false);
  const [projectMode, setProjectMode] = useState('mixed');
  const [isBranching, setIsBranching] = useState(false);

  // Year Plan prefill: read from sessionStorage on mount
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('yearplan_prefill');
      if (prefill) {
        const data = JSON.parse(prefill);
        sessionStorage.removeItem('yearplan_prefill');
        yearPlanItemRef.current = data.planItemId || null;
        if (data.title) {
          setAdditionalContext(prev => prev ? prev : `Project idea: "${data.title}" — ${data.description || ''}`);
        }
      }
    } catch {}
  }, []);

  // Step 5 (Generating)
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [genError, setGenError] = useState(null);

  // Step 6 (Review)
  const [generatedQuest, setGeneratedQuest] = useState(() => saved.current?.generatedQuest || null);
  const [launching, setLaunching] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Step 7 (Launch)
  const [launchedQuestId, setLaunchedQuestId] = useState(null);

  // Persist wizard state to sessionStorage on changes
  useEffect(() => {
    if (step < 1 || launchedQuestId) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const data = {
      step, questType, selectedStudentId, selectedStudentIds,
      selectedInterests, selectedStandards, customTopic, additionalContext,
      selectedPathways, customCareer, generatedQuest,
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, [step, questType, selectedStudentId, selectedStudentIds, selectedInterests, selectedStandards, customTopic, additionalContext, selectedPathways, customCareer, generatedQuest, launchedQuestId]);

  // Refs for generation timers
  const progressRef = useRef(null);
  const textRef = useRef(null);

  // Fetch students
  useEffect(() => {
    if (!user) return;
    setStudentsLoading(true);
    supabase
      .from('students')
      .select('*, parent_access(parent_name, expectations, child_loves, core_skill_priorities)')
      .eq('guide_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          // Flatten parent data onto student for AI prompt
          const enriched = data.map(s => {
            const pa = Array.isArray(s.parent_access) ? s.parent_access[0] : s.parent_access;
            return {
              ...s,
              parent_expectations: pa?.expectations || null,
              parent_child_loves: pa?.child_loves || null,
            };
          });
          setStudents(enriched);
        }
        setStudentsLoading(false);
      });
  }, [user]);

  // Pre-populate from suggestion URL params
  const suggestionPrefilled = useRef(false);
  useEffect(() => {
    if (suggestionPrefilled.current || studentsLoading || !students.length) return;
    const fromType = searchParams.get('from');
    const suggestionId = searchParams.get('id');
    if (fromType !== 'suggestion' || !suggestionId) return;
    suggestionPrefilled.current = true;

    supabase
      .from('project_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single()
      .then(({ data: sug }) => {
        if (!sug) return;
        // Select student
        const student = students.find(s => s.id === sug.student_id);
        if (student) {
          setQuestType('individual');
          setSelectedStudentId(student.id);
          setSelectedInterests(student.interests || []);
        }
        // Set custom topic from description
        if (sug.description) setCustomTopic(sug.description);
        // Set career pathway from career_connection
        if (sug.career_connection) {
          const pathwayMatch = CAREER_PATHWAYS.find(p =>
            p.label.toLowerCase().includes(sug.career_connection.toLowerCase()) ||
            sug.career_connection.toLowerCase().includes(p.label.toLowerCase())
          );
          if (pathwayMatch) setSelectedPathways([pathwayMatch.id]);
          else setCustomCareer(sug.career_connection);
        }
        // Mark as converted
        supabase.from('project_suggestions').update({ status: 'converted' }).eq('id', sug.id);
      });
  }, [searchParams, students, studentsLoading]);

  // Derived: selected students array
  const selectedStudents =
    questType === 'individual'
      ? students.filter((s) => s.id === selectedStudentId)
      : students.filter((s) => selectedStudentIds.includes(s.id));

  const selectedStudentIdsForSave =
    questType === 'individual'
      ? selectedStudentId
        ? [selectedStudentId]
        : []
      : selectedStudentIds;

  // Generation effect
  const runGeneration = useCallback(async () => {
    setGenError(null);
    setProgress(0);

    // Start progress animation: 0 → 90 with decelerating curve over ~45s
    // Moves quickly at first (feels responsive) then slows down so it
    // never reaches 90 before the API returns
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      // Logarithmic ease-out: fast start, very slow finish
      // At 5s → ~40%, 15s → ~65%, 30s → ~80%, 60s → ~88%
      const pct = Math.min(90, 90 * (1 - Math.exp(-elapsed / 12000)));
      setProgress(Math.round(pct));
      if (pct < 89.5) {
        progressRef.current = requestAnimationFrame(tick);
      }
    };
    progressRef.current = requestAnimationFrame(tick);

    // Cycle loading texts every 3.5s
    let textIdx = 0;
    setLoadingTextIdx(0);
    textRef.current = setInterval(() => {
      textIdx = (textIdx + 1) % LOADING_TEXTS.length;
      setLoadingTextIdx(textIdx);
    }, 3500);

    try {
      const pathwayLabels = selectedPathways
        .map((id) => CAREER_PATHWAYS.find((p) => p.id === id)?.label)
        .filter(Boolean);
      if (customCareer.trim()) pathwayLabels.push(customCareer.trim());

      const standardsStr = selectedStandards.length > 0
        ? selectedStandards.map((s) => `${s.id}: ${s.description}`).join('; ')
        : customTopic.trim() || 'general inquiry skills';

      // Fetch student standards profiles if available
      let studentStandardsProfiles = null;
      try {
        const stdResults = await Promise.all(
          selectedStudents.map(s =>
            supabase
              .from('student_standards')
              .select('*')
              .eq('student_id', s.id)
              .eq('status', 'active')
              .then(({ data }) => ({ studentName: s.name, standards: data || [] }))
          )
        );
        if (stdResults.some(r => r.standards.length > 0)) {
          studentStandardsProfiles = stdResults;
        }
      } catch (e) {
        // Non-critical — continue without profiles
      }

      const questData = isBranching
        ? await ai.generateBranchingQuest({
            students: selectedStudents,
            standards: standardsStr,
            pathway: pathwayLabels.length > 0 ? pathwayLabels.join(', ') : 'none',
            type: questType,
            count: selectedStudents.length,
            studentStandardsProfiles,
            additionalContext,
            projectMode,
          })
        : await ai.generateQuest({
            students: selectedStudents,
            standards: standardsStr,
            pathway: pathwayLabels.length > 0 ? pathwayLabels.join(', ') : 'none',
            type: questType,
            count: selectedStudents.length,
            studentStandardsProfiles,
            additionalContext,
            useRealWorld,
            projectMode,
          });

      cancelAnimationFrame(progressRef.current);
      clearInterval(textRef.current);

      // Animate to 100%
      setProgress(100);
      setGeneratedQuest(questData);

      // Fire off world scene generation in background (non-blocking)
      setWorldError(null);
      setWorldRegenCount(0);
      const studentInterests = selectedStudents.flatMap(s => [...(s.interests || []), ...(s.passions || [])]);
      ai.generateWorldScene({
        questTitle: questData.quest_title,
        stages: questData.stages,
        studentInterests,
        careerPathway: pathwayLabels[0] || 'none',
        gradeBand: selectedStudents[0]?.grade_band || '6-8',
      }).then(async sceneData => {
        if (!sceneData) { setWorldError('Scene description failed'); return; }
        try {
          const image = await generateWorldImage(sceneData.image_prompt);
          if (!image) throw new Error('No image returned');
          setGeneratedQuest(prev => prev ? ({
            ...prev,
            _worldScene: { ...sceneData, _imageBase64: image.base64, _imageMime: image.mimeType },
          }) : prev);
        } catch (imgErr) {
          // Image generation failed — save hotspot data but show error
          setGeneratedQuest(prev => prev ? ({ ...prev, _worldScene: sceneData }) : prev);
          setWorldError(imgErr.message || 'Image generation failed');
        }
      }).catch((err) => { setWorldError(err.message || 'World generation failed'); });

      // Auto-advance after 600ms
      setTimeout(() => setStep(6), 600);
    } catch (err) {
      cancelAnimationFrame(progressRef.current);
      clearInterval(textRef.current);
      setGenError(err?.message || 'Something went wrong. Please try again.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterests, selectedStudents, selectedStandards, selectedPathways, customCareer, questType]);

  useEffect(() => {
    if (step === 5) {
      runGeneration();
    }
    return () => {
      cancelAnimationFrame(progressRef.current);
      clearInterval(textRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Save quest (shared by launch and draft)
  const saveQuest = async (status) => {
    if (!generatedQuest) return null;
    setSaveError(null);
    setLaunching(true);
    try {
      // Save quest
      const { data: quest, error: questError } = await supabase
        .from('quests')
        .insert({
          guide_id: user.id,
          title: generatedQuest.quest_title,
          subtitle: generatedQuest.quest_subtitle,
          narrative_hook: generatedQuest.narrative_hook,
          career_pathway: selectedPathways[0] || null,
          quest_type: questType,
          status,
          total_duration_days: generatedQuest.total_duration,
          academic_standards: selectedStandards.map((s) => s.id),
          reflection_prompts: generatedQuest.reflection_prompts,
          parent_summary: generatedQuest.parent_summary,
          project_mode: projectMode,
        })
        .select()
        .single();

      if (questError) throw questError;

      // Save stages
      if (generatedQuest.stages?.length) {
        const VALID_STAGE_TYPES = ['research', 'build', 'experiment', 'simulate', 'reflect', 'present', 'puzzle_gate', 'choice_fork', 'evidence_board'];
        // Map common AI-returned aliases to valid types
        const STAGE_TYPE_MAP = {
          create: 'build', investigate: 'research', explore: 'research',
          design: 'build', make: 'build', analyze: 'research', discuss: 'reflect',
          share: 'present', write: 'reflect', test: 'experiment',
        };
        const sanitizeType = (t) => {
          if (!t) return 'research';
          const lower = t.toLowerCase();
          if (VALID_STAGE_TYPES.includes(lower)) return lower;
          return STAGE_TYPE_MAP[lower] || 'research';
        };

        const { data: savedStages, error: stagesError } = await supabase.from('quest_stages').insert(
          generatedQuest.stages.map((s, i) => ({
            quest_id: quest.id,
            stage_number: s.stage_number || i + 1,
            title: s.stage_title || s.title || `Stage ${i + 1}`,
            stage_type: sanitizeType(s.stage_type),
            duration_days: typeof s.duration === 'number' ? s.duration : parseInt(s.duration) || 1,
            description: s.description || '',
            academic_skills: Array.isArray(s.academic_skills_embedded) ? s.academic_skills_embedded : [],
            skill_note: s.skill_integration_note || null,
            deliverable: s.deliverable || null,
            guiding_questions: Array.isArray(s.guiding_questions) ? s.guiding_questions : [],
            resources: Array.isArray(s.resources_needed) ? s.resources_needed : [],
            stretch_challenge: s.stretch_challenge || null,
            sources: Array.isArray(s.sources) ? s.sources : [],
            status: i === 0 ? 'active' : 'locked',
          }))
        ).select();
        if (stagesError) throw stagesError;

        // Generate treasure map landmarks (non-blocking)
        if (savedStages?.length) {
          try {
            const landmarkData = await ai.generateLandmarks(savedStages);
            if (landmarkData.length > 0) {
              const landmarkRows = landmarkData.map(l => {
                const matchingStage = savedStages.find(s => s.stage_number === l.stage_number);
                return matchingStage ? {
                  stage_id: matchingStage.id,
                  landmark_type: l.landmark_type,
                  landmark_name: l.landmark_name,
                  narrative_hook: l.narrative_hook,
                  ambient_sound: l.ambient_sound || null,
                } : null;
              }).filter(Boolean);
              await landmarksApi.bulkUpsert(landmarkRows);
            }
          } catch (e) {
            console.warn('Landmark generation failed (non-blocking):', e);
          }

          // Generate interactive data for special stage types
          for (const stage of savedStages) {
            if (['puzzle_gate', 'choice_fork', 'evidence_board'].includes(stage.stage_type)) {
              try {
                const config = await ai.generateInteractiveData(stage, stage.stage_type);
                await interactiveStages.upsert(stage.id, stage.stage_type, config);
              } catch (e) {
                console.warn(`Interactive data generation failed for stage ${stage.stage_number}:`, e);
              }
            }
          }

          // Save expedition challenges (non-blocking)
          try {
            const challengesToSave = [];
            savedStages.forEach(saved => {
              const originalStage = generatedQuest.stages.find(s => s.stage_number === saved.stage_number);
              if (originalStage?.expedition_challenge) {
                const ec = originalStage.expedition_challenge;
                challengesToSave.push({
                  stage_id: saved.id,
                  challenge_type: ec.challenge_type || 'estimate',
                  challenge_text: ec.challenge_text,
                  challenge_config: ec.challenge_config || {},
                  target_skill_ids: ec.target_skills || [],
                  difficulty: ec.difficulty || 'standard',
                  ep_reward: 15,
                });
              }
            });
            if (challengesToSave.length > 0) {
              await expeditionChallenges.bulkCreate(challengesToSave);
            }
          } catch (e) {
            console.warn('Expedition challenges save failed (non-blocking):', e);
          }

          // Upload world scene image and save to quest (non-blocking)
          if (generatedQuest._worldScene?._imageBase64) {
            try {
              const sceneUrl = await uploadWorldScene(quest.id, generatedQuest._worldScene._imageBase64, generatedQuest._worldScene._imageMime);
              await supabase.from('quests').update({
                world_scene_url: sceneUrl,
                world_hotspots: generatedQuest._worldScene.hotspots || [],
                world_scene_prompt: generatedQuest._worldScene.image_prompt || '',
              }).eq('id', quest.id);
            } catch (e) {
              console.warn('World scene save failed (non-blocking):', e);
            }
          }

          // Save branch relationships for branching quests (non-blocking)
          if (isBranching && generatedQuest?.is_branching) {
            try {
              // Set is_branching on the quest
              await supabase.from('quests').update({ is_branching: true }).eq('id', quest.id);

              // Build stage ID map (stage_id string → saved UUID)
              const stageIdMap = {};
              savedStages.forEach(saved => {
                const originalStage = generatedQuest.stages?.find(s =>
                  s.stage_id === String(saved.stage_number) || s.stage_title === saved.title
                );
                if (originalStage?.stage_id) stageIdMap[originalStage.stage_id] = saved.id;
              });

              // Save branches
              const branchRows = [];
              (generatedQuest.stages || []).forEach(stage => {
                if (stage.branches?.length > 0 && stage.stage_id) {
                  const parentId = stageIdMap[stage.stage_id];
                  if (!parentId) return;
                  stage.branches.forEach((branch, idx) => {
                    branchRows.push({
                      stage_id: parentId,
                      branch_index: idx,
                      branch_label: branch.label || '',
                      branch_description: branch.description || '',
                      next_stage_id: stageIdMap[branch.next_stage] || null,
                      narrative_variant: branch.narrative_variant || null,
                    });
                  });
                }
              });

              if (branchRows.length > 0) {
                await stageBranches.bulkCreate(branchRows);
              }
            } catch (e) {
              console.warn('Branch relationships save failed (non-blocking):', e);
            }
          }
        }
      }

      // Save simulation (non-blocking)
      if (selectedPathways.length > 0 && generatedQuest.career_simulation) {
        try {
          await supabase.from('career_simulations').insert({
            quest_id: quest.id,
            ...generatedQuest.career_simulation,
            status: 'locked',
          });
        } catch (e) {
          console.warn('Simulation save failed (non-blocking):', e);
        }
      }

      // Assign students (non-blocking)
      if (selectedStudentIdsForSave.length) {
        try {
          await supabase.from('quest_students').insert(
            selectedStudentIdsForSave.map((sid) => ({ quest_id: quest.id, student_id: sid }))
          );
        } catch (e) {
          console.warn('Student assignment failed (non-blocking):', e);
        }
      }

      // Save guide playbook if generated (non-blocking)
      if (generatedQuest.playbookDays?.length > 0) {
        try {
          await guidePlaybook.bulkUpsert(quest.id, generatedQuest.playbookDays);
        } catch (e) {
          console.warn('Playbook save failed (non-blocking):', e);
        }
      }

      // Link back to year plan if generated from one
      if (yearPlanItemRef.current) {
        yearPlanItems.linkToQuest(yearPlanItemRef.current, quest.id).catch(console.warn);
        yearPlanItemRef.current = null;
      }

      return quest.id;
    } catch (err) {
      console.error('saveQuest error:', err);
      setSaveError(typeof err?.message === 'string' ? err.message : 'Failed to save quest. Check console for details.');
      return null;
    } finally {
      setLaunching(false);
    }
  };

  const handleLaunch = async () => {
    try {
      const id = await saveQuest('active');
      if (id) {
        setLaunchedQuestId(id);
        setStep(7);
      }
    } catch (err) {
      console.error('handleLaunch error:', err);
      setSaveError('Launch failed unexpectedly. Please try again.');
      setLaunching(false);
    }
  };

  const handleDraft = async () => {
    try {
      const id = await saveQuest('draft');
      if (id) {
        setLaunchedQuestId(id);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('handleDraft error:', err);
      setSaveError('Save as draft failed unexpectedly. Please try again.');
      setLaunching(false);
    }
  };

  const [addedToLibrary, setAddedToLibrary] = useState(false);

  const handleAddToLibrary = async () => {
    if (!generatedQuest) return;
    const { error } = await supabase.from('quest_templates').insert({
      guide_id: user.id,
      title: generatedQuest.quest_title,
      subtitle: generatedQuest.quest_subtitle,
      narrative_hook: generatedQuest.narrative_hook,
      career_pathway: selectedPathways[0] || null,
      quest_type: questType,
      total_duration_days: generatedQuest.total_duration,
      academic_standards: selectedStandards.map((s) => s.id),
      interest_tags: selectedInterests,
      grade_band: selectedStudents[0]?.grade_band || '3-5',
      usage_count: 0,
      is_public: false,
      author_name: profile?.full_name || null,
      stages_data: generatedQuest.stages || [],
      simulation_data: generatedQuest.career_simulation || null,
    });
    if (error) {
      console.error('Add to Library error:', error.message);
    } else {
      setAddedToLibrary(true);
    }
  };

  const handleRegenerate = () => {
    setStep(4); // Go to "Anything Else?" so guide can refine before re-generating
  };

  const handleSkipPathway = () => {
    setSelectedPathways([]);
    setCustomCareer('');
    setStep(4);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes checkDraw {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Page background */}
      <div style={{ minHeight: '100vh', backgroundColor: T.paper, fontFamily: 'var(--font-body)' }}>

        {/* TopBar */}
        <div
          style={{
            backgroundColor: T.chalk,
            borderBottom: '1px solid var(--pencil)',
            padding: '0 24px',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Link
            to="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              textDecoration: 'none',
            }}
          >
            <WayfinderLogoIcon size={22} color={T.ink} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: T.ink,
              letterSpacing: '-0.02em',
            }}>
              Wayfinder
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--graphite)',
                textDecoration: 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              <ChevronLeft size={14} />
              Dashboard
            </Link>
            {profile && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lab-blue)', color: 'var(--chalk)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', userSelect: 'none', flexShrink: 0 }}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : getInitials(profile.full_name)
                }
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            maxWidth: step === 6 ? 900 : 640,
            margin: '0 auto',
            padding: '40px 24px',
          }}
        >
          {/* Step indicator (hide on step 5 generating and step 7 launched) */}
          {step !== 5 && step !== 7 && (
            <StepIndicator current={step} />
          )}

          {/* Step card */}
          <div
            style={{
              backgroundColor: T.chalk,
              borderRadius: 16,
              padding: step === 5 ? '40px 32px' : '32px',
              border: `1px solid ${T.parchment}`,
              boxShadow: '0 1px 6px rgba(26,26,46,0.06)',
            }}
          >
            {step === 1 && (
              <Step1Students
                students={students}
                studentsLoading={studentsLoading}
                questType={questType}
                setQuestType={(t) => { setQuestType(t); setSelectedStudentId(null); setSelectedStudentIds([]); setSelectedInterests([]); }}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
                selectedStudentIds={selectedStudentIds}
                setSelectedStudentIds={setSelectedStudentIds}
                selectedInterests={selectedInterests}
                setSelectedInterests={setSelectedInterests}
                onNext={() => setStep(2)}
              />
            )}

            {step === 2 && (
              <Step2Skills
                selectedStandards={selectedStandards}
                setSelectedStandards={setSelectedStandards}
                customTopic={customTopic}
                setCustomTopic={setCustomTopic}
                selectedStudents={selectedStudents}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}

            {step === 3 && (
              <Step3Pathway
                selectedPathways={selectedPathways}
                setSelectedPathways={setSelectedPathways}
                customCareer={customCareer}
                setCustomCareer={setCustomCareer}
                onBack={() => setStep(2)}
                onNext={() => setStep(4)}
                onSkip={handleSkipPathway}
                selectedStudents={selectedStudents}
                selectedStandards={selectedStandards}
              />
            )}

            {step === 4 && (
              <Step4AnythingElse
                additionalContext={additionalContext}
                setAdditionalContext={setAdditionalContext}
                useRealWorld={useRealWorld}
                setUseRealWorld={setUseRealWorld}
                projectMode={projectMode}
                setProjectMode={setProjectMode}
                isBranching={isBranching}
                setIsBranching={setIsBranching}
                onBack={() => setStep(3)}
                onNext={() => setStep(5)}
              />
            )}

            {step === 5 && (
              <Step5Generating
                progress={progress}
                loadingText={LOADING_TEXTS[loadingTextIdx]}
                error={genError}
                onRegenerate={runGeneration}
              />
            )}

            {step === 6 && generatedQuest && (
              <Step6Review
                generatedQuest={generatedQuest}
                setGeneratedQuest={setGeneratedQuest}
                selectedStandards={selectedStandards}
                selectedPathways={selectedPathways}
                questType={questType}
                selectedStudents={selectedStudents}
                allStudents={students}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
                selectedStudentIds={selectedStudentIds}
                setSelectedStudentIds={setSelectedStudentIds}
                setQuestType={setQuestType}
                onLaunch={handleLaunch}
                onDraft={handleDraft}
                onRegenerate={handleRegenerate}
                onAddToLibrary={handleAddToLibrary}
                launching={launching}
                saveError={saveError}
              />
            )}

            {step === 7 && (
              <Step7Launch
                selectedStudents={selectedStudents}
                questId={launchedQuestId}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
