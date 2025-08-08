import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Award } from 'lucide-react';

interface PublicProfileCardProps {
  full_name: string;
  username: string;
  avatar_url?: string | null;
  xp: number;
  streak: number;
}

export const PublicProfileCard: React.FC<PublicProfileCardProps> = ({ full_name, username, avatar_url, xp, streak }) => {
  const currentLevel = Math.floor(xp / 1000) + 1;
  const initials = full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  return (
    <article className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-3xl border border-white/20 dark:border-gray-700/20 shadow-lg p-8 mb-8">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        <Avatar className="w-32 h-32 border-4 border-white/20 shadow-lg">
          <AvatarImage src={avatar_url || undefined} alt={full_name} className="object-cover" />
          <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{full_name}</h1>
          <p className="text-primary font-medium mb-2">@{username}</p>
          <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
            <span className="text-sm text-primary font-medium">Level {currentLevel}</span>
            <span className="text-sm text-muted-foreground">{xp} XP</span>
            {streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-100/50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                <Award className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">{streak} day streak</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
