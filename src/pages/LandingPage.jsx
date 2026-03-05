import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Route,
  Mic,
  FlaskConical,
  Microscope,
  Zap,
  Trophy,
  Atom,
  Activity,
  Heart,
  ArrowRight,
  MapPin,
  Sparkles,
  School,
  BarChart2,
  ShieldCheck,
} from 'lucide-react';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';
import { supabase } from '../lib/supabase';

/* ─── Scroll animation hook ─────────────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─── Inline style helpers ───────────────────────────────────────────────── */
const fadeSection = {
  opacity: 0,
  transform: 'translateY(20px)',
  transition: 'opacity 400ms ease, transform 400ms ease',
};

/* inject the .visible rule once */
const visibleStyle = `
  .fade-section.visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;

/* ─── Quest Map SVG Illustration ─────────────────────────────────────────── */
function QuestMapIllustration() {
  const nodes = [
    { x: 110, y: 72,  icon: <FlaskConical size={20} />, label: 'Spark Interest', gold: false, side: 'right' },
    { x: 210, y: 180, icon: <Microscope  size={20} />, label: 'Deep Dive',      gold: false, side: 'left'  },
    { x: 110, y: 290, icon: <Zap         size={20} />, label: 'Build & Test',   gold: true,  side: 'right' },
    { x: 210, y: 398, icon: <Trophy      size={20} />, label: 'Present',        gold: false, side: 'left'  },
  ];

  return (
    <svg
      viewBox="0 0 340 480"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Wayfinder project map illustration"
      style={{ width: '100%', maxWidth: 340, height: 'auto' }}
    >
      {/* Grid paper lines */}
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(154,163,175,0.12)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="340" height="480" fill="url(#grid)" rx="12" />
      <rect width="340" height="480" fill="rgba(250,248,245,0.7)" rx="12" />

      {/* Title label */}
      <text x="170" y="26" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#9CA3AF" letterSpacing="1.5">WAYFINDER — EXPLORER EDITION</text>

      {/* Dashed vertical spine */}
      <line x1="160" y1="50" x2="160" y2="430"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeDasharray="5 6"
        strokeLinecap="round"
      />

      {/* Connector lines from spine to nodes */}
      {nodes.map((n, i) => (
        <line
          key={`connector-${i}`}
          x1="160" y1={n.y}
          x2={n.x} y2={n.y}
          stroke="#9CA3AF"
          strokeWidth="1"
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
      ))}

      {/* Waypoint nodes */}
      {nodes.map((n, i) => (
        <g key={`node-${i}`} transform={`translate(${n.x}, ${n.y})`}>
          {/* Shadow */}
          <circle cx="2" cy="3" r="24" fill="rgba(26,26,46,0.06)" />
          {/* Node circle */}
          <circle
            r="24"
            fill={n.gold ? '#B8860B' : '#FAF8F5'}
            stroke={n.gold ? '#B8860B' : '#9CA3AF'}
            strokeWidth="1.5"
          />
          {/* Step number */}
          <text
            y="-8"
            textAnchor="middle"
            fontFamily="'Instrument Serif', serif"
            fontSize="10"
            fill={n.gold ? 'rgba(255,255,255,0.7)' : '#9CA3AF'}
          >
            {String(i + 1).padStart(2, '0')}
          </text>
          {/* Icon (foreignObject for Lucide) */}
          <foreignObject x="-10" y="-4" width="20" height="20">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                color: n.gold ? '#FFFFFF' : '#6B7280',
              }}
            >
              {n.icon}
            </div>
          </foreignObject>
        </g>
      ))}

      {/* Floating specimen card snippets */}
      {/* Card near node 1 */}
      <g transform="translate(148, 96)">
        <rect x="0" y="0" width="120" height="44" rx="5" fill="white" stroke="#E5E7EB" strokeWidth="1" />
        <rect x="0" y="0" width="3" height="44" rx="5" fill="#2D6A4F" />
        <text x="10" y="14" fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="#9CA3AF">SKILL UNLOCKED</text>
        <text x="10" y="28" fontFamily="'DM Sans', sans-serif" fontSize="9" fontWeight="600" fill="#1A1A2E">Systems Thinking</text>
        <text x="10" y="40" fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="#B8860B">+240 XP</text>
      </g>

      {/* Card near node 3 */}
      <g transform="translate(8, 258)">
        <rect x="0" y="0" width="110" height="50" rx="5" fill="white" stroke="#E5E7EB" strokeWidth="1" />
        <rect x="0" y="0" width="3" height="50" rx="5" fill="#B8860B" />
        <text x="10" y="14" fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="#9CA3AF">CAREER LINK</text>
        <text x="10" y="28" fontFamily="'DM Sans', sans-serif" fontSize="9" fontWeight="600" fill="#1A1A2E">AI Materials</text>
        <text x="10" y="40" fontFamily="'DM Sans', sans-serif" fontSize="9" fill="#6B7280">Scientist</text>
      </g>

      {/* Card near node 2 */}
      <g transform="translate(228, 155)">
        <rect x="0" y="0" width="100" height="44" rx="5" fill="white" stroke="#E5E7EB" strokeWidth="1" />
        <rect x="0" y="0" width="3" height="44" rx="5" fill="#1B4965" />
        <text x="10" y="14" fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="#9CA3AF">QUEST TYPE</text>
        <text x="10" y="28" fontFamily="'DM Sans', sans-serif" fontSize="9" fontWeight="600" fill="#1A1A2E">Investigation</text>
        <text x="10" y="40" fontFamily="'IBM Plex Mono', monospace" fontSize="7" fill="#2D6A4F">ACTIVE</text>
      </g>

      {/* Start marker at top */}
      <g transform="translate(160, 42)">
        <circle r="6" fill="#2D6A4F" />
        <circle r="3" fill="white" />
      </g>

      {/* End marker at bottom */}
      <g transform="translate(160, 438)">
        <text textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="#9CA3AF" y="4">PROJECT COMPLETE</text>
      </g>
      <g transform="translate(160, 428)">
        <polygon points="0,-7 7,4 -7,4" fill="#B8860B" />
      </g>
    </svg>
  );
}

/* ─── Landing Page ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const problemRef = useFadeIn();
  const howRef     = useFadeIn();
  const pathwayRef = useFadeIn();
  const proofRef   = useFadeIn();
  const ctaRef     = useFadeIn();

  async function handleWaitlist(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setWaitlistLoading(true);
    setWaitlistError(null);
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({ email: trimmed });
      if (error) {
        // 23505 = unique_violation: they already signed up — still show success
        if (error.code === '23505') {
          setSubmitted(true);
        } else {
          setWaitlistError('Something went wrong. Please try again.');
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setWaitlistError('Something went wrong. Please try again.');
    } finally {
      setWaitlistLoading(false);
    }
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      {/* Inject .visible CSS */}
      <style>{visibleStyle}</style>

      {/* ── Sticky Nav ─────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--chalk)',
          borderBottom: '1px solid var(--pencil)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: 'var(--ink)',
            }}
          >
            <WayfinderLogoIcon size={28} color="var(--ink)" />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>
              Wayfinder
            </span>
          </Link>

          {/* Desktop nav links */}
          <div
            className="nav-links-desktop"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => scrollToSection('how-it-works')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--graphite)',
              }}
            >
              For Guides
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => scrollToSection('schools')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--graphite)',
              }}
            >
              For Schools
            </button>
            <Link
              to="/student/login"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--compass-gold)',
                fontWeight: 600,
                textDecoration: 'none',
                marginLeft: 'var(--space-4)',
              }}
            >
              Learner Login
            </Link>
            <Link
              to="/signup"
              className="btn btn-primary"
              style={{ marginLeft: 'var(--space-4)' }}
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
            className="nav-hamburger"
          >
            <span style={{
              display: 'block', width: 22, height: 2,
              background: 'var(--ink)', marginBottom: 5, borderRadius: 2,
            }} />
            <span style={{
              display: 'block', width: 22, height: 2,
              background: 'var(--ink)', marginBottom: 5, borderRadius: 2,
            }} />
            <span style={{
              display: 'block', width: 22, height: 2,
              background: 'var(--ink)', borderRadius: 2,
            }} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            style={{
              background: 'var(--chalk)',
              borderTop: '1px solid var(--pencil)',
              padding: 'var(--space-4) var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={() => { scrollToSection('how-it-works'); setMobileMenuOpen(false); }}
              style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              For Guides
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { scrollToSection('cta'); setMobileMenuOpen(false); }}
              style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              For Schools
            </button>
            <Link
              to="/student/login"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--compass-gold)',
                fontWeight: 600,
                textDecoration: 'none',
                marginTop: 'var(--space-2)',
              }}
            >
              Learner Login
            </Link>
            <Link
              to="/signup"
              className="btn btn-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started Free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        className="grid-paper"
        style={{
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--space-16) 0',
        }}
      >
        <div className="container" style={{ width: '100%' }}>
          <div
            className="hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '55fr 45fr',
              gap: 'var(--space-16)',
              alignItems: 'center',
            }}
          >
            {/* Left column */}
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--field-green)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 'var(--space-6)',
                  fontWeight: 500,
                }}
              >
                For Guides at Learner-Driven Schools
              </p>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-4xl)',
                  lineHeight: 1.15,
                  color: 'var(--ink)',
                  marginBottom: 'var(--space-6)',
                  letterSpacing: '-0.02em',
                }}
              >
                AI-powered project generation in minutes — based on you.
              </h1>

              <p
                style={{
                  fontSize: 'var(--text-lg)',
                  color: 'var(--graphite)',
                  lineHeight: 1.7,
                  marginBottom: 'var(--space-8)',
                  maxWidth: 520,
                }}
              >
                Tell Wayfinder what your learners care about, pick your standards, and let the AI build a rigorous, career-connected project in under two minutes.
              </p>

              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  to="/signup"
                  className="btn btn-primary"
                  style={{ fontSize: 'var(--text-base)', padding: 'var(--space-4) var(--space-8)' }}
                >
                  Start Building Projects
                  <ArrowRight size={16} />
                </Link>
                <button
                  className="btn btn-ghost"
                  onClick={() => scrollToSection('how-it-works')}
                  style={{
                    background: 'none',
                    border: '1px solid var(--pencil)',
                    fontSize: 'var(--text-base)',
                    padding: 'var(--space-4) var(--space-6)',
                    cursor: 'pointer',
                    color: 'var(--ink)',
                    borderRadius: 6,
                  }}
                >
                  See How It Works
                </button>
              </div>

              {/* Trust signal */}
              <p
                style={{
                  marginTop: 'var(--space-8)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--pencil)',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <Sparkles size={12} style={{ color: 'var(--compass-gold)' }} />
                Designed for learner-driven schools across North America
              </p>
            </div>

            {/* Right column — SVG illustration */}
            <div
              className="hero-illustration"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <QuestMapIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ────────────────────────────────────────────────────── */}
      <section
        id="problem"
        ref={problemRef}
        className="fade-section"
        style={{
          ...fadeSection,
          padding: 'var(--space-24) 0',
          background: 'var(--chalk)',
        }}
      >
        <div
          className="container"
          style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto', padding: '0 var(--space-6)' }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--graphite)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-4)',
              fontWeight: 500,
            }}
          >
            The Challenge
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              lineHeight: 1.25,
              color: 'var(--ink)',
              marginBottom: 'var(--space-8)',
              letterSpacing: '-0.02em',
            }}
          >
            50,000 students. Infinite curiosity. Zero exposure to the careers AI is creating.
          </h2>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <p style={{ color: 'var(--graphite)', lineHeight: 1.75 }}>
              Students in learner-driven schools are deeply engaged — but their project work often stays surface-level because guides don&apos;t have time to design interdisciplinary, career-connected curriculum for every learner.
            </p>
            <p style={{ color: 'var(--graphite)', lineHeight: 1.75 }}>
              Meanwhile, AI is transforming fields like material science, synthetic biology, and telemedicine — but a 9-year-old building a Minecraft world has no idea these fields exist, let alone that their spatial reasoning could lead there.
            </p>
            <p style={{ color: 'var(--graphite)', lineHeight: 1.75 }}>
              Wayfinder bridges that gap.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        ref={howRef}
        className="fade-section"
        style={{
          ...fadeSection,
          padding: 'var(--space-24) 0',
          background: 'var(--parchment)',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--graphite)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 'var(--space-4)',
                fontWeight: 500,
              }}
            >
              How It Works
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              From interest to expertise in three steps.
            </h2>
          </div>

          <div
            className="how-it-works-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-6)',
            }}
          >
            {[
              {
                num: '1',
                Icon: Compass,
                title: 'Guide Inputs Interests',
                desc: 'Share what your students are obsessed with. Select the academic skills you need to embed. Wayfinder\'s AI does the rest.',
              },
              {
                num: '2',
                Icon: Route,
                title: 'AI Generates the Project',
                desc: 'The engine designs a multi-stage project pathway that weaves required standards into the student\'s interest — and connects it to a real career field they\'ve never heard of.',
              },
              {
                num: '3',
                Icon: Mic,
                title: 'Students Explore & Simulate',
                desc: 'Learners follow the project map, complete challenges, and enter voice-powered career simulations where they solve real problems as junior scientists and specialists.',
              },
            ].map(({ num, Icon, title, desc }) => (
              <div
                key={num}
                className="specimen-card"
                style={{ '--tab-color': 'var(--graphite)', paddingLeft: 'calc(var(--space-6) + 8px)' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '3rem',
                    lineHeight: 1,
                    color: 'var(--compass-gold)',
                    marginBottom: 'var(--space-4)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'var(--chalk)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                    border: '1px solid var(--pencil)',
                  }}
                >
                  <Icon size={20} style={{ color: 'var(--graphite)' }} />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    color: 'var(--ink)',
                    marginBottom: 'var(--space-3)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </h3>
                <p style={{ color: 'var(--graphite)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Career Pathways ────────────────────────────────────────────── */}
      <section
        id="pathways"
        ref={pathwayRef}
        className="fade-section"
        style={{
          ...fadeSection,
          padding: 'var(--space-24) 0',
          background: 'var(--chalk)',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--graphite)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 'var(--space-4)',
                fontWeight: 500,
              }}
            >
              Career Pathways
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              Sample projects from the frontier of AI careers.
            </h2>
          </div>

          <div
            className="pathways-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-6)',
            }}
          >
            {/* Card 1 — AI in Material Science */}
            <div className="specimen-card tech" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(27,73,101,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Atom size={20} style={{ color: 'var(--lab-blue)' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--lab-blue)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  AI in Material Science
                </p>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Battery Composition · Smart Materials · Nano-Engineering
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Design a Smarter Material
              </h3>
              <p style={{ color: 'var(--graphite)', fontSize: 'var(--text-sm)', lineHeight: 1.7, flexGrow: 1 }}>
                Use AI-assisted simulation to explore how material properties are discovered and optimized. Model a new biodegradable polymer and pitch it to a simulated materials scientist.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {['Systems Thinking', 'Computational Modeling', 'Materials Science', 'Sustainability'].map(tag => (
                  <span key={tag} className="skill-tag default">{tag}</span>
                ))}
              </div>
            </div>

            {/* Card 2 — AI in Biology */}
            <div className="specimen-card science" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(45,106,79,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Activity size={20} style={{ color: 'var(--field-green)' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--field-green)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  AI in Biology
                </p>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Drug Discovery · Genomics · Synthetic Biology
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Read the Language of Life
              </h3>
              <p style={{ color: 'var(--graphite)', fontSize: 'var(--text-sm)', lineHeight: 1.7, flexGrow: 1 }}>
                Explore how AI is revolutionizing genomics and protein folding. Analyze real sequence data, understand how AlphaFold works, and interview a simulated computational biologist.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {['Genomics', 'AI & Biology', 'Data Analysis', 'Critical Thinking'].map(tag => (
                  <span key={tag} className="skill-tag default">{tag}</span>
                ))}
              </div>
            </div>

            {/* Card 3 — AI in Healthcare */}
            <div className="specimen-card humanity" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: 'rgba(192,57,43,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Heart size={20} style={{ color: 'var(--specimen-red)' }} />
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--specimen-red)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  AI in Healthcare
                </p>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Telemedicine · Diagnostic AI · Digital Health
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                Diagnose with Intelligence
              </h3>
              <p style={{ color: 'var(--graphite)', fontSize: 'var(--text-sm)', lineHeight: 1.7, flexGrow: 1 }}>
                Investigate how AI is transforming radiology and diagnostics. Review case studies, understand the ethics of algorithmic medicine, and build a simple disease-detection model.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {['Medical Ethics', 'AI Diagnostics', 'Research Methods', 'Communication'].map(tag => (
                  <span key={tag} className="skill-tag default">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ───────────────────────────────────────────────── */}
      <section
        id="proof"
        ref={proofRef}
        className="fade-section"
        style={{
          ...fadeSection,
          padding: 'var(--space-24) 0',
          background: 'var(--parchment)',
        }}
      >
        <div
          className="container"
          style={{
            textAlign: 'center',
            maxWidth: 680,
            margin: '0 auto',
            padding: '0 var(--space-6)',
          }}
        >
          {/* Decorative open quote */}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '6rem',
              lineHeight: 0.5,
              color: 'var(--pencil)',
              marginBottom: 'var(--space-6)',
              userSelect: 'none',
            }}
          >
            &ldquo;
          </div>

          <blockquote
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              lineHeight: 1.55,
              color: 'var(--ink)',
              fontStyle: 'italic',
              marginBottom: 'var(--space-8)',
              border: 'none',
              padding: 0,
            }}
          >
            Wayfinder made me feel like I could actually design curriculum that honors who my students are — and I did it in 10 minutes.
          </blockquote>

          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
              color: 'var(--graphite)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-12)',
            }}
          >
            — Guide, Austin TX
          </p>

          {/* Divider */}
          <div style={{ width: 48, height: 1, background: 'var(--pencil)', margin: '0 auto var(--space-12)' }} />

          {/* Stat */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              background: 'var(--chalk)',
              border: '1px solid var(--pencil)',
              borderRadius: 8,
              padding: 'var(--space-4) var(--space-8)',
            }}
          >
            <MapPin size={16} style={{ color: 'var(--compass-gold)', flexShrink: 0 }} />
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                color: 'var(--ink)',
                letterSpacing: '0.02em',
              }}
            >
              Designed for <strong>learner-driven schools</strong> across North America
            </p>
          </div>
        </div>
      </section>

      {/* ── For Schools ─────────────────────────────────────────────────── */}
      <section
        id="schools"
        ref={useFadeIn()}
        className="fade-section"
        style={{
          ...fadeSection,
          padding: 'var(--space-24) 0',
          background: 'var(--ink)',
        }}
      >
        <div className="container" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-6)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 64, alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left copy */}
            <div style={{ flex: '1 1 340px', maxWidth: 480 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--compass-gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--space-4)', fontWeight: 500 }}>
                For Schools
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--chalk)', marginBottom: 'var(--space-6)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Bring Wayfinder to your whole campus.
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, marginBottom: 'var(--space-8)' }}>
                School licenses unlock a shared Project Library, administrator dashboards, standards alignment reports, and onboarding support — so every guide can hit the ground running.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                {[
                  'School-wide Project Library with custom templates',
                  'Admin dashboard — see all guides and learner progress',
                  'Standards alignment reports for parent & board review',
                  'Dedicated onboarding and curriculum mapping support',
                  'Volume pricing from 5 guides upward',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--compass-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="2,5 4,7 8,3" stroke="#1A1A2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
              <a
                href="mailto:schools@wayfinder.app"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--compass-gold)', color: 'var(--ink)',
                  padding: '12px 28px', borderRadius: 8,
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '0.01em',
                  transition: 'opacity 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Request School Pricing
                <ArrowRight size={15} />
              </a>
            </div>

            {/* Right: feature cards */}
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { Icon: School,       title: 'Multi-guide schools', body: 'One licence covers your full teaching team. Share projects, co-create templates, and align on standards together.' },
                { Icon: BarChart2,    title: 'Progress at a glance', body: "The admin dashboard surfaces every learner's project status across all guides — no spreadsheets needed." },
                { Icon: ShieldCheck,  title: 'Private & secure', body: "Student data never leaves your school's workspace. Fully FERPA-compliant, no ads, no third-party sharing." },
              ].map((card) => (
                <div key={card.title} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '18px 20px' }}>
                  <card.Icon size={22} color="rgba(255,255,255,0.7)" style={{ marginBottom: 10, display: 'block' }} />
                  <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--chalk)', marginBottom: 4 }}>{card.title}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>{card.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Block ──────────────────────────────────────────────────── */}
      <section
        id="cta"
        ref={ctaRef}
        className="fade-section"
        style={{
          ...fadeSection,
          padding: 'var(--space-24) 0',
          background: 'var(--parchment)',
          borderTop: '1px solid var(--pencil)',
        }}
      >
        <div
          className="container"
          style={{
            textAlign: 'center',
            maxWidth: 560,
            margin: '0 auto',
            padding: '0 var(--space-6)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--graphite)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 'var(--space-4)',
              fontWeight: 500,
            }}
          >
            Join the Waitlist
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--ink)',
              marginBottom: 'var(--space-8)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Ready to turn interests into projects?
          </h2>

          {submitted ? (
            <div
              style={{
                background: 'var(--chalk)',
                border: '1px solid var(--field-green)',
                borderRadius: 8,
                padding: 'var(--space-6)',
                color: 'var(--field-green)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                letterSpacing: '0.03em',
              }}
            >
              You&apos;re on the list. We&apos;ll be in touch soon.
            </div>
          ) : (
            <form
              onSubmit={handleWaitlist}
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="email"
                required
                className="input"
                placeholder="your@school.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ flex: '1 1 240px', minWidth: 0 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={waitlistLoading}
                style={{
                  padding: 'var(--space-3) var(--space-6)',
                  flexShrink: 0,
                  fontSize: 'var(--text-sm)',
                  opacity: waitlistLoading ? 0.7 : 1,
                }}
              >
                {waitlistLoading ? 'Joining…' : 'Join the Waitlist'}
              </button>
            </form>
          )}
          {waitlistError && !submitted && (
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--specimen-red)',
              marginTop: 8,
            }}>
              {waitlistError}
            </p>
          )}

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
            <Link
              to="/signup"
              className="btn btn-primary"
              style={{ padding: 'var(--space-3) var(--space-8)', fontSize: 'var(--text-sm)' }}
            >
              Get Started Free
            </Link>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--pencil)',
              letterSpacing: '0.04em',
              marginTop: 'var(--space-4)',
            }}
          >
            Free for founding schools. No credit card required.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--pencil)',
          background: 'var(--chalk)',
          padding: 'var(--space-8) 0',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-6)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            Wayfinder
          </span>

          <nav
            style={{
              display: 'flex',
              gap: 'var(--space-6)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {[
              { label: 'About',       href: '#' },
              { label: 'For Guides',  href: '#how-it-works' },
              { label: 'For Schools', href: '#schools' },
              { label: 'Contact',     href: 'mailto:hello@wayfinder.app' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--graphite)',
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => (e.target.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.target.style.color = 'var(--graphite)')}
              >
                {label}
              </a>
            ))}
          </nav>

          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--pencil)',
              letterSpacing: '0.03em',
            }}
          >
            &copy; 2025 Wayfinder. Built for learner-driven schools.
          </p>
        </div>
      </footer>

      {/* ── Responsive overrides via a <style> tag ─────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-illustration {
            display: none !important;
          }
          .how-it-works-grid {
            grid-template-columns: 1fr !important;
          }
          .pathways-grid {
            grid-template-columns: 1fr !important;
            overflow-x: auto;
            display: flex !important;
            flex-wrap: nowrap;
            gap: var(--space-4);
            padding-bottom: var(--space-4);
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
          }
          .pathways-grid > * {
            flex: 0 0 85vw;
            scroll-snap-align: start;
          }
          .nav-links-desktop {
            display: none !important;
          }
          .nav-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
