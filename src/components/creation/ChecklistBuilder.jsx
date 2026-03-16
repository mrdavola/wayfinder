import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ChevronUp, ChevronDown, X, Check } from 'lucide-react';

const MAX_STEPS = 15;

let stepCounter = 0;
function makeId() {
  stepCounter++;
  return `s-${Date.now()}-${stepCounter}`;
}

/* ── Inline editable text ─────────────────────────────────────────── */
function EditableText({ value, onChange, checked }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onChange(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        style={{
          fontSize: 14,
          fontFamily: 'var(--font-body)',
          border: '1.5px solid var(--lab-blue)',
          borderRadius: 4,
          padding: '4px 8px',
          outline: 'none',
          background: 'var(--paper)',
          color: 'var(--ink)',
          width: '100%',
        }}
      />
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      style={{
        cursor: 'text',
        fontSize: 14,
        fontFamily: 'var(--font-body)',
        color: checked ? 'var(--graphite)' : 'var(--ink)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
        textDecoration: checked ? 'line-through' : 'none',
        opacity: checked ? 0.6 : 1,
        flex: 1,
      }}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

/* ── Custom checkbox ──────────────────────────────────────────────── */
function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-checked={checked}
      role="checkbox"
      style={{
        width: 22,
        height: 22,
        minWidth: 22,
        borderRadius: 4,
        border: checked ? '2px solid var(--compass-gold)' : '2px solid var(--pencil)',
        background: checked ? 'var(--compass-gold)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'all 0.15s ease',
      }}
    >
      {checked && <Check size={14} color="white" strokeWidth={3} />}
    </button>
  );
}

/* ── Small icon button ────────────────────────────────────────────── */
function IconBtn({ children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: disabled ? 'var(--parchment)' : 'var(--pencil)',
        opacity: disabled ? 0.4 : 1,
        borderRadius: 4,
        transition: 'color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

/* ── Main component ───────────────────────────────────────────────── */
export default function ChecklistBuilder({ onSave }) {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState([]);
  const [notes, setNotes] = useState('');
  const [newStepText, setNewStepText] = useState('');
  const [addingStep, setAddingStep] = useState(false);
  const newStepRef = useRef(null);
  const saveTimer = useRef(null);

  // Debounced auto-save
  const schedSave = useCallback((data) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (onSave) onSave(data);
    }, 500);
  }, [onSave]);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  // Auto-save whenever state changes
  useEffect(() => {
    schedSave({ title, steps, notes });
  }, [title, steps, notes, schedSave]);

  useEffect(() => {
    if (addingStep) newStepRef.current?.focus();
  }, [addingStep]);

  /* ── Step operations ──────────────────────────────────────── */
  function addStep() {
    const text = newStepText.trim();
    if (!text || steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, { id: makeId(), text, done: false }]);
    setNewStepText('');
    setAddingStep(false);
  }

  function toggleStep(id) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, done: !s.done } : s));
  }

  function editStep(id, text) {
    setSteps((prev) => prev.map((s) => s.id === id ? { ...s, text } : s));
  }

  function deleteStep(id) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function moveStep(id, dir) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progress = total > 0 ? completed / total : 0;

  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      color: 'var(--ink)',
      maxWidth: 600,
      margin: '0 auto',
    }}>
      {/* ── Header: title + add button ──────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}>
        <label style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--graphite)',
          whiteSpace: 'nowrap',
        }}>
          Plan:
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name your plan..."
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            border: '1.5px solid var(--parchment)',
            borderRadius: 6,
            padding: '8px 12px',
            outline: 'none',
            background: 'var(--chalk)',
            color: 'var(--ink)',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--lab-blue)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--parchment)'; }}
        />
        <button
          type="button"
          onClick={() => {
            if (steps.length >= MAX_STEPS) return;
            setAddingStep(true);
          }}
          disabled={steps.length >= MAX_STEPS}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            color: 'var(--chalk)',
            background: steps.length >= MAX_STEPS ? 'var(--pencil)' : 'var(--lab-blue)',
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            cursor: steps.length >= MAX_STEPS ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
        >
          <Plus size={15} /> Add Step
        </button>
      </div>

      <div style={{
        borderTop: '1.5px solid var(--parchment)',
        paddingTop: 12,
      }}>
        {/* ── Empty state ────────────────────────────────────── */}
        {total === 0 && !addingStep && (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: 'var(--pencil)',
            fontSize: 14,
          }}>
            Add your first step to get started
          </div>
        )}

        {/* ── Step list ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map((step, idx) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 6,
                background: step.done ? 'var(--parchment)' : 'var(--chalk)',
                border: '1px solid var(--parchment)',
                transition: 'background 0.15s',
              }}
            >
              <Checkbox checked={step.done} onChange={() => toggleStep(step.id)} />

              <EditableText
                value={step.text}
                checked={step.done}
                onChange={(text) => editStep(step.id, text)}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                <IconBtn
                  onClick={() => moveStep(step.id, -1)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ChevronUp size={16} />
                </IconBtn>
                <IconBtn
                  onClick={() => moveStep(step.id, 1)}
                  disabled={idx === steps.length - 1}
                  title="Move down"
                >
                  <ChevronDown size={16} />
                </IconBtn>
                <IconBtn
                  onClick={() => deleteStep(step.id)}
                  title="Delete step"
                >
                  <X size={16} />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>

        {/* ── Inline new step input ──────────────────────────── */}
        {addingStep && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            marginTop: 4,
            borderRadius: 6,
            border: '1.5px dashed var(--lab-blue)',
            background: 'var(--chalk)',
          }}>
            <input
              ref={newStepRef}
              type="text"
              value={newStepText}
              onChange={(e) => setNewStepText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addStep();
                if (e.key === 'Escape') { setNewStepText(''); setAddingStep(false); }
              }}
              placeholder="Describe this step..."
              style={{
                flex: 1,
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--ink)',
              }}
            />
            <button
              type="button"
              onClick={addStep}
              disabled={!newStepText.trim()}
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                color: 'var(--chalk)',
                background: newStepText.trim() ? 'var(--field-green)' : 'var(--pencil)',
                border: 'none',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: newStepText.trim() ? 'pointer' : 'default',
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setNewStepText(''); setAddingStep(false); }}
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                color: 'var(--graphite)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Progress bar ───────────────────────────────────── */}
        {total > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--graphite)' }}>
                Progress
              </span>
              <span style={{
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                color: progress === 1 ? 'var(--field-green)' : 'var(--graphite)',
                fontWeight: progress === 1 ? 700 : 500,
              }}>
                {completed}/{total}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'var(--parchment)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress * 100}%`,
                height: '100%',
                borderRadius: 4,
                background: progress === 1 ? 'var(--field-green)' : 'var(--compass-gold)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* ── Notes ──────────────────────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--graphite)',
            marginBottom: 6,
          }}>
            Any thoughts on your plan?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What feels easiest? What might be tricky?"
            rows={3}
            style={{
              width: '100%',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              border: '1.5px solid var(--parchment)',
              borderRadius: 6,
              padding: '10px 12px',
              outline: 'none',
              background: 'var(--chalk)',
              color: 'var(--ink)',
              resize: 'vertical',
              lineHeight: 1.5,
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--lab-blue)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--parchment)'; }}
          />
        </div>

        {/* ── Max steps notice ───────────────────────────────── */}
        {steps.length >= MAX_STEPS && (
          <div style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--graphite)',
            textAlign: 'center',
          }}>
            Maximum of {MAX_STEPS} steps reached
          </div>
        )}
      </div>
    </div>
  );
}
