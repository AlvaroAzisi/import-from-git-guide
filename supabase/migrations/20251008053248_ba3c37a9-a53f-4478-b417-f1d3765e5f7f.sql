-- Create function to check if two users are accepted friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friends
    WHERE status = 'accepted'
    AND (
      (from_user = user1_id AND to_user = user2_id)
      OR (from_user = user2_id AND to_user = user1_id)
    )
  );
END;
$$;

-- Create function to get or create DM conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if users are friends
  IF NOT are_friends(current_user_id, other_user_id) THEN
    RAISE EXCEPTION 'Users must be friends to create a conversation';
  END IF;
  
  -- Try to find existing conversation
  SELECT c.id INTO conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM conversation_members cm1
    WHERE cm1.conversation_id = c.id AND cm1.user_id = current_user_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_members cm2
    WHERE cm2.conversation_id = c.id AND cm2.user_id = other_user_id
  )
  AND (
    SELECT COUNT(*) FROM conversation_members cm
    WHERE cm.conversation_id = c.id
  ) = 2
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by, is_active)
    VALUES ('direct', current_user_id, true)
    RETURNING id INTO conversation_id;
    
    -- Add both users as members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES 
      (conversation_id, current_user_id, 'member'),
      (conversation_id, other_user_id, 'member');
  END IF;
  
  RETURN conversation_id;
END;
$$;

-- Update messages RLS policies to check friendship
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can send messages to friends only" ON messages;
CREATE POLICY "Users can send messages to friends only"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id FROM conversation_members
    WHERE user_id = auth.uid()
  )
);

-- Enable realtime for messages and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;