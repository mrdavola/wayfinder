import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Check, ArrowLeft, ArrowRight,
  Sparkles, Loader2, AlertCircle, X, Plus, Users, Trophy,
  BookOpen, FlaskConical, Microscope, Presentation, NotebookPen,
  Rocket,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ai } from '../../lib/api';
import { getStudentSession } from '../../lib/studentSession';
import { CAREER_PATHWAYS, PATHWAY_CATEGORIES } from '../../data/careerPathways';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', labBlue: '#1B4965', compassGold: '#B8860B',
  specimenRed: '#C0392B',
};

const STEP_LABELS = ['Interests', 'Career', 'Details', 'Generating', 'Review'];

const STAGE_ICONS = {
  research: BookOpen, experiment: FlaskConical, simulate: Microscope,
  present: Presentation, reflect: NotebookPen,
};

function StageTypeIcon({ type, size = 14 }) {
  const Icon = STAGE_ICONS[type] || BookOpen;
  return <Icon size={size} />;
}

// ── Step indicator ──
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 32, gap: 0 }}>
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: isDone ? T.fieldGreen : isActive ? T.compassGold : 'transparent',
                border: `2px solid ${isDone ? T.fieldGreen : isActive ? T.compassGold : T.pencil}`,
                transition: 'all 0.2s',
              }}>
                {isDone ? (
                  <Check size={13} color={T.chalk} strokeWidth={2.5} />
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? T.chalk : T.pencil, fontFamily: 'var(--font-mono)' }}>
                    {stepNum}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 9, fontWeight: isActive ? 700 : 400,
                color: isActive ? T.ink : isDone ? T.fieldGreen : T.pencil,
                whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
              }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                height: 2, width: 28,
                backgroundColor: isDone ? T.fieldGreen : T.parchment,
                marginTop: 12, flexShrink: 0, transition: 'background-color 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Chip input with AI suggestions ──
