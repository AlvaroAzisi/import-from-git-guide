// App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RoomsPage from './pages/RoomsPage';
import SettingsPage from './pages/SettingsPage';
import TemanKuPage from './pages/TemanKuPage';
import RuangkuPage from './pages/RuangkuPage';
import RoomPage from './pages/RoomPage';
import PublicProfilePage from './pages/PublicProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { Toaster } from './components/Toaster';

function App() {
  const { user, loading } = useAuth();

  // While we’re checking session, render nothing (or a spinner)
  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <>
      <Toaster />

      <Routes>
        {/* 1) Landing: if already signed in, send to /home */}
        <Route
          path="/"
          element={
            user
              ? <Navigate to="/home" replace />
              : <LandingPage />
          }
        />

        {/* 2) Protected screens */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <RoomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/temanku"
          element={
            <ProtectedRoute>
              <TemanKuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ruangku/:roomId"
          element={
            <ProtectedRoute>
              <RuangkuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join/:code"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />

        {/* 3) Public profile pages */}
        <Route
          path="/@:username"
          element={<PublicProfilePage />}
        />

        {/* 4) Catch-all: if signed in, go home; otherwise go landing */}
        <Route
          path="*"
          element={
            user
              ? <Navigate to="/home" replace />
              : <Navigate to="/" replace />
          }
        />
      </Routes>
    </>
  );
}

export default App;
