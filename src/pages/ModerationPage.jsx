import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle2, MessageCircle, ChevronDown, ChevronRight, Eye, Search, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { guideMessages as guideMessagesApi } from '../lib/api';
import TopBar from '../components/layout/TopBar';

export default function ModerationPage() {
  const { user } = useAuth();
  const [quests, setQuests] = useState([]);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [conversations, setConversations] = useState({});
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('flagged'); // 'flagged' | 'all'
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load quests + flagged messages
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      // Get all quests for this guide
      const { data: questData } = await supabase
        .from('quests')
        .select('id, title, status')
        .eq('guide_id', user.id)
        .order('created_at', { ascending: false });
      setQuests(questData || []);

      // Get flagged messages
      const { data: flagged } = await supabase
        .from('guide_messages')
        .select('*')
        .eq('flagged', true)
        .order('created_at', { ascending: false });
      setFlaggedMessages(flagged || []);

      setLoading(false);
    })();
  }, [user]);

  // Load conversations for selected quest
  useEffect(() => {
    if (!selectedQuest) return;
    (async () => {
      const { data } = await supabase
        .from('guide_messages')
        .select('*')
        .eq('quest_id', selectedQuest)
        .eq('message_type', 'field_guide')
        .order('created_at', { ascending: true });

      // Group by student_name
      const grouped = {};
      (data || []).forEach(msg => {
        if (!grouped[msg.student_name]) grouped[msg.student_name] = [];
        grouped[msg.student_name].push(msg);
      });
      setConversations(grouped);
    })();
  }, [selectedQuest]);

  const handleMarkReviewed = async (msgId) => {
    await guideMessagesApi.markReviewed(msgId);
    setFlaggedMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const questTitle = quests.find(q => q.id === selectedQuest)?.title || '';

  const filteredStudents = Object.keys(conversations).filter(name =>
    !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <TopBar />
      <div style={{
        maxWidth: 900, margin: '0 auto', padding: '24px 20px',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Shield size={22} color="var(--lab-blue)" />
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
            color: 'var(--ink)', margin: 0,
          }}>
            Chat Moderation
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[
            { key: 'flagged', label: 'Flagged Messages', icon: AlertTriangle, count: flaggedMessages.length },
            { key: 'all', label: 'All Conversations', icon: MessageCircle },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: tab === key ? '1px solid var(--lab-blue)' : '1px solid var(--pencil)',
                background: tab === key ? 'rgba(27,73,101,0.06)' : 'var(--chalk)',
                color: tab === key ? 'var(--lab-blue)' : 'var(--graphite)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span style={{
                  background: 'var(--specimen-red)', color: 'var(--chalk)',
                  borderRadius: 100, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <p style={{ color: 'var(--graphite)', fontSize: 13 }}>Loading...</p>
        )}

        {/* Flagged tab */}
        {tab === 'flagged' && !loading && (
          <div>
            {flaggedMessages.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '48px 20px',
                color: 'var(--graphite)',
              }}>
                <CheckCircle2 size={32} color="var(--field-green)" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>All clear</p>
                <p style={{ fontSize: 12, margin: 0 }}>No flagged messages to review.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {flaggedMessages.map(msg => (
                  <div key={msg.id} style={{
                    background: 'rgba(192,57,43,0.04)',
                    border: '1px solid rgba(192,57,43,0.2)',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <AlertTriangle size={14} color="var(--specimen-red)" />
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--specimen-red)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', fontWeight: 700,
                      }}>
                        Flagged
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: 'var(--ink)', fontWeight: 600,
                      }}>
                        {msg.student_name}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--graphite)', marginLeft: 'auto',
                      }}>
                        {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13, color: 'var(--ink)', lineHeight: 1.5,
                      margin: '0 0 10px', padding: '8px 10px',
                      background: 'rgba(192,57,43,0.06)', borderRadius: 6,
                    }}>
                      {msg.content}
                    </p>
                    <button
                      onClick={() => handleMarkReviewed(msg.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 6,
                        border: '1px solid var(--field-green)',
                        background: 'transparent',
                        color: 'var(--field-green)',
                        fontSize: 11, fontWeight: 600,
                        fontFamily: 'var(--font-body)',
                        cursor: 'pointer',
                      }}
                    >
                      <CheckCircle2 size={12} /> Mark Reviewed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Conversations tab */}
        {tab === 'all' && !loading && (
          <div>
            {/* Quest selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--graphite)', textTransform: 'uppercase',
                letterSpacing: '0.06em', display: 'block', marginBottom: 6,
              }}>
                Select Project
              </label>
              <select
                value={selectedQuest || ''}
                onChange={e => { setSelectedQuest(e.target.value || null); setExpandedStudent(null); }}
                style={{
                  width: '100%', maxWidth: 400, padding: '8px 12px',
                  borderRadius: 8, border: '1px solid var(--pencil)',
                  background: 'var(--chalk)', fontSize: 13,
                  fontFamily: 'var(--font-body)', color: 'var(--ink)',
                }}
              >
                <option value="">Choose a project...</option>
                {quests.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedQuest && (
              <>
                {/* Search */}
                <div style={{ marginBottom: 14, position: 'relative' }}>
                  <Search size={14} color="var(--graphite)" style={{ position: 'absolute', left: 10, top: 9 }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by student name..."
                    style={{
                      width: '100%', maxWidth: 300, padding: '7px 10px 7px 30px',
                      borderRadius: 8, border: '1px solid var(--pencil)',
                      background: 'var(--chalk)', fontSize: 12,
                      fontFamily: 'var(--font-body)', color: 'var(--ink)',
                    }}
                  />
                </div>

                {filteredStudents.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--graphite)', fontStyle: 'italic' }}>
                    {Object.keys(conversations).length === 0
                      ? 'No Field Guide conversations yet for this project.'
                      : 'No students match your search.'}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredStudents.map(studentName => {
                      const msgs = conversations[studentName];
                      const isExpanded = expandedStudent === studentName;
                      const hasFlagged = msgs.some(m => m.flagged);
                      return (
                        <div key={studentName} style={{
                          border: '1px solid var(--pencil)',
                          borderRadius: 10, overflow: 'hidden',
                          background: hasFlagged ? 'rgba(192,57,43,0.03)' : 'var(--chalk)',
                        }}>
                          <button
                            onClick={() => setExpandedStudent(isExpanded ? null : studentName)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              width: '100%', padding: '12px 16px',
                              background: 'none', border: 'none', cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            {isExpanded ? <ChevronDown size={14} color="var(--graphite)" /> : <ChevronRight size={14} color="var(--graphite)" />}
                            <span style={{
                              fontFamily: 'var(--font-body)', fontSize: 13,
                              fontWeight: 600, color: 'var(--ink)',
                            }}>
                              {studentName}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 10,
                              color: 'var(--graphite)',
                            }}>
                              {msgs.length} message{msgs.length !== 1 ? 's' : ''}
                            </span>
                            {hasFlagged && (
                              <AlertTriangle size={12} color="var(--specimen-red)" style={{ marginLeft: 4 }} />
                            )}
                          </button>
                          {isExpanded && (
                            <div style={{
                              padding: '0 16px 14px',
                              display: 'flex', flexDirection: 'column', gap: 6,
                              maxHeight: 400, overflowY: 'auto',
                            }}>
                              {msgs.map((msg, i) => (
                                <div key={i} style={{
                                  padding: '6px 10px', borderRadius: 8,
                                  background: msg.role === 'user'
                                    ? (msg.flagged ? 'rgba(192,57,43,0.08)' : 'var(--parchment)')
                                    : 'rgba(27,73,101,0.05)',
                                  border: msg.flagged ? '1px solid rgba(192,57,43,0.3)' : 'none',
                                }}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
                                  }}>
                                    <span style={{
                                      fontFamily: 'var(--font-mono)', fontSize: 9,
                                      textTransform: 'uppercase', letterSpacing: '0.05em',
                                      color: msg.role === 'user' ? 'var(--graphite)' : 'var(--lab-blue)',
                                    }}>
                                      {msg.role === 'user' ? studentName : 'Field Guide'}
                                    </span>
                                    <span style={{
                                      fontFamily: 'var(--font-mono)', fontSize: 9,
                                      color: 'var(--pencil)',
                                    }}>
                                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.flagged && (
                                      <span style={{
                                        fontFamily: 'var(--font-mono)', fontSize: 8,
                                        color: 'var(--specimen-red)', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.06em',
                                      }}>
                                        Flagged
                                      </span>
                                    )}
                                  </div>
                                  <p style={{
                                    fontSize: 12, color: 'var(--ink)',
                                    lineHeight: 1.5, margin: 0,
                                  }}>
                                    {msg.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
