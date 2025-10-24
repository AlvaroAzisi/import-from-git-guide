import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

export interface Friend extends UserProfile {
  friendship_created_at: string;
}

export interface FriendRequest {
  id: string;
  requester: string;
  recipient: string;
  message?: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  requester_profile?: FriendRequestProfile;
  recipient_profile?: FriendRequestProfile;
}

export interface DirectChat {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  updated_at: string;
}

export interface DirectMessageProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export interface DirectMessage {
  id: string;
  chat_id: string;
  sender: string | null;
  content: string;
  created_at: string | null;
  sender_profile?: DirectMessageProfile | null;
}

export interface FriendRequestProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[] | null;
  xp: number | null;
  level: number | null;
}

export interface RecommendedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[];
  last_active_at: string | null;
  xp: number | null;
  level: number | null;
  score: number;
}

// Get all accepted friends for current user
export const getFriends = async (): Promise<Friend[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    // Query friendships table
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        created_at,
        friend:profiles!friendships_friend_id_fkey(
          id,
          username,
          full_name,
          avatar_url,
          email,
          status,
          bio,
          xp,
          level,
          interests
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching friends:', error);
      return [];
    }

    const friends: Friend[] = (data || [])
      .map((item: any) => ({
        ...(item.friend || {}),
        friendship_created_at: item.created_at,
      }))
      .filter(f => f.id);

    return friends;
  } catch (error) {
    console.error('Error in getFriends:', error);
    return [];
  }
};

// Get friendship status between current user and another user
export const getFriendshipStatus = async (userId: string): Promise<'self' | 'friend' | 'request_sent' | 'request_received' | 'none'> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return 'none';
    if (user.id === userId) return 'self';

    // Check all statuses in parallel
    const [friendRes, sentRes, recvRes] = await Promise.all([
      supabase.from('friendships').select('*').eq('user_id', user.id).eq('friend_id', userId).maybeSingle(),
      supabase.from('friend_requests').select('*').eq('requester', user.id).eq('recipient', userId).eq('status', 'pending').maybeSingle(),
      supabase.from('friend_requests').select('*').eq('requester', userId).eq('recipient', user.id).eq('status', 'pending').maybeSingle()
    ]);

    if (friendRes.data) return 'friend';
    if (sentRes.data) return 'request_sent';
    if (recvRes.data) return 'request_received';
    
    return 'none';
  } catch (error) {
    console.error('Error in getFriendshipStatus:', error);
    return 'none';
  }
};

// Send a friend request
export const sendFriendRequest = async (toUserId: string, message?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    if (user.id === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const status = await getFriendshipStatus(toUserId);
    
    if (status === 'friend') {
      throw new Error('Already friends');
    }
    
    if (status === 'request_sent') {
      throw new Error('Friend request already sent');
    }

    // Send friend request using new schema
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        requester: user.id,
        recipient: toUserId,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in sendFriendRequest:', error);
    throw error;
  }
};

// Respond to friend request (accept or decline)
export const respondToFriendRequest = async (requestId: string, accept: boolean) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const status = accept ? 'accepted' : 'declined';
    const { data, error } = await supabase
      .from('friend_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('recipient', user.id)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in respondToFriendRequest:', error);
    throw error;
  }
};

// Get pending friend requests for current user
export const getPendingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        *,
        requester_profile:profiles!friend_requests_requester_fkey(
          id,
          username,
          full_name,
          avatar_url,
          bio,
          interests,
          xp,
          level
        )
      `)
      .eq('recipient', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingFriendRequests:', error);
    return [];
  }
};

// Get user recommendations
export const getRecommendations = async (limit = 20): Promise<RecommendedUser[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    const { data, error } = await supabase.rpc('recommendations_for_user', {
      p_user: user.id,
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    return [];
  }
};

// Find or create direct chat
export const findOrCreateDirectChat = async (otherUserId: string): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.rpc('find_or_create_direct_chat', {
      p_user_a: user.id,
      p_user_b: otherUserId
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error in findOrCreateDirectChat:', error);
    throw error;
  }
};

// Send direct message
export const sendDirectMessage = async (chatId: string, content: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        chat_id: chatId,
        sender: user.id,
        content
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in sendDirectMessage:', error);
    throw error;
  }
};

// Get direct messages for a chat
export const getDirectMessages = async (chatId: string, limit = 50): Promise<DirectMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender_profile:profiles!direct_messages_sender_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).reverse();
  } catch (error) {
    console.error('Error in getDirectMessages:', error);
    return [];
  }
};

// Remove a friend
export const removeFriend = async (friendId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    // Delete friendship (only need to delete one direction, cascade will handle it)
    await supabase
      .from('friendships')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', friendId);

    return true;
  } catch (error) {
    console.error('Error in removeFriend:', error);
    return false;
  }
};
