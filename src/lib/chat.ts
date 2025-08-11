// src/lib/chat.ts
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
  other_user?: Partial<UserProfile>;
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
  sender?: Partial<UserProfile>;
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

const logSupabaseError = (prefix: string, error: any) => {
  if (!error) return;
  // If it's a PostgREST/Supabase error object:
  console.error(prefix, {
    message: error.message ?? error,
    details: error.details ?? undefined,
    hint: error.hint ?? undefined,
    code: error.code ?? undefined,
    // fallback raw object
    raw: error
  });
};

// Get user's conversations
export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (userResult?.error) {
      logSupabaseError('[getConversations] auth.getUser error:', userResult.error);
      throw userResult.error;
    }
    if (!user) throw new Error('Not authenticated');

    // Use an inner join on conversation_members to ensure the user is member
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        type,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        last_message_at,
        // include conversation_members so we can filter
        conversation_members!inner(user_id)
      `)
      .eq('conversation_members.user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) {
      logSupabaseError('[getConversations] conversations select error:', error);
      throw error;
    }

    const rows = data || [];
    return await processConversationsWithExtras(rows, user.id);
  } catch (error: any) {
    console.error('Get conversations error:', error?.message ?? error, error);
    return [];
  }
};


// helper to enrich conversations (unread, other_user, last_message)
const processConversationsWithExtras = async (rows: any[], currentUserId: string): Promise<Conversation[]> => {
  try {
    const processed = await Promise.all(
      rows.map(async (conv: any) => {
        let unreadCount = 0;
        try {
          unreadCount = await getConversationUnreadCount(conv.id);
        } catch (e) {
          console.warn('[processConversations] unread count failed for', conv.id, e);
        }

        let otherUser: UserProfile | undefined;
        if (conv.type === 'dm') {
          // fetch conversation_members excluding current user
          const { data: membersData, error: membersError } = await supabase
            .from('conversation_members')
            .select('user_id, profiles(*)')
            .eq('conversation_id', conv.id)
            .neq('user_id', currentUserId)
            .limit(1);

          if (membersError) {
            logSupabaseError('[processConversations] conversation_members fetch error:', membersError);
          } else if (Array.isArray(membersData) && membersData.length > 0) {
            otherUser = (membersData[0] as any).profiles as UserProfile;
          }
        }

        // Try to fetch last message more explicitly if available
        let lastMessage: ChatMessage | undefined;
        if (conv.last_message_at) {
          const { data: msgData, error: msgError } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:profiles(full_name, avatar_url, username)
            `)
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgError) {
            logSupabaseError('[processConversations] last message fetch error:', msgError);
          } else if (Array.isArray(msgData) && msgData.length > 0) {
            lastMessage = msgData[0] as ChatMessage;
          }
        }

        return {
          ...conv,
          unread_count: unreadCount,
          other_user: otherUser,
          last_message: lastMessage
        } as Conversation;
      })
    );

    return processed;
  } catch (err) {
    console.error('[processConversationsWithExtras] unexpected error:', err);
    return rows as Conversation[];
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
      .maybeSingle(); // maybeSingle won't throw if no row

    if (error) {
      logSupabaseError('[getConversation] select error:', error);
      throw error;
    }
    return data ?? null;
  } catch (error) {
    console.error('Get conversation error:', error);
    return null;
  }
};

// Create DM conversation
export const createDMConversation = async (otherUserId: string): Promise<string | null> => {
  try {
    const rpcResult = await supabase.rpc('create_dm_conversation', {
      other_user_id: otherUserId
    });

    if (rpcResult.error) {
      logSupabaseError('[createDMConversation] rpc error:', rpcResult.error);
      return null;
    }

    // rpcResult.data might be whatever your RPC returns (id or row)
    return rpcResult.data ?? null;
  } catch (error) {
    console.error('Create DM conversation error:', error);
    return null;
  }
};

