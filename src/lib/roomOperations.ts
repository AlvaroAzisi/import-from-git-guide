// Atomic room operations with proper error handling and auth recovery
// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';

export interface CreateRoomPayload {
  name: string;
  description?: string;
  subject?: string;
  is_public?: boolean;
  max_members?: number;
}

export interface RoomOperationResult {
  success: boolean;
  room_id?: string;
  room?: any;
  membership?: any;
  error?: string;
  code?: 'ROOM_NOT_FOUND' | 'ALREADY_MEMBER' | 'ROOM_FULL' | 'NOT_AUTHENTICATED' | 'GENERAL_ERROR';
}

// Store pending operations for auth recovery
const STORAGE_KEYS = {
  PENDING_ROOM_JOIN: 'kupintar_pending_room_join',
  PENDING_ROOM_CREATE: 'kupintar_pending_room_create',
} as const;

export const storePendingJoin = (roomId: string) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_ROOM_JOIN, roomId);
  } catch (error) {
    console.warn('Failed to store pending join:', error);
  }
};

export const getPendingJoin = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.PENDING_ROOM_JOIN);
  } catch (error) {
    console.warn('Failed to get pending join:', error);
    return null;
  }
};

export const clearPendingJoin = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_ROOM_JOIN);
  } catch (error) {
    console.warn('Failed to clear pending join:', error);
  }
};

export const storePendingCreate = (payload: CreateRoomPayload) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_ROOM_CREATE, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to store pending create:', error);
  }
};

export const getPendingCreate = (): CreateRoomPayload | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PENDING_ROOM_CREATE);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to get pending create:', error);
    return null;
  }
};

export const clearPendingCreate = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_ROOM_CREATE);
  } catch (error) {
    console.warn('Failed to clear pending create:', error);
  }
};

/**
 * Atomic create room and join operation
 */
export const createRoomAndJoin = async (payload: CreateRoomPayload): Promise<RoomOperationResult> => {
  try {
    // Check authentication first
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    const session = sessionData?.session;
    if (!session) {
      storePendingCreate(payload);
      return {
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      };
    }

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

    if (data && data.success) {
      clearPendingCreate();
      return {
        success: true,
        room_id: data.room.id,
        room: data.room,
        membership: data.membership
      };
    }

    return {
      success: false,
      error: data?.error || 'No data returned from room creation',
      code: 'GENERAL_ERROR'
    };

  } catch (error: any) {
    console.error('Create room error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create room',
      code: 'GENERAL_ERROR'
    };
  }
};

/**
 * Join existing room by ID or code
 */
export const joinRoom = async (roomIdOrCode: string): Promise<RoomOperationResult> => {
  try {
    // Check authentication first
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    const session = sessionData?.session;
    if (!session) {
      storePendingJoin(roomIdOrCode);
      return {
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      };
    }

    const { data, error } = await supabase.rpc('join_room_safe', {
      p_room_identifier: roomIdOrCode
    });

    if (error) {
      console.error('Join room RPC error:', error);
      return {
        success: false,
        error: error.message,
        code: 'GENERAL_ERROR'
      };
    }

    if (data && data.success) {
      clearPendingJoin();
      return {
        success: true,
        room_id: data.room_id,
        code: data.code === 'ALREADY_MEMBER' ? 'ALREADY_MEMBER' : undefined
      };
    }

    // Handle error codes from RPC
    const errorMessages = {
      'ROOM_NOT_FOUND': 'Room not found or inactive',
      'MAX_CAPACITY': 'Room is at maximum capacity',
      'ROOM_PRIVATE': 'Room is private and requires invitation'
    };
    
    return {
      success: false,
      error: errorMessages[data?.code as keyof typeof errorMessages] || data?.error || 'Failed to join room',
      code: data?.code
    };

  } catch (error: any) {
    console.error('Join room error:', error);
    return {
      success: false,
      error: error.message || 'Failed to join room',
      code: 'GENERAL_ERROR'
    };
  }
};

/**
 * Leave room operation
 */
export const leaveRoom = async (roomId: string): Promise<RoomOperationResult> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    
    const session = sessionData?.session;
    if (!session) {
      return {
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      };
    }

    const userId = session.user.id;

    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      room_id: roomId
    };

  } catch (error: any) {
    console.error('Leave room error:', error);
    return {
      success: false,
      error: error.message || 'Failed to leave room',
      code: 'GENERAL_ERROR'
    };
  }
};

/**
 * Hook for room operations with navigation
 */
import { useNavigation } from './navigation';

export const useRoomOperations = () => {
  const { navigateToRoom } = useNavigation();
  
  const createAndJoinRoom = async (payload: CreateRoomPayload) => {
    const result = await createRoomAndJoin(payload);
    if (result.success && result.room_id) {
      // Auto-navigate to the newly created room
      navigateToRoom(result.room_id);
    }
    return result;
  };
  
  const joinExistingRoom = async (roomIdOrCode: string) => {
    const result = await joinRoom(roomIdOrCode);
    if (result.success && result.room_id) {
      // Auto-navigate to the joined room
      navigateToRoom(result.room_id);
    }
    return result;
  };
  
  return {
    createAndJoinRoom,
    joinExistingRoom,
    leaveRoom
  };
};