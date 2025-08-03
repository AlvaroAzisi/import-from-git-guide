import { supabase } from './supabase';

export interface Room {
  id: string;
  name: string;
  description: string;
  subject: string;
  max_members: number;
  is_public: boolean;
  creator_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
  creator?: {
    id?: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  role: 'member' | 'admin';
  profile?: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        *,
        profile:profiles!fk_room_members_user_id(
          full_name,
          avatar_url,
          username
        )
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get room members error:', error);
    return [];
  }
};

export const getRoomMemberCount = async (roomId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_room_member_count', { p_room_id: roomId });
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Get room member count error:', error);
    return 0;
  }
};

export const getRooms = async (limit: number = 10): Promise<Room[]> => {
  try {
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url)
      `
      )
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (roomsError) throw roomsError;

    const memberCounts = await Promise.all(
      rooms.map(async (room) => {
        const count = await getRoomMemberCount(room.id);
        return { id: room.id, member_count: count };
      })
    );

    const roomsWithCounts = rooms.map(room => {
      const countObj = memberCounts.find(c => c.id === room.id);
      return {
        ...room,
        member_count: countObj ? countObj.member_count : 0
      };
    });

    return roomsWithCounts;
  } catch (error) {
    console.error('Get rooms error:', error);
    return [];
  }
};