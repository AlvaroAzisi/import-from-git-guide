import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingError } from './components/LoadingError';
import { AuthRedirectHandler } from './components/AuthRedirectHandler';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from './components/Toaster';

// Route Components
import { EntryRedirect } from './routes/EntryRedirect';
import { NotFound } from './routes/NotFound';
import { RootLayout } from './routes/RootLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public Pages
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import PublicProfilePage from './pages/PublicProfilePage';
import RoomPage from './pages/RoomPage';
import { ForgotPasswordPage } from './routes/auth/ForgotPasswordPage';

// Protected Pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import TemanKuPage from './pages/TemanKuPage';
import RuangkuPage from './pages/RuangkuPage';
// Removed deprecated chat imports - using new consolidated chat system
import { ChatRedirectPage } from './routes/chat/ChatRedirectPage';
import { RoomListPage } from './routes/rooms/RoomListPage';
import { OnboardingPage } from './routes/onboarding/OnboardingPage';

function App() {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <LoadingError
          isLoading={loading}
          error={null}
          loadingMessage="Initializing application..."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <>
      <AuthRedirectHandler />
      <Toaster />

      <Routes>
        {/* 🌐 PUBLIC ROUTES */}
        
        {/* Root - Entry point redirect */}
        <Route path="/" element={<EntryRedirect />} />
        
        {/* Authentication */}
        <Route path="/auth/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
        <Route path="/auth/register" element={user ? <Navigate to="/home" replace /> : <RegistrationPage />} />
        <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
        
        {/* Legacy login/register routes */}
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/home" replace /> : <RegistrationPage />} />
        
        {/* Public profile */}
        <Route path="/@:username" element={<PublicProfilePage />} />
        
        {/* Join room via code (public access) */}
        <Route path="/join/:code" element={<RoomPage />} />

        {/* 🔐 PROTECTED ROUTES */}
        <Route
          element={
            <ProtectedRoute>
              <RootLayout />
            </ProtectedRoute>
          }
        >
          {/* Main Navigation */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/temanku" element={<TemanKuPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Chat System - Using ChatRedirectPage for all chat routes */}
          <Route path="/chat/@:username" element={<ChatRedirectPage />} />
          
          {/* Room System */}
          <Route path="/ruangku" element={<RoomListPage />} />
          <Route path="/ruangku/:roomId" element={<RuangkuPage />} />
          
          {/* Onboarding (optional) */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          {/* Legacy Redirects */}
          <Route 
            path="/rooms/:roomId" 
            element={<Navigate to={`/ruangku/${window.location.pathname.split('/').pop()}`} replace />} 
          />
          <Route 
            path="/room/:roomId" 
            element={<Navigate to={`/ruangku/${window.location.pathname.split('/').pop()}`} replace />} 
          />
          <Route 
            path="/rooms" 
            element={<Navigate to="/ruangku" replace />} 
          />
        </Route>

        {/* 404 NOT FOUND */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
