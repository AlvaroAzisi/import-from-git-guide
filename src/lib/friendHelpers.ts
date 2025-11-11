import { supabase } from '../integrations/supabase/client';

export interface FriendRequest {
  id: string;
  requester: string;
  recipient: string;
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
  id: number;
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
export async function sendFriendRequest(senderId: string, receiverId: string) {
  try {
    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('requester', senderId)
      .eq('recipient', receiverId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return { data: null, error: new Error('Friend request already sent') };
    }

    // Check if already friends (using old schema)
    const { data: existingFriend } = await supabase
      .from('friends')
      .select('*')
      .or(`and(from_user.eq.${senderId},to_user.eq.${receiverId}),and(from_user.eq.${receiverId},to_user.eq.${senderId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (existingFriend) {
      return { data: null, error: new Error('Already friends') };
    }

    const { data, error } = await supabase
      .from('friend_requests')
      .insert([{ requester: senderId, recipient: receiverId }])
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
 */
export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'decline',
  currentUserId: string
) {
  try {
    const status = action === 'accept' ? 'accepted' : 'declined';

    // Update friend request status
    const { data: request, error: updateError } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', requestId)
      .eq('recipient', currentUserId)
      .select()
      .single();

    if (updateError) {
      return { data: null, error: updateError };
    }

    // If accepted, create mutual friendship using old friends schema
    if (action === 'accept' && request) {
      await createFriendPair(request.requester, request.recipient);
    }

    return { data: request, error: null };
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return { data: null, error };
  }
}

/**
 * Create mutual friendship between two users (using old friends schema)
 */
export async function createFriendPair(userId: string, friendId: string) {
  try {
    const { error } = await supabase.from('friends').insert([
      { from_user: userId, to_user: friendId, status: 'accepted' },
      { from_user: friendId, to_user: userId, status: 'accepted' },
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
        sender:requester (
          id,
          username,
          full_name,
          avatar_url,
          xp,
          interests
        )
      `
      )
      .eq('recipient', userId)
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
 * Get all friends for current user (using old friends schema)
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  try {
    const { data, error } = await supabase
      .from('friends')
      .select(
        `
        *,
        friend:to_user (
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
      .eq('from_user', userId)
      .eq('status', 'accepted')
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
 * Check friendship status between two users (using old friends schema)
 */
export async function getFriendshipStatus(
  userId: string,
  otherUserId: string
): Promise<'none' | 'pending_sent' | 'pending_received' | 'friends'> {
  try {
    // Check if friends (using old schema)
    const { data: friendData } = await supabase
      .from('friends')
      .select('*')
      .or(`and(from_user.eq.${userId},to_user.eq.${otherUserId}),and(from_user.eq.${otherUserId},to_user.eq.${userId})`)
      .eq('status', 'accepted')
      .maybeSingle();

    if (friendData) return 'friends';

    // Check for pending request sent by current user
    const { data: sentRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('requester', userId)
      .eq('recipient', otherUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (sentRequest) return 'pending_sent';

    // Check for pending request received by current user
    const { data: receivedRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('requester', otherUserId)
      .eq('recipient', userId)
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
 * Remove a friend (using old friends schema)
 */
export async function removeFriend(userId: string, friendId: string) {
  try {
    // Remove both directions of friendship
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(from_user.eq.${userId},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${userId})`);

    if (error) throw error;
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
