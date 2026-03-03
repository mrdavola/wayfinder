import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--paper)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg
            width="56"
            height="56"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animation: 'spin 3s linear infinite', margin: '0 auto' }}
          >
            <circle cx="50" cy="50" r="46" stroke="var(--ink)" strokeWidth="5" />
            <circle cx="50" cy="50" r="37" stroke="var(--ink)" strokeWidth="2" />
            <line x1="50" y1="5"  x2="50" y2="13" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="87" y1="50" x2="95" y2="50" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="50" y1="87" x2="50" y2="95" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="5"  y1="50" x2="13" y2="50" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
            <path
              d="M 50 18 C 54 36, 64 46, 82 50 C 64 54, 54 64, 50 82 C 46 64, 36 54, 18 50 C 36 46, 46 36, 50 18 Z M 50 44 A 6 6 0 1 0 50 56 A 6 6 0 1 0 50 44 Z"
              fill="var(--ink)" fillRule="evenodd"
            />
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--graphite)',
            fontSize: 'var(--text-sm)',
            marginTop: '12px',
          }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user exists but hasn't completed onboarding
  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
