import { supabase } from '../integrations/supabase/client';
import { logError } from './errorHandler';
import type { Tables, TablesInsert } from '../integrations/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

export type FriendRequest = Tables<'friend_requests'> & {
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
  receiver?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
};

export type Friendship = Tables<'friends'> & {
  friend_profile?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
    bio?: string | null;
    xp?: number | null;
    level?: number | null;
    interests?: string[] | null;
  };
};

export interface RecommendedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  xp?: number | null;
  level?: number | null;
  interests?: string[] | null;
  score?: number;
}

export type FriendshipStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'friends'
  | 'blocked';

// Direct Message types
export interface DirectMessage {
  id: string;
  chat_id: string;
  sender: string | null;
  content: string;
  created_at: string | null;
  sender_profile?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

// Friend type for chat components
export type Friend = Friendship['friend_profile'];

// ============================================================================
// FRIEND REQUESTS
// ============================================================================

export const sendFriendRequest = async (
  receiverId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    if (user.id === receiverId) {
      return { success: false, error: 'Cannot send friend request to yourself' };
    }

    const payload: TablesInsert<'friend_requests'> = {
      sender_id: user.id,
      receiver_id: receiverId,
      message: message || null,
      status: 'pending',
    };

    const { error } = await supabase.from('friend_requests').insert(payload);

    if (error) {
      if (error.message.includes('Rate limit')) {
        return { success: false, error: 'Too many requests. Please wait before sending more.' };
      }
      if (error.message.includes('blocked')) {
        return { success: false, error: 'Cannot send request to this user' };
      }
      if (error.message.includes('duplicate')) {
        return { success: false, error: 'Friend request already sent' };
      }
      logError('sendFriendRequest', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    logError('sendFriendRequest', error);
    return { success: false, error: error.message || 'Failed to send friend request' };
  }
};

export const respondToFriendRequest = async (
  requestId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', requestId)
      .eq('receiver_id', user.id);

    if (error) {
      logError('respondToFriendRequest', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    logError('respondToFriendRequest', error);
    return { success: false, error: error.message || 'Failed to respond to friend request' };
  }
};

export const getPendingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('friend_requests')
      .select(
        `
        *,
        sender:profiles!friend_requests_sender_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logError('getPendingFriendRequests', error);
      return [];
    }

    return (data || []).map((req: any) => ({
      ...req,
      sender: Array.isArray(req.sender) ? req.sender[0] : req.sender,
    })) as FriendRequest[];
  } catch (error) {
    logError('getPendingFriendRequests', error);
    return [];
  }
};

// ============================================================================
// FRIENDSHIPS
// ============================================================================

export const getFriends = async (): Promise<Friendship[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('friends')
      .select(
        `
        *,
        friend_profile:profiles!friends_friend_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          bio,
          xp,
          level,
          interests
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('getFriends', error);
      return [];
    }

    return (data || []).map((friendship: any) => ({
      ...friendship,
      friend_profile: Array.isArray(friendship.friend_profile)
        ? friendship.friend_profile[0]
        : friendship.friend_profile,
    })) as Friendship[];
  } catch (error) {
    logError('getFriends', error);
    return [];
  }
};

export const getFriendshipStatus = async (otherUserId: string): Promise<FriendshipStatus> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 'none';

    // Check if blocked
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
      .maybeSingle();

    if (blocked) return 'blocked';

    // Check friendship
    const { data: friendship } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', otherUserId)
      .maybeSingle();

    if (friendship) return 'friends';

    // Check pending requests
    const { data: sentRequest } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', user.id)
      .eq('receiver_id', otherUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (sentRequest) return 'pending_sent';

    const { data: receivedRequest } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (receivedRequest) return 'pending_received';

    return 'none';
  } catch (error) {
    logError('getFriendshipStatus', error);
    return 'none';
  }
};

export const removeFriend = async (friendId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Delete both directions of the friendship
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

    if (error) {
      logError('removeFriend', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    logError('removeFriend', error);
    return { success: false, error: error.message || 'Failed to remove friend' };
  }
};

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

export const getRecommendations = async (limit = 20): Promise<RecommendedUser[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase.rpc('recommend_friends', {
      p_user_id: user.id,
      p_limit: limit,
    });

    if (error) {
      logError('getRecommendations', error);
      return [];
    }

    return (data || []) as RecommendedUser[];
  } catch (error) {
    logError('getRecommendations', error);
    return [];
  }
};

// ============================================================================
// SEARCH
// ============================================================================

export const searchUsers = async (query: string): Promise<RecommendedUser[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const searchQuery = query.trim();
    if (!searchQuery) return [];

    const { data, error} = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, xp, level, interests')
      .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      .neq('id', user.id)
      .eq('is_deleted', false)
      .limit(20);

    if (error) {
      logError('searchUsers', error);
      return [];
    }

    return (data || []) as RecommendedUser[];
  } catch (error) {
    logError('searchUsers', error);
    return [];
  }
};

// ============================================================================
// DIRECT MESSAGES
// ============================================================================

export const findOrCreateDirectChat = async (otherUserId: string): Promise<string> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('find_or_create_direct_chat', {
      p_user_a: user.id,
      p_user_b: otherUserId,
    });

    if (error) throw error;
    return data as string;
  } catch (error) {
    logError('findOrCreateDirectChat', error);
    throw error;
  }
};

export const getDirectMessages = async (chatId: string): Promise<DirectMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender_profile:profiles!sender(id, username, full_name, avatar_url)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      logError('getDirectMessages', error);
      return [];
    }

    return (data || []).map((msg: any) => ({
      ...msg,
      sender_profile: Array.isArray(msg.sender_profile) ? msg.sender_profile[0] : msg.sender_profile,
    })) as DirectMessage[];
  } catch (error) {
    logError('getDirectMessages', error);
    return [];
  }
};

export const sendDirectMessage = async (chatId: string, content: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.from('direct_messages').insert({
      chat_id: chatId,
      sender: user.id,
      content,
    });

    if (error) {
      logError('sendDirectMessage', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    logError('sendDirectMessage', error);
    return { success: false, error: error.message || 'Failed to send message' };
  }
};

// ============================================================================
// BLOCKING
// ============================================================================

export const blockUser = async (
  blockedId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: user.id,
      blocked_id: blockedId,
      reason: reason || null,
    });

    if (error) {
      logError('blockUser', error);
      return { success: false, error: error.message };
    }

    // Remove friendship if exists
    await removeFriend(blockedId);

    return { success: true };
  } catch (error: any) {
    logError('blockUser', error);
    return { success: false, error: error.message || 'Failed to block user' };
  }
};

export const unblockUser = async (blockedId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      logError('unblockUser', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    logError('unblockUser', error);
    return { success: false, error: error.message || 'Failed to unblock user' };
  }
};
