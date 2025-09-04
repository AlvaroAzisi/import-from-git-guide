export type Badge = {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  color: string;
  requirement_type: 'xp' | 'streak' | 'manual';
  requirement_value: number | null;
};

export type ProfileBadge = {
  id: string;
  profile_id: string;
  badge_id: string;
  awarded_at: string;
};

import { supabase } from './supabase';

export async function fetchAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').order('requirement_value', { ascending: true });
  if (error) {
    console.warn('Badges table not ready or error:', error.message);
    return [];
  }
  return data as Badge[];
}

export async function fetchProfileBadges(profileId: string): Promise<ProfileBadge[]> {
  const { data, error } = await supabase
    .from('profiles_badges')
    .select('*')
    .eq('profile_id', profileId);
  if (error) {
    console.warn('profiles_badges not ready or error:', error.message);
    return [];
  }
  return data as ProfileBadge[];
}

export async function grantBadge(profileId: string, badgeId: string) {
  // Backend/permissions handled by you; this will fail if RLS denies
  const { error } = await supabase.from('profiles_badges').insert({ profile_id: profileId, badge_id: badgeId });
  if (error) throw error;
}
