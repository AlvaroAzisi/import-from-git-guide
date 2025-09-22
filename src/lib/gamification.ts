import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

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

export const getUserGamificationStats = async (userId: string): Promise<GamificationStats | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('xp, level, streak_count, streak_last_updated')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data as GamificationStats;
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    return null;
  }
};

export const awardBadge = async (userId: string, badgeName: string): Promise<boolean> => {
  try {
    const { data: badgeData, error: badgeError } = await supabase
      .from('badges')
      .select('id')
      .eq('name', badgeName)
      .single();

    if (badgeError) throw badgeError;
    if (!badgeData) throw new Error('Badge not found');

    const { error } = await supabase
      .from('user_badges')
      .insert([{ user_id: userId, badge_id: badgeData.id }]);

    if (error) throw error;
    return true;
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
    const { data, error } = await supabase
      .from('badges')
      .select('*');

    if (error) throw error;
    return data as Badge[];
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
};

export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data as UserBadge[];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
};
