import { useState, useEffect, useRef } from 'react';
import { Send, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CampfireChat({ questId, stageId, studentName, studentId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!questId || !stageId) return;
    supabase
      .from('guide_messages')
      .select('*')
      .eq('quest_id', questId)
      .eq('stage_id', stageId)
      .eq('message_type', 'campfire_chat')
      .order('created_at')
      .then(({ data }) => setMessages(data || []));
  }, [questId, stageId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from('guide_messages').insert({
      quest_id: questId, stage_id: stageId,
      student_id: studentId, student_name: studentName,
      role: 'user', content: input.trim(),
      message_type: 'campfire_chat',
    }).select().single();
    if (!error && data) setMessages(prev => [...prev, data]);
    setInput('');
    setSending(false);
  };

  return (
    <div style={{
      border: '1px solid var(--pencil)', borderRadius: 10, overflow: 'hidden',
      background: 'var(--chalk)',
    }}>
      <div style={{
        padding: '8px 12px', background: 'var(--parchment)',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid var(--pencil)',
      }}>
        <Flame size={14} color="var(--compass-gold)" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
          Campfire Chat
        </span>
      </div>

      <div ref={scrollRef} style={{
        height: 200, overflowY: 'auto', padding: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--pencil)', fontSize: 12, textAlign: 'center', padding: 20 }}>
            Start a conversation with your team...
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.student_name === studentName;
          return (
            <div key={msg.id} style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
            }}>
              {!isMe && (
                <div style={{ fontSize: 10, color: 'var(--graphite)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>
                  {msg.student_name}
                </div>
              )}
              <div style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 13,
                fontFamily: 'var(--font-body)',
                background: isMe ? 'var(--lab-blue)' : 'var(--parchment)',
                color: isMe ? 'var(--chalk)' : 'var(--ink)',
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: 6, padding: 8, borderTop: '1px solid var(--pencil)',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message your team..."
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 6,
            border: '1px solid var(--pencil)', fontSize: 13,
            fontFamily: 'var(--font-body)',
          }}
        />
        <button onClick={handleSend} disabled={!input.trim() || sending}
          className="btn btn-primary" style={{ padding: '6px 10px' }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
