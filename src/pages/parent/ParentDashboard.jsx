import { useParams } from 'react-router-dom';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F',
};

export default function ParentDashboard() {
  const { token } = useParams();

  return (
    <div style={{
      minHeight: '100vh', background: T.paper,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: T.chalk,
        borderRadius: 16, border: `1px solid ${T.parchment}`,
        boxShadow: '0 4px 24px rgba(26,26,46,0.06)',
        padding: '48px 32px', textAlign: 'center',
      }}>
        <WayfinderLogoIcon size={36} color={T.fieldGreen} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: T.ink, margin: '16px 0 8px' }}>
          Parent Dashboard
        </h1>
        <div style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 20,
          background: `${T.fieldGreen}12`, color: T.fieldGreen,
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20,
        }}>
          Coming Soon
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, lineHeight: 1.6 }}>
          Soon you'll be able to see your child's quest progress, skill growth,
          and guide notes — all in one place. Stay tuned!
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: T.pencil, marginTop: 16 }}>
          Questions? Reach out to your child's guide.
        </p>
      </div>
    </div>
  );
}
