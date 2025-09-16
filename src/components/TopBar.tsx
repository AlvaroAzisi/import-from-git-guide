import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { NotificationBell } from './NotificationBell';

interface TopBarProps {
  onMenuClick: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="sticky top-0 z-30 backdrop-blur-md bg-white/20 dark:bg-gray-900/20 border-b border-white/20 dark:border-gray-700/20">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu and minimize buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="p-2 rounded-xl backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Language Toggle */}
          <div className="flex items-center gap-1 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 rounded-xl p-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                language === 'en'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-700/20'
              }`}
            >
              EN
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLanguage('id')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                language === 'id'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-700/20'
              }`}
            >
              ID
            </motion.button>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-xl backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/20 dark:border-gray-700/20 hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
