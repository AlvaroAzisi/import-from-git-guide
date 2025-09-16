// TODO: Disabled – depends on old schema (conversations, group_messages)
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'room';
  name?: string;
  last_message_at?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
}

// Placeholder functions - disabled
export const getConversations = async () => {
  return { data: [], error: null };
};

export const getConversation = async (_id: string) => {
  return { data: null, error: 'Feature disabled' };
};

export const createDMConversation = async (_userId: string) => {
  return null;
};

export const createDirectConversation = async (_userId: string) => {
  return null;
};

export const sendMessage = async (_conversationId: string, _content: string) => {
  return { data: null, error: 'Feature disabled' };
};
