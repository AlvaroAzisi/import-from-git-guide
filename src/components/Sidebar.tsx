import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BookOpen, 
  User, 
  Settings,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useNavigation } from '../lib/navigation';
import { signOut } from '../lib/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
  minimized?: boolean;
  onToggleMinimized?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onCreateRoom,
  minimized = false,
  onToggleMinimized
}) => {
  const location = useLocation();
  const { safeNavigate, isNavigating } = useNavigation();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const menuItems = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: BookOpen, label: t('nav.rooms'), path: '/rooms' },
    { icon: MessageCircle, label: 'Messages', path: '/chat' },
    { icon: Users, label: t('nav.friends'), path: '/temanku' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
  ];

  // Handle outside click and ESC key
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleNavigation = (path: string) => {
    safeNavigate(path);
    // Don't auto-close on desktop
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleCreateRoom = () => {
    onCreateRoom();
    onClose();
  };

  const SidebarButton: React.FC<{
    icon: React.ComponentType<any>;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    isLoading?: boolean;
    variant?: 'default' | 'create' | 'danger';
  }> = ({ icon: Icon, label, onClick, isActive = false, isLoading = false, variant = 'default' }) => {
    const getButtonStyles = () => {
      if (variant === 'create') {
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl';
      }
      if (variant === 'danger') {
        return 'text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20';
      }
      if (isActive) {
        return 'bg-blue-500 text-white shadow-lg';
      }
      return 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20';
    };

    const button = (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        disabled={isLoading}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${getButtonStyles()}`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <Icon className="w-5 h-5 flex-shrink-0" />
        )}
        <AnimatePresence>
          {!minimized && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="truncate"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );

    if (minimized) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent side="right" className="z-50">
              <div className="rounded-lg px-3 py-2 bg-popover text-popover-foreground shadow-lg">
                {label}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

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
        className="fixed left-0 top-0 h-full backdrop-blur-md bg-white/95 dark:bg-gray-900/95 border-r border-white/20 dark:border-gray-700/20 shadow-2xl z-50 flex flex-col"
        role="navigation"
        aria-expanded={isOpen}
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
            
            {onToggleMinimized && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleMinimized}
                className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors"
                title={minimized ? "Expand sidebar" : "Minimize sidebar"}
              >
                {minimized ? (
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </motion.button>
            )}
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

        {/* Minimized User Avatar */}
        {profile && minimized && (
          <div className="p-3 border-b border-white/10 dark:border-gray-700/10 flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <img
                    src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=3b82f6&color=fff`}
                    alt={profile.full_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/20 dark:border-gray-700/20 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleNavigation('/profile')}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="z-50">
                  <div className="rounded-lg px-3 py-2 bg-popover text-popover-foreground shadow-lg">
                    <p className="font-medium">{profile.full_name}</p>
                    <p className="text-xs opacity-80">@{profile.username}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const itemIsNavigating = isNavigating(item.path);
              return (
                <SidebarButton
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleNavigation(item.path)}
                  isActive={isActive}
                  isLoading={itemIsNavigating}
                />
              );
            })}

          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 dark:border-gray-700/10">
          <div className="space-y-2">
            {/* Create Room Button - Only location */}
            <SidebarButton
              icon={Plus}
              label={t('rooms.create')}
              onClick={handleCreateRoom}
              variant="create"
            />
            
            <SidebarButton
              icon={Settings}
              label="Settings"
              onClick={() => handleNavigation('/settings')}
            />
            
            <SidebarButton
              icon={LogOut}
              label={t('nav.signOut')}
              onClick={handleSignOut}
              variant="danger"
            />

            {/* Minimize Toggle */}
            {onToggleMinimized && (
              <SidebarButton
                icon={minimized ? ChevronRight : ChevronLeft}
                label={minimized ? "Expand" : "Minimize"}
                onClick={onToggleMinimized}
              />
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;