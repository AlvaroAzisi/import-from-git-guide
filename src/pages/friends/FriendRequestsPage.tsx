import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Avatar } from '../../components/ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import {
  getPendingRequests,
  respondFriendRequest,
  type FriendRequest,
} from '../../lib/friendHelpers';
import { supabase } from '../../integrations/supabase/client';

export default function FriendRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    loadRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            loadRequests();
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old?.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadRequests = async () => {
    if (!user?.id) return;

    setLoading(true);
    const data = await getPendingRequests(user.id);
    setRequests(data);
    setLoading(false);
  };

  const handleAccept = async (requestId: string, _senderId: string, senderName: string) => {
    if (!user?.id) return;

    setProcessingIds((prev) => new Set(prev).add(requestId));

    const { error } = await respondFriendRequest(requestId, 'accept', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive',
      });
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
      return;
    }

    toast({
      title: `You're now friends with ${senderName} 🎉`,
      description: 'You can now message each other!',
    });

    // Remove from list
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  const handleDecline = async (requestId: string) => {
    if (!user?.id) return;

    setProcessingIds((prev) => new Set(prev).add(requestId));

    const { error } = await respondFriendRequest(requestId, 'decline', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline friend request',
        variant: 'destructive',
      });
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
      return;
    }

    toast({
      title: 'Request declined',
      description: 'The request has been removed',
    });

    // Remove from list
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/temanku')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to TemanKu
        </Button>
        <h1 className="text-3xl font-bold text-foreground mb-2">Friend Requests</h1>
        <p className="text-muted-foreground">
          {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
        </p>
      </div>

      {/* Request list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center bg-card/50 backdrop-blur-sm border-border/50">
          <div className="max-w-sm mx-auto">
            <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No pending requests
            </h3>
            <p className="text-muted-foreground mb-4">
              When someone sends you a friend request, it will appear here
            </p>
            <Button onClick={() => navigate('/temanku')}>Find Friends</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {requests.map((request) => {
              const sender = request.sender!;
              const isProcessing = processingIds.has(request.id);

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="w-16 h-16 border-2 border-border">
                        {sender.avatar_url ? (
                          <img
                            src={sender.avatar_url}
                            alt={sender.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">
                            {sender.full_name[0]}
                          </div>
                        )}
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">
                          {sender.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">@{sender.username}</p>
                        {sender.xp !== undefined && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {sender.xp} XP
                          </p>
                        )}
                        {sender.interests && sender.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {sender.interests.slice(0, 3).map((interest, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs"
                              >
                                {interest}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() =>
                            handleAccept(request.id, sender.id, sender.full_name)
                          }
                          disabled={isProcessing}
                          variant="default"
                          size="sm"
                          className="gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleDecline(request.id)}
                          disabled={isProcessing}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
