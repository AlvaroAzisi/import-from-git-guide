import { supabase } from './supabase';

// Updated to work with new conversations schema
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
        is_active: true,
        short_code: generateRoomCode(), // ✅ short_code
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
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;

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
      .limit(safeLimit);

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

    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(
        `
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `
      )
      .eq('created_by', user.id)
      .eq('type', 'group')
      .order('created_at', { ascending: false });

    if (conversationsError) throw conversationsError;

    const memberCounts = await Promise.all(
      conversations.map(async (conv) => {
        const count = await getRoomMemberCount(conv.id);
        return { id: conv.id, member_count: count };
      })
    );

    const roomsWithCounts = conversations.map(conv => {
      const countObj = memberCounts.find(c => c.id === conv.id);
      return {
        id: conv.id,
        name: conv.name || 'Unnamed Room',
        description: conv.description || '',
        subject: conv.metadata?.subject || '',
        max_members: conv.metadata?.max_members || 10,
        is_public: conv.metadata?.is_public || false,
        creator_id: conv.created_by,
        is_active: true,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        short_code: conv.metadata?.invite_code || '',
        creator: conv.creator,
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

export const getRoom = async (conversationId: string): Promise<Room | null> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(
        `
        *,
        creator:profiles!created_by(full_name, avatar_url)
      `
      )
      .eq('id', conversationId)
      .eq('type', 'group')
      .single();
    if (error) throw error;
    
    // Transform to Room interface
    return {
      id: data.id,
      name: data.name || 'Unnamed Room',
      description: data.description || '',
      subject: data.metadata?.subject || '',
      max_members: data.metadata?.max_members || 10,
      is_public: data.metadata?.is_public || false,
      creator_id: data.created_by,
      is_active: true,
      created_at: data.created_at,
      updated_at: data.updated_at,
      short_code: data.metadata?.invite_code || '',
      creator: data.creator
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
    .from('conversations')
    .select(`
      *,
      creator:profiles!created_by(full_name, avatar_url)
    `)
    .eq('metadata->>invite_code', normalizedCode)
    .eq('type', 'group')
    .single();

  if (error) {
    console.error('Error fetching conversation by invite_code:', error);
    return null;
  }

  // Transform to Room interface
  return {
    id: data.id,
    name: data.name || 'Unnamed Room',
    description: data.description || '',
    subject: data.metadata?.subject || '',
    max_members: data.metadata?.max_members || 10,
    is_public: data.metadata?.is_public || false,
    creator_id: data.created_by,
    is_active: true,
    created_at: data.created_at,
    updated_at: data.updated_at,
    short_code: data.metadata?.invite_code || '',
    creator: data.creator
  };
};


export const getRoomMembers = async (conversationId: string): Promise<RoomMember[]> => {
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
      .eq('conversation_id', conversationId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get conversation members error:', error);
    return [];
  }
};

export const sendMessage = async (conversationId: string, content: string): Promise<Message | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    if (!content.trim()) throw new Error('Message content is empty');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
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

export const getMessages = async (conversationId: string, limit: number = 50): Promise<Message[]> => {
  try {
      .from('messages')
      .select(
      )
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
        profile:profiles(full_name, avatar_url)
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    const { count, error } = await supabase
      .eq('type', 'group')
      .eq('metadata->>is_public', 'true')
      .eq('conversation_id', conversationId);
    
    if (error) throw error;
    if (conversationsError) throw conversationsError;
  } catch (error) {
    console.error('Get conversation member count error:', error);
      conversations.map(async (conv) => {
        const count = await getRoomMemberCount(conv.id);
        return { id: conv.id, member_count: count };

export const isRoomMember = async (conversationId: string): Promise<boolean> => {
  try {
    const roomsWithCounts = conversations.map(conv => {
      const countObj = memberCounts.find(c => c.id === conv.id);
    if (!user) return false;
        id: conv.id,
        name: conv.name || 'Unnamed Room',
        description: conv.description || '',
        subject: conv.metadata?.subject || '',
        max_members: conv.metadata?.max_members || 10,
        is_public: conv.metadata?.is_public || false,
        creator_id: conv.created_by,
        is_active: true,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        short_code: conv.metadata?.invite_code || '',
        creator: conv.creator,
    const { data, error } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Check conversation membership error:', error);
    return false;
  }
};
  }
}