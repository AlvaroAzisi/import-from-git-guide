// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'message' | 'room_invite' | 'system';
  title: string;
  content?: string | null;
  data?: any;
  is_read: boolean | null;
  created_at: string | null;
}

// TODO adapted for new Supabase backend - get user notifications
export const getUserNotifications = async (): Promise<Notification[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Notification[];
  } catch (error) {
    console.error('Get notifications error:', error);
    return [];
  }
};

// TODO adapted for new Supabase backend - get unread count
export const getUnreadNotificationCount = async (): Promise<number> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Get unread notification count error:', error);
    return 0;
  }
};

// TODO adapted for new Supabase backend - mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return false;
  }
};
