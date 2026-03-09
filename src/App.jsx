import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Eagerly loaded (landing + auth — needed immediately)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Lazy-loaded pages
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuestBuilder = lazy(() => import('./pages/QuestBuilder'));
const QuestMap = lazy(() => import('./pages/QuestMap'));
const SimulationChamber = lazy(() => import('./pages/SimulationChamber'));
const QuestLibrary = lazy(() => import('./pages/QuestLibrary'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const ExperimentPage = lazy(() => import('./pages/ExperimentPage'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StudentQuestPage = lazy(() => import('./pages/student/StudentQuestPage'));
const StudentLogin = lazy(() => import('./pages/student/StudentLogin'));
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const StudentProjectBuilder = lazy(() => import('./pages/student/StudentProjectBuilder'));
const LearnerIntakeForm = lazy(() => import('./pages/student/LearnerIntakeForm'));
const ExploreSkillPage = lazy(() => import('./pages/student/ExploreSkillPage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const GroupBuilderPage = lazy(() => import('./pages/GroupBuilderPage'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));
const YearPlan = lazy(() => import('./pages/YearPlan'));
const CareerExplorer = lazy(() => import('./pages/CareerExplorer'));
const MasteryMap = lazy(() => import('./pages/MasteryMap'));
const CommunityRepository = lazy(() => import('./pages/CommunityRepository'));

import './index.css';

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-body)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--pencil)', borderTopColor: 'var(--ink)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--graphite)', fontSize: 14 }}>Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/experiment" element={<ExperimentPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Student-facing routes — no auth required */}
            <Route path="/q/:id" element={<StudentQuestPage />} />
            <Route path="/join/:code" element={<LearnerIntakeForm />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student" element={<StudentHome />} />
            <Route path="/student/project/new" element={<StudentProjectBuilder />} />
            <Route path="/student/explore/:explorationId" element={<ExploreSkillPage />} />

            {/* Career Explorer */}
            <Route path="/careers/:studentId" element={<CareerExplorer />} />
            <Route path="/mastery/:studentId" element={<MasteryMap />} />

            {/* Parent portal */}
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/:token" element={<ParentDashboard />} />

            {/* Semi-protected: only accessible after signup */}
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Protected routes (guide/admin) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/quest/new" element={<ProtectedRoute><QuestBuilder /></ProtectedRoute>} />
            <Route path="/quest/:id" element={<ProtectedRoute><QuestMap /></ProtectedRoute>} />
            <Route path="/simulation/:id" element={<SimulationChamber />} />
            <Route path="/library" element={<ProtectedRoute><QuestLibrary /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
            <Route path="/students/groups" element={<ProtectedRoute><GroupBuilderPage /></ProtectedRoute>} />
            <Route path="/students/:id" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/yearplan" element={<ProtectedRoute><YearPlan /></ProtectedRoute>} />
            <Route path="/yearplan/:planId" element={<ProtectedRoute><YearPlan /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityRepository /></ProtectedRoute>} />
            <Route path="/moderation" element={<ProtectedRoute><ModerationPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
