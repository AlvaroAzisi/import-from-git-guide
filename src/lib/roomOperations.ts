// Atomic room operations with proper error handling
import { supabase } from './supabase';

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

    const userId = session.user.id;

    // Create conversation (room) using new schema
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name: payload.name,
        description: payload.description,
        metadata: {
          subject: payload.subject,
          max_members: payload.max_members || 10,
          is_public: payload.is_public ?? true
        },
        created_by: userId
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: conversation.id,
        user_id: userId,
        role: 'admin',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      // Cleanup orphaned conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      throw memberError;
    }

    clearPendingCreate();
    return {
      success: true,
      room_id: conversation.id,
      room: conversation,
      membership: { role: 'admin' }
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

    const userId = session.user.id;

    // Find conversation by ID or code
    let conversation;
    if (roomIdOrCode.length > 10 && roomIdOrCode.includes('-')) {
      // UUID format - direct lookup
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', roomIdOrCode)
        .single();
      
      if (error) throw error;
      conversation = data;
    } else {
      // Short code lookup
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('metadata->>invite_code', roomIdOrCode.toUpperCase())
        .single();
      
      if (error) throw error;
      conversation = data;
    }

    if (!conversation) {
      return {
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND'
      };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('conversation_members')
      .select('id')
      .eq('conversation_id', conversation.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      clearPendingJoin();
      return {
        success: true,
        room_id: conversation.id,
        room: conversation,
        code: 'ALREADY_MEMBER'
      };
    }

    // Check capacity
    const maxMembers = conversation.metadata?.max_members || 10;
    const { count } = await supabase
      .from('conversation_members')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation.id);

    if (count && count >= maxMembers) {
      return {
        success: false,
        error: 'Room is full',
        code: 'ROOM_FULL'
      };
    }

    // Join the conversation
    const { error: joinError } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: conversation.id,
        user_id: userId,
        role: 'member',
        joined_at: new Date().toISOString()
      });

    if (joinError) throw joinError;

    clearPendingJoin();
    return {
      success: true,
      room_id: conversation.id,
      room: conversation,
      membership: { role: 'member' }
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
      navigateToRoom(result.room_id);
    }
    return result;
  };
  
  const joinExistingRoom = async (roomIdOrCode: string) => {
    const result = await joinRoom(roomIdOrCode);
    if (result.success && result.room_id) {
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