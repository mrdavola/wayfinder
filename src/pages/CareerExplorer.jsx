import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Compass, Sparkles, Loader2, ExternalLink, Briefcase, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { careerInsights, ai } from '../lib/api';
import TrustBadge from '../components/ui/TrustBadge';
import { getTrustTier } from '../lib/trustDomains';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';

export default function CareerExplorer() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: studentData }, insightsData] = await Promise.all([
        supabase.from('students').select('*, student_skills(*, skills(*))').eq('id', studentId).single(),
        careerInsights.getForStudent(studentId),
      ]);
      setStudent(studentData);
      setInsights(insightsData);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const handleDiscover = async () => {
    if (!student || discovering) return;
    setDiscovering(true);

    const { data: questStudents } = await supabase
      .from('quest_students')
      .select('quests(id, title, career_pathway, status)')
      .eq('student_id', studentId);
    const completedQuests = (questStudents || [])
      .map(qs => qs.quests)
      .filter(q => q?.status === 'completed');

    const profile = {
      ...student,
      skills: student.student_skills?.map(ss => ss.skills) || [],
    };

    const newCareers = await ai.discoverCareers(profile, completedQuests);
    if (newCareers.length > 0) {
      const saved = await careerInsights.bulkAdd(studentId, newCareers.map(c => ({
        career_title: c.career_title,
        description: c.description,
        reason: c.reason,
        category: c.category || 'suggested',
        source_urls: c.source_urls || [],
        related_quest_ids: completedQuests.map(q => q.id),
      })));
      setInsights(prev => [...saved, ...prev]);
    }
    setDiscovering(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <Link to={`/students/${studentId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--graphite)', textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back to profile
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <WayfinderLogoIcon size={16} color="var(--compass-gold)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink)' }}>Career Explorer</span>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{student?.avatar_emoji || '🧭'}</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: 0 }}>
            {student?.name}'s Career Map
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--graphite)', marginBottom: 28 }}>
          Careers connected to your projects and interests. These are possibilities to explore — not predictions!
        </p>

        {/* Discover button */}
        <button onClick={handleDiscover} disabled={discovering}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '14px 20px', marginBottom: 24,
            background: discovering ? 'var(--parchment)' : 'rgba(184,134,11,0.06)',
            border: '1.5px dashed var(--compass-gold)', borderRadius: 10,
            cursor: discovering ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)',
          }}>
          {discovering ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} color="var(--compass-gold)" />}
          {discovering ? 'Discovering careers...' : 'Explore More Careers'}
        </button>

        {/* Empty state */}
        {insights.length === 0 && !discovering && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)' }}>
            <Briefcase size={32} color="var(--pencil)" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13 }}>No career connections yet. Complete projects or click "Explore More" to discover careers!</p>
          </div>
        )}

        {/* Career cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {insights.map(insight => (
            <div key={insight.id} style={{
              background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={16} color="var(--lab-blue)" />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', margin: 0 }}>
                  {insight.career_title}
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--graphite)', lineHeight: 1.5, margin: 0 }}>
                {insight.description}
              </p>
              <div style={{
                padding: '8px 10px', background: 'rgba(184,134,11,0.06)', borderRadius: 6,
                fontSize: 12, color: 'var(--ink)', lineHeight: 1.5,
              }}>
                <strong style={{ color: 'var(--compass-gold)' }}>Why this fits you:</strong> {insight.reason}
              </div>
              {insight.source_urls?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {insight.source_urls.map((src, i) => (
                    <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--lab-blue)', textDecoration: 'none' }}>
                      <TrustBadge tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
