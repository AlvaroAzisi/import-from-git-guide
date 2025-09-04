import { useState, useEffect } from 'react';
import { getRoomMemberCount } from '../lib/api';

interface RoomMemberCounterProps {
  roomId: string;
}

const RoomMemberCounter: React.FC<RoomMemberCounterProps> = ({ roomId }) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      const memberCount = await getRoomMemberCount(roomId);
      setCount(memberCount);
    };
    fetchCount();
  }, [roomId]);

  return <p className="text-gray-600">Members: {count}</p>;
};

export default RoomMemberCounter;