import { supabase } from '../integrations/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  type: string;
  created_at: string;
  members?: Array<{
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  }>;
}

// Check if two users are friends
export const checkFriendship = async (userId1: string, userId2: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('are_friends', {
    user1_id: userId1,
    user2_id: userId2,
  });

  if (error) {
    console.error('Error checking friendship:', error);
    return false;
  }

  return data || false;
};

// Get or create a DM conversation with another user
export const getOrCreateConversation = async (otherUserId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
      other_user_id: otherUserId,
    });

    if (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }

    return data;
  } catch (error: any) {
    if (error.message?.includes('must be friends')) {
      throw new Error('MUST_BE_FRIENDS');
    }
    throw error;
  }
};

// Fetch messages for a conversation
export const fetchMessages = async (
  conversationId: string,
  limit = 50
): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      sender:profiles!messages_sender_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data || []).map((msg: any) => ({
    ...msg,
    sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender,
  }));
};

// Send a message
export const sendMessage = async (
  conversationId: string,
  content: string
): Promise<Message | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  // Input validation
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Message cannot be empty');
  }
  if (trimmedContent.length > 5000) {
    throw new Error('Message is too long (maximum 5000 characters)');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedContent,
      message_type: 'text',
    })
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      created_at,
      sender:profiles!messages_sender_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return {
    ...data,
    sender: Array.isArray(data.sender) ? data.sender[0] : data.sender,
  };
};

// Subscribe to new messages in a conversation
export const subscribeToMessages = (
  conversationId: string,
  onNewMessage: (message: Message) => void
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
        // Fetch full message with sender data
        const { data } = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            sender:profiles!messages_sender_id_fkey(
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onNewMessage({
            ...data,
            sender: Array.isArray(data.sender) ? data.sender[0] : data.sender,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
