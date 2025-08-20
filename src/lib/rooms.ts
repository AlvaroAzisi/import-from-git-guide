import { supabase } from './supabase';

/**
 * Updated to work with conversations table (new schema)
 * Maps conversations to Room interface for backward compatibility
 */

/**
 * Validates if a string is a valid UUID
 * @param str - The string to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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
  conversation_id: string;
  room_id?: string; // For backward compatibility
  user_id: string;
  sender_id?: string; // For new schema
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

// Create room using new schema
export const createRoom = async (roomData: {
  name: string;
  description: string;
  subject: string;
  max_members: number;
  is_public: boolean;
}): Promise<Room | null> => {
  try {
    // Parameter validation
    if (!roomData?.name?.trim()) throw new Error('Room name is required');
    if (!roomData?.subject?.trim()) throw new Error('Subject is required');
    if (!Number.isInteger(roomData.max_members) || roomData.max_members < 2)
      throw new Error('Max members must be an integer ≥ 2');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in to create a room');

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        ...roomData,
        creator_id: user.id,
        created_by: user.id,
        is_active: true,
        short_code: generateRoomCode(), // ✅ short_code
        join_code: generateRoomCode(), // ✅ join_code
      })
      .select(
        `
        *,
        creator:profiles!creator_id(full_name, avatar_url),
        created_by_profile:profiles!created_by(full_name, avatar_url)
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
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

    // Use conversations table instead of rooms
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(
        `
        *,
        created_by_profile:profiles!created_by(full_name, avatar_url)
      `
      )
      .eq('type', 'group')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (conversationsError) throw conversationsError;

    // Map conversations to Room interface
    const rooms = (conversations || []).map(conv => ({
      id: conv.id,
      name: conv.name || 'Unnamed Room',
      description: conv.description || '',
      subject: 'General', // Default subject
      max_members: 50, // Default max members for groups
      is_public: true, // Assume public for now
      creator_id: conv.created_by,
      is_active: conv.is_active,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      creator: conv.created_by_profile
    }));

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
        creator:profiles!creator_id(full_name, avatar_url),
        created_by_profile:profiles!created_by(full_name, avatar_url)
      `
      )
      .or(`creator_id.eq.${user.id},created_by.eq.${user.id}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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
        creator: room.creator || room.created_by_profile,
        member_count: countObj ? countObj.member_count : 0
      };
    });

    return roomsWithCounts;
  } catch (error) {
    console.error('Get my rooms error:', error);
    return [];
  }
};

export const leaveRoomLegacy = async (roomId: string): Promise<boolean> => {
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
      .from('conversations')
      .select(
        `
        *,
        created_by_profile:profiles!created_by(full_name, avatar_url)
      `
      )
      .eq('id', roomId)
      .eq('type', 'group')
      .eq('is_active', true)
      .single();

    if (error) throw error;
    
    // Map conversation to Room interface
    return {
      id: data.id,
      name: data.name || 'Unnamed Room',
      description: data.description || '',
      subject: 'General',
      max_members: 50,
      is_public: true,
      creator_id: data.created_by,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
      creator: data.created_by_profile
    };
  } catch (error) {
    console.error('Get room error:', error);
    return null;
  }
};

// Update getRoomByCode
export const getRoomByCode = async (inviteCode: string): Promise<Room | null> => {
  const normalizedCode = inviteCode.trim().toUpperCase();

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      creator:profiles!creator_id(full_name, avatar_url),
      created_by_profile:profiles!created_by(full_name, avatar_url)
    `)
    .or(`short_code.eq.${normalizedCode},join_code.eq.${normalizedCode}`)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching room by code:', error);
    return null;
  }

  return {
    ...data,
    creator: data.creator || data.created_by_profile
  };
};

export const getRoomMemberCount = async (roomId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .rpc('get_room_member_count', { p_room_id: roomId });
    
    if (error) {
      console.warn('RPC failed, falling back to direct count:', error);
      // Fallback to direct count
      const { count, error: countError } = await supabase
        .from('conversation_members')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', roomId);
      
      if (countError) throw countError;
      return count || 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error('Get room member count error:', error);
    return 0;
  }
};

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  try {
    const { data, error } = await supabase
      .from('conversation_members')
      .select(`
        *,
        profile:profiles!user_id(
          full_name,
          avatar_url,
          username
        )
      `)
      .eq('conversation_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get room members error:', error);
    return [];
  }
};

export const sendMessage = async (roomId: string, content: string): Promise<Message | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    if (!content.trim()) throw new Error('Message content is empty');

    // Use current month's partitioned messages table
    const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '_');
    const messagesTable = `messages_${currentMonth}`;

    const { data, error } = await supabase
      .from(messagesTable)
      .insert({
        conversation_id: roomId,
        sender_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString()
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
    // Use current month's partitioned messages table
    const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '_');
    const messagesTable = `messages_${currentMonth}`;

    const { data, error } = await supabase
      .from(messagesTable)
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .eq('conversation_id', roomId)
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
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Check room membership error:', error);
    return false;
  }
};

// Join room function
export const joinRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    // Check if already a member
    const isMember = await isRoomMember(roomId);
    if (isMember) return true;

    // Check room capacity (using conversation)
    const room = await getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const currentMemberCount = await getRoomMemberCount(roomId);
    if (currentMemberCount >= room.max_members) {
      throw new Error('Room is full');
    }

    const { error } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: roomId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        role: 'member'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Join room error:', error);
    return false;
  }
};

// Leave room function
export const leaveRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', roomId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Leave room error:', error);
    return false;
  }
};

// Delete room function
export const deleteRoom = async (roomId: string): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    // Check if user is the creator
    const room = await getRoom(roomId);
    if (!room || room.creator_id !== user.id) {
      throw new Error('You can only delete rooms you created');
    }

    const { error } = await supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', roomId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Delete room error:', error);
    return false;
  }
};