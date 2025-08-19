import { supabase } from './supabase';

export interface FriendRequest {
  id: string;
  from_user: string;
  to_user: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  from_profile?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

/**
 * Fetch friend requests with proper joins for your schema
 */
export const fetchFriendRequests = async (): Promise<{ data: FriendRequest[]; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: 'Not authenticated' };
    }

    console.log('[NotificationBell] Fetching friend requests for user:', user.id);

    // First, get pending friend requests
    const { data: friendRequests, error: friendsError } = await supabase
      .from('friends')
      .select('*')
      .eq('to_user', user.id)
      .eq('status', 'pending');

    if (friendsError) {
      console.error('[NotificationBell] Error fetching friend requests:', friendsError);
      throw friendsError;
    }

    if (!friendRequests || friendRequests.length === 0) {
      console.log('[NotificationBell] No pending friend requests found');
      return { data: [], error: null };
    }

    // Then, get profile information for each from_user
    const fromUserIds = friendRequests.map(req => req.from_user);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', fromUserIds);

    if (profilesError) {
      console.error('[NotificationBell] Error fetching profiles:', profilesError);
      // Don't throw here - we can still show requests without profile info
    }

    // Combine the data
    const requestsWithProfiles = friendRequests.map(request => ({
      ...request,
      from_profile: profiles?.find(profile => profile.id === request.from_user)
    }));

    console.log('[NotificationBell] Found', requestsWithProfiles.length, 'friend requests');
    return { data: requestsWithProfiles, error: null };

  } catch (error: any) {
    console.error('[NotificationBell] Error fetching friend requests:', error);
    return { data: [], error: error.message };
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (requestId: string): Promise<{ error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('to_user', user.id); // Ensure user can only accept requests sent to them

    if (error) throw error;
    
    console.log('[NotificationBell] Friend request accepted');
    return { error: null };

  } catch (error: any) {
    console.error('[NotificationBell] Error accepting friend request:', error);
    return { error: error.message };
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (requestId: string): Promise<{ error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'rejected' })
      .eq('id', requestId)
      .eq('to_user', user.id); // Ensure user can only reject requests sent to them

    if (error) throw error;
    
    console.log('[NotificationBell] Friend request rejected');
    return { error: null };

  } catch (error: any) {
    console.error('[NotificationBell] Error rejecting friend request:', error);
    return { error: error.message };
  }
};

/**
 * Get user's friends list
 */
export const getFriends = async (): Promise<{ data: any[]; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: [], error: 'Not authenticated' };
    }

    // Get accepted friendships where user is either from_user or to_user
    const { data: friendships, error: friendsError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(from_user.eq.${user.id},status.eq.accepted),and(to_user.eq.${user.id},status.eq.accepted)`);

    if (friendsError) throw friendsError;

    if (!friendships || friendships.length === 0) {
      return { data: [], error: null };
    }

    // Get the friend user IDs (the other user in each friendship)
    const friendIds = friendships.map(friendship => 
      friendship.from_user === user.id ? friendship.to_user : friendship.from_user
    );

    // Get profile information for friends
    const { data: friendProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, status, last_seen_at')
      .in('id', friendIds);

    if (profilesError) throw profilesError;

    return { data: friendProfiles || [], error: null };

  } catch (error: any) {
    console.error('[NotificationBell] Error getting friends:', error);
    return { data: [], error: error.message };
  }
};
