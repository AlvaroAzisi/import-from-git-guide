import React, { useState, useEffect } from 'react';
import { RoomManager } from '../../lib/roomManager';
import type { Room } from '../../types/room';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface RoomDetailsProps {
  roomId: string;
}

const RoomDetails: React.FC<RoomDetailsProps> = ({ roomId }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomDetails = async () => {
      setLoading(true);
      const { room, userIsMember, error } = await RoomManager.getRoomDetails(roomId);

      if (error) {
        console.error('Error fetching room details:', error);
      } else if (room) {
        setRoom(room as Room);
        setIsMember(userIsMember || false);
      }
      setLoading(false);
    };

    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId]);

  const handleLeaveRoom = async () => {
    const { success, error } = await RoomManager.leaveRoom(roomId);
    if (success) {
      toast({ title: 'Success', description: 'You have left the room.' });
      navigate('/rooms');
    } else {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  };

  const handleDeleteRoom = async () => {
    const { success, error } = await RoomManager.deleteRoom(roomId);
    if (success) {
      toast({ title: 'Success', description: 'The room has been deleted.' });
      navigate('/rooms');
    } else {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div>Loading room details...</div>;
  }

  if (!room) {
    return <div>Room not found.</div>;
  }

  const isOwner = user && room && user.id === room.created_by;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2">{room.name}</h2>
          <p>{room.description}</p>
        </div>
        <div className="flex flex-col space-y-2">
          {isMember && !isOwner && (
            <button
              onClick={handleLeaveRoom}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Leave Room
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDeleteRoom}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Delete Room
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomDetails;
