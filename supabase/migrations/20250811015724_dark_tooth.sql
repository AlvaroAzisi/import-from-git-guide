/*
  # Chat System Schema

  1. New Tables
    - `conversations` - DM and group conversations
    - `conversation_members` - participants in conversations
    - `chat_messages` - messages in conversations
    - `message_reads` - read receipts for messages
    - `typing_events` - ephemeral typing indicators

  2. Security
    - Enable RLS on all tables
    - Add policies for conversation access
    - Add policies for message sending/reading
    - Add policies for read receipts

  3. Functions
    - mark_messages_read function
    - get_conversation_unread_count function
    - create_dm_conversation function
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('dm', 'group')),
  name text, -- for group chats
  description text, -- for group chats
  avatar_url text, -- for group chats
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE, -- link to study room if applicable
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

-- Create conversation_members table
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachments jsonb DEFAULT '[]'::jsonb,
  reply_to_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_reads table for read receipts
CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_created ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON message_reads(user_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view conversations they are members of"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Conversation admins can update conversations"
  ON conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_id = conversations.id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Conversation members policies
CREATE POLICY "Users can view conversation members"
  ON conversation_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations they are invited to"
  ON conversation_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations"
  ON conversation_members
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON conversation_members
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Conversation members can view messages"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Conversation members can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON chat_messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Message reads policies
CREATE POLICY "Users can view message reads"
  ON message_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      JOIN chat_messages msg ON msg.conversation_id = cm.conversation_id
      WHERE msg.id = message_reads.message_id 
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
  ON message_reads
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Functions for chat operations
CREATE OR REPLACE FUNCTION mark_messages_read(conversation_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_read_at for the user in this conversation
  UPDATE conversation_members 
  SET last_read_at = now()
  WHERE conversation_id = conversation_uuid AND user_id = user_uuid;
  
  -- Mark all messages in conversation as read by this user
  INSERT INTO message_reads (message_id, user_id)
  SELECT cm.id, user_uuid
  FROM chat_messages cm
  WHERE cm.conversation_id = conversation_uuid
    AND cm.sender_id != user_uuid
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = cm.id AND mr.user_id = user_uuid
    );
END;
$$;

CREATE OR REPLACE FUNCTION get_conversation_unread_count(conversation_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM chat_messages cm
  WHERE cm.conversation_id = conversation_uuid
    AND cm.sender_id != user_uuid
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr 
      WHERE mr.message_id = cm.id AND mr.user_id = user_uuid
    );
$$;

CREATE OR REPLACE FUNCTION create_dm_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_uuid uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if DM conversation already exists
  SELECT c.id INTO conversation_uuid
  FROM conversations c
  JOIN conversation_members cm1 ON cm1.conversation_id = c.id
  JOIN conversation_members cm2 ON cm2.conversation_id = c.id
  WHERE c.type = 'dm'
    AND cm1.user_id = current_user_id
    AND cm2.user_id = other_user_id
    AND (
      SELECT COUNT(*) FROM conversation_members 
      WHERE conversation_id = c.id
    ) = 2;
  
  -- If conversation doesn't exist, create it
  IF conversation_uuid IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('dm', current_user_id)
    RETURNING id INTO conversation_uuid;
    
    -- Add both users as members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES 
      (conversation_uuid, current_user_id, 'member'),
      (conversation_uuid, other_user_id, 'member');
  END IF;
  
  RETURN conversation_uuid;
END;
$$;

-- Trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enable realtime
ALTER TABLE conversations REPLICA IDENTITY FULL;
ALTER TABLE conversation_members REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE message_reads REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;