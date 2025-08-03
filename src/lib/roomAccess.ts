import { supabase } from './supabase';
import { isRoomMember, joinRoom, getRoom } from './rooms';

export interface RoomAccessResult {
  canAccess: boolean;
  isMember: boolean;
  requiresJoin: boolean;
  room?: any;
  error?: string;
}

/**
 * Smart room access logic that determines if user can access a room
 * and what actions they need to take
 */
export const checkRoomAccess = async (roomId: string): Promise<RoomAccessResult> => {
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        canAccess: false,
        isMember: false,
        requiresJoin: false,
        error: 'Authentication required'
      };
    }

    // Get room details
    const room = await getRoom(roomId);
    if (!room) {
      return {
        canAccess: false,
        isMember: false,
        requiresJoin: false,
        error: 'Room not found or inactive'
      };
    }

    // Check if user is already a member
    const isMember = await isRoomMember(roomId);
    
    if (isMember) {
      // User is already a member, can access immediately
      return {
        canAccess: true,
        isMember: true,
        requiresJoin: false,
        room
      };
    }

    // Check if room is public and has space
    if (room.is_public) {
      // Get current member count
      const { data: memberCount } = await supabase.rpc('get_room_member_count', {
        room_uuid: roomId
      });

      if (memberCount >= room.max_members) {
        return {
          canAccess: false,
          isMember: false,
          requiresJoin: false,
          room,
          error: 'Room is full'
        };
      }

      // Room is public and has space, user can join
      return {
        canAccess: true,
        isMember: false,
        requiresJoin: true,
        room
      };
    }

    // Room is private and user is not a member
    return {
      canAccess: false,
      isMember: false,
      requiresJoin: false,
      room,
      error: 'Room is private and requires invitation'
    };

  } catch (error: any) {
    console.error('Room access check error:', error);
    return {
      canAccess: false,
      isMember: false,
      requiresJoin: false,
      error: error.message || 'Failed to check room access'
    };
  }
};

/**
 * Smart room entry that handles the entire flow
 */
export const enterRoom = async (roomId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const accessResult = await checkRoomAccess(roomId);

    if (!accessResult.canAccess) {
      return {
        success: false,
        error: accessResult.error || 'Cannot access room'
      };
    }

    // If user needs to join, do it automatically
    if (accessResult.requiresJoin) {
      const joinResult = await joinRoom(roomId);
      if (!joinResult) {
        return {
          success: false,
          error: 'Failed to join room'
        };
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error('Room entry error:', error);
    return {
      success: false,
      error: error.message || 'Failed to enter room'
    };
  }
};

/**
 * Check if room requires verification before access
 */
export const requiresVerification = async (roomId: string): Promise<boolean> => {
  try {
    const accessResult = await checkRoomAccess(roomId);
    return accessResult.requiresJoin && accessResult.canAccess;
  } catch (error) {
    console.error('Verification check error:', error);
    return false;
  }
};