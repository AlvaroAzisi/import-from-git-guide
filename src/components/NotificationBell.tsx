import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Users, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { Button } from './ui/button';
import { FriendRequest, fetchFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../lib/friendRequests';

interface Notification {
  id: string;
  type: 'friend_request' | 'room_invitation' | 'system';
  title: string;
  message: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string | null;
  room_id?: string;
  room_name?: string;
  created_at: string;
  read: boolean;
}

// Using FriendRequest from friendRequests.ts instead of local interface

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch friend requests
  const loadFriendRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await fetchFriendRequests();
      if (error) throw error;
      setFriendRequests(data || []);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch friend requests',
        variant: 'destructive'
      });
    }
  };

  // Convert friend requests to notifications
  const generateNotifications = () => {
    const friendRequestNotifications: Notification[] = friendRequests.map(request => ({
      id: `friend_request_${request.id}`,
      type: 'friend_request' as const,
      title: 'Friend Request',
      message: `${request.from_profile?.full_name || 'Someone'} sent you a friend request`,
      sender_id: request.from_user,
      sender_name: request.from_profile?.full_name || 'Unknown',
      sender_avatar: request.from_profile?.avatar_url,
      created_at: request.created_at,
      read: false
    }));

    const allNotifications = [...friendRequestNotifications];
    setNotifications(allNotifications);
    setUnreadCount(allNotifications.filter(n => !n.read).length);
  };

  // Handle friend request response
  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      setLoading(true);
      
      const { error } = await (action === 'accept' 
        ? acceptFriendRequest(requestId)
        : rejectFriendRequest(requestId));

      if (error) throw error;

      // Remove from local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: action === 'accept' ? 'Friend request accepted' : 'Friend request rejected',
        description: action === 'accept' 
          ? 'You are now friends!' 
          : 'Friend request has been rejected.'
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} friend request`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription for friend requests
  useEffect(() => {
    if (!user) return;

    loadFriendRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_relationships',
          filter: `to_user=eq.${user.id}`
        },
        () => {
          loadFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_relationships',
          filter: `to_user=eq.${user.id}`
        },
        () => {
          loadFriendRequests();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to friend requests channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Friend requests channel error');
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error removing channel:', error);
      }
    };
  }, [user]);

  // Update notifications when friend requests change
  useEffect(() => {
    generateNotifications();
  }, [friendRequests]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 
                   hover:bg-white/20 transition-all duration-200 group"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                       flex items-center justify-center text-xs font-medium text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto
                         bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-white/20 
                         rounded-2xl shadow-lg z-50"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200/20 dark:border-gray-700/20">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {unreadCount} unread
                </p>
              </div>

              {/* Notifications List */}
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 border-b border-gray-200/10 dark:border-gray-700/10 
                                 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {notification.type === 'friend_request' ? (
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {notification.sender_avatar ? (
                              <img
                                src={notification.sender_avatar}
                                alt={notification.sender_name}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 
                                             flex items-center justify-center">
                                <UserPlus className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <UserPlus className="w-4 h-4 text-blue-500" />
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {notification.title}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                              {formatTimeAgo(notification.created_at)}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const requestId = notification.id.replace('friend_request_', '');
                                  handleFriendRequest(requestId, 'accept');
                                }}
                                disabled={loading}
                                className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const requestId = notification.id.replace('friend_request_', '');
                                  handleFriendRequest(requestId, 'reject');
                                }}
                                disabled={loading}
                                className="h-8 px-3"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Other notification types */
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 
                                           flex items-center justify-center">
                              {notification.type === 'room_invitation' ? (
                                <Users className="w-5 h-5 text-white" />
                              ) : (
                                <Bell className="w-5 h-5 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-4 border-t border-gray-200/20 dark:border-gray-700/20">
                  <button
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      setUnreadCount(0);
                    }}
                    className="w-full text-sm text-primary hover:text-primary/80 
                             transition-colors font-medium"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};