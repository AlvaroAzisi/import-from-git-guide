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

// Create a new room
export const createRoom = async (roomData: {
  name: string;
  description: string;
  subject: string;
  max_members: number;
  is_public: boolean;
}): Promise<Room | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in to create a room');

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        ...roomData,
        creator_id: user.id,
        is_active: true // ensure room is active by default
      })
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url)
      `
      )
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create room error:', error);
    return null;
  }
};

// Get public rooms
export const getRooms = async (limit: number = 10): Promise<Room[]> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url),
        room_members(count)
      `
      )
      .eq('is_public', true)
      .eq('is_active', true)
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

// Get rooms created by current user
export const getMyRooms = async (): Promise<Room[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    const { data, error } = await supabase
      .from('rooms')
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url),
        room_members(count)
      `
      )
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(room => ({
      ...room,
      member_count: room.room_members?.[0]?.count || 0
    }));
  } catch (error) {
    console.error('Get my rooms error:', error);
    return [];
  }
};

// Join an existing room
export const joinRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in to join a room');

    // Check room exists and is active
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('max_members')
      .eq('id', roomId)
      .eq('is_active', true)
      .single();
    if (roomError) throw roomError;
    if (!room) throw new Error('Room not found or inactive');

    // Prevent duplicate membership
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    if (existingMember) throw new Error('Already a member of this room');

    // Check capacity
    const { count, error: countError } = await supabase
      .from('room_members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId);
    if (countError) throw countError;
    if (count !== null && count >= room.max_members) throw new Error('Room is full');

    const { error } = await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: user.id,
      role: 'member' // default role
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Join room error:', error);
    throw error;
  }
};

// Leave a room
export const leaveRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

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

// Get a single room (active only)
export const getRoom = async (roomId: string): Promise<Room | null> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url)
      `
      )
      .eq('id', roomId)
      .eq('is_active', true)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get room error:', error);
    return null;
  }
};

// Get members of a room
export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select(
        `
        *,
        profile:profiles!user_id(full_name, avatar_url, username)
      `
      )
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get room members error:', error);
    return [];
  }
};


// Send a message in a room
export const sendMessage = async (roomId: string, content: string): Promise<Message | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    // Prevent sending empty messages
    if (!content.trim()) throw new Error('Message content is empty');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim()
      })
      .select(
        `
        *,
        profile:profiles(full_name, avatar_url)
      `
      )
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
};

// Get messages in a room
export const getMessages = async (roomId: string, limit: number = 50): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        profile:profiles(full_name, avatar_url)
      `
      )
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

// Check if current user is a member of a room
export const isRoomMember = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
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

