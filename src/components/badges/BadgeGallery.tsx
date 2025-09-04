import React from 'react';
import type { Badge, ProfileBadge } from '../../lib/badges';
import { BadgeItem } from './BadgeItem';

interface BadgeGalleryProps {
  badges: Badge[];
  earned: ProfileBadge[];
}

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({ badges, earned }) => {
  const earnedIds = new Set(earned.map((e) => e.badge_id));
  return (
    <section aria-labelledby="badges-title" className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-6">
      <h2 id="badges-title" className="text-xl font-bold mb-4">Badges</h2>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
        {badges.map((b) => (
          <BadgeItem key={b.id} badge={b} unlocked={earnedIds.has(b.id)} />
        ))}
        {badges.length === 0 && (
          <p className="text-sm text-muted-foreground">No badges yet.</p>
        )}
      </div>
    </section>
  );
};
