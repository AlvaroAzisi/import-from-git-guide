// TODO adapted for new Supabase backend
import { useState, useEffect } from 'react';
import { getPublicRooms, Room } from '../lib/api';

const RoomList = () => {
  const [rooms, setRooms] = useState<Room[]>([]);

  // TODO adapted for new Supabase backend
  useEffect(() => {
    const fetchRooms = async () => {
      const roomsData = await getPublicRooms();
      setRooms(roomsData);
    };
    fetchRooms();
  }, []);

  return (
    <div className="p-4">
      {rooms.map((room) => (
        <div key={room.id} className="border p-4 mb-4 rounded">
          <h2 className="text-xl font-bold">{room.name}</h2>
          <p className="text-gray-600">{room.description || 'No description'}</p>
          <p>Members: {room.member_count || 0}</p>
          <p className="text-sm text-gray-500">Subject: {room.subject || 'General'}</p>
        </div>
      ))}
    </div>
  );
};

export default RoomList;
