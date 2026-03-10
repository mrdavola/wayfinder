import { useState } from 'react';
import { X, Star, Zap } from 'lucide-react';
import { kudos } from '../../lib/api';

export default function KudosModal({ student, guideId, onClose, onSuccess }) {
  const [epAmount, setEpAmount] = useState(25);
  const [stAmount, setStAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!reason.trim()) return;
    setSending(true);
    try {
      await kudos.give(guideId, student.id, epAmount, stAmount, reason.trim());
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Kudos failed:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--paper)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
            Give Kudos to {student.name}
          </h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}>
            <Zap size={14} /> EP Amount: {epAmount}
          </label>
          <input type="range" min={10} max={100} step={5} value={epAmount}
            onChange={e => setEpAmount(Number(e.target.value))}
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}>
            <Star size={14} fill="#f59e0b" /> Star Tokens: {stAmount}
          </label>
          <input type="range" min={5} max={50} step={5} value={stAmount}
            onChange={e => setStAmount(Number(e.target.value))}
            style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason</label>
          <textarea
            className="input"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Great work on your research project!"
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={sending || !reason.trim()}
          style={{ width: '100%' }}
        >
          {sending ? 'Sending...' : `Send Kudos (+${epAmount} EP, +${stAmount} ST)`}
        </button>
      </div>
    </div>
  );
}
