import { Paintbrush } from 'lucide-react';

export default function SketchPad({ onSave }) {
  return (
    <div style={{
      border: '1.5px dashed var(--pencil)',
      borderRadius: 10,
      padding: 32,
      textAlign: 'center',
      color: 'var(--graphite)',
      fontFamily: 'var(--font-body)',
      background: 'var(--chalk)',
      marginBottom: 8,
    }}>
      <Paintbrush size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Sketch Pad</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>Freehand drawing tool coming soon</div>
    </div>
  );
}
