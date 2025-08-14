import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, ChevronRight } from 'lucide-react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import TopBar from '../components/TopBar';
import CreateRoomModal from '../components/CreateRoomModal';
import { useSidebar } from '../contexts/SidebarContext';
import { useNavigation } from '../lib/navigation';

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
  const { isOpen, isMinimized, openSidebar, closeSidebar, toggleSidebar } = useSidebar();
  const { navigateToRoom } = useNavigation();
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  const handleCreateRoom = () => {
    setCreateRoomOpen(true);
    closeSidebar();
  };

  const handleRoomCreated = async (room: any) => {
    setCreateRoomOpen(false);
    // Navigate to the new room instead of redirecting to /home
    if (room?.id) {
      navigateToRoom(room.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      {/* Sidebar Toggle - Only show when sidebar is closed */}
      {!isOpen && (
        <>
          {/* Visible toggle button */}
          <button
            onClick={openSidebar}
            aria-label="Open sidebar"
            aria-disabled={isOpen}
            disabled={isOpen}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-40 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 dark:border-gray-700/20 rounded-r-2xl shadow-lg hover:bg-white/90 dark:hover:bg-gray-900/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Left-edge hot area for hover reveal */}
          <div
            className="fixed left-0 top-0 w-2 h-full z-30 hover:w-4 transition-all duration-200"
            onMouseEnter={() => {
              // Debounced open on hover
              setTimeout(() => {
                if (!isOpen) openSidebar();
              }, 150);
            }}
            aria-hidden="true"
          />
        </>
      )}
      
      {/* Top Bar */}
      <TopBar 
        onMenuClick={openSidebar}
      />
      
      {/* Persistent Sidebar */}
      <Sidebar 
        isOpen={isOpen} 
        onClose={closeSidebar}
        onCreateRoom={handleCreateRoom}
        minimized={isMinimized}
      />

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${
        isOpen 
          ? isMinimized 
            ? 'lg:ml-20' 
            : 'lg:ml-80'
          : 'ml-0 max-w-none mx-auto'
      }`}>
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