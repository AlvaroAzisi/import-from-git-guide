// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string; // TODO adapted for new Supabase backend - keeping current schema
  sender_id: string | null;
  content: string;
  message_type: 'text' | 'image' | 'file' | null;
  created_at: string;
  is_edited: boolean | null;
  is_deleted: boolean | null;
  sender?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username: string;
  } | null;
}

// TODO adapted for new Supabase backend - simplified message fetching  
export const getRoomMessages = async (roomId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id(
          id,
          full_name,
          avatar_url,
          username
        )
      `)
      .eq('conversation_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as Message[];
  } catch (error) {
    console.error('Get room messages error:', error);
    return [];
  }
};

// TODO adapted for new Supabase backend - send message
export const sendMessage = async (roomId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text'): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: roomId,
        sender_id: user.id,
        content,
        message_type: messageType
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Send message error:', error);
    return false;
  }
};