import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Settings, LogOut, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar } from '../ui/avatar';
import { useToast } from '../../hooks/useToast';
import type { Room } from '../../types/room';

interface RoomInfoCardProps {
  room: Room;
  isAdmin: boolean;
  onSettings: () => void;
  onLeave: () => void;
  creatorName?: string;
  creatorAvatar?: string;
}

export const RoomInfoCard: React.FC<RoomInfoCardProps> = ({
  room,
  isAdmin,
  onSettings,
  onLeave,
  creatorName,
  creatorAvatar,
}) => {
  const { toast } = useToast();

  const handleInvite = () => {
    const inviteLink = `${window.location.origin}/ruangku/${room.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: 'Invite Link Copied!',
      description: 'Share this link with your study partners',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return 'Created yesterday';
    if (diffDays < 7) return `Created ${diffDays} days ago`;
    if (diffDays < 30) return `Created ${Math.floor(diffDays / 7)} weeks ago`;
    return `Created ${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-lg"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <h1 className="text-3xl font-bold text-foreground">{room.name}</h1>
            {room.subject && (
              <Badge variant="secondary" className="mt-1">
                {room.subject}
              </Badge>
            )}
          </div>

          {room.description && (
            <p className="text-muted-foreground leading-relaxed">{room.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {creatorName && (
              <div className="flex items-center gap-2">
                {creatorAvatar && (
                  <Avatar className="w-6 h-6">
                    <img src={creatorAvatar} alt={creatorName} />
                  </Avatar>
                )}
                <span>Created by {creatorName}</span>
              </div>
            )}
            {room.created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(room.created_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleInvite}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Invite
          </Button>

          {isAdmin ? (
            <Button
              onClick={onSettings}
              variant="default"
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Room Settings
            </Button>
          ) : (
            <Button
              onClick={onLeave}
              variant="destructive"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Leave Room
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
