import React, { useState, useEffect } from 'react';
import { getFriends, removeFriend, type Friendship } from '../../lib/friends';
import { useToast } from '../../hooks/useToast';

const FriendList: React.FC = () => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const fetchedFriends = await getFriends();
        setFriends(fetchedFriends);
      } catch (error) {
        console.error('Error fetching friends:', error);
        toast({ title: 'Error', description: 'Failed to load friends.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, []);

  const handleRemoveFriend = async (friendId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      const { success } = await removeFriend(friendId);
      if (success) {
        setFriends(friends.filter(f => f.friend_id !== friendId));
        toast({ title: 'Success', description: 'Friend removed.' });
      } else {
        toast({ title: 'Error', description: 'Failed to remove friend.', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return <div>Loading friends...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
      <h2 className="text-xl font-bold mb-4">Friends ({friends.length})</h2>
      {friends.length === 0 ? (
        <p>No friends yet. Send some friend requests!</p>
      ) : (
        <ul>
          {friends.map(friend => (
            <li key={friend.id} className="flex items-center justify-between space-x-4 mb-2">
              <div className="flex items-center space-x-4">
                <img
                  className="w-10 h-10 rounded-full object-cover"
                  src={friend.friend_profile?.avatar_url || `https://i.pravatar.cc/150?u=${friend.friend_id}`}
                  alt={friend.friend_profile?.username || 'User'}
                />
                <span>{friend.friend_profile?.username}</span>
              </div>
              <button
                onClick={() => handleRemoveFriend(friend.friend_id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendList;
