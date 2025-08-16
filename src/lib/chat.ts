import { supabase } from './supabase';
import type { Message } from './rooms';

/**
 * Send a message in a conversation
 * @param conversationId - The ID of the conversation/room
 * @param content - The message content
 * @returns The created message or null if there was an error
 */
export const sendMessage = async (conversationId: string, content: string): Promise<Message | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('You must be logged in');

    if (!content.trim()) throw new Error('Message content is empty');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
};

/**
 * Get messages for a conversation
 * @param conversationId - The ID of the conversation/room
 * @param limit - Maximum number of messages to retrieve
 * @returns Array of messages
 */
export const getMessages = async (conversationId: string, limit: number = 50): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
};

/**
 * Subscribe to new messages in a conversation
 * @param conversationId - The ID of the conversation/room
 * @param onInsert - Callback function for new messages
 * @returns Unsubscribe function
 */
export const subscribeToMessages = (conversationId: string, onInsert: (message: Message) => void) => {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const newMessage = payload.new as Message;
        try {
          // Fetch sender profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMessage.user_id)
            .single();

          onInsert({
            ...newMessage,
            profile: profileData || undefined
          });
        } catch (error) {
          console.error('Error fetching profile for message:', error);
          // Still deliver message even if profile fetch fails
          onInsert(newMessage);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
