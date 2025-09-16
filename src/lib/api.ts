// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

export interface Room {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  max_members: number | null;
  is_public: boolean | null;
  created_by: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  join_code: string | null;
  short_code: string | null;
  member_count?: number;
  creator?: {
    id?: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface RoomMember {
  id: string;
  room_id: string | null;
  user_id: string | null;
  joined_at: string | null;
  role: string | null;
  profile?: {
    full_name: string;
    avatar_url: string;
    username: string;
  } | null;
}

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select(
        `
        *,
        profile:profiles!user_id(
          full_name,
          avatar_url,
          username
        )
      `
      )
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return (data || []) as RoomMember[];
  } catch (error) {
    console.error('Get room members error:', error);
    return [];
  }
};

export const getRoomMemberCount = async (roomId: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_room_member_count', { p_room_id: roomId });
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Get room member count error:', error);
    return 0;
  }
};

// TODO adapted for new Supabase backend - simplified room fetching
export const getRooms = async (limit: number = 10): Promise<Room[]> => {
  try {
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(
        `
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `
      )
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (roomsError) throw roomsError;

    // TODO removed redundant logic - backend now handles member counts via triggers
    const roomsWithCounts = await Promise.all(
      (rooms || []).map(async (room) => {
        const count = await getRoomMemberCount(room.id);
        return { ...room, member_count: count };
      })
    );

    return roomsWithCounts;
  } catch (error) {
    console.error('Get rooms error:', error);
    return [];
  }
};

// TODO adapted for new Supabase backend - get public rooms only
export const getPublicRooms = async (limit: number = 10): Promise<Room[]> => {
  return getRooms(limit);
};

// TODO adapted for new Supabase backend - get user's rooms
export const getUserRooms = async (userId: string): Promise<Room[]> => {
  try {
    const { data: memberData, error } = await supabase
      .from('room_members')
      .select(
        `
        room:rooms!room_id(
          *,
          creator:profiles!created_by(full_name, avatar_url)
        )
      `
      )
      .eq('user_id', userId);

    if (error) throw error;

    const rooms = (memberData || []).map((item) => item.room).filter(Boolean);
    return rooms as Room[];
  } catch (error) {
    console.error('Get user rooms error:', error);
    return [];
  }
};

// TODO adapted for new Supabase backend - simplified friends fetching
export const getFriends = async (): Promise<UserProfile[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friends')
      .select(
        `
        to_user,
        from_user,
        to_profile:profiles!to_user(*),
        from_profile:profiles!from_user(*)
      `
      )
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .eq('status', 'accepted');

    if (error) throw error;

    // TODO removed redundant logic - get the friend profile (not current user)
    return (data || [])
      .map((item) => {
        return item.from_user === user.id ? item.to_profile : item.from_profile;
      })
      .filter(Boolean) as UserProfile[];
  } catch (error) {
    console.error('Get friends error:', error);
    return [];
  }
};
