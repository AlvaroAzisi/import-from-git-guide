import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RoomInterface } from '../../components/rooms/RoomInterface';
import { RoomManager } from '../../lib/roomManager';
import type { Room } from '../../types/room';

const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;
      
      const { room: roomData, error } = await RoomManager.getRoomDetails(id);
      
      if (error || !roomData) {
        console.error('Error fetching room:', error);
        setLoading(false);
        return;
      }
      
      setRoom(roomData as Room);
      setLoading(false);
    };

    fetchRoom();
  }, [id]);

  const handleLeave = async () => {
    if (!id) return;
    
    const { success } = await RoomManager.leaveRoom(id);
    if (success) {
      navigate('/rooms');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-foreground">Room not found</p>
          <button 
            onClick={() => navigate('/rooms')}
            className="text-primary hover:underline"
          >
            Back to rooms
          </button>
        </div>
      </div>
    );
  }

  return <RoomInterface room={room} onLeave={handleLeave} />;
};

export default RoomDetailPage;
