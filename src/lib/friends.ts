import { supabase } from '../integrations/supabase/client';
import type { UserProfile } from './auth';

export interface Friend extends UserProfile {
  friendship_created_at: string;
}

// Get all accepted friends for current user
export const getFriends = async (): Promise<Friend[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    // Get friends where current user is from_user
    const { data: friendsAsFrom, error: error1 } = await supabase
      .from('friends')
      .select(`
        created_at,
        to_profile:profiles!friends_to_user_fkey(
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
      .eq('from_user', user.id)
      .eq('status', 'accepted');

    // Get friends where current user is to_user
    const { data: friendsAsTo, error: error2 } = await supabase
      .from('friends')
      .select(`
        created_at,
        from_profile:profiles!friends_from_user_fkey(
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
      .eq('to_user', user.id)
      .eq('status', 'accepted');

    if (error1 || error2) {
      console.error('Error fetching friends:', error1 || error2);
      return [];
    }

    const friends: Friend[] = [
      ...(friendsAsFrom || []).map((item: any) => ({
        ...(item.to_profile || {}),
        friendship_created_at: item.created_at,
      })),
      ...(friendsAsTo || []).map((item: any) => ({
        ...(item.from_profile || {}),
        friendship_created_at: item.created_at,
      })),
    ].filter(f => f.id); // Filter out any null profiles

    return friends;
  } catch (error) {
    console.error('Error in getFriends:', error);
    return [];
  }
};

// Get friendship status between current user and another user
export const getFriendshipStatus = async (userId: string): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return 'none';
    if (user.id === userId) return 'none';

    // Check both directions
    const { data: status1 } = await supabase
      .from('friends')
      .select('status')
      .eq('from_user', user.id)
      .eq('to_user', userId)
      .maybeSingle();

    if (status1?.status) return status1.status;

    const { data: status2 } = await supabase
      .from('friends')
      .select('status')
      .eq('from_user', userId)
      .eq('to_user', user.id)
      .maybeSingle();

    if (status2?.status) return status2.status;

    return 'none';
  } catch (error) {
    console.error('Error in getFriendshipStatus:', error);
    return 'none';
  }
};

// Send a friend request
export const sendFriendRequest = async (toUserId: string) => {
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
    
    if (status === 'accepted') {
      throw new Error('Already friends');
    }
    
    if (status === 'pending') {
      throw new Error('Friend request already sent');
    }

    // Send friend request
    const { data, error } = await supabase
      .from('friends')
      .insert({
        from_user: user.id,
        to_user: toUserId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for the recipient
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (data?.id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: toUserId,
          type: 'friend_request',
          title: 'New Friend Request',
          content: `${profile?.full_name || 'Someone'} sent you a friend request`,
          data: { from_user_id: user.id, friendship_id: data.id },
        });
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in sendFriendRequest:', error);
    throw error;
  }
};

// Remove a friend
export const removeFriend = async (friendId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    // Delete friendship in both directions
    await supabase
      .from('friends')
      .delete()
      .or(`and(from_user.eq.${user.id},to_user.eq.${friendId}),and(from_user.eq.${friendId},to_user.eq.${user.id})`);

    return true;
  } catch (error) {
    console.error('Error in removeFriend:', error);
    return false;
  }
};
