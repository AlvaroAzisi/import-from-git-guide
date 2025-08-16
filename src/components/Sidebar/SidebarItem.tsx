import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from '../../lib/auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import type { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  path?: string;
  onClick?: () => void;
  isActive?: boolean;
  isLoading?: boolean;
  minimized?: boolean;
  variant?: 'default' | 'create' | 'danger';
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  path,
  onClick,
  isActive = false,
  isLoading = false,
  minimized = false,
  variant = 'default',
  onFocus,
  onBlur
}) => {

  const handleClick = async () => {
    if (isLoading) return; // Prevent clicks while loading
    
    // Handle special cases
    if (path === '/signout') {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
      return;
    }
    
    onClick?.();
  };

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
      onClick={handleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={isLoading}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${getButtonStyles()}`}
      aria-current={isActive ? 'page' : undefined}
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
      {isLoading && !minimized && (
        <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
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