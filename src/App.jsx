import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import Dashboard from './pages/Dashboard';
import QuestBuilder from './pages/QuestBuilder';
import QuestMap from './pages/QuestMap';
import SimulationChamber from './pages/SimulationChamber';
import QuestLibrary from './pages/QuestLibrary';
import StudentsPage from './pages/StudentsPage';
import ExperimentPage from './pages/ExperimentPage';
import SettingsPage from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import StudentQuestPage from './pages/student/StudentQuestPage';
import StudentLogin from './pages/student/StudentLogin';
import StudentHome from './pages/student/StudentHome';
import StudentProjectBuilder from './pages/student/StudentProjectBuilder';
import LearnerIntakeForm from './pages/student/LearnerIntakeForm';
import StudentProfilePage from './pages/StudentProfilePage';
import GroupBuilderPage from './pages/GroupBuilderPage';
import ParentDashboard from './pages/parent/ParentDashboard';
import ModerationPage from './pages/ModerationPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          <Route path="/moderation" element={<ProtectedRoute><ModerationPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
