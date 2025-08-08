import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import { Award, Crown, Flame, Sparkles, Star, Trophy, UserPlus, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Badge } from '../../lib/badges';

const iconMap: Record<string, React.ComponentType<any>> = {
  UserPlus,
  Star,
  Sparkles,
  Crown,
  Flame,
  Zap,
  Trophy,
};

interface BadgeItemProps {
  badge: Badge;
  unlocked?: boolean;
}

export const BadgeItem: React.FC<BadgeItemProps> = ({ badge, unlocked = false }) => {
  const Icon = iconMap[badge.icon_name] || Award;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className={`group relative flex items-center justify-center w-12 h-12 rounded-2xl border shadow-sm backdrop-blur-sm ${
              unlocked ? 'bg-white/40 dark:bg-gray-800/40 border-white/30 dark:border-gray-700/30' : 'bg-muted/40 border-dashed opacity-60'
            }`}
            aria-label={`${badge.name}: ${badge.description}`}
          >
            <Icon className="w-6 h-6 text-primary" />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-50">
          <div className="rounded-xl px-3 py-2 bg-popover text-popover-foreground shadow">
            <p className="text-sm font-medium">{badge.name}</p>
            <p className="text-xs opacity-80">{badge.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
