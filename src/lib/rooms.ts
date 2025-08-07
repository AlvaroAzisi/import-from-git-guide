import { supabase } from './supabase';

export const isValidUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

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
  code?: string;
  short_code?: string;
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

// Update generateRoomCode untuk uppercase
function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// Update createRoom
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
        is_active: true,
        short_code: generateRoomCode(), // ✅ pakai short_code
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
        const { data: count, error } = await supabase
          .rpc('get_room_member_count', { p_room_id: room.id });
        if (error) throw error;
        return { id: room.id, member_count: count || 0 };
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

export const getMyRooms = async (): Promise<Room[]> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url)
      `
      )
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (roomsError) throw roomsError;

    const memberCounts = await Promise.all(
      rooms.map(async (room) => {
        const { data: count, error } = await supabase
          .rpc('get_room_member_count', { p_room_id: room.id });
        if (error) throw error;
        return { id: room.id, member_count: count || 0 };
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
    console.error('Get my rooms error:', error);
    return [];
  }
};

export const joinRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in to join a room');

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('max_members')
      .eq('id', roomId)
      .eq('is_active', true)
      .single();
    if (roomError) throw roomError;
    if (!room) throw new Error('Room not found or inactive');

    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();
    if (existingMember) throw new Error('Already a member of this room');

    const { data: count, error: countError } = await supabase
      .rpc('get_room_member_count', { p_room_id: roomId });
    if (countError) throw countError;
    if (count !== null && count >= room.max_members) throw new Error('Room is full');

    const { error } = await supabase.from('room_members').insert({
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

// Update getRoomByCode
export const getRoomByCode = async (roomCode: string): Promise<Room | null> => {
  const normalizedCode = roomCode.trim().toUpperCase(); // ✅ normalize casing

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      creator:profiles!creator_id(full_name, avatar_url)
    `)
    .eq('short_code', normalizedCode)
    .single();

  if (error) {
    console.error('Error fetching room by short_code:', error);
    return null;
  }

  return data;
};


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
    console.error('Get room members error:', JSON.stringify(error, null, 2));
    return [];
  }
};

export const sendMessage = async (roomId: string, content: string): Promise<Message | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

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

export const isRoomMember = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('is_room_member', { p_room_id: roomId, p_user_id: user.id });

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Check room membership error:', error);
    return false;
  }
};