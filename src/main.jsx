import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-reload once when chunk files are stale after a new deploy
window.addEventListener('error', (e) => {
  if (e.message?.includes('Failed to fetch dynamically imported module') ||
      e.message?.includes('Loading chunk') ||
      e.message?.includes('Loading CSS chunk')) {
    const reloaded = sessionStorage.getItem('chunk-reload');
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  }
});
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('Failed to fetch dynamically imported module')) {
    const reloaded = sessionStorage.getItem('chunk-reload');
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  }
});
// Clear the reload flag on successful load
sessionStorage.removeItem('chunk-reload');

// StrictMode removed: causes Supabase auth lock contention in dev
// (double-invokes effects → two competing auth subscriptions)
createRoot(document.getElementById('root')).render(<App />)
