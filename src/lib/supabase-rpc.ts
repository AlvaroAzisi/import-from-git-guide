import { supabase } from './supabase';
import type { UserProfile } from './auth';

// Type definitions for RPC responses
export interface JoinRoomByCodeResponse {
  success: boolean;
  room_id?: string;
  room_title?: string;
  error?: string;
}

export interface RoomUpdateData {
  name?: string;
  description?: string;
  subject?: string;
}

export interface UpdateRoomResponse {
  success: boolean;
  room?: any;
  error?: string;
}

export interface RegenerateCodeResponse {
  success: boolean;
  new_code?: string;
  error?: string;
}

export interface SoftDeleteRoomResponse {
  success: boolean;
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
}

export interface CanStartDMResponse {
  can_dm: boolean;
  reason?: string;
}

export interface FriendRequestResponse {
  success: boolean;
  status: string;
  error?: string;
}

export interface RemoveFriendResponse {
  success: boolean;
  error?: string;
}

/**
 * Join room by short code
 */
export const joinRoomByCode = async (code: string): Promise<JoinRoomByCodeResponse> => {
  try {
    const normalized = code.trim().toUpperCase();

    const { data, error } = await supabase.rpc('validate_join_code', { 
      p_code: normalized 
    });

    if (error) {
      console.error('Join room by code error:', error);
      return { 
        success: false, 
        error: error.message || 'Invalid room code' 
      };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result || !result.valid || !result.room_id) {
      return { success: false, error: 'Invalid or expired room code' };
    }

    // Fetch room title for nicer UX (optional)
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
      room_title: room?.name || undefined
    };
  } catch (error: any) {
    console.error('Join room by code error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to join room' 
    };
  }
};

/**
 * Get room by ID
 */
export const getRoomById = async (roomId: string): Promise<any> => {
  try {
    // TODO: DB/RLS: Varo will ensure rooms table has proper SELECT policies
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Get room by ID error:', error);
    throw error;
  }
};

/**
 * Update room details
 */
export const updateRoom = async (roomId: string, updates: RoomUpdateData): Promise<UpdateRoomResponse> => {
  try {
    // TODO: DB/RLS: Varo will paste SQL for update_room RPC
    // Expected params: { room_id: string, updates: RoomUpdateData }
    // Expected response: { success: boolean, room: Room }
    const { data, error } = await supabase.rpc('update_room', {
      room_id: roomId,
      updates
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to update room' 
      };
    }

    return {
      success: true,
      room: data
    };
  } catch (error: any) {
    console.error('Update room error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update room' 
    };
  }
};

/**
 * Regenerate room invite code
 */
export const regenerateRoomCode = async (roomId: string): Promise<RegenerateCodeResponse> => {
  try {
    // TODO: DB/RLS: Varo will paste SQL for regenerate_room_code RPC
    // Expected params: { room_id: string }
    // Expected response: { new_code: string }
    const { data, error } = await supabase.rpc('regenerate_room_code', {
      room_id: roomId
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to regenerate code' 
      };
    }

    return {
      success: true,
      new_code: data?.new_code
    };
  } catch (error: any) {
    console.error('Regenerate room code error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to regenerate code' 
    };
  }
};

/**
 * Soft delete room (mark as inactive)
 */
export const softDeleteRoom = async (roomId: string): Promise<SoftDeleteRoomResponse> => {
  try {
    // TODO: DB/RLS: Varo will paste SQL for soft_delete_room RPC
    // Expected params: { room_id: string }
    // Expected response: { success: boolean }
    const { data, error } = await supabase.rpc('soft_delete_room', {
      room_id: roomId
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to delete room' 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Soft delete room error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to delete room' 
    };
  }
};

/**
 * Get detailed profile information with relationships
 */
export const getProfileDetails = async (userId: string): Promise<ProfileDetails> => {
  try {
    // Fallback to direct profile query since RPC doesn't exist yet
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    
    // Get friendship status
    const currentUser = (await supabase.auth.getUser()).data.user;
    let friendshipStatus: 'none' | 'pending' | 'accepted' | 'blocked' = 'none';
    
    if (currentUser && currentUser.id !== userId) {
      const { data: friendData } = await supabase
        .from('friends')
        .select('status')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser.id})`)
        .single();
      
      friendshipStatus = friendData?.status || 'none';
    }
    
    // Return profile with additional fields
    return {
      ...profileData,
      friendship_status: friendshipStatus,
      mutual_rooms: [], // TODO: Implement mutual rooms query
      mutual_friends_count: 0 // TODO: Implement mutual friends count
    } as ProfileDetails;
  } catch (error: any) {
    console.error('Get profile details error:', error);
    throw error;
  }
};

/**
 * Check if user can start DM (respect limits)
 */
export const canStartDM = async (targetUserId: string): Promise<CanStartDMResponse> => {
  try {
    // TODO: DB/RLS: Varo will paste SQL for can_start_dm RPC
    // Expected params: { target_user_id: string }
    // Expected response: { can_dm: boolean, reason?: string }
    const { data, error } = await supabase.rpc('can_start_dm', {
      target_user_id: targetUserId
    });

    if (error) {
      return { can_dm: false, reason: error.message };
    }

    return data || { can_dm: true };
  } catch (error: any) {
    console.error('Can start DM error:', error);
    return { can_dm: false, reason: 'Failed to check DM availability' };
  }
};

/**
 * Send friend request
 */
export const sendFriendRequest = async (toUserId: string): Promise<FriendRequestResponse> => {
  try {
    // TODO: DB/RLS: Varo will paste SQL for send_friend_request RPC
    // Expected params: { to_user_id: string }
    // Expected response: { success: boolean, status: string }
    const { data, error } = await supabase.rpc('send_friend_request', {
      to_user_id: toUserId
    });

    if (error) {
      return { 
        success: false, 
        status: 'none',
        error: error.message || 'Failed to send friend request' 
      };
    }

    return {
      success: true,
      status: data?.status || 'pending'
    };
  } catch (error: any) {
    console.error('Send friend request error:', error);
    return { 
      success: false, 
      status: 'none',
      error: error.message || 'Failed to send friend request' 
    };
  }
};

/**
 * Remove friend
 */
export const removeFriend = async (friendId: string): Promise<RemoveFriendResponse> => {
  try {
    // TODO: DB/RLS: Varo will paste SQL for remove_friend RPC
    // Expected params: { friend_id: string }
    // Expected response: { success: boolean }
    const { data, error } = await supabase.rpc('remove_friend', {
      friend_id: friendId
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to remove friend' 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Remove friend error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to remove friend' 
    };
  }
};