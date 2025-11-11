import React from 'react';
import { motion } from 'framer-motion';
import { User, MessageCircle, UserPlus, Clock, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Avatar } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';

export interface UserCardProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio?: string | null;
  xp?: number | null;
  level?: number | null;
  interests?: string[] | null;
}

interface UserCardProps {
  profile: UserCardProfile;
  relationshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  onAdd?: (userId: string) => void;
  onAccept?: (userId: string) => void;
  onDecline?: (userId: string) => void;
  showMessageButton?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  profile,
  relationshipStatus,
  onAdd,
  onAccept,
  onDecline,
  showMessageButton = true,
}) => {
  const navigate = useNavigate();

  const handleMessage = () => {
    navigate(`/chat/@${profile.username}`);
  };

  const renderActionButton = () => {
    switch (relationshipStatus) {
      case 'friends':
        return showMessageButton ? (
          <Button
            onClick={handleMessage}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </Button>
        ) : null;

      case 'pending_sent':
        return (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Clock className="w-4 h-4" />
            Pending
          </Button>
        );

      case 'pending_received':
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => onAccept?.(profile.id)}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Accept
            </Button>
            <Button
              onClick={() => onDecline?.(profile.id)}
              variant="outline"
              size="sm"
            >
              Decline
            </Button>
          </div>
        );

      case 'none':
      default:
        return (
          <Button
            onClick={() => onAdd?.(profile.id)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </Button>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="w-14 h-14 border-2 border-border">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {profile.full_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  @{profile.username}
                </p>
              </div>
              {profile.xp !== undefined && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                  <span>{profile.xp} XP</span>
                </div>
              )}
            </div>

            {/* Bio or interests */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {profile.bio}
              </p>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.interests.slice(0, 3).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs"
                  >
                    {interest}
                  </span>
                ))}
                {profile.interests.length > 3 && (
                  <span className="px-2 py-1 text-muted-foreground text-xs">
                    +{profile.interests.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Action button */}
            <div className="mt-3">{renderActionButton()}</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
