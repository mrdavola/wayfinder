import { useState, useEffect } from 'react';
import { Star, Search, Loader2, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { communityProjects, communityReviews, yearPlanPackages } from '../lib/api';
import TopBar from '../components/layout/TopBar';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Used' },
];

export default function CommunityRepository() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [viewMode, setViewMode] = useState('projects');
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    if (!profile?.school_id) return;
    setLoading(true);
    communityProjects.listForSchool(profile.school_id, { sortBy }).then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, [profile?.school_id, sortBy]);

  useEffect(() => {
    if (!profile?.school_id || viewMode !== 'packages') return;
    yearPlanPackages.list(profile.school_id).then(setPackages);
  }, [profile?.school_id, viewMode]);

  const filtered = projects.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setReviewRating(0);
    setReviewText('');
    const revs = await communityReviews.getForProject(project.id);
    setReviews(revs);
  };

  const handleSubmitReview = async () => {
    if (!selectedProject || !reviewRating || !user) return;
    const rev = await communityReviews.submit(selectedProject.id, user.id, reviewRating, reviewText);
    if (rev) {
      setReviews(prev => [rev, ...prev.filter(r => r.reviewer_id !== user.id)]);
      setReviewRating(0);
      setReviewText('');
      const updated = await communityProjects.listForSchool(profile.school_id, { sortBy });
      setProjects(updated);
    }
  };

  const handleClone = (project) => {
    sessionStorage.setItem('community_clone', JSON.stringify({
      title: project.title,
      description: project.description,
      tags: project.tags,
      career_pathway: project.career_pathway,
    }));
    communityProjects.incrementUsage(project.id);
    window.location.href = '/quest/new';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <TopBar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: '0 0 4px' }}>
          Community Repository
        </h1>
        <p style={{ fontSize: 12, color: 'var(--graphite)', marginBottom: 20 }}>
          Projects shared by guides at your school. Browse, rate, and use as templates.
        </p>

        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <button onClick={() => setViewMode('projects')} style={{
            flex: 1, padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: viewMode === 'projects' ? 'var(--ink)' : 'var(--chalk)',
            color: viewMode === 'projects' ? 'var(--chalk)' : 'var(--graphite)',
            fontFamily: 'var(--font-body)',
          }}>Projects</button>
          <button onClick={() => setViewMode('packages')} style={{
            flex: 1, padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: viewMode === 'packages' ? 'var(--ink)' : 'var(--chalk)',
            color: viewMode === 'packages' ? 'var(--chalk)' : 'var(--graphite)',
            fontFamily: 'var(--font-body)',
          }}>Year Plan Packages</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} color="var(--graphite)" style={{ position: 'absolute', left: 10, top: 9 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              style={{
                width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8,
                border: '1px solid var(--pencil)', fontSize: 12, fontFamily: 'var(--font-body)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden' }}>
            {SORT_OPTIONS.map((opt, idx) => (
              <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: sortBy === opt.value ? 'var(--ink)' : 'var(--chalk)',
                color: sortBy === opt.value ? 'var(--chalk)' : 'var(--graphite)',
                fontFamily: 'var(--font-body)',
                borderRight: idx < SORT_OPTIONS.length - 1 ? '1px solid var(--pencil)' : 'none',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'packages' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{
                background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
                padding: '16px 18px',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', margin: '0 0 4px' }}>
                  {pkg.title}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--graphite)', margin: '0 0 8px', lineHeight: 1.4 }}>
                  {pkg.description}
                </p>
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--graphite)', marginBottom: 8 }}>
                  <span>{(pkg.items_snapshot || []).length} projects</span>
                  <span>{pkg.total_weeks} weeks</span>
                  <span>Imported {pkg.import_count}x</span>
                </div>
                <button onClick={async () => {
                  sessionStorage.setItem('package_import', JSON.stringify(pkg));
                  window.location.href = '/yearplan';
                }} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: 'var(--lab-blue)', color: 'white', fontSize: 11,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  Import Plan
                </button>
              </div>
            ))}
            {packages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 13 }}>No year plan packages shared yet.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'projects' && (loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)' }}>
            <p style={{ fontSize: 13 }}>No shared projects yet. Complete a project and share it!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(project => (
              <div key={project.id} onClick={() => handleSelectProject(project)} style={{
                background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12,
                padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
                borderColor: selectedProject?.id === project.id ? 'var(--lab-blue)' : 'var(--pencil)',
              }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', margin: '0 0 4px' }}>
                  {project.title}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--graphite)', margin: '0 0 8px', lineHeight: 1.4 }}>
                  {project.description.length > 100 ? project.description.slice(0, 100) + '...' : project.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--compass-gold)' }}>
                    <Star size={11} fill="var(--compass-gold)" /> {project.avg_rating || '\u2014'}
                  </div>
                  <span style={{ color: 'var(--pencil)' }}>|</span>
                  <span style={{ color: 'var(--graphite)' }}>Used {project.use_count}x</span>
                  {project.career_pathway && (
                    <>
                      <span style={{ color: 'var(--pencil)' }}>|</span>
                      <span style={{ color: 'var(--graphite)' }}>{project.career_pathway}</span>
                    </>
                  )}
                </div>
                {project.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {project.tags.map((tag, i) => (
                      <span key={i} style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 9,
                        background: 'rgba(27,73,101,0.06)', color: 'var(--lab-blue)',
                        fontFamily: 'var(--font-mono)',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Selected Project Detail */}
        {viewMode === 'projects' && selectedProject && (
          <div style={{
            marginTop: 24, background: 'var(--chalk)', border: '1px solid var(--pencil)',
            borderRadius: 14, padding: '20px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>
                {selectedProject.title}
              </h2>
              <button onClick={() => handleClone(selectedProject)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 8, border: 'none', background: 'var(--lab-blue)',
                color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}>
                <Copy size={13} /> Use as Template
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--graphite)', lineHeight: 1.5, marginBottom: 16 }}>
              {selectedProject.description}
            </p>
            <div style={{ fontSize: 10, color: 'var(--pencil)', marginBottom: 16 }}>
              Shared by {selectedProject.shared_by_profile?.full_name || 'a guide'}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Reviews</h3>
            {reviews.map(rev => (
              <div key={rev.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--parchment)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={10} fill={n <= rev.rating ? 'var(--compass-gold)' : 'none'}
                        color={n <= rev.rating ? 'var(--compass-gold)' : 'var(--pencil)'} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--graphite)' }}>{rev.reviewer?.full_name || 'Guide'}</span>
                </div>
                {rev.review_text && <p style={{ fontSize: 11, color: 'var(--ink)', margin: 0 }}>{rev.review_text}</p>}
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={16} style={{ cursor: 'pointer' }}
                    fill={n <= reviewRating ? 'var(--compass-gold)' : 'none'}
                    color={n <= reviewRating ? 'var(--compass-gold)' : 'var(--pencil)'}
                    onClick={() => setReviewRating(n)}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={reviewText} onChange={e => setReviewText(e.target.value)}
                  placeholder="Share your experience..."
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--pencil)',
                    fontSize: 11, fontFamily: 'var(--font-body)', outline: 'none',
                  }}
                />
                <button onClick={handleSubmitReview} disabled={!reviewRating} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: reviewRating ? 'var(--compass-gold)' : 'var(--pencil)',
                  color: 'white', fontSize: 11, fontWeight: 600, cursor: reviewRating ? 'pointer' : 'not-allowed',
                }}>
                  Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
