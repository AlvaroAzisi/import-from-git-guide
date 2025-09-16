import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className={`${width} ${height} bg-gradient-to-r from-white/10 via-white/20 to-white/10 dark:from-gray-800/10 dark:via-gray-800/20 dark:to-gray-800/10 rounded-lg ${className}`}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            backgroundSize: '200% 100%',
          }}
        />
      ))}
    </>
  );
};

export const MessageSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div
            className={`max-w-xs p-3 rounded-2xl ${i % 2 === 0 ? 'bg-white/20 dark:bg-gray-800/20' : 'bg-blue-500/20'}`}
          >
            <SkeletonLoader height="h-3" className="mb-2" />
            <SkeletonLoader width="w-3/4" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const RoomCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl border border-white/10 dark:border-gray-700/10">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SkeletonLoader height="h-5" className="mb-2" />
          <SkeletonLoader width="w-2/3" height="h-4" />
        </div>
        <div className="ml-4">
          <SkeletonLoader width="w-16" height="h-4" />
        </div>
      </div>
    </div>
  );
};

export const UserCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 bg-white/20 dark:bg-gray-800/20 rounded-2xl border border-white/10 dark:border-gray-700/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 dark:bg-gray-800/20 rounded-full" />
        <div className="flex-1">
          <SkeletonLoader height="h-4" className="mb-1" />
          <SkeletonLoader width="w-2/3" height="h-3" />
        </div>
        <SkeletonLoader width="w-12" height="h-3" />
      </div>
    </div>
  );
};
