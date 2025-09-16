// TODO: Disabled – depends on old schema (user_relationships, conversations)
import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

// Type definitions for RPC responses
export interface JoinRoomByCodeResponse {
  success: boolean;
  room_id?: string;
  room_title?: string;
  error?: string;
}

export interface ProfileDetails extends UserProfile {
  friendship_status: 'none' | 'pending' | 'accepted' | 'blocked';
  mutual_rooms: Array<{
    id: string;
    name: string;
    subject: string;
  }>;
  mutual_friends_count: number;
  rooms_joined: number;
}

// Simplified functions for new backend
export const joinRoomByCode = async (code: string): Promise<JoinRoomByCodeResponse> => {
  try {
    const normalized = code.trim().toUpperCase();

    const { data, error } = await supabase.rpc('validate_join_code', {
      p_code: normalized,
    });

    if (error) {
      console.error('Join room by code error:', error);
      return {
        success: false,
        error: error.message || 'Invalid room code',
      };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result || !result.valid || !result.room_id) {
      return { success: false, error: 'Invalid or expired room code' };
    }

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', result.room_id)
      .maybeSingle();
    if (roomErr) {
      console.warn('Could not fetch room title:', roomErr.message);
    }

    return {
      success: true,
      room_id: result.room_id,
      room_title: room?.name || undefined,
    };
  } catch (error: any) {
    console.error('Join room by code error:', error);
    return {
      success: false,
      error: error.message || 'Failed to join room',
    };
  }
};

export const getRoomById = async (roomId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Get room by ID error:', error);
    throw error;
  }
};

// Placeholder functions - disabled until schema is expanded
export const getProfileDetails = async (userId: string): Promise<ProfileDetails> => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    if (!profileData) throw new Error('Profile not found');

    return {
      ...profileData,
      friendship_status: 'none',
      mutual_rooms: [],
      mutual_friends_count: 0,
    } as ProfileDetails;
  } catch (error: any) {
    console.error('Get profile details error:', error);
    throw new Error('Profile not found');
  }
};

export const canStartDM = async (_targetUserId: string) => {
  return { can_dm: false, reason: 'Feature disabled' };
};

export const sendFriendRequest = async (_toUserId: string) => {
  return { success: false, status: 'none', error: 'Feature disabled' };
};

export const removeFriend = async (_friendId: string) => {
  return { success: false, error: 'Feature disabled' };
};

// Additional placeholder exports for room settings modal
export const updateRoom = async (
  _roomId: string,
  _updates: any
): Promise<{ error: string | null }> => {
  // TODO: disabled – old schema (room_requests)
  return { error: 'Feature disabled' };
};

export const regenerateRoomCode = async (_roomId: string): Promise<{ error: string | null }> => {
  // TODO: disabled – old schema (room_requests)
  return { error: 'Feature disabled' };
};

export const softDeleteRoom = async (_roomId: string): Promise<{ error: string | null }> => {
  // TODO: disabled – old schema (room_requests)
  return { error: 'Feature disabled' };
};