function ChipInput({ label, placeholder, chips, setChips, suggestions, aiLoading, onRequestSuggestions }) {
  const [inputVal, setInputVal] = useState('');

  const addChip = (val) => {
    const trimmed = val.trim();
    if (trimmed && !chips.includes(trimmed)) setChips([...chips, trimmed]);
    setInputVal('');
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6, fontFamily: 'var(--font-body)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {chips.map(c => (
          <span key={c} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 20,
            background: `${T.compassGold}15`, color: T.ink,
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
          }}>
            {c}
            <button onClick={() => setChips(chips.filter(x => x !== c))} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: T.graphite, display: 'flex',
            }}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && inputVal.trim()) { e.preventDefault(); addChip(inputVal); }
          }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: `1.5px solid ${T.pencil}`, background: T.chalk,
            fontSize: 13, fontFamily: 'var(--font-body)', color: T.ink,
          }}
        />
        {inputVal.trim() && (
          <button onClick={() => addChip(inputVal)} style={{
            padding: '10px 14px', borderRadius: 8, border: 'none',
            background: T.compassGold, color: T.ink, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
          }}>
            Add
          </button>
        )}
      </div>
      {/* AI suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: 10, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Suggestions:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {suggestions.filter(s => !chips.includes(s)).map(s => (
              <button key={s} onClick={() => addChip(s)} style={{
                padding: '3px 10px', borderRadius: 16,
                border: `1px dashed ${T.compassGold}`, background: 'transparent',
                color: T.compassGold, fontSize: 11, fontWeight: 500,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                transition: 'all 150ms',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `${T.compassGold}10`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
      {onRequestSuggestions && (
        <button onClick={onRequestSuggestions} disabled={aiLoading} style={{
          marginTop: 8, padding: '5px 12px', borderRadius: 6,
          border: `1px solid ${T.pencil}`, background: 'transparent',
          color: T.graphite, fontSize: 11, cursor: aiLoading ? 'wait' : 'pointer',
          fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {aiLoading ? <><Loader2 size={11} style={{ animation: 'spb-spin 1s linear infinite' }} /> Thinking...</> : <><Sparkles size={11} /> Suggest more</>}
        </button>
      )}
    </div>
  );
}

// ── Step 1: Interests & Skills ──
function Step1Interests({ interests, setInterests, skills, setSkills, profile, interestSuggestions, skillSuggestions, aiLoading, onSuggestInterests, onSuggestSkills }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        What excites you?
      </h2>
      <p style={{ fontSize: 13, color: T.graphite, lineHeight: 1.6, marginBottom: 24 }}>
        Tell us what you're curious about and what skills you want to build. We'll design a project around you.
      </p>

      <ChipInput
        label="Your interests"
        placeholder="Type an interest and press Enter..."
        chips={interests}
        setChips={setInterests}
        suggestions={interestSuggestions}
        aiLoading={aiLoading === 'interests'}
        onRequestSuggestions={onSuggestInterests}
      />

      <ChipInput
        label="Skills you want to practice"
        placeholder="e.g. writing, public speaking, data analysis..."
        chips={skills}
        setChips={setSkills}
        suggestions={skillSuggestions}
        aiLoading={aiLoading === 'skills'}
        onRequestSuggestions={onSuggestSkills}
      />
    </div>
  );
}

// ── Step 2: Career interests ──
function Step2Career({ selectedPathways, setSelectedPathways, pathwaySuggestions, interests }) {
  const [catFilter, setCatFilter] = useState('suggested');

  const suggestedIds = pathwaySuggestions.map(p => p.id);
  const filtered = catFilter === 'suggested'
    ? CAREER_PATHWAYS.filter(p => suggestedIds.includes(p.id))
    : catFilter === 'all'
      ? CAREER_PATHWAYS
      : CAREER_PATHWAYS.filter(p => p.category === catFilter);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        Career connections
      </h2>
      <p style={{ fontSize: 13, color: T.graphite, lineHeight: 1.6, marginBottom: 20 }}>
        Pick careers that sound interesting — your project will connect to real-world work in these fields.
      </p>

      {/* Category filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <button
          onClick={() => setCatFilter('suggested')}
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            border: catFilter === 'suggested' ? `2px solid ${T.compassGold}` : `1px solid ${T.pencil}`,
            background: catFilter === 'suggested' ? `${T.compassGold}15` : 'transparent',
            color: catFilter === 'suggested' ? T.compassGold : T.graphite,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Sparkles size={11} /> For You
        </button>
        {[{ id: 'all', label: 'All' }, ...PATHWAY_CATEGORIES.filter(c => c.id !== 'all')].map(cat => (
          <button key={cat.id} onClick={() => setCatFilter(cat.id)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            border: catFilter === cat.id ? `2px solid ${T.ink}` : `1px solid ${T.pencil}`,
            background: catFilter === cat.id ? `${T.ink}08` : 'transparent',
            color: catFilter === cat.id ? T.ink : T.graphite,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pathway grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
        {filtered.map(pw => {
          const selected = selectedPathways.includes(pw.id);
          const Icon = pw.Icon;
          return (
            <button
              key={pw.id}
              onClick={() => setSelectedPathways(
                selected ? selectedPathways.filter(p => p !== pw.id) : [...selectedPathways, pw.id]
              )}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                border: selected ? `2px solid ${pw.color}` : `1px solid ${T.pencil}`,
                background: selected ? `${pw.color}08` : T.chalk,
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${pw.color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} color={pw.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                  {pw.label}
                </div>
                <div style={{ fontSize: 9, color: T.graphite, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pw.tags}
                </div>
              </div>
              {selected && <Check size={14} color={pw.color} />}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setCatFilter('all')}
        style={{
          marginTop: 10, fontSize: 12, color: T.labBlue, background: 'none',
          border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
          padding: 0, display: catFilter === 'all' ? 'none' : 'inline',
        }}
      >
        Browse all careers →
      </button>

      {/* Custom pathway input */}
      <CustomPathwayInput selectedPathways={selectedPathways} setSelectedPathways={setSelectedPathways} />
    </div>
  );
}

function CustomPathwayInput({ selectedPathways, setSelectedPathways }) {
  const [val, setVal] = useState('');
  const customPathways = selectedPathways.filter(p => !CAREER_PATHWAYS.find(cp => cp.id === p));

  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
        Don't see your career? Add your own:
      </label>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && val.trim()) {
              e.preventDefault();
              const id = val.trim().toLowerCase().replace(/\s+/g, '_');
              if (!selectedPathways.includes(id)) setSelectedPathways([...selectedPathways, id]);
              setVal('');
            }
          }}
          placeholder="e.g. Magician, Space Chef..."
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8,
            border: `1.5px solid ${T.pencil}`, background: T.chalk,
            fontSize: 12, fontFamily: 'var(--font-body)', color: T.ink,
          }}
        />
      </div>
      {customPathways.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {customPathways.map(cp => (
            <span key={cp} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              background: `${T.labBlue}12`, color: T.labBlue,
              fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-body)',
            }}>
              {cp.replace(/_/g, ' ')}
              <button onClick={() => setSelectedPathways(selectedPathways.filter(p => p !== cp))} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.graphite, display: 'flex',
              }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Additional context + buddy ──
