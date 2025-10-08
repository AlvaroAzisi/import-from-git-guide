import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserPlus, MessageCircle, Users, X, Check, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { acceptFriendRequest, rejectFriendRequest } from '../lib/friendRequests';
import { useToast } from '../hooks/useToast';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [processingNotification, setProcessingNotification] = useState<string | null>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-primary" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'room_invite':
        return <Users className="w-5 h-5 text-purple-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification.id);
    
    // Navigate based on notification type (don't close panel for friend requests)
    if (notification.type !== 'friend_request') {
      if (notification.type === 'message' && notification.data?.conversation_id) {
        navigate(`/chat/${notification.data.conversation_id}`);
      } else {
        navigate('/temanku');
      }
      setIsOpen(false);
    }
  };

  const handleAcceptFriendRequest = async (notification: any) => {
    const friendshipId = notification.data?.friendship_id;
    
    if (!friendshipId) {
      toast({
        title: 'Error',
        description: 'Invalid friend request',
        variant: 'destructive',
      });
      return;
    }

    setProcessingNotification(notification.id);
    
    try {
      const { error } = await acceptFriendRequest(friendshipId);
      
      if (error) {
        throw new Error(error);
      }

      toast({
        title: 'Success',
        description: 'Friend request accepted!',
      });

      await markAsRead(notification.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept friend request',
        variant: 'destructive',
      });
    } finally {
      setProcessingNotification(null);
    }
  };

  const handleRejectFriendRequest = async (notification: any) => {
    const friendshipId = notification.data?.friendship_id;
    
    if (!friendshipId) {
      toast({
        title: 'Error',
        description: 'Invalid friend request',
        variant: 'destructive',
      });
      return;
    }

    setProcessingNotification(notification.id);
    
    try {
      const { error } = await rejectFriendRequest(friendshipId);
      
      if (error) {
        throw new Error(error);
      }

      toast({
        title: 'Friend request rejected',
      });

      await markAsRead(notification.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject friend request',
        variant: 'destructive',
      });
    } finally {
      setProcessingNotification(null);
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl backdrop-blur-md bg-card/40 border border-border/20 hover:bg-card/60 transition-all"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 md:w-96 max-h-[600px] backdrop-blur-xl bg-card/80 border border-border/30 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/20 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[500px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 transition-colors ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        } ${notification.type !== 'friend_request' ? 'hover:bg-muted/30 cursor-pointer' : ''}`}
                        onClick={() => notification.type !== 'friend_request' && handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm mb-1">
                              {notification.title}
                            </p>
                            {notification.content && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.content}
                              </p>
                            )}
                            
                            {/* Friend Request Actions */}
                            {notification.type === 'friend_request' && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleAcceptFriendRequest(notification)}
                                  disabled={processingNotification === notification.id}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                  {processingNotification === notification.id ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectFriendRequest(notification)}
                                  disabled={processingNotification === notification.id}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all disabled:opacity-50"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Decline
                                </button>
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.created_at ? new Date(notification.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : 'Just now'}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
