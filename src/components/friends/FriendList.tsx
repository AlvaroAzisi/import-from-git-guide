import React from 'react';

const FriendList: React.FC = () => {
  const friends = [
    { id: '1', username: 'friend1' },
    { id: '2', username: 'friend2' },
    { id: '3', username: 'friend3' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-4">
      <h2 className="text-xl font-bold mb-4">Friends ({friends.length})</h2>
      <ul>
        {friends.map(friend => (
          <li key={friend.id} className="flex items-center space-x-4 mb-2">
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={`https://i.pravatar.cc/150?u=${friend.id}`}
              alt={friend.username}
            />
            <span>{friend.username}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendList;
