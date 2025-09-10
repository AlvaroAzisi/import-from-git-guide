// TODO: Disabled – depends on old schema (conversations, room analytics)
import { supabase } from '../integrations/supabase/client';
import type { Room } from '../types/room';

// Re-export types for backward compatibility
export type { Room } from '../types/room';

// Simplified room functions for new backend
export const getRooms = async (limit: number = 10): Promise<Room[]> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }

    return (data || []).map(room => ({
      id: room.id,
      name: room.name,
      description: room.description || '',
      subject: room.subject || '',
      creator_id: room.creator_id,
      created_at: room.created_at,
      updated_at: room.updated_at,
      is_active: room.is_active ?? true,
      is_public: room.is_public ?? true,
      max_members: room.max_members || 10,
      short_code: room.short_code
    }));
  } catch (error) {
    console.error('Error in getRooms:', error);
    return [];
  }
};

// Placeholder functions - disabled until schema is expanded
export const getUserOwnedRooms = async (_userId: string): Promise<Room[]> => {
  return [];
};

export const getRoomAnalytics = async (_roomId: string) => {
  return { total_messages: 0, active_members: 0 };
};

export const getRoomMembersByRole = async (_roomId: string) => {
  return { admins: [], members: [] };
};