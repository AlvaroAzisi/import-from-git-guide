// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

/**
 * Updated to work with user_relationships table (new schema)
 */

export interface FriendRequest {
  id: string;
  user_id: string;
  target_user_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  user_profile?: UserProfile;
  target_profile?: UserProfile;
}

// TODO adapted for new Supabase backend
export const sendFriendRequest = async (targetUserId: string): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (user.id === targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if request already exists - using separate queries to avoid complex OR
    const [existingRequest1, existingRequest2] = await Promise.all([
      supabase
        .from('friends')
        .select('id, status')
        .eq('from_user', user.id)
        .eq('to_user', targetUserId)
        .maybeSingle(),
      supabase
        .from('friends')
        .select('id, status')
        .eq('from_user', targetUserId)
        .eq('to_user', user.id)
        .maybeSingle(),
    ]);

    const existing = existingRequest1.data || existingRequest2.data;

    if (existing) {
      if (existing.status === 'pending') {
        throw new Error('Friend request already sent');
      } else if (existing.status === 'accepted') {
        throw new Error('Already friends');
      }
    }

    const { error } = await supabase.from('friends').insert({
      from_user: user.id,
      to_user: targetUserId,
      status: 'pending',
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Send friend request error:', error);
    throw error;
  }
};

// TODO adapted for new Supabase backend
export const acceptFriendRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Accept friend request error:', error);
    return false;
  }
};

// TODO adapted for new Supabase backend
export const rejectFriendRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('friends').delete().eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Reject friend request error:', error);
    return false;
  }
};

// TODO adapted for new Supabase backend
export const getFriends = async (): Promise<UserProfile[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Get friends using separate queries to avoid complex OR conditions
    const [friendsAsFrom, friendsAsTo] = await Promise.all([
      supabase
        .from('friends')
        .select(
          `
        to_user,
        from_user,
        to_profile:profiles!to_user(*)
      `
        )
        .eq('from_user', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('friends')
        .select(
          `
        to_user,
        from_user,
        from_profile:profiles!from_user(*)
      `
        )
        .eq('to_user', user.id)
        .eq('status', 'accepted'),
    ]);

    if (friendsAsFrom.error || friendsAsTo.error) {
      throw friendsAsFrom.error || friendsAsTo.error;
    }

    const data = [
      ...(friendsAsFrom.data || []).map((item) => ({ ...item, friend_profile: item.to_profile })),
      ...(friendsAsTo.data || []).map((item) => ({ ...item, friend_profile: item.from_profile })),
    ];

    const friends = data.map((item) => item.friend_profile).filter(Boolean);
    return friends as unknown as UserProfile[];
  } catch (error) {
    console.error('Get friends error:', error);
    return [];
  }
};

// TODO adapted for new Supabase backend
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
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
        user_profile:profiles!from_user(*),
        target_profile:profiles!to_user(*)
      `
      )
      .eq('to_user', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((item) => ({
      ...item,
      user_id: item.from_user,
      target_user_id: item.to_user,
    })) as FriendRequest[];
  } catch (error) {
    console.error('Get friend requests error:', error);
    return [];
  }
};

// TODO adapted for new Supabase backend
export const removeFriend = async (friendId: string): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Remove friendship using separate queries to avoid complex OR
    const [delete1, delete2] = await Promise.all([
      supabase.from('friends').delete().eq('from_user', user.id).eq('to_user', friendId),
      supabase.from('friends').delete().eq('from_user', friendId).eq('to_user', user.id),
    ]);

    if (delete1.error && delete2.error) {
      throw delete1.error || delete2.error;
    }
    return true;
  } catch (error) {
    console.error('Remove friend error:', error);
    return false;
  }
};

// TODO adapted for new Supabase backend
export const getFriendshipStatus = async (
  userId: string
): Promise<'none' | 'pending' | 'accepted' | 'blocked'> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id === userId) return 'none';

    // Check friendship status using separate queries to avoid complex OR
    const [status1, status2] = await Promise.all([
      supabase
        .from('friends')
        .select('status')
        .eq('from_user', user.id)
        .eq('to_user', userId)
        .maybeSingle(),
      supabase
        .from('friends')
        .select('status')
        .eq('from_user', userId)
        .eq('to_user', user.id)
        .maybeSingle(),
    ]);

    if (status1.error && status1.error.code !== 'PGRST116') throw status1.error;
    if (status2.error && status2.error.code !== 'PGRST116') throw status2.error;

    const data = status1.data || status2.data;
    return (data?.status as 'none' | 'pending' | 'accepted' | 'blocked') || 'none';
  } catch (error) {
    console.error('Get friendship status error:', error);
    return 'none';
  }
};
