import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Check, Tag } from 'lucide-react';

const MAX_ZONES = 6;
const MAX_EVIDENCE = 15;

const ZONE_COLORS = ['#22C55E', '#EF4444', '#3B82F6', '#D4A843', '#8B5CF6', '#EC4899'];
const ZONE_PRESETS = ['For', 'Against', 'Unclear'];

const EVIDENCE_TYPES = [
  { key: 'fact', label: 'Fact', color: '#3B82F6' },
  { key: 'quote', label: 'Quote', color: '#D4A843' },
  { key: 'data', label: 'Data', color: '#22C55E' },
  { key: 'observation', label: 'Observation', color: '#8B5CF6' },
];

function getTypeStyle(type) {
  return EVIDENCE_TYPES.find(t => t.key === type) || EVIDENCE_TYPES[0];
}

let zoneCounter = 0;
let evidenceCounter = 0;

/* -- Evidence Card ------------------------------------------------ */
function EvidenceCard({ item, isSelected, onSelect, onDelete, onEdit }) {
  const typeStyle = getTypeStyle(item.type);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
      style={{
        background: 'var(--paper)',
        border: isSelected ? '2px solid var(--lab-blue)' : '1.5px solid var(--pencil)',
        borderRadius: 8,
        padding: '8px 10px',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isSelected
          ? '0 0 0 2px rgba(59,130,246,0.25), 0 2px 6px rgba(0,0,0,0.08)'
          : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        minWidth: 120,
        maxWidth: 220,
        userSelect: 'none',
      }}
    >
      {/* Type badge */}
      <span style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: '#fff',
        background: typeStyle.color,
        borderRadius: 4,
        padding: '1px 6px',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {typeStyle.label}
      </span>

      {/* Text */}
      <div style={{
        fontSize: 13,
        lineHeight: 1.4,
        color: 'var(--ink)',
        fontFamily: 'var(--font-body)',
        wordBreak: 'break-word',
      }}>
        {item.text || 'Empty evidence'}
      </div>

      {/* Source */}
      {item.source && (
        <div style={{
          fontSize: 11,
          color: 'var(--graphite)',
          fontFamily: 'var(--font-mono)',
          marginTop: 4,
          fontStyle: 'italic',
        }}>
          Source: {item.source}
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#EF4444',
          border: 'none',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          opacity: 0,
          transition: 'opacity 0.15s',
        }}
        className="evidence-delete-btn"
        aria-label="Delete evidence"
      >
        <X size={11} strokeWidth={3} />
      </button>
    </div>
  );
}

/* -- Zone Container ----------------------------------------------- */
function ZoneContainer({ zone, evidenceItems, selectedEvidence, onAssign, onDeleteZone, onSelectEvidence, onDeleteEvidence }) {
  return (
    <div
      onClick={() => {
        if (selectedEvidence) onAssign(zone.id);
      }}
      style={{
        border: `2px solid ${zone.color}`,
        borderRadius: 10,
        minHeight: 80,
        padding: 10,
        background: `${zone.color}08`,
        flex: '1 1 200px',
        cursor: selectedEvidence ? 'pointer' : 'default',
        transition: 'background 0.15s, box-shadow 0.15s',
        boxShadow: selectedEvidence ? `0 0 0 2px ${zone.color}33` : 'none',
      }}
    >
      {/* Zone header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-body)',
          color: zone.color,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {zone.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteZone(zone.id); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--graphite)',
            cursor: 'pointer',
            padding: 2,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Delete zone"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Evidence in this zone */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {evidenceItems.map(item => (
          <EvidenceCard
            key={item.id}
            item={item}
            isSelected={selectedEvidence === item.id}
            onSelect={onSelectEvidence}
            onDelete={onDeleteEvidence}
          />
        ))}
        {evidenceItems.length === 0 && (
          <div style={{
            fontSize: 12,
            color: 'var(--graphite)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-body)',
            padding: '8px 0',
            opacity: 0.6,
          }}>
            {selectedEvidence ? 'Click here to place evidence' : 'No evidence yet'}
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Add Evidence Modal ------------------------------------------- */
function AddEvidenceForm({ onAdd, onCancel }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('fact');
  const [source, setSource] = useState('');
  const textRef = useRef(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ text: text.trim(), type, source: source.trim() || null });
    setText('');
    setSource('');
    textRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--paper)',
        border: '1.5px solid var(--pencil)',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        maxWidth: 360,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
        Add Evidence
      </div>

      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What evidence did you find?"
        style={{
          width: '100%',
          minHeight: 60,
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          border: '1.5px solid var(--pencil)',
          borderRadius: 6,
          padding: '8px 10px',
          resize: 'vertical',
          outline: 'none',
          background: 'var(--parchment)',
          color: 'var(--ink)',
        }}
      />

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {EVIDENCE_TYPES.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              padding: '3px 10px',
              borderRadius: 4,
              border: type === t.key ? `2px solid ${t.color}` : '1.5px solid var(--pencil)',
              background: type === t.key ? `${t.color}18` : 'transparent',
              color: type === t.key ? t.color : 'var(--graphite)',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="Source (optional)"
        style={{
          width: '100%',
          fontSize: 12,
          fontFamily: 'var(--font-body)',
          border: '1.5px solid var(--pencil)',
          borderRadius: 6,
          padding: '6px 10px',
          outline: 'none',
          background: 'var(--parchment)',
          color: 'var(--ink)',
        }}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            padding: '5px 12px',
            borderRadius: 6,
            border: '1.5px solid var(--pencil)',
            background: 'transparent',
            color: 'var(--graphite)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            padding: '5px 14px',
            borderRadius: 6,
            border: 'none',
            background: !text.trim() ? 'var(--pencil)' : 'var(--ink)',
            color: '#fff',
            cursor: !text.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Add
        </button>
      </div>
    </form>
  );
}

/* -- Add Zone Form ------------------------------------------------ */
function AddZoneForm({ usedColors, onAdd, onCancel }) {
  const [name, setName] = useState('');
  const nextColor = ZONE_COLORS.find(c => !usedColors.includes(c)) || ZONE_COLORS[0];
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), color: nextColor });
    setName('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Zone name..."
        style={{
          fontSize: 13,
          fontFamily: 'var(--font-body)',
          padding: '5px 10px',
          border: '1.5px solid var(--pencil)',
          borderRadius: 6,
          outline: 'none',
          width: 140,
          background: 'var(--parchment)',
          color: 'var(--ink)',
        }}
      />
      <div style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: nextColor,
        flexShrink: 0,
      }} />
      <button
        type="submit"
        disabled={!name.trim()}
        style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          padding: '5px 10px',
          borderRadius: 6,
          border: 'none',
          background: !name.trim() ? 'var(--pencil)' : 'var(--ink)',
          color: '#fff',
          cursor: !name.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Check size={13} /> Add
      </button>
      <button
        type="button"
        onClick={onCancel}
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
    </form>
  );
}

