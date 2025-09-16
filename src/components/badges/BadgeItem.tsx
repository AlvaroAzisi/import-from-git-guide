import React from 'react';
import type { Badge } from '../../lib/badges';

interface BadgeItemProps {
  badge: Badge;
  earned?: boolean;
  earnedAt?: string;
}

// TODO adapted for new Supabase backend - badges functionality disabled
export const BadgeItem: React.FC<BadgeItemProps> = ({ badge, earned = false }) => {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        earned
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
          : 'border-gray-200 bg-gray-50 dark:bg-gray-800 opacity-60'
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-2">{badge.icon_name}</div>
        <h3 className="font-semibold">
          {badge.icon_name} - {badge.color}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Badges temporarily disabled during migration
        </p>
      </div>
    </div>
  );
};
