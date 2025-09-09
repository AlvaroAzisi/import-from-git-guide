// Centralized room management with atomic operations
// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';
import type { Room, CreateRoomPayload, JoinRoomResponse } from '../types/room';

export class RoomManager {
  /**
   * Atomic create room + join operation
   * Uses stored procedure for atomicity
   */
  static async createAndJoinRoom(payload: CreateRoomPayload): Promise<JoinRoomResponse> {
    try {
      // Call the stored procedure that creates room and adds creator as admin atomically
      const { data, error } = await supabase.rpc('create_room_and_join', {
        p_name: payload.name,
        p_description: payload.description || '',
        p_subject: payload.subject || '',
        p_is_public: payload.is_public ?? true,
        p_max_members: payload.max_members || 10
      });

      if (error) {
        console.error('Create room RPC error:', error);
        return {
          success: false,
          error: error.message,
          code: 'GENERAL_ERROR'
        };
      }

      if (data && data.length > 0) {
        const roomData = data[0];
        return {
          success: true,
          room: roomData.room,
          membership: roomData.membership
        };
      }

      return {
        success: false,
        error: 'No data returned from room creation',
        code: 'GENERAL_ERROR'
      };

    } catch (error: any) {
      console.error('Create and join room error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create room',
        code: 'GENERAL_ERROR'
      };
    }
  }

  /**
   * Join existing room by ID or short code
   */
  static async joinRoom(roomIdOrCode: string): Promise<JoinRoomResponse> {
    try {
      // First check if room exists and get details
      const roomCheck = await this.checkRoomExists(roomIdOrCode);
      if (!roomCheck.exists) {
        return {
          success: false,
          error: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        };
      }

      // Call the join room RPC
      const { data, error } = await supabase.rpc('join_room_safe', {
        p_room_identifier: roomIdOrCode
      });

      if (error) {
        // Map known errors to codes
        if (error.message.includes('already a member')) {
          return {
            success: true, // Still success - they're already in
            room: roomCheck.room,
            code: 'ALREADY_MEMBER'
          };
        }
        if (error.message.includes('max capacity')) {
          return {
            success: false,
            error: 'Room is at maximum capacity',
            code: 'MAX_CAPACITY'
          };
        }
        if (error.message.includes('private') || error.message.includes('not public')) {
          return {
            success: false,
            error: 'Room is private',
            code: 'ROOM_PRIVATE'
          };
        }

        return {
          success: false,
          error: error.message,
          code: 'GENERAL_ERROR'
        };
      }

      return {
        success: true,
        room: roomCheck.room,
        membership: data
      };

    } catch (error: any) {
      console.error('Join room error:', error);
      return {
        success: false,
        error: error.message || 'Failed to join room',
        code: 'GENERAL_ERROR'
      };
    }
  }

  /**
   * Check if room exists and return basic info
   */
  static async checkRoomExists(roomIdOrCode: string): Promise<{
    exists: boolean;
    room?: Room;
    error?: string;
  }> {
    try {
      // Try by ID first, then by short_code
      let query = supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true);

      // Check if it looks like a UUID (room ID) or short code
      if (roomIdOrCode.length > 10 && roomIdOrCode.includes('-')) {
        query = query.eq('id', roomIdOrCode);
      } else {
        query = query.eq('short_code', roomIdOrCode.toUpperCase());
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - room doesn't exist
          return { exists: false };
        }
        return { exists: false, error: error.message };
      }

      return { exists: true, room: data };

    } catch (error: any) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Get room details with member count
   */
  static async getRoomDetails(roomId: string): Promise<{
    room?: Room;
    memberCount?: number;
    userIsMember?: boolean;
    error?: string;
  }> {
    try {
      const [roomResult, memberResult, membershipResult] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('room_members').select('id').eq('room_id', roomId),
        supabase.from('room_members').select('id').eq('room_id', roomId).eq('user_id', (await supabase.auth.getUser()).data.user?.id).single()
      ]);

      if (roomResult.error) {
        return { error: roomResult.error.message };
      }

      return {
        room: roomResult.data,
        memberCount: memberResult.data?.length || 0,
        userIsMember: !membershipResult.error
      };

    } catch (error: any) {
      return { error: error.message };
    }
  }
}