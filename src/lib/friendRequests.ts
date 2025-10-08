import { supabase } from '../integrations/supabase/client';

export interface FriendRequest {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

// Get pending friend requests for current user
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        from_user,
        to_user,
        status,
        created_at,
        sender:profiles!friends_from_user_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('to_user', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }

    return (data || []).map((req: any) => ({
      ...req,
      sender: Array.isArray(req.sender) ? req.sender[0] : req.sender,
    }));
  } catch (error) {
    console.error('Error in getFriendRequests:', error);
    return [];
  }
};

// Send a friend request
export const sendFriendRequest = async (toUserId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    if (user.id === toUserId) {
      return { data: null, error: 'Cannot send friend request to yourself' };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(from_user.eq.${user.id},to_user.eq.${toUserId}),and(from_user.eq.${toUserId},to_user.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { data: null, error: 'Already friends' };
      }
      return { data: null, error: 'Friend request already sent' };
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

    if (error) {
      console.error('Error sending friend request:', error);
      return { data: null, error: error.message };
    }

    // Create notification for the recipient
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await supabase
      .from('notifications')
      .insert([{
        user_id: toUserId,
        type: 'friend_request',
        title: 'New Friend Request',
        content: `${profile?.full_name || 'Someone'} sent you a friend request`,
        data: { from_user_id: user.id, friendship_id: data.id },
      }]);

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in sendFriendRequest:', error);
    return { data: null, error: error.message };
  }
};

// Accept a friend request
export const acceptFriendRequest = async (friendshipId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Update friendship status to accepted
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .eq('to_user', user.id) // Ensure user is the recipient
      .select()
      .single();

    if (error) {
      console.error('Error accepting friend request:', error);
      return { data: null, error: error.message };
    }

    // Get friendship details to create notification
    if (data) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Notify the requester that their request was accepted
      await supabase
        .from('notifications')
        .insert([{
          user_id: data.from_user || '',
          type: 'system' as const,
          title: 'Friend Request Accepted',
          content: `${profile?.full_name || 'Someone'} accepted your friend request`,
          data: { accepted_by: user.id },
        }]);
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in acceptFriendRequest:', error);
    return { data: null, error: error.message };
  }
};

// Reject a friend request
export const rejectFriendRequest = async (friendshipId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId)
      .eq('to_user', user.id); // Ensure user is the recipient

    if (error) {
      console.error('Error rejecting friend request:', error);
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (error: any) {
    console.error('Error in rejectFriendRequest:', error);
    return { data: null, error: error.message };
  }
};
