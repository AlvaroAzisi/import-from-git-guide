// TODO: Disabled – depends on old schema (room member checks)
import { supabase } from '../integrations/supabase/client';

export interface RoomAccessResult {
  canAccess: boolean;
  isMember: boolean;
  requiresJoin: boolean;
  room?: any;
  error?: string;
}

// Simplified room access check
export const checkRoomAccess = async (roomId: string): Promise<RoomAccessResult> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        canAccess: false,
        isMember: false,
        requiresJoin: false,
        error: 'Authentication required',
      };
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('is_active', true)
      .single();

    if (roomError || !room) {
      return {
        canAccess: false,
        isMember: false,
        requiresJoin: false,
        error: 'Room not found or inactive',
      };
    }

    const { data: membership } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      return {
        canAccess: true,
        isMember: true,
        requiresJoin: false,
        room,
      };
    }

    if (room.is_public) {
      const { data: memberCount } = await supabase.rpc('get_room_member_count', {
        p_room_id: roomId,
      });

      if ((memberCount || 0) >= (room.max_members || 10)) {
        return {
          canAccess: false,
          isMember: false,
          requiresJoin: false,
          room,
          error: 'Room is full',
        };
      }

      return {
        canAccess: true,
        isMember: false,
        requiresJoin: true,
        room,
      };
    }

    return {
      canAccess: false,
      isMember: false,
      requiresJoin: false,
      room,
      error: 'Room is private and requires invitation',
    };
  } catch (error: any) {
    console.error('Room access check error:', error);
    return {
      canAccess: false,
      isMember: false,
      requiresJoin: false,
      error: error.message || 'Failed to check room access',
    };
  }
};

export const enterRoom = async (roomId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const accessResult = await checkRoomAccess(roomId);

    if (!accessResult.canAccess) {
      return {
        success: false,
        error: accessResult.error || 'Cannot access room',
      };
    }

    if (accessResult.requiresJoin) {
      const { data, error } = await supabase.rpc('join_room_safe', {
        p_room_identifier: roomId,
      });

      if (error || !data) {
        return {
          success: false,
          error: 'Failed to join room',
        };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Room entry error:', error);
    return {
      success: false,
      error: error.message || 'Failed to enter room',
    };
  }
};

export const requiresVerification = async (roomId: string): Promise<boolean> => {
  try {
    const accessResult = await checkRoomAccess(roomId);
    return accessResult.requiresJoin && accessResult.canAccess;
  } catch (error) {
    console.error('Verification check error:', error);
    return false;
  }
};
