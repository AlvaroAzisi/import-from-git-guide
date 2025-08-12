import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import type { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  path?: string;
  onClick?: () => void;
  isActive?: boolean;
  minimized?: boolean;
  variant?: 'default' | 'create' | 'danger';
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  path,
  onClick,
  isActive = false,
  minimized = false,
  variant = 'default'
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (path) {
      navigate(path);
    }
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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${getButtonStyles()}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
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