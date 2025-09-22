import { supabase } from '../integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Conversation {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: { username: string; avatar_url: string; };
}

export const getConversations = async (): Promise<{ data: Conversation[] | null; error: any }> => {
  const { data: userResponse } = await supabase.auth.getUser();
  if (!userResponse.user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('room_members')
    .select('rooms(*)')
    .eq('user_id', userResponse.user.id);

  if (error) {
    return { data: null, error };
  }

  const conversations = data.map(item => item.rooms as Conversation).filter(Boolean);
  return { data: conversations, error: null };
};

export const sendMessage = async (roomId: string, content: string): Promise<{ data: any | null; error: any }> => {
  const { data: userResponse } = await supabase.auth.getUser();
  if (!userResponse.user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id: roomId, content, sender_id: userResponse.user.id }])
    .select();

  return { data, error };
};

export const subscribeToMessages = (
  roomId: string,
  onMessage: (message: ChatMessage) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`messages:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${roomId}` },
      async (payload) => {
        const newMessageId = payload.new.id;
        const { data, error } = await supabase
          .from('messages')
          .select('*, profiles(username, avatar_url)')
          .eq('id', newMessageId)
          .single();
        if (error) {
          console.error('Error fetching new message:', error);
        } else {
          onMessage(data as ChatMessage);
        }
      }
    )
    .subscribe();

  return channel;
};
