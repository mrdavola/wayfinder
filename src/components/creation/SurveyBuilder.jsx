import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, Star, X } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'open_response', label: 'Open Response' },
];

const MAX_QUESTIONS = 10;
const MAX_OPTIONS = 6;

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `q${Date.now()}_${idCounter}`;
}

function createQuestion() {
  return { id: nextId(), text: '', type: 'multiple_choice', options: ['', ''] };
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    fontFamily: 'var(--font-body)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  titleInput: {
    flex: 1,
    minWidth: 200,
    padding: '0.5rem 0.75rem',
    fontSize: 'var(--text-lg)',
    fontFamily: 'var(--font-display)',
    border: '1.5px solid var(--parchment)',
    borderRadius: 8,
    background: 'var(--chalk)',
    color: 'var(--ink)',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  counter: {
    fontSize: 'var(--text-sm)',
    color: 'var(--graphite)',
    whiteSpace: 'nowrap',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0.45rem 0.85rem',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    color: 'var(--chalk)',
    background: 'var(--lab-blue)',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  card: {
    border: '1.5px solid var(--parchment)',
    borderRadius: 12,
    padding: '1rem 1.25rem',
    background: 'var(--chalk)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  qLabel: {
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    color: 'var(--ink)',
    minWidth: 28,
  },
  typeSelect: {
    padding: '0.35rem 0.5rem',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    border: '1.5px solid var(--parchment)',
    borderRadius: 6,
    background: 'var(--paper)',
    color: 'var(--ink)',
    cursor: 'pointer',
    outline: 'none',
  },
  headerActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 4,
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    border: '1px solid var(--parchment)',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--graphite)',
    transition: 'background 0.12s',
  },
  textInput: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    border: '1.5px solid var(--parchment)',
    borderRadius: 8,
    background: 'var(--paper)',
    color: 'var(--ink)',
    outline: 'none',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  optionInput: {
    flex: 1,
    padding: '0.35rem 0.6rem',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    border: '1.5px solid var(--parchment)',
    borderRadius: 6,
    background: 'var(--chalk)',
    color: 'var(--ink)',
    outline: 'none',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid var(--pencil)',
    flexShrink: 0,
  },
  removeOptionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--pencil)',
  },
  addOptionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '0.3rem 0.6rem',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    color: 'var(--lab-blue)',
    background: 'transparent',
    border: '1px dashed var(--pencil)',
    borderRadius: 6,
    cursor: 'pointer',
  },
  starsRow: {
    display: 'flex',
    gap: 4,
    padding: '0.25rem 0',
  },
  yesNoRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    fontSize: 'var(--text-sm)',
    color: 'var(--graphite)',
    padding: '0.25rem 0',
  },
  previewArea: {
    width: '100%',
    minHeight: 48,
    padding: '0.5rem 0.75rem',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    border: '1.5px dashed var(--parchment)',
    borderRadius: 8,
    background: 'var(--paper)',
    color: 'var(--pencil)',
    resize: 'none',
  },
};

// ── Sub-components ──────────────────────────────────────────────────

function MultipleChoiceEditor({ options, onChange }) {
  const updateOption = (idx, value) => {
    const next = [...options];
    next[idx] = value;
    onChange(next);
  };

  const removeOption = (idx) => {
    if (options.length <= 1) return;
    onChange(options.filter((_, i) => i !== idx));
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    onChange([...options, '']);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {options.map((opt, idx) => (
        <div key={idx} style={styles.optionRow}>
          <div style={styles.radio} />
          <input
            style={styles.optionInput}
            value={opt}
            onChange={(e) => updateOption(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
          />
          {options.length > 1 && (
            <button
              style={styles.removeOptionBtn}
              onClick={() => removeOption(idx)}
              title="Remove option"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {options.length < MAX_OPTIONS && (
        <button style={styles.addOptionBtn} onClick={addOption}>
          <Plus size={13} /> Add option
        </button>
      )}
    </div>
  );
}

function RatingPreview() {
  return (
    <div style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={22} fill="var(--compass-gold)" color="var(--compass-gold)" />
      ))}
    </div>
  );
}

function YesNoPreview() {
  return (
    <div style={styles.yesNoRow}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={styles.radio} /> Yes
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={styles.radio} /> No
      </span>
    </div>
  );
}

function OpenResponsePreview() {
  return (
    <textarea
      style={styles.previewArea}
      disabled
      placeholder="Respondent's answer will appear here..."
      rows={2}
    />
  );
}

// ── QuestionCard ────────────────────────────────────────────────────

function QuestionCard({ question, index, total, onUpdate, onDelete, onMove }) {
  const handleTypeChange = (type) => {
    const updated = { ...question, type };
    if (type === 'multiple_choice' && (!question.options || question.options.length === 0)) {
      updated.options = ['', ''];
    } else if (type !== 'multiple_choice') {
      updated.options = [];
    }
    onUpdate(updated);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.qLabel}>Q{index + 1}</span>
        <select
          style={styles.typeSelect}
          value={question.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div style={styles.headerActions}>
          <button
            style={{ ...styles.iconBtn, opacity: index === 0 ? 0.35 : 1 }}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            title="Move up"
          >
            <ChevronUp size={16} />
          </button>
          <button
            style={{ ...styles.iconBtn, opacity: index === total - 1 ? 0.35 : 1 }}
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            title="Move down"
          >
            <ChevronDown size={16} />
          </button>
          <button
            style={{ ...styles.iconBtn, color: 'var(--specimen-red)' }}
            onClick={() => onDelete(question.id)}
            title="Delete question"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <input
        style={styles.textInput}
        value={question.text}
        onChange={(e) => onUpdate({ ...question, text: e.target.value })}
        placeholder="Enter your question..."
      />

      {question.type === 'multiple_choice' && (
        <MultipleChoiceEditor
          options={question.options || ['', '']}
          onChange={(opts) => onUpdate({ ...question, options: opts })}
        />
      )}
      {question.type === 'rating' && <RatingPreview />}
      {question.type === 'yes_no' && <YesNoPreview />}
      {question.type === 'open_response' && <OpenResponsePreview />}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function SurveyBuilder({ onSave }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(() => [createQuestion()]);
  const debounceRef = useRef(null);

  // Debounced auto-save
  const triggerSave = useCallback(() => {
    if (!onSave) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({ title, questions });
    }, 500);
  }, [onSave, title, questions]);

  useEffect(() => {
    triggerSave();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [triggerSave]);

  const addQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) return;
    setQuestions((prev) => [...prev, createQuestion()]);
  };

  const updateQuestion = (updated) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  };

  const deleteQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <input
          style={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Survey title..."
        />
        <span style={styles.counter}>
          {questions.length}/{MAX_QUESTIONS} questions
        </span>
      </div>

      <button
        style={{
          ...styles.addBtn,
          opacity: questions.length >= MAX_QUESTIONS ? 0.5 : 1,
          cursor: questions.length >= MAX_QUESTIONS ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
        }}
        disabled={questions.length >= MAX_QUESTIONS}
        onClick={addQuestion}
      >
        <Plus size={16} /> Add Question
      </button>

      {questions.map((q, idx) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={idx}
          total={questions.length}
          onUpdate={updateQuestion}
          onDelete={deleteQuestion}
          onMove={moveQuestion}
        />
      ))}
    </div>
  );
}
