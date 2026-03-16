import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

const MAX_COLS = 6;
const MAX_ROWS = 8;
const DEBOUNCE_MS = 500;

/* ── Editable cell / header ──────────────────────────────────────── */
function EditableCell({ value, onChange, placeholder, bold, style: extraStyle }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value) onChange(trimmed);
    else setDraft(value);
  }

  const baseStyle = {
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    color: 'var(--ink)',
    fontWeight: bold ? 600 : 400,
    ...extraStyle,
  };

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
        placeholder={placeholder}
        style={{
          ...baseStyle,
          border: '1.5px solid var(--lab-blue)',
          borderRadius: 4,
          padding: '4px 8px',
          outline: 'none',
          background: 'var(--chalk)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        ...baseStyle,
        cursor: 'text',
        display: 'block',
        minHeight: 20,
        color: value ? 'var(--ink)' : 'var(--pencil)',
      }}
    >
      {value || placeholder || 'Click to edit'}
    </span>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function ComparisonTable({ onSave }) {
  const [columns, setColumns] = useState(['', '']);
  const [rows, setRows] = useState(['', '']);
  const [cells, setCells] = useState({});
  const [conclusion, setConclusion] = useState('');
  const timerRef = useRef(null);

  /* ── Auto-save with debounce ─────────────────────────────────── */
  const scheduleAutoSave = useCallback((nextCols, nextRows, nextCells, nextConclusion) => {
    if (!onSave) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSave({
        columns: nextCols,
        rows: nextRows,
        cells: nextCells,
        conclusion: nextConclusion,
      });
    }, DEBOUNCE_MS);
  }, [onSave]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  /* helper to fire save after any state setter */
  function withSave(nextCols, nextRows, nextCells, nextConclusion) {
    scheduleAutoSave(nextCols, nextRows, nextCells, nextConclusion);
  }

  /* ── Column ops ──────────────────────────────────────────────── */
  function addColumn() {
    if (columns.length >= MAX_COLS) return;
    const next = [...columns, ''];
    setColumns(next);
    withSave(next, rows, cells, conclusion);
  }

  function deleteColumn(ci) {
    if (columns.length <= 1) return;
    const nextCols = columns.filter((_, i) => i !== ci);
    // Rebuild cells: remove column ci, shift higher indices down
    const nextCells = {};
    rows.forEach((_, ri) => {
      let newCi = 0;
      columns.forEach((_, oci) => {
        if (oci === ci) return;
        const old = cells[`${ri}-${oci}`];
        if (old !== undefined) nextCells[`${ri}-${newCi}`] = old;
        newCi++;
      });
    });
    setColumns(nextCols);
    setCells(nextCells);
    withSave(nextCols, rows, nextCells, conclusion);
  }

  function updateColumnHeader(ci, val) {
    const next = columns.map((c, i) => (i === ci ? val : c));
    setColumns(next);
    withSave(next, rows, cells, conclusion);
  }

  /* ── Row ops ─────────────────────────────────────────────────── */
  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    const next = [...rows, ''];
    setRows(next);
    withSave(columns, next, cells, conclusion);
  }

  function deleteRow(ri) {
    if (rows.length <= 1) return;
    const nextRows = rows.filter((_, i) => i !== ri);
    // Rebuild cells: remove row ri, shift higher indices down
    const nextCells = {};
    rows.forEach((_, ori) => {
      if (ori === ri) return;
      const newRi = ori > ri ? ori - 1 : ori;
      columns.forEach((_, ci) => {
        const old = cells[`${ori}-${ci}`];
        if (old !== undefined) nextCells[`${newRi}-${ci}`] = old;
      });
    });
    setRows(nextRows);
    setCells(nextCells);
    withSave(columns, nextRows, nextCells, conclusion);
  }

  function updateRowHeader(ri, val) {
    const next = rows.map((r, i) => (i === ri ? val : r));
    setRows(next);
    withSave(columns, next, cells, conclusion);
  }

  /* ── Cell ops ────────────────────────────────────────────────── */
  function updateCell(ri, ci, val) {
    const nextCells = { ...cells, [`${ri}-${ci}`]: val };
    setCells(nextCells);
    withSave(columns, rows, nextCells, conclusion);
  }

  function updateConclusion(val) {
    setConclusion(val);
    withSave(columns, rows, cells, val);
  }

  /* ── Styles ──────────────────────────────────────────────────── */
  const cellBorder = '1px solid var(--pencil)';

  const thStyle = (bg) => ({
    padding: 8,
    border: cellBorder,
    background: bg || 'var(--parchment)',
    position: 'relative',
    minWidth: 120,
    verticalAlign: 'top',
  });

  const tdStyle = (ri) => ({
    padding: 8,
    border: cellBorder,
    background: ri % 2 === 0 ? 'var(--paper)' : 'var(--parchment)',
    verticalAlign: 'top',
    minWidth: 120,
  });

  const deleteBtn = {
    position: 'absolute',
    top: 2,
    right: 2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    lineHeight: 1,
    color: 'var(--pencil)',
    borderRadius: 3,
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={addColumn}
          disabled={columns.length >= MAX_COLS}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            padding: '6px 12px',
            border: '1px solid var(--pencil)',
            borderRadius: 6,
            background: 'var(--chalk)',
            color: columns.length >= MAX_COLS ? 'var(--pencil)' : 'var(--ink)',
            cursor: columns.length >= MAX_COLS ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={14} /> Add Column
        </button>
        <button
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            padding: '6px 12px',
            border: '1px solid var(--pencil)',
            borderRadius: 6,
            background: 'var(--chalk)',
            color: rows.length >= MAX_ROWS ? 'var(--pencil)' : 'var(--ink)',
            cursor: rows.length >= MAX_ROWS ? 'not-allowed' : 'pointer',
          }}
        >
          <Plus size={14} /> Add Row
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr>
              {/* Top-left empty corner */}
              <th
                style={{
                  ...thStyle('var(--parchment)'),
                  minWidth: 100,
                }}
              />
              {columns.map((col, ci) => (
                <th key={ci} style={thStyle()}>
                  <div style={{ paddingRight: columns.length > 1 ? 18 : 0 }}>
                    <EditableCell
                      value={col}
                      onChange={(v) => updateColumnHeader(ci, v)}
                      placeholder={`Option ${ci + 1}`}
                      bold
                    />
                  </div>
                  {columns.length > 1 && (
                    <button
                      onClick={() => deleteColumn(ci)}
                      style={deleteBtn}
                      title="Delete column"
                    >
                      <X size={13} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {/* Row header */}
                <td
                  style={{
                    ...thStyle(ri % 2 === 0 ? 'var(--paper)' : 'var(--parchment)'),
                    minWidth: 100,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ paddingRight: rows.length > 1 ? 18 : 0 }}>
                    <EditableCell
                      value={row}
                      onChange={(v) => updateRowHeader(ri, v)}
                      placeholder={`Criterion ${ri + 1}`}
                      bold
                    />
                  </div>
                  {rows.length > 1 && (
                    <button
                      onClick={() => deleteRow(ri)}
                      style={deleteBtn}
                      title="Delete row"
                    >
                      <X size={13} />
                    </button>
                  )}
                </td>
                {/* Data cells */}
                {columns.map((_, ci) => (
                  <td key={ci} style={tdStyle(ri)}>
                    <EditableCell
                      value={cells[`${ri}-${ci}`] || ''}
                      onChange={(v) => updateCell(ri, ci, v)}
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Conclusion */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--ink)',
            marginBottom: 6,
          }}
        >
          Which is best and why?
        </label>
        <textarea
          value={conclusion}
          onChange={(e) => updateConclusion(e.target.value)}
          placeholder="Based on my comparison, I think..."
          rows={3}
          style={{
            width: '100%',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            border: '1px solid var(--pencil)',
            borderRadius: 6,
            padding: '8px 12px',
            color: 'var(--ink)',
            background: 'var(--chalk)',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
