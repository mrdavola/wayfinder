import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode removed: causes Supabase auth lock contention in dev
// (double-invokes effects → two competing auth subscriptions)
createRoot(document.getElementById('root')).render(<App />)
