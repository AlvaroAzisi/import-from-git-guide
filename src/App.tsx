// App.tsx

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import TemanKuPage from './pages/TemanKuPage';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from './components/Toaster';

function App() {
  const { user, loading } = useAuth();

  // Loading screen saat status auth belum siap
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="backdrop-blur-md bg-white/30 rounded-3xl border border-white/20 shadow-lg p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={user ? <HomePage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/temanku"
          element={user ? <TemanKuPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/@:username"
          element={user ? <ProfilePage /> : <Navigate to="/" replace />}
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