// Create group conversation
export const createGroupConversation = async (name: string, description?: string): Promise<string | null> => {
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (userResult?.error) {
      logSupabaseError('[createGroupConversation] auth.getUser error:', userResult.error);
      throw userResult.error;
    }
    if (!user) throw new Error('Not authenticated');

    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        description,
        created_by: user.id
      })
      .select()
      .single();

    if (conversationError) {
      logSupabaseError('[createGroupConversation] conversation insert error:', conversationError);
      return null;
    }

    const conversationId = conversationData.id;
    if (!conversationId) {
      console.warn('[createGroupConversation] insert returned no id:', conversationData);
      return null;
    }

    // Add creator as admin
    const { error: addMemberError } = await supabase
      .from('conversation_members')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'admin'
      });

    if (addMemberError) {
      logSupabaseError('[createGroupConversation] add member error:', addMemberError);

      // Cleanup orphaned conversation
      const { error: cleanupError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (cleanupError) {
        logSupabaseError('[createGroupConversation] cleanup error:', cleanupError);
      }

      return null;
    }

    return conversationId;
  } catch (error) {
    const errMsg = (error as { message?: string })?.message || error;
    console.error('Create group conversation error:', errMsg, error);
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

    if (error) {
      logSupabaseError('[getMessages] select error:', error);
      throw error;
    }
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
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (userResult?.error) {
      logSupabaseError('[sendChatMessage] auth.getUser error:', userResult.error);
      throw userResult.error;
    }
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

    if (error) {
      logSupabaseError('[sendChatMessage] insert error:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return null;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string): Promise<boolean> => {
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (!user) return false;

    const rpcResult = await supabase.rpc('mark_messages_read', {
      conversation_uuid: conversationId,
      user_uuid: user.id
    });

    if (rpcResult.error) {
      logSupabaseError('[markMessagesAsRead] rpc error:', rpcResult.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Mark messages read error:', error);
    return false;
  }
};

// Get unread count for conversation
export const getConversationUnreadCount = async (conversationId: string): Promise<number> => {
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (!user) return 0;

    const rpcResult = await supabase.rpc('get_conversation_unread_count', {
      conversation_uuid: conversationId,
      user_uuid: user.id
    });

    if (rpcResult.error) {
      logSupabaseError('[getConversationUnreadCount] rpc error:', rpcResult.error);
      return 0;
    }

    // rpcResult.data might be number or object depending on function
    return (typeof rpcResult.data === 'number') ? rpcResult.data : (rpcResult.data ?? 0);
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

    if (error) {
      logSupabaseError('[searchMessages] select error:', error);
      throw error;
    }
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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('id', newMessage.sender_id)
          .limit(1)
          .maybeSingle();

        if (profileError) logSupabaseError('[subscribeToConversation] profile fetch error:', profileError);

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
      try {
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
      } catch (e) {
        console.warn('[subscribeToConversation] presence handling error:', e);
      }
    })
    .subscribe();

  return () => {
    try {
      // use whichever cleanup exists in your supabase client version
      // @ts-ignore
      if (supabase.removeChannel) {
        // @ts-ignore
        supabase.removeChannel(messagesChannel);
        // @ts-ignore
        supabase.removeChannel(typingChannel);
      } else {
        // @ts-ignore
        messagesChannel.unsubscribe?.();
        // @ts-ignore
        typingChannel.unsubscribe?.();
      }
    } catch (e) {
      console.warn('[subscribeToConversation] cleanup error:', e);
    }
  };
};

// Send typing indicator
export const sendTypingIndicator = async (conversationId: string, isTyping: boolean) => {
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
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
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (userResult?.error) {
      logSupabaseError('[uploadChatAttachment] auth.getUser error:', userResult.error);
      throw userResult.error;
    }
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

    if (uploadError) {
      logSupabaseError('[uploadChatAttachment] upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('chat_media')
      .getPublicUrl(filePath);

    // supabase.storage.getPublicUrl returns { data: { publicUrl } } in many clients
    // adapt if your client returns different shape
    if (!data?.publicUrl && data?.publicUrl === undefined) {
      console.warn('[uploadChatAttachment] getPublicUrl returned unexpected data:', data);
    }

    return data?.publicUrl ?? null;
  } catch (error) {
    console.error('Upload chat attachment error:', error);
    throw error;
  }
};
