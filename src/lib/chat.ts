import { supabase } from './supabase';
import type { UserProfile } from './auth';

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  room_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  unread_count?: number;
  other_user?: UserProfile;
  last_message?: ChatMessage;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachments: any[];
  reply_to_id?: string;
  created_at: string;
  updated_at: string;
  sender?: UserProfile;
  is_read?: boolean;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string;
  profile?: UserProfile;
}

export interface TypingEvent {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
  user_name?: string;
}

// Get user's conversations
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members!inner(user_id, last_read_at),
        chat_messages(
          id,
          content,
          sender_id,
          created_at,
          sender:profiles(full_name, avatar_url)
        )
      `)
      .eq('conversation_members.user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Process conversations to add unread counts and other user info
    const processedConversations = await Promise.all(
      (data || []).map(async (conv: any) => {
        const unreadCount = await getConversationUnreadCount(conv.id);
        
        // For DM conversations, get the other user's info
        let otherUser: UserProfile | undefined;
        if (conv.type === 'dm') {
          const { data: members } = await supabase
            .from('conversation_members')
            .select('user_id, profiles(*)') 
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .single();
          
          if (members) {
            otherUser = members.profiles as UserProfile;
          }
        }

        // Get last message
        const lastMessage = conv.chat_messages?.[0];

        return {
          ...conv,
          unread_count: unreadCount,
          other_user: otherUser,
          last_message: lastMessage
        };
      })
    );

    return processedConversations;
  } catch (error) {
    console.error('Get conversations error:', error);
    return [];
  }
};

// Get conversation by ID
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_members(
          user_id,
          role,
          profiles(*)
        )
      `)
      .eq('id', conversationId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get conversation error:', error);
    return null;
  }
};

// Create DM conversation
export const createDMConversation = async (otherUserId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('create_dm_conversation', {
      other_user_id: otherUserId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Create DM conversation error:', error);
    return null;
  }
};

// Create group conversation
export const createGroupConversation = async (name: string, description?: string): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description,
        created_by: user.id
      })
      .select('id')
      .single();

    if (error) throw error;

    // Add creator as admin
    await supabase
      .from('conversation_members')
      .insert({
        conversation_id: data.id,
        user_id: user.id,
        role: 'admin'
      });

    return data.id;
  } catch (error) {
    console.error('Create group conversation error:', error);
    return null;
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId: string, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles(full_name, avatar_url, username)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).reverse(); // Reverse to show oldest first
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
};

// Send message
export const sendChatMessage = async (
  conversationId: string, 
  content: string, 
  messageType: 'text' | 'image' | 'file' = 'text',
  attachments: any[] = []
): Promise<ChatMessage | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        attachments
      })
      .select(`
        *,
        sender:profiles(full_name, avatar_url, username)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('mark_messages_read', {
      conversation_uuid: conversationId,
      user_uuid: user.id
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Mark messages read error:', error);
    return false;
  }
};

// Get unread count for conversation
export const getConversationUnreadCount = async (conversationId: string): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase.rpc('get_conversation_unread_count', {
      conversation_uuid: conversationId,
      user_uuid: user.id
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};

// Search messages
export const searchMessages = async (conversationId: string, query: string): Promise<ChatMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles(full_name, avatar_url, username)
      `)
      .eq('conversation_id', conversationId)
      .textSearch('content', query)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Search messages error:', error);
    return [];
  }
};

// Real-time subscriptions
export const subscribeToConversation = (
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onTyping?: (event: TypingEvent) => void
) => {
  // Subscribe to new messages
  const messagesChannel = supabase
    .channel(`chat-messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const newMessage = payload.new as ChatMessage;
        
        // Fetch sender profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('id', newMessage.sender_id)
          .single();

        onMessage({
          ...newMessage,
          sender: profile || undefined
        });
      }
    )
    .subscribe();

  // Subscribe to typing events (using presence)
  const typingChannel = supabase
    .channel(`typing-${conversationId}`, {
      config: {
        presence: {
          key: conversationId,
        },
      },
    })
    .on('presence', { event: 'sync' }, () => {
      const state = typingChannel.presenceState();
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (onTyping && presence.is_typing) {
            onTyping({
              user_id: presence.user_id,
              conversation_id: conversationId,
              is_typing: presence.is_typing,
              user_name: presence.user_name
            });
          }
        });
      });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(messagesChannel);
    supabase.removeChannel(typingChannel);
  };
};

// Send typing indicator
export const sendTypingIndicator = async (conversationId: string, isTyping: boolean) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    
    if (isTyping) {
      await channel.track({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || 'User',
        is_typing: true,
        timestamp: Date.now()
      });
    } else {
      await channel.untrack();
    }
  } catch (error) {
    console.error('Send typing indicator error:', error);
  }
};

// Upload chat attachment
export const uploadChatAttachment = async (
  file: File, 
  conversationId: string
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate file
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `${conversationId}/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file, {
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('chat_media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Upload chat attachment error:', error);
    throw error;
  }
};