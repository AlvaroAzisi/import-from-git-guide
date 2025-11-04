import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RoomInfoCard } from '../../components/rooms/RoomInfoCard';
import { RoomChat } from '../../components/rooms/RoomChat';
import { RoomMembersPanel } from '../../components/rooms/RoomMembersPanel';
import { RoomSettingsPanel } from '../../components/rooms/RoomSettingsPanel';
import { getRoom, isRoomMember, leaveRoom } from '../../lib/rooms';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import type { Room } from '../../types/room';
import { supabase } from '../../integrations/supabase/client';

const RoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    loadRoomData();
  }, [id]);

  const loadRoomData = async () => {
    if (!id) return;

    setLoading(true);

    // Check if user is member
    const memberStatus = await isRoomMember(id);
    setIsMember(memberStatus);

    if (!memberStatus) {
      setLoading(false);
      return;
    }

    // Fetch room data
    const roomData = await getRoom(id);
    if (!roomData) {
      setLoading(false);
      return;
    }

    setRoom(roomData);

    // Fetch creator profile
    if (roomData.created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', roomData.created_by)
        .single();
      
      setCreatorProfile(profile);
    }

    // Check if current user is admin
    if (user?.id) {
      const { data: memberData } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', id)
        .eq('user_id', user.id)
        .single();

      setIsAdmin(memberData?.role === 'admin');
    }

    setLoading(false);
  };

  const handleLeave = async () => {
    if (!id || !user?.id) return;

    const confirmed = window.confirm('Are you sure you want to leave this room?');
    if (!confirmed) return;

    await leaveRoom(id);
    toast({
      title: 'Left Room',
      description: 'You have left the study room',
    });
    navigate('/home');
  };

  const handleRoomUpdate = (updates: Partial<Room>) => {
    if (room) {
      setRoom({ ...room, ...updates });
    }
  };

  const handleRoomDelete = () => {
    toast({
      title: 'Room Deleted',
      description: 'The study room has been deleted',
    });
    navigate('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading room...</p>
        </motion.div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-md mx-auto p-6"
        >
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You need to be a member of this room to view its content.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="text-primary hover:underline"
          >
            Go back to home
          </button>
        </motion.div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-xl font-semibold text-foreground">Room not found</p>
          <button
            onClick={() => navigate('/home')}
            className="text-primary hover:underline"
          >
            Go back to home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Room Info Header */}
        <RoomInfoCard
          room={room}
          isAdmin={isAdmin}
          onSettings={() => setShowSettings(true)}
          onLeave={handleLeave}
          creatorName={creatorProfile?.full_name || creatorProfile?.username}
          creatorAvatar={creatorProfile?.avatar_url}
        />

        {/* Main Content: Chat + Members */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-250px)]">
          {/* Chat Area */}
          <RoomChat roomId={room.id} />

          {/* Members Panel */}
          <div className="lg:block hidden">
            <RoomMembersPanel
              roomId={room.id}
              isAdmin={isAdmin}
              currentUserId={user?.id}
              roomCode={room.short_code || undefined}
            />
          </div>
        </div>

        {/* Mobile Members - Collapsible */}
        <div className="lg:hidden">
          <RoomMembersPanel
            roomId={room.id}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            roomCode={room.short_code || undefined}
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <RoomSettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          room={room}
          onUpdate={handleRoomUpdate}
          onDelete={handleRoomDelete}
        />
      )}
    </div>
  );
};

export default RoomDetailPage;
