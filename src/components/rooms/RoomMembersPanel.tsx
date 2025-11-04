import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, X, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { useToast } from '../../hooks/useToast';
import { getRoomMembers } from '../../lib/rooms';
import { supabase } from '../../integrations/supabase/client';
import type { RoomMember } from '../../lib/rooms';

interface RoomMembersPanelProps {
  roomId: string;
  isAdmin: boolean;
  currentUserId?: string;
  roomCode?: string;
}

export const RoomMembersPanel: React.FC<RoomMembersPanelProps> = ({
  roomId,
  isAdmin,
  currentUserId,
  roomCode,
}) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
    
    // Subscribe to member changes
    const channel = supabase
      .channel(`room-members-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => loadMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getRoomMembers(roomId);
    setMembers(data);
    setLoading(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!isAdmin || userId === currentUserId) return;

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member removed from room',
      });
    }
  };

  const handleCopyInvite = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    toast({
      title: 'Code Copied!',
      description: `Room code: ${roomCode}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-background/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">
              Members ({members.length})
            </h3>
          </div>
          {isAdmin && roomCode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyInvite}
              className="gap-2"
            >
              <Copy className="w-3 h-3" />
              Code
            </Button>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isMemberAdmin = member.role === 'admin';

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-10 h-10">
                  {member.profile?.avatar_url && (
                    <img
                      src={member.profile.avatar_url}
                      alt={member.profile.username || 'User'}
                    />
                  )}
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {member.profile?.full_name || member.profile?.username || 'Unknown User'}
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground ml-1">(You)</span>
                      )}
                    </p>
                    {isMemberAdmin && (
                      <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  {member.profile?.username && (
                    <p className="text-xs text-muted-foreground truncate">
                      @{member.profile.username}
                    </p>
                  )}
                </div>
              </div>

              {isAdmin && !isCurrentUser && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveMember(member.user_id!)}
                  className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
