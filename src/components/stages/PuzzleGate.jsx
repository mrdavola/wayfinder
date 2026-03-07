import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, GripVertical, ArrowRight } from 'lucide-react';

export default function PuzzleGate({ config, onComplete }) {
  const { puzzle_type, instruction, categories, items } = config;
  const [placements, setPlacements] = useState({});
  const [dragItem, setDragItem] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState(null);

  const unplaced = items.filter(item => !placements[item.text]);

  const handleDrop = useCallback((category) => {
    if (!dragItem) return;
    setPlacements(prev => ({ ...prev, [dragItem]: category }));
    setDragItem(null);
  }, [dragItem]);

  const handleCheck = () => {
    const res = items.map(item => ({
      text: item.text,
      placed: placements[item.text] || null,
      correct: puzzle_type === 'sequence'
        ? parseInt(placements[item.text]) === item.correct_position
        : placements[item.text] === item.correct_category,
    }));
    setResults(res);
    setChecked(true);
    if (res.every(r => r.correct)) setTimeout(() => onComplete?.(true), 800);
  };

  const handleReset = () => { setPlacements({}); setChecked(false); setResults(null); };
  const allPlaced = unplaced.length === 0;
  const allCorrect = results?.every(r => r.correct);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: 'var(--parchment)', borderRadius: 12, padding: 20, border: '1px solid var(--pencil)' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginBottom: 16 }}>
          {instruction || 'Sort the items into the correct categories.'}
        </p>

        {unplaced.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, padding: 12, background: 'var(--chalk)', borderRadius: 8, border: '1px dashed var(--pencil)' }}>
            {unplaced.map(item => (
              <div key={item.text} draggable onDragStart={() => setDragItem(item.text)}
                style={{ padding: '6px 12px', background: 'var(--lab-blue)', color: 'var(--chalk)', borderRadius: 6, fontSize: 13, fontFamily: 'var(--font-body)', cursor: 'grab', display: 'flex', alignItems: 'center', gap: 4 }}>
                <GripVertical size={12} />{item.text}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${categories?.length || 2}, 1fr)`, gap: 12 }}>
          {(categories || []).map(cat => {
            const catItems = items.filter(i => placements[i.text] === cat);
            return (
              <div key={cat} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(cat)}
                style={{ border: `2px dashed ${dragItem ? 'var(--compass-gold)' : 'var(--pencil)'}`, borderRadius: 10, padding: 12, minHeight: 100, background: dragItem ? 'rgba(184,134,11,0.05)' : 'transparent', transition: 'all 200ms' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{cat}</div>
                {catItems.map(item => {
                  const result = results?.find(r => r.text === item.text);
                  return (
                    <div key={item.text} style={{ padding: '5px 10px', marginBottom: 4, borderRadius: 5, fontSize: 13, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, background: result ? (result.correct ? '#d4edda' : '#f8d7da') : 'var(--parchment)', cursor: !checked ? 'grab' : 'default' }}
                      draggable={!checked} onDragStart={() => !checked && setDragItem(item.text)}>
                      {result && (result.correct ? <CheckCircle size={14} color="var(--field-green)" /> : <XCircle size={14} color="var(--specimen-red)" />)}
                      {item.text}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {checked && !allCorrect && <button onClick={handleReset} className="btn btn-ghost" style={{ fontSize: 13 }}>Try Again</button>}
          {!checked && allPlaced && <button onClick={handleCheck} className="btn btn-primary" style={{ fontSize: 13 }}>Check <ArrowRight size={14} /></button>}
          {checked && allCorrect && (
            <div style={{ color: 'var(--field-green)', fontFamily: 'var(--font-display)', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={18} /> Puzzle solved!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
