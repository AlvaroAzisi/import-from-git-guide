// import { supabase } from '../integrations/supabase/client';

export interface GamificationStats {
  xp: number;
  level: number;
  streak_count: number;
  streak_last_updated: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  criteria: string | null;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  awarded_at: string;
  badges: Badge; // Joined data
}

export const getUserGamificationStats = async (): Promise<GamificationStats | null> => {
  try {
    // Return mock data since streak_count doesn't exist in current schema
    return {
      xp: 0,
      level: 1,
      streak_count: 0,
      streak_last_updated: null
    };
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    return null;
  }
};

export const awardBadge = async (userId: string, badgeName: string): Promise<boolean> => {
  try {
    // Feature disabled - badges table missing required columns
    console.log(`Badge award disabled for user: ${userId}, badge: ${badgeName}`);
    return false;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
};

export const freezeStreak = async (userId: string): Promise<boolean> => {
  try {
    // This would typically involve updating a 'streak_frozen' flag or similar
    // For now, it's a placeholder
    console.log(`Streak freeze requested for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Error freezing streak:', error);
    return false;
  }
};

export const getBadges = async (): Promise<Badge[]> => {
  try {
    // Feature disabled - badges table missing required columns
    return [];
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
};

export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    // Feature disabled - user_badges table missing from schema
    console.log(`User badges disabled for user: ${userId}`);
    return [];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
};