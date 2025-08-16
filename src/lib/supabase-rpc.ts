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
    const { data: _data, error } = await supabase.rpc('soft_delete_room', {
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
    // Use direct profile query instead of missing RPC
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;
    if (!profileData) throw new Error('Profile not found');
    
    // Get friendship status
    const currentUser = (await supabase.auth.getUser()).data.user;
    let friendshipStatus: 'none' | 'pending' | 'accepted' | 'blocked' = 'none';
    
    if (currentUser && currentUser.id !== userId) {
      const { data: friendData } = await supabase
        .from('user_relationships')
        .select('status')
        .or(`and(user_id.eq.${currentUser.id},related_user_id.eq.${userId}),and(user_id.eq.${userId},related_user_id.eq.${currentUser.id})`)
        .eq('relationship_type', 'friend')
        .maybeSingle();
      
      friendshipStatus = friendData?.status || 'none';
    }
    
    // Get mutual conversations (simplified query)
    let mutualRooms: any[] = [];
    if (currentUser && currentUser.id !== userId) {
      const { data: mutualRoomsData } = await supabase
        .from('conversation_members')
        .select(`
          conversation:conversations(id, name, description)
        `)
        .eq('user_id', userId)
;
      
      mutualRooms = mutualRoomsData?.map(item => ({
        id: item.conversation?.id,
        name: item.conversation?.name,
        subject: item.conversation?.description
      })).filter(Boolean) || [];
    }
    
    // Return profile with additional fields
    return {
      ...profileData,
      friendship_status: friendshipStatus,
      mutual_rooms: mutualRooms,
      mutual_friends_count: 0 // TODO: Implement mutual friends count
    } as ProfileDetails;
  } catch (error: any) {
    console.error('Get profile details error:', error);
    // Return minimal profile data on error
    const { data: basicProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (basicProfile) {
      return {
        ...basicProfile,
        friendship_status: 'none',
        mutual_rooms: [],
        mutual_friends_count: 0
      } as ProfileDetails;
    }
    
    throw new Error('Profile not found');
  }
};

/**
 * Check if user can start DM (respect limits)
 */
export const canStartDM = async (targetUserId: string): Promise<CanStartDMResponse> => {
  try {
    // Simple check - can always start DM for now
    // TODO: Implement rate limiting and blocking checks
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return { can_dm: false, reason: 'Not authenticated' };
    }
    
    if (currentUser.id === targetUserId) {
      return { can_dm: false, reason: 'Cannot DM yourself' };
    }
    
    // Check if user is blocked
    const { data: blockData } = await supabase
      .from('user_relationships')
      .select('status')
      .or(`and(user_id.eq.${currentUser.id},related_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},related_user_id.eq.${currentUser.id})`)
      .eq('relationship_type', 'block')
      .maybeSingle();
    
    if (blockData) {
      return { can_dm: false, reason: 'User is blocked' };
    }
    
    return { can_dm: true };
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
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return { 
        success: false, 
        status: 'none',
        error: 'Not authenticated' 
      };
    }
    
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('user_relationships')
      .select('status')
      .or(`and(user_id.eq.${currentUser.id},related_user_id.eq.${toUserId}),and(user_id.eq.${toUserId},related_user_id.eq.${currentUser.id})`)
      .eq('relationship_type', 'friend')
      .maybeSingle();
    
    if (existing) {
      return {
        success: false,
        status: existing.status,
        error: existing.status === 'pending' ? 'Friend request already sent' : 'Already friends'
      };
    }
    
    // Create friend request
    const { error } = await supabase
      .from('user_relationships')
      .insert({
        user_id: currentUser.id,
        related_user_id: toUserId,
        relationship_type: 'friend',
        status: 'pending'
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
      status: 'pending'
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
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Not authenticated' 
      };
    }
    
    const { error } = await supabase
      .from('user_relationships')
      .delete()
      .or(`and(user_id.eq.${currentUser.id},related_user_id.eq.${friendId}),and(user_id.eq.${friendId},related_user_id.eq.${currentUser.id})`)
      .eq('relationship_type', 'friend');
    
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