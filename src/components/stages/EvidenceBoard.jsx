import { useState, useCallback } from 'react';
import { FileText, Quote, BarChart3, Image, GripVertical, Send } from 'lucide-react';

const CLUE_ICONS = { fact: FileText, quote: Quote, data: BarChart3, image_desc: Image };

export default function EvidenceBoard({ config, onComplete }) {
  const { prompt, clue_cards, board_zones } = config;
  const [placements, setPlacements] = useState({});
  const [dragClue, setDragClue] = useState(null);
  const [argument, setArgument] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const unplaced = (clue_cards || []).filter(c => !placements[c.id]);
  const allPlaced = unplaced.length === 0;

  const handleDrop = useCallback((zone) => {
    if (!dragClue) return;
    setPlacements(prev => ({ ...prev, [dragClue]: zone }));
    setDragClue(null);
  }, [dragClue]);

  const handleSubmit = () => { setSubmitted(true); onComplete?.({ placements, argument }); };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: '#2C2C2C', borderRadius: 12, padding: 20, border: '1px solid #444', color: '#E8E8E8' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#F5E6C8', marginBottom: 4 }}>Evidence Board</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#B0B0B0', marginBottom: 20 }}>{prompt}</p>

        {unplaced.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, padding: 12, background: '#1A1A1A', borderRadius: 8, border: '1px dashed #555' }}>
            <div style={{ width: '100%', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Clues ({unplaced.length} remaining)</div>
            {unplaced.map(clue => {
              const Icon = CLUE_ICONS[clue.type] || FileText;
              return (
                <div key={clue.id} draggable onDragStart={() => setDragClue(clue.id)}
                  style={{ padding: '8px 12px', background: '#3A3A3A', borderRadius: 6, border: '1px solid #555', cursor: 'grab', maxWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <GripVertical size={10} color="#888" /><Icon size={12} color="#F5E6C8" />
                    <span style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)' }}>{clue.type}</span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>{clue.text}</div>
                  {clue.source && <div style={{ fontSize: 9, color: '#888', marginTop: 4, fontStyle: 'italic' }}>Source: {clue.source}</div>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${board_zones?.length || 3}, 1fr)`, gap: 10 }}>
          {(board_zones || []).map(zone => {
            const zoneClues = clue_cards.filter(c => placements[c.id] === zone);
            return (
              <div key={zone} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(zone)}
                style={{ border: `2px dashed ${dragClue ? '#F5E6C8' : '#555'}`, borderRadius: 10, padding: 10, minHeight: 120, background: dragClue ? 'rgba(245,230,200,0.05)' : 'transparent', transition: 'all 200ms' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F5E6C8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #444', paddingBottom: 4 }}>{zone}</div>
                {zoneClues.map(clue => (
                  <div key={clue.id} style={{ padding: '6px 8px', marginBottom: 4, borderRadius: 4, background: '#3A3A3A', fontSize: 11, lineHeight: 1.3, border: '1px solid #555' }}>{clue.text}</div>
                ))}
              </div>
            );
          })}
        </div>

        {allPlaced && !submitted && (
          <div style={{ marginTop: 16 }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F5E6C8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Make your case:</label>
            <textarea value={argument} onChange={(e) => setArgument(e.target.value)}
              placeholder="Using the evidence you've gathered, write your argument..."
              style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 8, background: '#1A1A1A', border: '1px solid #555', color: '#E8E8E8', fontFamily: 'var(--font-body)', fontSize: 13, resize: 'vertical' }} />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button onClick={handleSubmit} disabled={!argument.trim()} className="btn btn-primary" style={{ fontSize: 13 }}>Submit Evidence <Send size={13} /></button>
            </div>
          </div>
        )}
        {submitted && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#F5E6C8', fontFamily: 'var(--font-display)', fontSize: 16 }}>Case submitted. The evidence speaks for itself.</div>
        )}
      </div>
    </div>
  );
}
