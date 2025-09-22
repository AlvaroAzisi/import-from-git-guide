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

    return (data || []).map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description || '',
      subject: room.subject || '',
      created_by: room.created_by,
      created_at: room.created_at,
      updated_at: room.updated_at,
      is_active: room.is_active ?? true,
      is_public: room.is_public ?? true,
      max_members: room.max_members || 10,
      short_code: room.short_code,
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

// Additional exports required by pages - placeholder implementations
export const getRoom = async (roomId: string): Promise<Room | null> => {
  try {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();

    if (error) {
      console.error('Error fetching room:', error);
      return null;
    }

    return data
      ? {
          id: data.id,
          name: data.name,
          description: data.description || '',
          subject: data.subject || '',
          created_by: data.created_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
          is_active: data.is_active ?? true,
          is_public: data.is_public ?? true,
          max_members: data.max_members || 10,
          short_code: data.short_code,
        }
      : null;
  } catch (error) {
    console.error('Error in getRoom:', error);
    return null;
  }
};

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select(
        `
        *,
        profile:profiles(id, full_name, avatar_url)
      `
      )
      .eq('room_id', roomId);

    if (error) {
      console.error('Error fetching room members:', error);
      return [];
    }

    return (data || []).map((member) => ({
      id: member.id,
      room_id: member.room_id || '',
      user_id: member.user_id || '',
      role: member.role as 'admin' | 'member',
      joined_at: member.joined_at || '',
      profile: member.profile || undefined,
    }));
  } catch (error) {
    console.error('Error in getRoomMembers:', error);
    return [];
  }
};

export const getMessages = async (roomId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        profile:profiles(id, full_name, avatar_url)
      `
      )
      .eq('conversation_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map((message) => ({
      id: message.id,
      room_id: roomId,
      user_id: message.sender_id || '',
      content: message.content,
      created_at: message.created_at,
      profile: message.profile || undefined,
    }));
  } catch (error) {
    console.error('Error in getMessages:', error);
    return [];
  }
};

export const sendMessage = async (roomId: string, content: string): Promise<Message | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: roomId,
        sender_id: user.user.id,
        content,
        message_type: 'text',
      })
      .select(
        `
        *,
        profile:profiles(id, full_name, avatar_url)
      `
      )
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return {
      id: data.id,
      room_id: roomId,
      user_id: data.sender_id || '',
      content: data.content,
      created_at: data.created_at,
      profile: data.profile || undefined,
    };
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
};

export const joinRoom = async (roomId: string): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: user.user.id,
      role: 'member',
    });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('You are already a member of this room');
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error joining room:', error);
    throw error;
  }
};

export const leaveRoom = async (roomId: string): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.user.id);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

export const isRoomMember = async (roomId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data, error } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      console.error('Error checking room membership:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isRoomMember:', error);
    return false;
  }
};

export const getRoomByCode = async (code: string): Promise<Room | null> => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`short_code.eq.${code},join_code.eq.${code}`)
      .single();

    if (error) {
      console.error('Error fetching room by code:', error);
      return null;
    }

    return data
      ? {
          id: data.id,
          name: data.name,
          description: data.description || '',
          subject: data.subject || '',
          created_by: data.created_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
          is_active: data.is_active ?? true,
          is_public: data.is_public ?? true,
          max_members: data.max_members || 10,
          short_code: data.short_code,
        }
      : null;
  } catch (error) {
    console.error('Error in getRoomByCode:', error);
    return null;
  }
};

export const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};
