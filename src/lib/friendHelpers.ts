import { supabase } from '../integrations/supabase/client';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string | null;
  created_at: string | null;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    xp?: number | null;
    interests?: string[] | null;
  };
  receiver?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string | null;
    xp?: number;
    level?: number;
    interests?: string[];
  };
}

export interface RecommendedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio?: string | null;
  xp?: number | null;
  level?: number | null;
  interests?: string[] | null;
  score?: number;
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(senderId: string, receiverId: string, message?: string) {
  try {
    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return { data: null, error: new Error('Friend request already sent') };
    }

    // Check if already friends
    const { data: existingFriend } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', senderId)
      .eq('friend_id', receiverId)
      .maybeSingle();

    if (existingFriend) {
      return { data: null, error: new Error('Already friends') };
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{ sender_id: senderId, receiver_id: receiverId, message } as any])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { data: null, error };
  }
}

/**
 * Respond to a friend request (accept or decline)
 * Note: Trigger will automatically create mutual friendships on accept
 */
export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'decline',
  currentUserId: string
) {
  try {
    const status = action === 'accept' ? 'accepted' : 'declined';

    // Update friend request status (trigger handles friendship creation & notifications)
    const { data: request, error: updateError } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', requestId)
      .eq('receiver_id', currentUserId)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: request, error: null };
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return { data: null, error };
  }
}

/**
 * Create mutual friendship between two users (called manually if needed)
 * Note: Usually triggered automatically by friend_request acceptance
 */
export async function createFriendPair(userId: string, friendId: string) {
  try {
    const { error } = await supabase.from('friends').insert([
      { user_id: userId, friend_id: friendId } as any,
      { user_id: friendId, friend_id: userId } as any,
    ]);

    if (error) {
      console.error('Error creating friend pair:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Error creating friend pair:', error);
    return { error };
  }
}

/**
 * Get pending friend requests for current user
 */
export async function getPendingRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .select(
        `
        *,
        sender:sender_id (
          id,
          username,
          full_name,
          avatar_url,
          xp,
          interests
        )
      `
      )
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
}

/**
 * Get all friends for current user
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    const { data, error } = await supabase
      .from('friends')
      .select(
        `
        *,
        friend:friend_id (
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
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any) || [];
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

/**
 * Get recommended friends using RPC function
 */
export async function fetchRecommendedFriends(userId: string): Promise<RecommendedUser[]> {
  try {
    const { data, error } = await supabase.rpc('recommendations_for_user', {
      p_user: userId,
      p_limit: 20,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recommended friends:', error);
    return [];
  }
}

/**
 * Check friendship status between two users
 */
export async function getFriendshipStatus(
  userId: string,
  otherUserId: string
): Promise<'none' | 'pending_sent' | 'pending_received' | 'friends'> {
  try {
    // Check if friends
    const { data: friendData } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', userId)
      .eq('friend_id', otherUserId)
      .maybeSingle();

    if (friendData) return 'friends';

    // Check for pending request sent by current user
    const { data: sentRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', userId)
      .eq('receiver_id', otherUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (sentRequest) return 'pending_sent';

    // Check for pending request received by current user
    const { data: receivedRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (receivedRequest) return 'pending_received';

    return 'none';
  } catch (error) {
    console.error('Error checking friendship status:', error);
    return 'none';
  }
}

/**
 * Remove a friend (both directions)
 */
export async function removeFriend(userId: string, friendId: string) {
  try {
    // Remove both directions of friendship
    await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId);

    await supabase
      .from('friends')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId);

    return { error: null };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { error };
  }
}

/**
 * Search users by username or interests
 */
export async function searchUsers(
  query: string,
  currentUserId: string
): Promise<RecommendedUser[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio, xp, level, interests')
      .neq('id', currentUserId)
      .eq('is_deleted', false)
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}
