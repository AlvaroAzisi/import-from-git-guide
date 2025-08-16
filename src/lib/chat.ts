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
        last_message_at
      `)
      .in('id', 
        supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', user.id)
      )
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
export const getMessages = async (conversationId: string, limit: number = 50, before?: string): Promise<ChatMessage[]> => {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(full_name, avatar_url, username)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Cursor-based pagination
    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await supabase

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
  messageType: 'text' | 'image' | 'file' = 'text'
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
      .from('messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        content,
        type: messageType,
        created_at: new Date().toISOString()
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

    // Update last_read_at in conversation_members
    const { error } = await supabase
      .from('conversation_members')
      .update({ 
        last_read_at: new Date().toISOString() 
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      logSupabaseError('[markMessagesAsRead] update error:', error);
      return false;
    }

    // Also insert into message_reads for detailed tracking
    const { data: latestMessage } = await supabase
      .from('messages')
      .select('id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (latestMessage) {
      await supabase
        .from('message_reads')
        .upsert({
          message_id: latestMessage.id,
          message_created_at: latestMessage.created_at,
          user_id: user.id,
          read_at: new Date().toISOString()
        });
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

    // Get member's last read timestamp
    const { data: member } = await supabase
      .from('conversation_members')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!member) return 0;

    // Count messages after last read
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .gt('created_at', member.last_read_at || '1970-01-01T00:00:00Z');

    if (error) {
      logSupabaseError('[getConversationUnreadCount] count error:', error);
      return 0;
    });

    return count || 0;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
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
        const newMessage = payload.new as ChatMessage;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('id', newMessage.user_id)
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

  // Subscribe to typing indicators
  const typingChannel = supabase
    .channel(`typing-${conversationId}`, {
      config: {
        presence: {
          key: conversationId,
        },
      },
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        if (onTyping) {
          const indicator = payload.new || payload.old;
          onTyping({
            user_id: indicator.user_id,
            conversation_id: indicator.conversation_id,
            is_typing: payload.eventType === 'INSERT',
            user_name: indicator.user_name
          });
        }
      }
    )
    .subscribe();

  return () => {
    try {
      // Graceful cleanup for Supabase channels
      if (messagesChannel && typeof messagesChannel.unsubscribe === 'function') {
        messagesChannel.unsubscribe();
      }
      if (typingChannel && typeof typingChannel.unsubscribe === 'function') {
        typingChannel.unsubscribe();
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

    if (isTyping) {
      // Insert typing indicator
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          started_at: new Date().toISOString()
        });
    } else {
      // Remove typing indicator
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    }
  } catch (error) {
    console.error('Send typing indicator error:', error);
  }
};

// Upload chat attachment using new schema
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

    return data?.publicUrl ?? null;
  } catch (error) {
    console.error('Upload chat attachment error:', error);
    throw error;
  }
};

// Create DM conversation using new schema
export const createDMConversation = async (otherUserId: string): Promise<string | null> => {
  try {
    const userResult = await supabase.auth.getUser();
    const user = userResult?.data?.user;
    if (!user) throw new Error('Not authenticated');

    // Check if DM already exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'dm')
      .in('id', 
        supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', user.id)
      )
      .in('id',
        supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', otherUserId)
      )
      .single();

    if (existingConv) {
      return existingConv.id;
    }

    // Create new DM conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'dm',
        created_by: user.id
      })
      .select()
      .single();

    if (convError) throw convError;

    // Add both users as members
    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString()
        },
        {
          conversation_id: conversation.id,
          user_id: otherUserId,
          role: 'member',
          joined_at: new Date().toISOString()
        }
      ]);

    if (membersError) {
      // Cleanup orphaned conversation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      throw membersError;
    }

    return conversation.id;
  } catch (error) {
    console.error('Create DM conversation error:', error);
    return null;
  }
};

// Create group conversation using new schema
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
        role: 'admin',
        joined_at: new Date().toISOString()
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
