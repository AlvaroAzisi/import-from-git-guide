export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  is_private: boolean;
  subject?: string;
  max_members?: number;
  created_at: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  room_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  updated_at: string;
}
