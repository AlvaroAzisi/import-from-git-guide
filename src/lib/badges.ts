// TODO adapted for new Supabase backend - badges functionality disabled
// This file used 'badges' and 'profiles_badges' tables which don't exist in simplified schema

export interface Badge {
  id: string;
  icon_name: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
}

export interface ProfileBadge {
  profile_id: string;
  badge_id: string;
  earned_at: string;
}

// Disabled functions returning empty arrays
export const getAllBadges = async (): Promise<Badge[]> => {
  console.warn('Badges functionality temporarily disabled during backend migration');
  return [];
};

export const getUserBadges = async (_userId: string): Promise<ProfileBadge[]> => {
  console.warn('User badges functionality temporarily disabled during backend migration');
  return [];
};

export const awardBadge = async (_userId: string, _badgeId: string): Promise<boolean> => {
  console.warn('Badge awarding temporarily disabled during backend migration');
  return false;
};