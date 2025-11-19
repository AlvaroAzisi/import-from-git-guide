import React, { useState, useEffect } from 'react';
import { getPendingFriendRequests, respondToFriendRequest, type FriendRequest } from '../../lib/friends';
import { useToast } from '../../hooks/useToast';

const FriendRequestList: React.FC = () => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const fetchedRequests = await getPendingFriendRequests();
      setRequests(fetchedRequests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({ title: 'Error', description: 'Failed to load friend requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    const { success } = await respondToFriendRequest(requestId, true);
    if (success) {
      toast({ title: 'Success', description: 'Friend request accepted.' });
      fetchRequests();
    } else {
      toast({ title: 'Error', description: 'Failed to accept request.', variant: 'destructive' });
    }
  };

  const handleReject = async (requestId: string) => {
    const { success } = await respondToFriendRequest(requestId, false);
    if (success) {
      toast({ title: 'Success', description: 'Friend request rejected.' });
      fetchRequests();
    } else {
      toast({ title: 'Error', description: 'Failed to reject request.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div>Loading friend requests...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Friend Requests ({requests.length})</h2>
      {requests.length === 0 ? (
        <p>No new friend requests.</p>
      ) : (
        <ul>
          {requests.map(request => (
            <li key={request.id} className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <img
                  className="w-10 h-10 rounded-full object-cover"
                  src={request.sender?.avatar_url || `https://i.pravatar.cc/150?u=${request.from_user}`}
                  alt={request.sender?.username}
                />
                <span>{request.sender?.username || 'Unknown'}</span>
              </div>
              <div>
                <button
                  onClick={() => handleAccept(request.id)}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2 text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(request.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendRequestList;
