import { supabase } from './supabase';

// Core types for the chat system (temporary until database is rebuilt)
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_id?: string | null;
  thread_id?: string | null;
  mentions?: string[] | null;
  attachments?: any[] | null;
  metadata?: any | null;
  is_edited: boolean;
  is_deleted: boolean;
  is_read?: boolean;
  edited_at?: string | null;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    username: string;
  };
  sender?: {
    full_name: string;
    avatar_url: string | null;
    username: string;
  };
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group' | 'channel';
  name?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  last_message?: {
    content: string;
    sender_name: string;
    created_at: string;
    message_type?: string;
  } | null;
  unread_count?: number;
  other_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string | null;
    interests?: string[] | null;
    xp?: number;
  } | null;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at?: string | null;
  is_muted: boolean;
  profile?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface TypingEvent {
  user_id: string;
  conversation_id: string;
  username: string;
}

export type Message = ChatMessage;

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
        sender_id: user.id,
        content: content.trim(),
        message_type: 'text',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        profile:profiles(full_name, avatar_url, username)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
};

// Export alias for backwards compatibility
export const sendChatMessage = sendMessage;

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
        profile:profiles(full_name, avatar_url, username)
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
            .select('full_name, avatar_url, username')
            .eq('id', newMessage.sender_id || newMessage.user_id)
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
    try {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      } else {
        supabase.removeChannel(channel);
      }
    } catch (error) {
      console.warn('Error unsubscribing from messages channel:', error);
    }
  };
};

// Additional chat functions for complete implementation
export const getConversations = async (): Promise<{ data: Conversation[]; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members!inner(user_id)
      `)
      .eq('conversation_members.user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Add mock data for missing fields
    const enrichedData = (data || []).map(conv => ({
      ...conv,
      unread_count: 0,
      last_message: conv.last_message_at ? {
        content: 'Recent message...',
        sender_name: 'Someone',
        created_at: conv.last_message_at,
        message_type: 'text'
      } : null,
      other_user: conv.type === 'dm' ? {
        id: 'other-user-id',
        username: 'other_user',
        full_name: 'Other User',
        avatar_url: null,
        bio: null,
        interests: null,
        xp: 0
      } : null
    }));

    return { data: enrichedData, error: null };
  } catch (error: any) {
    console.error('Get conversations error:', error);
    return { data: [], error: error.message };
  }
};

export const getConversation = async (conversationId: string): Promise<{ data: Conversation | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Add mock data for missing fields
    const enrichedData = {
      ...data,
      unread_count: 0,
      last_message: data.last_message_at ? {
        content: 'Recent message...',
        sender_name: 'Someone',
        created_at: data.last_message_at,
        message_type: 'text'
      } : null,
      other_user: data.type === 'dm' ? {
        id: 'other-user-id',
        username: 'other_user',
        full_name: 'Other User',
        avatar_url: null,
        bio: null,
        interests: null,
        xp: 0
      } : null
    };

    return { data: enrichedData, error: null };
  } catch (error: any) {
    console.error('Get conversation error:', error);
    return { data: null, error: error.message };
  }
};

export const createDMConversation = async (otherUserId: string): Promise<{ data: Conversation | null; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if DM already exists
    const { data: existingDM } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members!inner(user_id)
      `)
      .eq('type', 'dm')
      .eq('conversation_members.user_id', user.id);

    // Find DM with other user
    for (const conv of existingDM || []) {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conv.id);
      
      if (members && members.length === 2 && 
          members.some(m => m.user_id === otherUserId)) {
        const enrichedConv = {
          ...conv,
          other_user: {
            id: otherUserId,
            username: 'other_user',
            full_name: 'Other User',
            avatar_url: null,
            bio: null,
            interests: null,
            xp: 0
          }
        };
        return { data: enrichedConv, error: null };
      }
    }

    // Create new DM conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'dm',
        created_by: user.id
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add both users as members
    const { error: memberError } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: newConv.id, user_id: user.id, role: 'member' },
        { conversation_id: newConv.id, user_id: otherUserId, role: 'member' }
      ]);

    if (memberError) throw memberError;

    const enrichedConv = {
      ...newConv,
      other_user: {
        id: otherUserId,
        username: 'other_user',
        full_name: 'Other User',
        avatar_url: null,
        bio: null,
        interests: null,
        xp: 0
      }
    };

    return { data: enrichedConv, error: null };
  } catch (error: any) {
    console.error('Create DM conversation error:', error);
    return { data: null, error: error.message };
  }
};

export const createGroupConversation = async (name: string, description?: string): Promise<{ data: Conversation | null; error: string | null }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description,
        created_by: user.id
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: newConv.id,
        user_id: user.id,
        role: 'admin'
      });

    if (memberError) throw memberError;

    return { data: newConv, error: null };
  } catch (error: any) {
    console.error('Create group conversation error:', error);
    return { data: null, error: error.message };
  }
};

export const markMessagesAsRead = async (conversationId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  } catch (error) {
    console.error('Mark messages as read error:', error);
  }
};

export const subscribeToConversation = (conversationId: string, onMessage: (message: Message) => void) => {
  return subscribeToMessages(conversationId, onMessage);
};

export const sendTypingIndicator = async (conversationId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('typing_indicators')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        started_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Send typing indicator error:', error);
  }
};

export const uploadChatAttachment = async (file: File): Promise<{ url: string | null; error: string | null }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `chat_media/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('chat_media')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    return { url: null, error: error.message };
  }
};