import { supabase } from './supabase';

export interface Room {
  id: string;
  name: string;
  description: string;
  subject: string;
  max_members: number;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  creator?: {
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

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export const createRoom = async (roomData: {
  name: string;
  description: string;
  subject: string;
  max_members: number;
  is_public: boolean;
}): Promise<Room | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        ...roomData,
        created_by: user.id
      })
      .select(`
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Add creator as admin member
    await supabase
      .from('room_members')
      .insert({
        room_id: data.id,
        user_id: user.id,
        role: 'admin'
      });

    return data;
  } catch (error) {
    console.error('Create room error:', error);
    return null;
  }
};

export const getRooms = async (limit: number = 10): Promise<Room[]> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:profiles!created_by(full_name, avatar_url),
        room_members(count)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(room => ({
      ...room,
      member_count: room.room_members?.[0]?.count || 0
    }));
  } catch (error) {
    console.error('Get rooms error:', error);
    return [];
  }
};

export const getRoom = async (roomId: string): Promise<Room | null> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `)
      .eq('id', roomId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get room error:', error);
    return null;
  }
};

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        *,
        profile:profiles(full_name, avatar_url, username)
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

export const joinRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      throw new Error('Already a member of this room');
    }

    // Check room capacity
    const { data: room } = await supabase
      .from('rooms')
      .select('max_members')
      .eq('id', roomId)
      .single();

    if (!room) throw new Error('Room not found');

    const { count } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (count && count >= room.max_members) {
      throw new Error('Room is full');
    }

    const { error } = await supabase
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: user.id,
        role: 'member'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Join room error:', error);
    throw error;
  }
};

export const leaveRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Leave room error:', error);
    return false;
  }
};

export const sendMessage = async (roomId: string, content: string): Promise<Message | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim()
      })
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
};

export const getMessages = async (roomId: string, limit: number = 50): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
};

export const isRoomMember = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Check room membership error:', error);
    return false;
  }
};