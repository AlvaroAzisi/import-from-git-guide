import { supabase } from '../integrations/supabase/client';
import { logError } from './errorHandler';
import type { Tables } from '../integrations/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

export type Conversation = Tables<'conversations'>;
export type ChatMessage = Tables<'messages'> & {
  profiles?: {
    username: string;
    avatar_url?: string | null;
  };
};

// ============================================================================
// CONVERSATIONS
// ============================================================================

export const getConversations = async (): Promise<{ data: Conversation[] | null; error: any }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) {
      logError('getConversations', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    logError('getConversations', error);
    return { data: null, error };
  }
};

// ============================================================================
// MESSAGES
// ============================================================================

export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<{ data: ChatMessage | null; error: any }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select('*, profiles(username, avatar_url)')
      .single();

    if (error) {
      logError('sendMessage', error);
      return { data: null, error };
    }

    return { data: data as ChatMessage, error: null };
  } catch (error) {
    logError('sendMessage', error);
    return { data: null, error };
  }
};

export const subscribeToMessages = (
  conversationId: string,
  onMessage: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const message = payload.new as ChatMessage;
        
        if (!message.sender_id) return;
        
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', message.sender_id)
          .single();

        onMessage({ ...message, profiles: profile || undefined });
      }
    )
    .subscribe();

  return channel;
};
