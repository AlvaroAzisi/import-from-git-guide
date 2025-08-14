// Enhanced sidebar with auto-minimize, responsive behavior, and proper routing
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../hooks/useNavigation';
import { ROUTES } from '../../constants/routes';
import { sidebarMenuItems } from './sidebarConfig';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onToggle,
  className = '' 
}) => {
  const { user, profile } = useAuth();
  const { safeNavigate, navigating, isNavigating } = useNavigation();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleNavigation = async (path: string, label: string) => {
    if (isNavigating(path)) return;

    try {
      // Close sidebar on mobile after navigation starts
      if (window.innerWidth < 1024) {
        onClose();
      }

      // Handle special routes
      if (path === '/signout') {
        // Handle sign out logic here
        return;
      }

      await safeNavigate(path);
    } catch (error) {
      console.error(`Navigation to ${label} failed:`, error);
    }
  };

  const isActivePath = (path: string) => {
    if (path === ROUTES.HOME) {
      return location.pathname === ROUTES.HOME;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ 
          type: 'tween',
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1]
        }}
        className={`fixed left-0 top-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-white/20 dark:border-gray-700/20 shadow-2xl z-50 flex flex-col ${className}`}
        role="navigation"
        aria-label="Main navigation"
        aria-expanded={isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 dark:border-gray-700/20">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Kupintar
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Profile Section */}
        {user && profile && (
          <div className="p-6 border-b border-white/10 dark:border-gray-700/20">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-white/20 dark:border-gray-700/20">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-medium">
                  {profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
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
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarMenuItems.map((item, index) => {
            const isActive = isActivePath(item.path);
            const isLoading = isNavigating(item.path);
            
            return (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNavigation(item.path, item.label)}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : item.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
              >
                <item.icon className={`w-5 h-5 transition-transform duration-200 ${
                  hoveredItem === item.path ? 'scale-110' : ''
                } ${isLoading ? 'animate-pulse' : ''}`} />
                
                <span className="font-medium">{item.label}</span>
                
                {isLoading && (
                  <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl -z-10"
                    transition={{ type: 'spring', duration: 0.5 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 dark:border-gray-700/20">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            © 2024 Kupintar
          </p>
        </div>
      </motion.div>

      {/* Hot Edge Reveal (Desktop only) */}
      {!isOpen && (
        <div
          className="fixed left-0 top-0 w-1 h-full z-30 lg:block hidden hover:w-2 transition-all duration-200 bg-gradient-to-b from-blue-500/20 to-cyan-500/20"
          onMouseEnter={() => {
            // Show hint after short delay
            setTimeout(() => {
              if (!isOpen) {
                onToggle();
              }
            }, 300);
          }}
          aria-label="Hover to reveal sidebar"
        />
      )}
    </>
  );
};