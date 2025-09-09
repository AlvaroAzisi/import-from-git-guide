// TODO adapted for new Supabase backend - chat functionality disabled
// This file used 'conversations', 'conversation_members' tables which don't exist in simplified schema

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  is_edited?: boolean;
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    username: string;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'room';
  name?: string;
  last_message_at?: string;
  created_at: string;
  members?: ConversationMember[];
  unread_count?: number;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  is_muted: boolean;
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    username: string;
  };
}

// Disabled functions returning empty arrays/null
export const getConversationMessages = async (_conversationId: string): Promise<ChatMessage[]> => {
  console.warn('Chat functionality temporarily disabled during backend migration');
  return [];
};

export const sendChatMessage = async (_conversationId: string, _content: string, _messageType: 'text' | 'image' | 'file' = 'text'): Promise<ChatMessage | null> => {
  console.warn('Chat functionality temporarily disabled during backend migration');
  return null;
};

export const getUserConversations = async (): Promise<Conversation[]> => {
  console.warn('Chat functionality temporarily disabled during backend migration');
  return [];
};

export const createDirectConversation = async (_userId: string): Promise<Conversation | null> => {
  console.warn('Chat functionality temporarily disabled during backend migration');
  return null;
};

export const createGroupConversation = async (_name: string, _memberIds: string[]): Promise<Conversation | null> => {
  console.warn('Chat functionality temporarily disabled during backend migration');
  return null;
};