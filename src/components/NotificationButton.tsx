import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accept' | 'friend_decline' | 'message' | 'room_invite' | 'system';
  title: string;
  content: string | null;
  data: any;
  is_read: boolean | null;
  created_at: string | null;
}

export const NotificationButton: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial notifications
    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
            if (!(payload.new as Notification).is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
            );
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications((data || []) as any);
    fetchUnreadCount();
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setUnreadCount(count || 0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setUnreadCount(0);
    fetchNotifications();
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
        navigate('/temanku/requests');
        break;
      case 'friend_accept':
        if (notification.data?.receiver_id) {
          navigate(`/@${notification.data.receiver_username || notification.data.receiver_id}`);
        }
        break;
      case 'message':
        if (notification.data?.chat_id) {
          navigate(`/chat/${notification.data.chat_id}`);
        }
        break;
      case 'room_invite':
        if (notification.data?.room_id) {
          navigate(`/ruangku/${notification.data.room_id}`);
        }
        break;
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (_type: string) => {
    // Return appropriate icon based on type
    return '🔔';
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

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
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 z-50"
            >
              <Card className="bg-card/95 backdrop-blur-md border-border shadow-lg">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                          !notification.is_read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">
                              {notification.title}
                            </p>
                            {notification.content && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.content}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.created_at && new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
