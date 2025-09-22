import { supabase } from '../integrations/supabase/client';
import type { Room } from '../types/room';
import type { UserProfile } from './auth';

/**
 * Searches for public rooms by name or description.
 * @param query The search query.
 * @returns A promise that resolves to an array of rooms.
 */
export const searchRooms = async (query: string): Promise<Room[]> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_public', true)
      .limit(10);

    if (error) throw error;
    return data as Room[];
  } catch (error) {
    console.error('Error searching rooms:', error);
    return [];
  }
};

/**
 * Searches for users by username or full name.
 * @param query The search query.
 * @returns A promise that resolves to an array of user profiles.
 */
export const searchFriends = async (query: string): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data as UserProfile[];
  } catch (error) {
    console.error('Error searching friends:', error);
    return [];
  }
};
