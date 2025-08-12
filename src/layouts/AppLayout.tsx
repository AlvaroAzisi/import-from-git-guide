import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar/Sidebar';
import TopBar from '../components/TopBar';
import CreateRoomModal from '../components/CreateRoomModal';
import { getSidebarMinimized, setSidebarMinimized } from '../utils/localStorage';

/**
 * AppLayout - Global layout wrapper with persistent sidebar
 * 
 * Manual test steps:
 * 1. Navigate between pages - sidebar should persist
 * 2. Minimize sidebar - state should persist on reload
 * 3. Hover over minimized sidebar - should reveal labels
 * 4. Click Messages - should navigate to /chat
 */
export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimizedState] = useState(() => getSidebarMinimized());
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  const handleToggleMinimized = () => {
    const newState = !sidebarMinimized;
    setSidebarMinimizedState(newState);
    setSidebarMinimized(newState);
  };

  const handleCreateRoom = () => {
    setCreateRoomOpen(true);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Top Bar */}
      <TopBar 
        onMenuClick={() => setSidebarOpen(true)}
        showMinimizeButton={true}
        onToggleMinimized={handleToggleMinimized}
        sidebarMinimized={sidebarMinimized}
      />
      
      {/* Persistent Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onCreateRoom={handleCreateRoom}
        minimized={sidebarMinimized}
        onToggleMinimized={handleToggleMinimized}
      />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarMinimized ? 'lg:ml-20' : 'lg:ml-80'}`}>
        <Outlet />
      </main>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onSuccess={() => setCreateRoomOpen(false)}
      />
    </div>
  );
};