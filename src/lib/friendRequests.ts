// TODO: Disabled – depends on old schema (friend_requests)
export interface FriendRequest {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  created_at: string;
}

// Placeholder functions - disabled
export const getFriendRequests = async () => {
  return [];
};

export const sendFriendRequest = async (_userId: string) => {
  return { data: null, error: 'Feature disabled' };
};

export const acceptFriendRequest = async (_requestId: string) => {
  return { data: null, error: 'Feature disabled' };
};

export const rejectFriendRequest = async (_requestId: string) => {
  return { data: null, error: 'Feature disabled' };
};
