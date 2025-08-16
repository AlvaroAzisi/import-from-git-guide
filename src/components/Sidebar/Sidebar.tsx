import React, { useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../contexts/SidebarContext';
import { User } from '../../types/auth';
import { sidebarMenuItems } from './sidebarConfig';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { MinimizeToggle } from './MinimizeToggle';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user } = useAuth() as { user: User | null };
  const { isOpen, toggleSidebar, isMinimized, toggleMinimized } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        toggleSidebar();
      }
    };

    if (isOpen && window.innerWidth < 1024) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        ref={sidebarRef}
        initial={{ width: isMinimized ? 80 : 320 }}
        animate={{ 
          width: isMinimized ? 80 : 320,
          x: isOpen ? 0 : -320
        }}
        transition={{ duration: 0.3 }}
        className={`fixed inset-y-0 left-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-white/20 dark:border-gray-700/20 shadow-2xl ${className}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-white/10 dark:border-gray-700/20">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent ${isMinimized ? 'hidden' : ''}`}>
                Kupintar
              </h2>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/20"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {sidebarMenuItems.map((item) => (
              <li key={item.path}>
                <SidebarItem
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname === item.path}
                  minimized={isMinimized}
                  variant={item.variant}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 dark:border-gray-700/20 space-y-4">
          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || 'User avatar'}
                  className="w-10 h-10 rounded-full border border-white/20 dark:border-gray-700/20"
                />
              )}
              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.full_name}
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Minimize Toggle */}
          <MinimizeToggle
            minimized={isMinimized}
            onToggle={toggleMinimized}
          />

          {/* Copyright */}
          {!isMinimized && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              © 2024 Kupintar
            </p>
          )}
        </div>
      </div>
    </motion.aside>
    </>
  );
};