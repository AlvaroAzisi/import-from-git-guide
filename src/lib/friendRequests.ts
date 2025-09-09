// TODO adapted for new Supabase backend - friend requests functionality disabled
// This file used 'user_relationships' table which doesn't exist in simplified schema

export interface FriendRequest {
  id: string;
  user_id: string;
  target_user_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  from_profile?: any;
}

// Disabled functions returning empty arrays
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  console.warn('Friend requests functionality temporarily disabled during backend migration');
  return [];
};

export const sendFriendRequest = async (_targetUserId: string): Promise<boolean> => {
  console.warn('Friend requests functionality temporarily disabled during backend migration');
  return false;
};

export const acceptFriendRequest = async (_requestId: string): Promise<boolean> => {
  console.warn('Friend requests functionality temporarily disabled during backend migration');
  return false;
};

export const declineFriendRequest = async (_requestId: string): Promise<boolean> => {
  console.warn('Friend requests functionality temporarily disabled during backend migration');
  return false;
};

export const getMutualFriends = async (_userId: string): Promise<any[]> => {
  console.warn('Mutual friends functionality temporarily disabled during backend migration');
  return [];
};