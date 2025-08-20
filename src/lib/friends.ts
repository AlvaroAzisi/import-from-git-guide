import { supabase } from './supabase';
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

export const sendFriendRequest = async (targetUserId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    if (user.id === targetUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('user_relationships')
      .select('id, status')
      .or(`and(user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},target_user_id.eq.${user.id})`)
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        throw new Error('Friend request already sent');
      } else if (existing.status === 'accepted') {
        throw new Error('Already friends');
      }
    }

    const { error } = await supabase
      .from('user_relationships')
      .insert({
        user_id: user.id,
        target_user_id: targetUserId,
        created_by: user.id,
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
      .from('user_relationships')
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
      .from('user_relationships')
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
      .from('user_relationships')
      .select(`
        target_user_id,
        target_profile:profiles!target_user_id(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error) throw error;

    return (data || []).map(item => item.target_profile).filter(Boolean) as unknown as UserProfile[];
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
      .from('user_relationships')
      .select(`
        *,
        user_profile:profiles!user_id(*),
        target_profile:profiles!target_user_id(*)
      `)
      .eq('target_user_id', user.id)
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
      .from('user_relationships')
      .delete()
      .or(`and(user_id.eq.${user.id},target_user_id.eq.${friendId}),and(user_id.eq.${friendId},target_user_id.eq.${user.id})`);

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
      .from('user_relationships')
      .select('status')
      .or(`and(user_id.eq.${user.id},target_user_id.eq.${userId}),and(user_id.eq.${userId},target_user_id.eq.${user.id})`)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.status || 'none';
  } catch (error) {
    console.error('Get friendship status error:', error);
    return 'none';
  }
};