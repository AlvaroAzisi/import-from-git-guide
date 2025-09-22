import React from 'react';

const FriendRequestList: React.FC = () => {
  const requests = [
    { id: '1', username: 'user4' },
    { id: '2', username: 'user5' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Friend Requests ({requests.length})</h2>
      <ul>
        {requests.map(request => (
          <li key={request.id} className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <img
                className="w-10 h-10 rounded-full object-cover"
                src={`https://i.pravatar.cc/150?u=${request.id}`}
                alt={request.username}
              />
              <span>{request.username}</span>
            </div>
            <div>
              <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded mr-2">Accept</button>
              <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendRequestList;
