import React from 'react';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { SidebarItem } from './SidebarItem';
import { MinimizeToggle } from './MinimizeToggle';
import { sidebarMenuItems } from './sidebarConfig';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  minimized?: boolean;
  onToggleMinimized?: () => void;
}

/**
 * Sidebar - Persistent navigation with minimize/hover functionality
 * 
 * Manual test steps:
 * 1. Minimize sidebar - should show icons only
 * 2. Hover over minimized items - should reveal labels
 * 3. Reload page - minimize state should persist
 * 4. Click Messages - should navigate to /chat
 * 5. Works on desktop, reasonable fallback on touch
 */
export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onCreateRoom,
  minimized = false,
  onToggleMinimized
}) => {
  const location = useLocation();
  const { profile } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle outside click and ESC key
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!isOpen || !sidebarRef.current) return;
      if (!sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen && !minimized) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && !minimized && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={{ x: minimized ? -72 : -320 }}
        animate={{ 
          x: 0,
          width: minimized ? '72px' : '320px'
        }}
        exit={{ x: minimized ? -72 : -320 }}
        transition={{ 
          type: "spring", 
          damping: 25, 
          stiffness: 200,
          duration: 0.22
        }}
        className={`fixed left-0 top-0 h-full backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-r border-white/20 dark:border-gray-700/20 shadow-2xl z-50 flex flex-col ${
          minimized ? 'lg:translate-x-0' : ''
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 dark:border-gray-700/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <AnimatePresence>
                {!minimized && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-2xl font-bold text-gray-800 dark:text-gray-200"
                  >
                    Kupintar
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* User Profile */}
        {profile && !minimized && (
          <div className="p-6 border-b border-white/10 dark:border-gray-700/10">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=3b82f6&color=fff`}
                    alt={profile.full_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {profile.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      @{profile.username}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-blue-500 font-medium">
                        Level {Math.floor((profile.xp || 0) / 1000) + 1}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {profile.xp || 0} XP
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {sidebarMenuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                             (item.path === '/chat' && location.pathname.startsWith('/chat'));
              
              return (
                <SidebarItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={isActive}
                  minimized={minimized}
                  onClick={onClose}
                  variant={item.variant}
                />
              );
            })}

            {/* Create Room Button */}
            {/* Create Room button moved to prevent duplication */}
          </div>
        </nav>

        {/* Footer with Minimize Toggle */}
        <div className="p-4 border-t border-white/10 dark:border-gray-700/10">
          {/* Create Room Button - Single location */}
          <MinimizeToggle
            minimized={minimized}
            onToggle={onToggleMinimized}
          >
            <SidebarItem
              icon={Plus}
              label="Create Room"
              onClick={() => {
                onCreateRoom();
                onClose();
              }}
              minimized={minimized}
              variant="create"
            />
          </MinimizeToggle>
        </div>
      </motion.div>
    </>
  );
};