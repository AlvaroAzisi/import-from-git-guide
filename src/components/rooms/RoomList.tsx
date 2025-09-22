import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../integrations/supabase/client';
import type { Room } from '../../types/room';

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_public', true)
        .limit(20);

      if (error) {
        console.error('Error fetching rooms:', error);
      } else {
        setRooms(data as Room[]);
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  if (loading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Public Rooms</h2>
      <ul>
        {rooms.map(room => (
          <li key={room.id} className="mb-4 p-4 border rounded-lg">
            <Link to={`/rooms/${room.id}`}>
              <h3 className="font-bold">{room.name}</h3>
              <p>{room.description}</p>
              {/* <p className="text-sm text-gray-500">{room.memberCount} members</p> */}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RoomList;
