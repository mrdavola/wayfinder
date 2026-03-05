import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WayfinderLogoIcon from '../icons/WayfinderLogo';

function getInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV_LINKS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Library', to: '/library' },
  { label: 'Students', to: '/students' },
];

export default function TopBar() {
  const { profile, signOut } = useAuth();
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = profile?.role === 'superadmin'
    ? [...NAV_LINKS, { label: 'Admin', to: '/admin' }]
    : NAV_LINKS;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const schoolName = profile?.schools?.name || profile?.school_name || '';
  const initials = getInitials(profile?.full_name);

  return (
    <header style={{
      background: 'var(--chalk)',
      borderBottom: '1px solid var(--pencil)',
      padding: '0 var(--space-6)',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <Link to="/dashboard" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-display)', fontSize: '1.25rem',
        color: 'var(--ink)', textDecoration: 'none',
        letterSpacing: '-0.01em', flexShrink: 0,
      }}>
        <WayfinderLogoIcon size={22} color="var(--ink)" />
        Wayfinder
      </Link>

      {/* Center nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
      }}>
        {navLinks.map(({ label, to }) => {
          const active = pathname === to;
          return (
            <Link
              key={label}
              to={to}
              style={{
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                color: active ? 'var(--ink)' : 'var(--graphite)',
                textDecoration: 'none',
                fontWeight: active ? 600 : 400,
                borderBottom: active ? '2px solid var(--ink)' : '2px solid transparent',
                paddingBottom: 2,
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--graphite)'; }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--lab-blue)', background: 'rgba(27,73,101,0.08)',
          padding: '3px 8px', borderRadius: 4,
        }}>
          Guide View
        </span>
        {schoolName && (
          <span
            className="topbar-school-name"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
              color: 'var(--graphite)', whiteSpace: 'nowrap',
              maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {schoolName}
          </span>
        )}

        {/* Avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            aria-label="Account menu"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--lab-blue)', color: 'var(--chalk)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
              fontWeight: 600, letterSpacing: '0.02em', flexShrink: 0,
              userSelect: 'none', overflow: 'hidden',
            }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <ChevronDown
              size={14}
              color="var(--graphite)"
              style={{
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease',
              }}
            />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--chalk)', border: '1px solid var(--pencil)',
              borderRadius: 8, boxShadow: '0 4px 16px rgba(26,26,46,0.12)',
              minWidth: 160, overflow: 'hidden', zIndex: 200,
            }}>
              {profile?.full_name && (
                <div style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--pencil)',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                  color: 'var(--ink)', fontWeight: 500,
                }}>
                  {profile.full_name}
                </div>
              )}
              <Link
                to="/settings"
                onClick={() => setDropdownOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  width: '100%', padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                  color: 'var(--graphite)', textDecoration: 'none',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--parchment)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--graphite)'; }}
              >
                <Settings size={14} />
                Settings
              </Link>
              <button
                onClick={() => { setDropdownOpen(false); signOut(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  width: '100%', padding: '10px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
                  color: 'var(--graphite)', textAlign: 'left',
                  borderTop: '1px solid var(--pencil)',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--parchment)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--graphite)'; }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) { .topbar-school-name { display: none; } }
        @media (max-width: 640px) { nav[aria-label="main"] { display: none; } }
      `}</style>
    </header>
  );
}
