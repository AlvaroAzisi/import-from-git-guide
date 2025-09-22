import { supabase } from '../integrations/supabase/client';
import type { Room } from '../types/room';
import type { UserProfile } from './auth';

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
