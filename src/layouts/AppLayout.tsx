import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import TopBar from '../components/TopBar';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import { useSidebar } from '../contexts/SidebarContext';
import { useRoomOperations } from '../lib/roomOperations';
import { useToast } from '../hooks/useToast';
import Sidebar from '../components/Sidebar';

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
  const { isOpen, isMinimized, openSidebar, closeSidebar, toggleSidebar } = useSidebar();
  const { createAndJoinRoom } = useRoomOperations();
  const { toast } = useToast();
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [leftEdgeHoverTimeout, setLeftEdgeHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleCreateRoom = () => {
    setCreateRoomOpen(true);
  };

  const handleRoomCreated = async (roomData: any) => {
    try {
      const result = await createAndJoinRoom(roomData);
      if (result.success) {
        toast({
          title: 'Room Created!',
          description: `Welcome to ${roomData.name}!`,
        });
        setCreateRoomOpen(false);
        // Navigation is handled by useRoomOperations hook
      }
    } catch (error) {
      console.error('Room creation error:', error);
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
      <TopBar onMenuClick={toggleSidebar} />

      <div className="flex">
        {/* Sidebar Toggle - Only show when sidebar is closed */}
        {!isOpen && (
          <button
            onClick={openSidebar}
            aria-label="Open sidebar"
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-r border-t border-b border-white/20 dark:border-gray-700/20 rounded-r-xl shadow-lg hover:bg-white dark:hover:bg-gray-900 transition-all duration-300 group"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
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
        <Sidebar
          isOpen={isOpen}
          onClose={closeSidebar}
          onCreateRoom={handleCreateRoom}
          minimized={isMinimized}
          onToggleMinimized={toggleSidebar}
        />

        {/* Main Content with smooth recentering */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isOpen ? (isMinimized ? 'lg:ml-20' : 'lg:ml-80') : 'ml-0 max-w-7xl mx-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
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
