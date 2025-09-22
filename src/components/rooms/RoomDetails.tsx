import React from 'react';

interface RoomDetailsProps {
  roomId: string;
}

const RoomDetails: React.FC<RoomDetailsProps> = ({ roomId }) => {
  const room = {
    id: roomId,
    name: 'React Study Group',
    description: 'A group for studying React.',
    owner: 'testuser',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2">{room.name}</h2>
      <p className="text-gray-500 mb-4">Owned by {room.owner}</p>
      <p>{room.description}</p>
    </div>
  );
};

export default RoomDetails;