/* -- Main Component ----------------------------------------------- */
export default function EvidenceBoardCreator({ onSave }) {
  const [zones, setZones] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [argument, setArgument] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [showAddZone, setShowAddZone] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const saveTimerRef = useRef(null);

  // Debounced auto-save
  const debouncedSave = useCallback((z, e, a) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSave?.({ zones: z, evidence: e, argument: a });
    }, 500);
  }, [onSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function triggerSave(z, e, a) {
    debouncedSave(z, e, a);
  }

  // -- Zones
  function addZone({ name, color }) {
    if (zones.length >= MAX_ZONES) return;
    zoneCounter++;
    const newZone = { id: `z-${Date.now()}-${zoneCounter}`, name, color };
    const next = [...zones, newZone];
    setZones(next);
    setShowAddZone(false);
    triggerSave(next, evidence, argument);
  }

  function deleteZone(id) {
    const nextZones = zones.filter(z => z.id !== id);
    // Unassign evidence from deleted zone
    const nextEvidence = evidence.map(e => e.zoneId === id ? { ...e, zoneId: null } : e);
    setZones(nextZones);
    setEvidence(nextEvidence);
    triggerSave(nextZones, nextEvidence, argument);
  }

  // -- Evidence
  function addEvidence({ text, type, source }) {
    if (evidence.length >= MAX_EVIDENCE) return;
    evidenceCounter++;
    const newItem = {
      id: `e-${Date.now()}-${evidenceCounter}`,
      text,
      type,
      source,
      zoneId: null,
    };
    const next = [...evidence, newItem];
    setEvidence(next);
    setShowAddEvidence(false);
    triggerSave(zones, next, argument);
  }

  function deleteEvidence(id) {
    const next = evidence.filter(e => e.id !== id);
    setEvidence(next);
    if (selectedEvidence === id) setSelectedEvidence(null);
    triggerSave(zones, next, argument);
  }

  // -- Assignment: click evidence to select, click zone to assign
  function handleSelectEvidence(id) {
    setSelectedEvidence(prev => prev === id ? null : id);
  }

  function handleAssignToZone(zoneId) {
    if (!selectedEvidence) return;
    const next = evidence.map(e =>
      e.id === selectedEvidence ? { ...e, zoneId } : e
    );
    setEvidence(next);
    setSelectedEvidence(null);
    triggerSave(zones, next, argument);
  }

  function handleUnassign(id) {
    // Double-click or select+click unsorted to unassign
    const next = evidence.map(e =>
      e.id === id ? { ...e, zoneId: null } : e
    );
    setEvidence(next);
    triggerSave(zones, next, argument);
  }

  function handleAssignToUnsorted() {
    if (!selectedEvidence) return;
    handleUnassign(selectedEvidence);
    setSelectedEvidence(null);
  }

  // -- Argument
  function handleArgumentChange(e) {
    const val = e.target.value;
    setArgument(val);
    triggerSave(zones, evidence, val);
  }

  // -- Deselect on background click
  function handleBgClick() {
    setSelectedEvidence(null);
  }

  const unsortedEvidence = evidence.filter(e => !e.zoneId);
  const usedColors = zones.map(z => z.color);

  return (
    <>
      <style>{`
        .evidence-card-wrap:hover .evidence-delete-btn { opacity: 1 !important; }
      `}</style>

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
          {showAddZone ? (
            <AddZoneForm
              usedColors={usedColors}
              onAdd={addZone}
              onCancel={() => setShowAddZone(false)}
            />
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowAddZone(true); setShowAddEvidence(false); }}
              disabled={zones.length >= MAX_ZONES}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 6,
                border: '1.5px solid var(--pencil)',
                background: 'var(--paper)',
                color: zones.length >= MAX_ZONES ? 'var(--pencil)' : 'var(--ink)',
                cursor: zones.length >= MAX_ZONES ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Plus size={13} /> Add Zone
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowAddEvidence(true); setShowAddZone(false); }}
            disabled={evidence.length >= MAX_EVIDENCE}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              background: evidence.length >= MAX_EVIDENCE ? 'var(--pencil)' : 'var(--ink)',
              color: '#fff',
              cursor: evidence.length >= MAX_EVIDENCE ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={13} /> Add Evidence
          </button>

          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--graphite)' }}>
            {evidence.length}/{MAX_EVIDENCE} evidence
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: 14 }}>
          {/* Selection hint */}
          {selectedEvidence && (
            <div style={{
              fontSize: 12,
              color: 'var(--lab-blue)',
              fontStyle: 'italic',
              fontFamily: 'var(--font-body)',
              marginBottom: 10,
              padding: '6px 10px',
              background: 'rgba(59,130,246,0.08)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Tag size={13} />
              Evidence selected. Click a zone to place it, or click "Unsorted" to unassign.
            </div>
          )}

          {/* Add evidence form */}
          {showAddEvidence && (
            <div style={{ marginBottom: 14 }}>
              <AddEvidenceForm
                onAdd={addEvidence}
                onCancel={() => setShowAddEvidence(false)}
              />
            </div>
          )}

          {/* Unsorted pool */}
          <div
            onClick={(e) => { e.stopPropagation(); handleAssignToUnsorted(); }}
            style={{
              marginBottom: 14,
              padding: 10,
              background: 'var(--paper)',
              borderRadius: 10,
              border: selectedEvidence ? '2px dashed var(--pencil)' : '1.5px solid var(--pencil)',
              cursor: selectedEvidence ? 'pointer' : 'default',
              minHeight: 50,
            }}
          >
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--graphite)',
              marginBottom: 8,
              fontFamily: 'var(--font-body)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Unsorted
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {unsortedEvidence.map(item => (
                <div key={item.id} className="evidence-card-wrap">
                  <EvidenceCard
                    item={item}
                    isSelected={selectedEvidence === item.id}
                    onSelect={handleSelectEvidence}
                    onDelete={deleteEvidence}
                  />
                </div>
              ))}
              {unsortedEvidence.length === 0 && evidence.length === 0 && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--graphite)',
                  fontStyle: 'italic',
                  opacity: 0.5,
                  padding: '4px 0',
                }}>
                  Click "Add Evidence" to get started
                </div>
              )}
              {unsortedEvidence.length === 0 && evidence.length > 0 && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--graphite)',
                  fontStyle: 'italic',
                  opacity: 0.5,
                  padding: '4px 0',
                }}>
                  All evidence sorted
                </div>
              )}
            </div>
          </div>

          {/* Zones grid */}
          {zones.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 14,
            }}>
              {zones.map(zone => (
                <ZoneContainer
                  key={zone.id}
                  zone={zone}
                  evidenceItems={evidence.filter(e => e.zoneId === zone.id)}
                  selectedEvidence={selectedEvidence}
                  onAssign={handleAssignToZone}
                  onDeleteZone={deleteZone}
                  onSelectEvidence={handleSelectEvidence}
                  onDeleteEvidence={deleteEvidence}
                />
              ))}
            </div>
          )}

          {/* Empty state for zones */}
          {zones.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '20px 0',
              color: 'var(--graphite)',
              opacity: 0.5,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                No zones yet
              </div>
              <div style={{ fontSize: 12, marginTop: 2, fontFamily: 'var(--font-body)' }}>
                Add zones like "For", "Against", "Unclear" to organize your evidence
              </div>
            </div>
          )}

          {/* Argument textarea */}
          <div style={{ marginTop: 4 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              marginBottom: 6,
            }}>
              Your argument
            </label>
            <textarea
              value={argument}
              onChange={handleArgumentChange}
              onClick={(e) => e.stopPropagation()}
              placeholder="Based on the evidence you've gathered, write your conclusion or argument here..."
              style={{
                width: '100%',
                minHeight: 80,
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
    </>
  );
}
