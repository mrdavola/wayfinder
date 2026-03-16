import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Plus, X, Trash2 } from 'lucide-react';

const MAX_ITEMS = 12;

const TIER_DEFS = {
  high:   { label: 'Most Important',  color: 'var(--compass-gold)', hex: '#D4A843' },
  medium: { label: 'Important',       color: 'var(--lab-blue)',     hex: '#3B82F6' },
  low:    { label: 'Less Important',  color: 'var(--graphite)',     hex: '#9CA3AF' },
};

let itemCounter = 0;

function makeId() {
  itemCounter++;
  return `i-${Date.now()}-${itemCounter}`;
}

/* ── Inline editable text ─────────────────────────────────────────── */
function EditableText({ value, onChange, style }) {
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
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          border: '1.5px solid var(--lab-blue)',
          borderRadius: 4,
          padding: '2px 6px',
          outline: 'none',
          background: 'var(--paper)',
          color: 'var(--ink)',
          width: '100%',
          ...style,
        }}
      />
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      style={{
        cursor: 'text',
        fontSize: 13,
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
        lineHeight: 1.4,
        wordBreak: 'break-word',
        ...style,
      }}
      title="Click to edit"
    >
      {value}
    </span>
  );
}

/* ── Rank Item Row ────────────────────────────────────────────────── */
function RankItem({ item, index, total, onMoveUp, onMoveDown, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'var(--paper)',
        border: '1.5px solid var(--pencil)',
        borderRadius: 8,
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Rank number */}
      <span style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--ink)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        {index + 1}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <EditableText value={item.text} onChange={(t) => onEdit(item.id, t)} />
      </div>

      {/* Up / Down */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        <button
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 2,
            cursor: index === 0 ? 'not-allowed' : 'pointer',
            color: index === 0 ? 'var(--pencil)' : 'var(--graphite)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Move up"
        >
          <ChevronUp size={15} />
        </button>
        <button
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 2,
            cursor: index === total - 1 ? 'not-allowed' : 'pointer',
            color: index === total - 1 ? 'var(--pencil)' : 'var(--graphite)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Move down"
        >
          <ChevronDown size={15} />
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          cursor: 'pointer',
          color: 'var(--graphite)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        aria-label="Delete item"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ── Tier Bucket ──────────────────────────────────────────────────── */
function TierBucket({ tierKey, def, items, selectedItem, onAssign, onSelectItem, onEdit, onDelete }) {
  return (
    <div
      onClick={() => { if (selectedItem) onAssign(tierKey); }}
      style={{
        border: `2px solid ${def.hex}`,
        borderRadius: 10,
        padding: 10,
        minHeight: 60,
        background: `${def.hex}08`,
        cursor: selectedItem ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        boxShadow: selectedItem ? `0 0 0 2px ${def.hex}33` : 'none',
      }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--font-body)',
        color: def.hex,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 8,
      }}>
        {def.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <div
            key={item.id}
            onClick={(e) => { e.stopPropagation(); onSelectItem(item.id); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              background: 'var(--paper)',
              border: selectedItem === item.id
                ? '2px solid var(--lab-blue)'
                : '1.5px solid var(--pencil)',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            <span style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              background: def.hex,
              borderRadius: 3,
              padding: '1px 5px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}>
              {tierKey === 'high' ? 'H' : tierKey === 'medium' ? 'M' : 'L'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableText value={item.text} onChange={(t) => onEdit(item.id, t)} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                color: 'var(--graphite)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
              aria-label="Delete item"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{
            fontSize: 12,
            color: 'var(--graphite)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-body)',
            opacity: 0.6,
            padding: '4px 0',
          }}>
            {selectedItem ? 'Click here to place item' : 'No items'}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */
export default function RankingSorter({ onSave }) {
  const [mode, setMode] = useState('rank'); // 'rank' | 'tier'
  const [items, setItems] = useState([]);
  const [reasoning, setReasoning] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newText, setNewText] = useState('');
  const addInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Focus add input when shown
  useEffect(() => {
    if (addingItem) addInputRef.current?.focus();
  }, [addingItem]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // Build save payload
  const buildPayload = useCallback((itms, m, r) => {
    const tiers = { high: { label: 'Most Important', items: [] }, medium: { label: 'Important', items: [] }, low: { label: 'Less Important', items: [] } };
    const serialized = itms.map((it, idx) => ({
      id: it.id,
      text: it.text,
      rank: m === 'rank' ? idx + 1 : null,
      tier: m === 'tier' ? (it.tier || null) : null,
    }));
    if (m === 'tier') {
      itms.forEach(it => {
        if (it.tier && tiers[it.tier]) tiers[it.tier].items.push(it.id);
      });
    }
    return { mode: m, items: serialized, tiers, reasoning: r };
  }, []);

  const debouncedSave = useCallback((itms, m, r) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave?.(buildPayload(itms, m, r));
    }, 500);
  }, [onSave, buildPayload]);

  function triggerSave(itms, m, r) {
    debouncedSave(itms, m, r);
  }

  // -- Mode toggle
  function toggleMode() {
    const next = mode === 'rank' ? 'tier' : 'rank';
    setMode(next);
    setSelectedItem(null);
    triggerSave(items, next, reasoning);
  }

  // -- Add item
  function handleAddItem() {
    const trimmed = newText.trim();
    if (!trimmed || items.length >= MAX_ITEMS) return;
    const newItem = { id: makeId(), text: trimmed, tier: null };
    const next = [...items, newItem];
    setItems(next);
    setNewText('');
    addInputRef.current?.focus();
    triggerSave(next, mode, reasoning);
  }

  // -- Delete item
  function deleteItem(id) {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    if (selectedItem === id) setSelectedItem(null);
    triggerSave(next, mode, reasoning);
  }

  // -- Edit item text
  function editItem(id, text) {
    const next = items.map(i => i.id === id ? { ...i, text } : i);
    setItems(next);
    triggerSave(next, mode, reasoning);
  }

  // -- Rank mode: move up/down
  function moveUp(index) {
    if (index <= 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setItems(next);
    triggerSave(next, mode, reasoning);
  }

  function moveDown(index) {
    if (index >= items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setItems(next);
    triggerSave(next, mode, reasoning);
  }

  // -- Tier mode: select & assign
  function handleSelectItem(id) {
    setSelectedItem(prev => prev === id ? null : id);
  }

  function assignToTier(tierKey) {
    if (!selectedItem) return;
    const next = items.map(i =>
      i.id === selectedItem ? { ...i, tier: tierKey } : i
    );
    setItems(next);
    setSelectedItem(null);
    triggerSave(next, mode, reasoning);
  }

  function assignToUnsorted() {
    if (!selectedItem) return;
    const next = items.map(i =>
      i.id === selectedItem ? { ...i, tier: null } : i
    );
    setItems(next);
    setSelectedItem(null);
    triggerSave(next, mode, reasoning);
  }

  // -- Reasoning
  function handleReasoningChange(e) {
    const val = e.target.value;
    setReasoning(val);
    triggerSave(items, mode, val);
  }

  // -- Background click deselect
  function handleBgClick() {
    setSelectedItem(null);
  }

  const unsortedItems = items.filter(i => !i.tier);

  return (
    <div
      onClick={handleBgClick}
      style={{
        fontFamily: 'var(--font-body)',
        border: '1.5px solid var(--pencil)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--parchment)',
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--pencil)',
        flexWrap: 'wrap',
      }}>
        {/* Mode toggle */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1.5px solid var(--pencil)',
          }}
        >
          <button
            onClick={toggleMode}
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              padding: '4px 12px',
              border: 'none',
              background: mode === 'rank' ? 'var(--ink)' : 'var(--paper)',
              color: mode === 'rank' ? '#fff' : 'var(--graphite)',
              cursor: 'pointer',
            }}
          >
            Rank
          </button>
          <button
            onClick={toggleMode}
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              padding: '4px 12px',
              border: 'none',
              borderLeft: '1px solid var(--pencil)',
              background: mode === 'tier' ? 'var(--ink)' : 'var(--paper)',
              color: mode === 'tier' ? '#fff' : 'var(--graphite)',
              cursor: 'pointer',
            }}
          >
            Tier
          </button>
        </div>

        {/* Add Item button */}
        <button
          onClick={(e) => { e.stopPropagation(); setAddingItem(true); }}
          disabled={items.length >= MAX_ITEMS}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: 6,
            border: 'none',
            background: items.length >= MAX_ITEMS ? 'var(--pencil)' : 'var(--ink)',
            color: '#fff',
            cursor: items.length >= MAX_ITEMS ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={13} /> Add Item
        </button>

        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--graphite)' }}>
          {items.length}/{MAX_ITEMS} items
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 14 }}>
        {/* Inline add form */}
        {addingItem && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <input
              ref={addInputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
                if (e.key === 'Escape') { setAddingItem(false); setNewText(''); }
              }}
              placeholder="Type an item..."
              style={{
                flex: 1,
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                padding: '6px 10px',
                border: '1.5px solid var(--pencil)',
                borderRadius: 6,
                outline: 'none',
                background: 'var(--paper)',
                color: 'var(--ink)',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--lab-blue)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--pencil)'; }}
            />
            <button
              onClick={handleAddItem}
              disabled={!newText.trim()}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: !newText.trim() ? 'var(--pencil)' : 'var(--ink)',
                color: '#fff',
                cursor: !newText.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setAddingItem(false); setNewText(''); }}
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                padding: '5px 8px',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--graphite)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Selection hint (tier mode) */}
        {mode === 'tier' && selectedItem && (
          <div style={{
            fontSize: 12,
            color: 'var(--lab-blue)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-body)',
            marginBottom: 10,
            padding: '6px 10px',
            background: 'rgba(59,130,246,0.08)',
            borderRadius: 6,
          }}>
            Item selected. Click a tier to place it, or click "Unsorted" to unassign.
          </div>
        )}

        {/* ── RANK MODE ──────────────────────────────────────────── */}
        {mode === 'rank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map((item, idx) => (
              <RankItem
                key={item.id}
                item={item}
                index={idx}
                total={items.length}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onEdit={editItem}
                onDelete={deleteItem}
              />
            ))}
            {items.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '24px 0',
                color: 'var(--graphite)',
                opacity: 0.5,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>No items yet</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  Click "+ Add Item" to start ranking
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TIER MODE ──────────────────────────────────────────── */}
        {mode === 'tier' && (
          <>
            {/* Unsorted pool */}
            <div
              onClick={(e) => { e.stopPropagation(); assignToUnsorted(); }}
              style={{
                marginBottom: 12,
                padding: 10,
                background: 'var(--paper)',
                borderRadius: 10,
                border: selectedItem ? '2px dashed var(--pencil)' : '1.5px solid var(--pencil)',
                cursor: selectedItem ? 'pointer' : 'default',
                minHeight: 44,
              }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--graphite)',
                marginBottom: 6,
                fontFamily: 'var(--font-body)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Unsorted
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unsortedItems.map(item => (
                  <div
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); handleSelectItem(item.id); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      background: 'var(--parchment)',
                      border: selectedItem === item.id
                        ? '2px solid var(--lab-blue)'
                        : '1.5px solid var(--pencil)',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      maxWidth: 220,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <EditableText value={item.text} onChange={(t) => editItem(item.id, t)} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 2,
                        cursor: 'pointer',
                        color: 'var(--graphite)',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                      aria-label="Delete item"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {unsortedItems.length === 0 && items.length === 0 && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--graphite)',
                    fontStyle: 'italic',
                    opacity: 0.5,
                    padding: '4px 0',
                  }}>
                    Click "+ Add Item" to get started
                  </div>
                )}
                {unsortedItems.length === 0 && items.length > 0 && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--graphite)',
                    fontStyle: 'italic',
                    opacity: 0.5,
                    padding: '4px 0',
                  }}>
                    All items sorted into tiers
                  </div>
                )}
              </div>
            </div>

            {/* Tier buckets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(TIER_DEFS).map(([key, def]) => (
                <TierBucket
                  key={key}
                  tierKey={key}
                  def={def}
                  items={items.filter(i => i.tier === key)}
                  selectedItem={selectedItem}
                  onAssign={assignToTier}
                  onSelectItem={handleSelectItem}
                  onEdit={editItem}
                  onDelete={deleteItem}
                />
              ))}
            </div>
          </>
        )}

        {/* Reasoning textarea */}
        <div style={{ marginTop: 14 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink)',
            fontFamily: 'var(--font-body)',
            marginBottom: 6,
          }}>
            Why this order?
          </label>
          <textarea
            value={reasoning}
            onChange={handleReasoningChange}
            onClick={(e) => e.stopPropagation()}
            placeholder="Explain your reasoning for this ranking..."
            style={{
              width: '100%',
              minHeight: 72,
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              lineHeight: 1.6,
              border: '1.5px solid var(--pencil)',
              borderRadius: 8,
              padding: '10px 12px',
              resize: 'vertical',
              outline: 'none',
              background: 'var(--paper)',
              color: 'var(--ink)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--lab-blue)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--pencil)'; }}
          />
        </div>
      </div>
    </div>
  );
}
