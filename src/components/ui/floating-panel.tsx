import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'center' | 'right' | 'left';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const positionClasses = {
  center: 'items-center justify-center',
  right: 'items-center justify-end pr-4',
  left: 'items-center justify-start pl-4',
};

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
  position = 'center',
  showCloseButton = true,
  closeOnBackdrop = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{
              duration: 0.22,
              ease: [0.22, 0.9, 0.26, 1], // Custom easing for smooth feel
            }}
            className={cn('fixed inset-0 z-50 flex p-4', positionClasses[position])}
          >
            <div
              className={cn(
                'w-full backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-2xl overflow-hidden',
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/20">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                {showCloseButton && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 dark:hover:bg-gray-800/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </motion.button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
