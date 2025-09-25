// TODO: Disabled – depends on old schema and complex RPC interactions
import { supabase } from '../integrations/supabase/client';
import type { CreateRoomPayload, JoinRoomResponse } from '../types/room';

// Hook for room operations - simplified to work with new backend
export const useRoomOperations = () => {
  const createAndJoinRoom = async (payload: CreateRoomPayload): Promise<JoinRoomResponse> => {
    try {
      const { data, error } = await supabase.rpc('create_room_and_join', {
        p_name: payload.name,
        p_description: payload.description || '',
        p_subject: payload.subject || '',
        p_is_public: payload.is_public ?? true,
        p_max_members: payload.max_members || 10,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'GENERAL_ERROR',
        };
      }

      if (data && data.length > 0) {
        const roomData = data[0];
        return {
          success: true,
          room: roomData.room as any,
          membership: roomData.membership as any,
        };
      }

      return {
        success: false,
        error: 'Failed to create room',
        code: 'GENERAL_ERROR',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: 'GENERAL_ERROR',
      };
    }
  };

  const joinRoom = async (roomCode: string): Promise<JoinRoomResponse> => {
    try {
      const { data, error } = await supabase.rpc('join_room_safe', {
        p_room_identifier: roomCode,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'GENERAL_ERROR',
        };
      }

      return {
        success: true,
        membership: data as any,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        code: 'GENERAL_ERROR',
      };
    }
  };

  return {
    createAndJoinRoom,
    joinRoom,
  };
};