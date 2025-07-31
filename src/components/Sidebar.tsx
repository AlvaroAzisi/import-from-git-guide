import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BookOpen, 
  User, 
  Settings,
  LogOut,
  Plus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { signOut } from '../lib/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onCreateRoom }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { t } = useLanguage();

  const menuItems = [
    { icon: Home, label: t('nav.home'), path: '/home' },
    { icon: BookOpen, label: t('nav.rooms'), path: '/rooms' },
    { icon: Users, label: t('nav.friends'), path: '/temanku' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
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
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        exit={{ x: -300 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-full w-80 backdrop-blur-md bg-white/30 dark:bg-gray-900/30 border-r border-white/20 dark:border-gray-700/20 shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 dark:border-gray-700/10">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">Kupintar</span>
          </div>
        </div>

        {/* User Profile */}
        {profile && (
          <div className="p-6 border-b border-white/10 dark:border-gray-700/10">
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
                    Level {Math.floor(profile.xp / 1000) + 1}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {profile.xp} XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </motion.button>
              );
            })}

            {/* Create Room Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateRoom}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 mt-4"
            >
              <Plus className="w-5 h-5" />
              {t('rooms.create')}
            </motion.button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 dark:border-gray-700/10">
          <div className="space-y-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigation('/settings')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20 transition-all duration-300"
            >
              <Settings className="w-5 h-5" />
              Settings
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all duration-300"
            >
              <LogOut className="w-5 h-5" />
              {t('nav.signOut')}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;