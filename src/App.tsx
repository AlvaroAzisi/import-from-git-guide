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
import { Toaster } from './components/Toaster';

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Protected routes */}
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
          path="/@:username"
          element={<PublicProfilePage />}
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
