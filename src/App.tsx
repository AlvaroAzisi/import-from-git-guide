// App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthRedirectHandler } from './components/AuthRedirectHandler';
import { AppLayout } from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RoomsPage from './pages/RoomsPage';
import SettingsPage from './pages/SettingsPage';
import TemanKuPage from './pages/TemanKuPage';
import RuangkuPage from './pages/RuangkuPage';
import RoomPage from './pages/RoomPage';
import PublicProfilePage from './pages/PublicProfilePage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
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
      <AuthRedirectHandler />
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

        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/home" replace />
              : <LoginPage />
          }
        />

        {/* 2) Protected screens */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/@:username" element={<ChatPage />} />
          <Route path="chat/group/:groupId" element={<ChatPage />} />
          <Route path="temanku" element={<TemanKuPage />} />
          <Route path="ruangku/:roomId" element={<RuangkuPage />} />
          <Route path="room/:roomId" element={<RoomPage />} />
          <Route path="join/:code" element={<RoomPage />} />
        </Route>

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
