import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
 * 5. Click outside sidebar - should close and recenter content
 * 6. Left edge hover - should reveal sidebar after delay
 */
export const AppLayout: React.FC = () => {
  const { isOpen, isMinimized, openSidebar, closeSidebar } = useSidebar();
  const { navigateToRoom } = useNavigation();
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [leftEdgeHoverTimeout, setLeftEdgeHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleCreateRoom = () => {
    setCreateRoomOpen(true);
  };

  // Use the function to avoid unused warning
  if (false) handleCreateRoom();

  const handleRoomCreated = (room: any) => {
    setCreateRoomOpen(false);
    // Navigate to the new room instead of redirecting to /home
    if (room?.id) {
      navigateToRoom(room.id);
    }
  };

  const handleLeftEdgeEnter = () => {
    if (isOpen) return; // Don't trigger if already open
    
    const timeout = setTimeout(() => {
      openSidebar();
    }, 150); // 150ms delay to prevent accidental triggers
    
    setLeftEdgeHoverTimeout(timeout);
  };

  const handleLeftEdgeLeave = () => {
    if (leftEdgeHoverTimeout) {
      clearTimeout(leftEdgeHoverTimeout);
      setLeftEdgeHoverTimeout(null);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Top Bar */}
      <TopBar onMenuClick={openSidebar} />
      
      <div className="flex">
        {/* Sidebar Toggle - Only show when sidebar is closed */}
        {!isOpen && (
          <button
            onClick={openSidebar}
            aria-label="Open sidebar"
            aria-disabled={isOpen}
            disabled={isOpen}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-40 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-white/20 dark:border-gray-700/20 rounded-r-2xl shadow-lg hover:bg-white/90 dark:hover:bg-gray-900/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        
        {/* Left-edge hot area for hover reveal */}
        {!isOpen && (
          <div
            className="fixed left-0 top-0 w-2 h-full z-30 hover:w-4 transition-all duration-200"
            onMouseEnter={handleLeftEdgeEnter}
            onMouseLeave={handleLeftEdgeLeave}
            aria-hidden="true"
          />
        )}
        
        {/* Persistent Sidebar */}
        <Sidebar />

        {/* Main Content with smooth recentering */}
        <main className={`flex-1 transition-all duration-300 ease-in-out ${
          isOpen 
            ? isMinimized 
              ? 'lg:ml-20' 
              : 'lg:ml-80'
            : 'ml-0 max-w-none mx-auto'
        }`}>
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {!isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-35 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onSuccess={handleRoomCreated}
      />
    </div>
  );
};