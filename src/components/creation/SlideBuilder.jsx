import { Presentation } from 'lucide-react';

export default function SlideBuilder({ onSave }) {
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
      <Presentation size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Slide Builder</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>Presentation builder coming soon</div>
    </div>
  );
}
