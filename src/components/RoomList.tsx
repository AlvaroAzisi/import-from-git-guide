import { useState, useEffect } from 'react';
import { getRooms, Room } from '../lib/api';

const RoomList = () => {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const fetchRooms = async () => {
      const roomsData = await getRooms();
      setRooms(roomsData);
    };
    fetchRooms();
  }, []);

  return (
    <div className="p-4">
      {rooms.map(room => (
        <div key={room.id} className="border p-4 mb-4 rounded">
          <h2 className="text-xl font-bold">{room.name}</h2>
          <p>Members: {room.member_count}</p>
        </div>
      ))}
    </div>
  );
};

export default RoomList;