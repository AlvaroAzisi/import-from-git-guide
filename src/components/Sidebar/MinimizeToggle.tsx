import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';

interface MinimizeToggleProps {
  minimized: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}

export const MinimizeToggle: React.FC<MinimizeToggleProps> = ({
  minimized,
  onToggle,
  children,
}) => {
  if (!onToggle) return null;

  const button = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800/20"
      title={minimized ? 'Expand sidebar' : 'Minimize sidebar'}
    >
      {minimized ? (
        <ChevronRight className="w-5 h-5" />
      ) : (
        <>
          <ChevronLeft className="w-5 h-5" />
          <span>Minimize</span>
        </>
      )}
    </motion.button>
  );

  if (minimized) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="z-50">
            <div className="rounded-lg px-3 py-2 bg-popover text-popover-foreground shadow-lg">
              Expand sidebar
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {children}
      {button}
    </div>
  );
};