function Step3Details({ additionalContext, setAdditionalContext, buddyEnabled, suggestedBuddy, onAcceptBuddy, onSkipBuddy, buddyAccepted }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        Anything else?
      </h2>
      <p style={{ fontSize: 13, color: T.graphite, lineHeight: 1.6, marginBottom: 20 }}>
        Add any extra details about what you want your project to focus on.
      </p>

      <textarea
        value={additionalContext}
        onChange={e => setAdditionalContext(e.target.value)}
        placeholder="e.g. I want to build something real, I learn best with hands-on experiments, I want to do interviews..."
        rows={4}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 14px', borderRadius: 10,
          border: `1.5px solid ${T.pencil}`, background: T.chalk,
          fontSize: 13, fontFamily: 'var(--font-body)', color: T.ink,
          lineHeight: 1.6, resize: 'vertical',
        }}
      />

      {/* Buddy pairing suggestion */}
      {buddyEnabled && suggestedBuddy && !buddyAccepted && (
        <div style={{
          marginTop: 24, padding: '16px 18px', borderRadius: 12,
          background: `${T.labBlue}06`, border: `1px solid ${T.labBlue}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Users size={14} color={T.labBlue} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.labBlue, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suggested Project Buddy
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            background: T.chalk, borderRadius: 8, marginBottom: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `${T.labBlue}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: T.labBlue,
              fontFamily: 'var(--font-mono)',
            }}>
              {suggestedBuddy.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{suggestedBuddy.name}</div>
              <div style={{ fontSize: 11, color: T.graphite, lineHeight: 1.4, marginTop: 2 }}>
                {suggestedBuddy.reason}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onAcceptBuddy} style={{
              flex: 1, padding: '10px', borderRadius: 8, border: 'none',
              background: T.labBlue, color: T.chalk,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              Work together
            </button>
            <button onClick={onSkipBuddy} style={{
              flex: 1, padding: '10px', borderRadius: 8,
              border: `1px solid ${T.pencil}`, background: 'transparent',
              color: T.graphite, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}>
              Solo project
            </button>
          </div>
        </div>
      )}

      {buddyAccepted && suggestedBuddy && (
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 8,
          background: `${T.fieldGreen}08`, border: `1px solid ${T.fieldGreen}30`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Check size={14} color={T.fieldGreen} />
          <span style={{ fontSize: 12, color: T.fieldGreen, fontWeight: 600 }}>
            Working with {suggestedBuddy.name}
          </span>
          <button onClick={onSkipBuddy} style={{
            marginLeft: 'auto', fontSize: 11, color: T.graphite,
            background: 'none', border: 'none', cursor: 'pointer',
          }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Generating ──
const GEN_STEPS = [
  'Understanding your interests...',
  'Finding real-world career connections...',
  'Designing your project stages...',
  'Adding guiding questions...',
  'Polishing everything...',
];

function Step4Generating() {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const durations = [3000, 4000, 5000, 3000, 5000];
    let total = 0;
    const timeouts = durations.map((d, i) => {
      total += d;
      return setTimeout(() => setStepIdx(Math.min(i + 1, GEN_STEPS.length - 1)), total);
    });
    return () => timeouts.forEach(clearTimeout);
  }, []);

  const estimateLeft = Math.max(0, 15 - elapsed);

  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
        <Rocket size={40} color={T.compassGold} style={{ animation: 'spb-float 2s ease-in-out infinite' }} />
      </div>
      <p style={{ fontSize: 16, color: T.ink, fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 8 }}>
        Building your project...
      </p>
      <p style={{ fontSize: 13, color: T.graphite, marginBottom: 20 }}>
        {GEN_STEPS[stepIdx]}
      </p>
      <div style={{
        width: '70%', maxWidth: 280, height: 5, background: T.parchment,
        borderRadius: 3, margin: '0 auto 14px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: T.compassGold, borderRadius: 3,
          width: `${Math.min(95, (elapsed / 18) * 100)}%`,
          transition: 'width 1s ease',
        }} />
      </div>
      <p style={{ fontSize: 11, color: T.pencil, margin: 0 }}>
        {estimateLeft > 0 ? `About ${estimateLeft} seconds left` : 'Almost there...'}
      </p>
    </div>
  );
}

// ── Step 5: Review (student-friendly) ──
function Step5Review({ result, error, onPublish, publishing, buddyName }) {
  const [openStage, setOpenStage] = useState(null);
  if (!result) return null;
  const stages = result.stages || [];

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: '0 0 6px' }}>
        Your project is ready!
      </h2>
      <p style={{ fontSize: 13, color: T.graphite, lineHeight: 1.6, marginBottom: 20 }}>
        Here's what we designed for you. Look it over — then launch it when you're ready.
      </p>

      {/* Project header */}
      <div style={{
        background: T.chalk, border: `1px solid ${T.pencil}`,
        borderRadius: 12, padding: '18px 20px', marginBottom: 20,
      }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: '0 0 6px' }}>
          {result.quest_title}
        </h1>
        <p style={{ fontSize: 13, color: T.graphite, fontFamily: 'var(--font-body)', margin: '0 0 14px' }}>
          {result.quest_subtitle}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
            {stages.length} stages · ~{result.total_duration || 10} days
          </span>
          {buddyName && (
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: `${T.labBlue}12`, color: T.labBlue,
              fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Users size={11} /> with {buddyName}
            </span>
          )}
        </div>

        {/* Story hook */}
        <div style={{
          background: T.parchment, borderLeft: `4px solid ${T.compassGold}`,
          borderRadius: '0 8px 8px 0', padding: '12px 14px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.compassGold, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Your Story
          </div>
          <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, margin: 0 }}>
            {result.narrative_hook}
          </p>
        </div>
      </div>

      {/* Journey map — dots with lines */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {stages.map((stage, i) => {
            const isLast = i === stages.length - 1;
            return (
              <div key={i} style={{ display: 'contents' }}>
                <div
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => setOpenStage(openStage === i ? null : i)}
                >
                  {isLast ? (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      backgroundColor: T.compassGold, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 0 3px ${T.compassGold}30`,
                    }}>
                      <Trophy size={14} color={T.chalk} />
                    </div>
                  ) : (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      backgroundColor: openStage === i ? T.compassGold : T.ink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 150ms',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                    </div>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div style={{ flex: 1, height: 0, borderTop: `2px dashed ${T.pencil}`, minWidth: 6 }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: 6 }}>
          {stages.map((stage, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div
                onClick={() => setOpenStage(openStage === i ? null : i)}
                style={{ flexShrink: 0, width: 34, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 8, color: T.graphite, fontFamily: 'var(--font-body)', textAlign: 'center', lineHeight: 1.2, display: 'block', wordBreak: 'break-word' }}>
                  {stage.stage_title}
                </span>
              </div>
              {i < stages.length - 1 && <div style={{ flex: 1, minWidth: 6 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Stage cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {stages.map((stage, i) => {
          const isOpen = openStage === i;
          return (
            <div key={i} style={{
              border: `1px solid ${T.pencil}`, borderRadius: 10, overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenStage(isOpen ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  background: isOpen ? T.parchment : T.chalk,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: T.ink, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.chalk, fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                    {stage.stage_title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <StageTypeIcon type={stage.stage_type} size={11} />
                      <span style={{ fontSize: 10, color: T.graphite, textTransform: 'capitalize' }}>{stage.stage_type}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
                      ~{stage.duration} days
                    </span>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />}
              </button>

              {isOpen && (
                <div style={{ padding: 14, borderTop: `1px solid ${T.pencil}` }}>
                  <p style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, margin: '0 0 12px' }}>
                    {stage.description}
                  </p>

                  {(stage.guiding_questions || []).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.compassGold, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                        Questions to explore
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {stage.guiding_questions.map((q, qi) => (
                          <li key={qi} style={{ fontSize: 12, color: T.graphite, marginBottom: 3, lineHeight: 1.5 }}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {stage.deliverable && (
                    <div style={{
                      background: `${T.fieldGreen}08`, borderRadius: 8,
                      padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.fieldGreen, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', marginTop: 1 }}>
                        What you'll create:
                      </div>
                      <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.5 }}>
                        {stage.deliverable}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: T.specimenRed, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function StudentProjectBuilder() {
  const navigate = useNavigate();
  const session = getStudentSession();

  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedPathways, setSelectedPathways] = useState([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [aiLoading, setAiLoading] = useState(null);

  // Profile data
  const [profile, setProfile] = useState(null);
  const [interestSuggestions, setInterestSuggestions] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [pathwaySuggestions, setPathwaySuggestions] = useState([]);

  // Buddy
  const [buddyEnabled, setBuddyEnabled] = useState(false);
  const [suggestedBuddy, setSuggestedBuddy] = useState(null);
  const [buddyAccepted, setBuddyAccepted] = useState(false);
  const [classmates, setClassmates] = useState([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!session?.studentId) {
      navigate('/student/login', { replace: true });
      return;
    }
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: student } = await supabase
      .from('students')
      .select('id, name, age, grade_band, interests, passions, about_me, guide_id, allow_ai_guide')
      .eq('id', session.studentId)
      .single();

    if (student) {
      setProfile(student);
      // Pre-populate from profile
      const profileInterests = [...(student.interests || []), ...(student.passions || [])].filter(Boolean);
      if (profileInterests.length) setInterestSuggestions(profileInterests);

      // Load classmates for buddy pairing
      if (student.guide_id) {
        const { data: mates } = await supabase
          .from('students')
          .select('id, name, interests, passions, about_me, grade_band')
          .eq('guide_id', student.guide_id)
          .neq('id', student.id);
        if (mates) setClassmates(mates);

        // Check if buddy pairing is enabled (guide-level setting)
        // For now check if guide has enabled it — we'll use a simple approach
        const { data: guideProfile } = await supabase
          .from('profiles')
          .select('buddy_pairing_enabled')
          .eq('id', student.guide_id)
          .single();
        if (guideProfile?.buddy_pairing_enabled) setBuddyEnabled(true);
      }
    }
  }

  async function suggestInterests() {
    if (!profile) return;
    setAiLoading('interests');
    try {
      const text = await ai.chat({
        systemPrompt: 'You suggest learning interests for students. Return ONLY a JSON array of 5-6 interest strings based on the student profile. No other text.',
        messages: [{ role: 'user', content: `Student: ${profile.name}, age ${profile.age || 10}. Current interests: ${(profile.interests || []).join(', ') || 'none listed'}. Passions: ${(profile.passions || []).join(', ') || 'none'}. Already selected: ${interests.join(', ') || 'none'}. Suggest 5-6 NEW interests they might enjoy.` }],
      });
      const match = text.match(/\[[\s\S]*\]/);
      if (match) setInterestSuggestions(prev => [...new Set([...prev, ...JSON.parse(match[0])])]);
    } catch (e) { console.error(e); }
    setAiLoading(null);
  }

  async function suggestSkills() {
    setAiLoading('skills');
    try {
      const text = await ai.chat({
        systemPrompt: 'You suggest learning skills for students. Return ONLY a JSON array of 5-6 skill strings. No other text.',
        messages: [{ role: 'user', content: `Student interests: ${interests.join(', ')}. Already selected skills: ${skills.join(', ') || 'none'}. Suggest 5-6 complementary skills.` }],
      });
      const match = text.match(/\[[\s\S]*\]/);
      if (match) setSkillSuggestions(prev => [...new Set([...prev, ...JSON.parse(match[0])])]);
    } catch (e) { console.error(e); }
    setAiLoading(null);
  }

  async function suggestPathways() {
    try {
      const allPathwayLabels = CAREER_PATHWAYS.map(p => p.id).join(', ');
      const text = await ai.chat({
        systemPrompt: `You match student interests to career pathways. Given the student's interests, return a JSON array of 4-6 pathway IDs from this list: ${allPathwayLabels}. Return ONLY the JSON array.`,
        messages: [{ role: 'user', content: `Interests: ${interests.join(', ')}. Skills: ${skills.join(', ')}.` }],
      });
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const ids = JSON.parse(match[0]);
        setPathwaySuggestions(ids.map(id => CAREER_PATHWAYS.find(p => p.id === id)).filter(Boolean));
      }
    } catch (e) { console.error(e); }
  }

  async function suggestBuddy() {
    if (!buddyEnabled || classmates.length === 0) return;
    try {
      const matesInfo = classmates.map(m =>
        `${m.name}: interests=[${(m.interests || []).join(', ')}], passions=[${(m.passions || []).join(', ')}]`
      ).join('\n');
      const text = await ai.chat({
        systemPrompt: 'You pair students for collaborative projects. Return JSON: {"student_name":"...","reason":"1-2 sentence justification"}. Pick the BEST match. Return ONLY JSON.',
        messages: [{
          role: 'user',
          content: `My interests: ${interests.join(', ')}. My skills: ${skills.join(', ')}. My project pathways: ${selectedPathways.join(', ')}.\n\nClassmates:\n${matesInfo}\n\nWho should I work with and why?`
        }],
      });
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const suggestion = JSON.parse(match[0]);
        const mate = classmates.find(m => m.name.toLowerCase() === suggestion.student_name?.toLowerCase());
        if (mate) {
          setSuggestedBuddy({ ...mate, reason: suggestion.reason });
        }
      }
    } catch (e) { console.error(e); }
  }

  // Generate project
  async function handleGenerate() {
    setStep(4);
    setError('');
    try {
      const pathwayLabels = selectedPathways.map(id => {
        const pw = CAREER_PATHWAYS.find(p => p.id === id);
        return pw ? pw.label : id.replace(/_/g, ' ');
      });

      const students = [{
        name: session.studentName,
        interests,
        age: profile?.age || '10',
        grade_band: profile?.grade_band || 'K-12',
      }];

      // Add buddy if accepted
      if (buddyAccepted && suggestedBuddy) {
        students.push({
          name: suggestedBuddy.name,
          interests: [...(suggestedBuddy.interests || []), ...(suggestedBuddy.passions || [])],
          age: suggestedBuddy.age || '10',
          grade_band: suggestedBuddy.grade_band || 'K-12',
        });
      }

      const questData = await ai.generateQuest({
        students,
        standards: skills.join(', ') || 'teacher discretion',
        pathway: pathwayLabels.join(', ') || 'none',
        type: buddyAccepted ? 'group' : 'individual',
        count: students.length,
        additionalContext: `This is a student-initiated personal project. ${additionalContext}. Career interests: ${pathwayLabels.join(', ')}. Make it feel like THEIR project, not an assignment. Keep it exciting and exploration-driven. Use friendly, encouraging language.`,
      });

      setResult(questData);
      setStep(5);
    } catch (err) {
      setError(err.message || 'Failed to generate project. Try again!');
      setStep(3);
    }
  }

  // Publish project
  async function handlePublish() {
    if (!result) return;
    setPublishing(true);
    setError('');
    try {
      const { data: studentData } = await supabase.from('students').select('guide_id').eq('id', session.studentId).single();

      const { data: quest, error: questErr } = await supabase.from('quests').insert({
        title: result.quest_title,
        subtitle: result.quest_subtitle,
        narrative_hook: result.narrative_hook,
        total_duration_days: result.total_duration || 10,
        career_pathway: 'self_directed',
        status: 'active',
        guide_id: studentData?.guide_id,
      }).select().single();
      if (questErr) throw questErr;

      const stagesData = (result.stages || []).map((s, i) => ({
        quest_id: quest.id,
        stage_number: s.stage_number || i + 1,
        title: s.stage_title,
        stage_type: s.stage_type || 'research',
        description: s.description,
        deliverable: s.deliverable,
        guiding_questions: s.guiding_questions || [],
        duration_days: s.duration || 2,
        status: i === 0 ? 'active' : 'locked',
        stretch_challenge: s.stretch_challenge || null,
      }));
      const { error: stagesErr } = await supabase.from('quest_stages').insert(stagesData);
      if (stagesErr) throw stagesErr;

      // Assign self
      const { error: assignErr } = await supabase.from('quest_students').insert({ quest_id: quest.id, student_id: session.studentId });
      if (assignErr) throw assignErr;

      // Assign buddy if accepted
      if (buddyAccepted && suggestedBuddy) {
        await supabase.from('quest_students').insert({ quest_id: quest.id, student_id: suggestedBuddy.id });
      }

      // Create simulation if present
      if (result.career_simulation) {
        await supabase.from('career_simulations').insert({
          quest_id: quest.id,
          scenario_title: result.career_simulation.scenario_title,
          role: result.career_simulation.role,
          context: result.career_simulation.context,
          key_decisions: result.career_simulation.key_decisions,
          skills_assessed: result.career_simulation.skills_assessed,
          voice_agent_personality: result.career_simulation.voice_agent_personality,
        });
      }

      navigate(`/q/${quest.id}`);
    } catch (err) {
      console.error('Publish error:', err);
      setError(err.message || 'Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  }

  // Navigation
  const canGoNext = () => {
    if (step === 1) return interests.length > 0;
    if (step === 2) return true; // pathways optional
    if (step === 3) return true;
    return false;
  };

  async function handleNext() {
    if (step === 1) {
      suggestPathways(); // fire and forget
      setStep(2);
    } else if (step === 2) {
      if (buddyEnabled && classmates.length > 0) suggestBuddy();
      setStep(3);
    } else if (step === 3) {
      handleGenerate();
    }
  }

  if (!session?.studentId) return null;

  return (
    <div style={{ minHeight: '100vh', background: T.paper, fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spb-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      {/* Top bar */}
      <header style={{
        height: 48, background: T.chalk, borderBottom: `1px solid ${T.pencil}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => step > 1 && step < 4 ? setStep(step - 1) : navigate('/student')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.graphite, fontSize: 12, fontFamily: 'var(--font-body)',
          }}
        >
          <ArrowLeft size={14} />
          {step > 1 && step < 4 ? 'Back' : 'Dashboard'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <WayfinderLogoIcon size={16} color={T.compassGold} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: T.ink, fontWeight: 700 }}>
            Create Project
          </span>
        </div>

        <div style={{ width: 80 }} /> {/* spacer for centering */}
      </header>

      {/* Content */}
      <div style={{
        flex: 1, maxWidth: step === 5 ? 800 : 600, width: '100%',
        margin: '0 auto', padding: '28px 20px 48px',
      }}>
        <StepIndicator current={step} />

        {step === 1 && (
          <Step1Interests
            interests={interests} setInterests={setInterests}
            skills={skills} setSkills={setSkills}
            profile={profile}
            interestSuggestions={interestSuggestions}
            skillSuggestions={skillSuggestions}
            aiLoading={aiLoading}
            onSuggestInterests={suggestInterests}
            onSuggestSkills={suggestSkills}
          />
        )}

        {step === 2 && (
          <Step2Career
            selectedPathways={selectedPathways}
            setSelectedPathways={setSelectedPathways}
            pathwaySuggestions={pathwaySuggestions}
            interests={interests}
          />
        )}

        {step === 3 && (
          <Step3Details
            additionalContext={additionalContext}
            setAdditionalContext={setAdditionalContext}
            buddyEnabled={buddyEnabled}
            suggestedBuddy={suggestedBuddy}
            onAcceptBuddy={() => setBuddyAccepted(true)}
            onSkipBuddy={() => { setBuddyAccepted(false); setSuggestedBuddy(null); }}
            buddyAccepted={buddyAccepted}
          />
        )}

        {step === 4 && <Step4Generating />}

        {step === 5 && (
          <Step5Review
            result={result}
            error={error}
            onPublish={handlePublish}
            publishing={publishing}
            buddyName={buddyAccepted && suggestedBuddy ? suggestedBuddy.name : null}
          />
        )}

        {/* Navigation buttons */}
        {step <= 3 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 32,
            gap: 12,
          }}>
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '12px 24px', borderRadius: 10,
                  border: `1px solid ${T.pencil}`, background: 'transparent',
                  color: T.ink, fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              style={{
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: canGoNext() ? T.compassGold : T.pencil,
                color: canGoNext() ? T.ink : T.graphite,
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
                cursor: canGoNext() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {step === 3 ? (
                <><Sparkles size={14} /> Generate My Project</>
              ) : (
                <>Next <ArrowRight size={14} /></>
              )}
            </button>
          </div>
        )}

        {/* Review action buttons */}
        {step === 5 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              onClick={() => { setResult(null); setStep(3); setError(''); }}
              style={{
                flex: 1, padding: '13px', borderRadius: 10,
                border: `1px solid ${T.pencil}`, background: 'transparent',
                color: T.ink, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              style={{
                flex: 2, padding: '13px', borderRadius: 10, border: 'none',
                background: publishing ? T.pencil : T.compassGold,
                color: publishing ? T.graphite : T.ink,
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
                cursor: publishing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {publishing ? (
                <><Loader2 size={14} style={{ animation: 'spb-spin 1s linear infinite' }} /> Publishing...</>
              ) : (
                <><Rocket size={14} /> Launch My Project</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
