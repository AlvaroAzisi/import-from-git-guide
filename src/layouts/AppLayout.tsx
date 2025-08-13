import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
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

  const handleRoomCreated = (room: any) => {
    setCreateRoomOpen(false);
    // Navigate to the new room instead of staying on current page
    window.location.href = `/room/${room.id}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Sidebar Toggle - Only show when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 p-3 bg-white/30 dark:bg-gray-900/30 backdrop-blur-md border border-white/20 dark:border-gray-700/20 rounded-r-2xl shadow-lg hover:bg-white/40 dark:hover:bg-gray-900/40 transition-all duration-300"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      
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
        onSuccess={handleRoomCreated}
      />
    </div>
  );
};