// TODO: Disabled – depends on old schema (badges, profiles_badges)
export interface Badge {
  id: string;
  name: string;
  icon_name: string;
  color: string;
  description?: string;
}

export interface ProfileBadge {
  id: string;
  badge_id: string;
  user_id: string;
  earned_at: string;
}

// Placeholder functions - disabled
export const getAllBadges = async () => {
  return [];
};

export const getUserBadges = async (_userId: string) => {
  return [];
};

export const checkBadgeEligibility = async (_userId: string) => {
  return [];
};