import React from 'react';
import { Link } from 'react-router-dom';

const RoomList: React.FC = () => {
  const rooms = [
    { id: '1', name: 'React Study Group', description: 'A group for studying React.', memberCount: 12 },
    { id: '2', name: 'TypeScript Enthusiasts', description: 'Diving deep into TypeScript.', memberCount: 8 },
    { id: '3', name: 'Vite Fan Club', description: 'Everything about Vite.', memberCount: 23 },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Public Rooms</h2>
      <ul>
        {rooms.map(room => (
          <li key={room.id} className="mb-4 p-4 border rounded-lg">
            <Link to={`/rooms/${room.id}`}>
              <h3 className="font-bold">{room.name}</h3>
              <p>{room.description}</p>
              <p className="text-sm text-gray-500">{room.memberCount} members</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RoomList;
