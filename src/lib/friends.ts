import { supabase } from './supabase';
import type { UserProfile } from './auth';

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  user_profile?: UserProfile;
  friend_profile?: UserProfile;
}

export const sendFriendRequest = async (friendId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (user.id === friendId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(from_user.eq.${user.id},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        throw new Error('Friend request already sent');
      } else if (existing.status === 'accepted') {
        throw new Error('Already friends');
      }
    }

    const { error } = await supabase
      .from('friends')
      .insert({
        from_user: user.id,
        to_user: friendId,
        status: 'pending'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Send friend request error:', error);
    throw error;
  }
};

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

export const rejectFriendRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Reject friend request error:', error);
    return false;
  }
};

export const getFriends = async (): Promise<UserProfile[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friends')
      .select(`
        to_user,
        friend_profile:profiles!to_user(*)
      `)
      .eq('from_user', user.id)
      .eq('status', 'accepted');

    if (error) throw error;

    return (data || []).map(item => item.friend_profile).filter(Boolean) as unknown as UserProfile[];
  } catch (error) {
    console.error('Get friends error:', error);
    return [];
  }
};

export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        user_profile:profiles!from_user(*),
        friend_profile:profiles!to_user(*)
      `)
      .eq('to_user', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get friend requests error:', error);
    return [];
  }
};

export const removeFriend = async (friendId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(from_user.eq.${user.id},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${user.id})`);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Remove friend error:', error);
    return false;
  }
};

export const getFriendshipStatus = async (userId: string): Promise<'none' | 'pending' | 'accepted' | 'blocked'> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === userId) return 'none';

    const { data, error } = await supabase
      .from('friends')
      .select('status')
      .or(`and(from_user.eq.${user.id},to_user.eq.${userId}),and(from_user.eq.${userId},to_user.eq.${user.id})`)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.status || 'none';
  } catch (error) {
    console.error('Get friendship status error:', error);
    return 'none';
  }
};