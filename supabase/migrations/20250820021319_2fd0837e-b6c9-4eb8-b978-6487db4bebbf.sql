-- Fix infinite recursion in RLS policies for conversation_members table
-- This is causing the critical database errors

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Members can view conversations they belong to" ON conversation_members;
DROP POLICY IF EXISTS "Users can read conversation members" ON conversation_members;

-- Create non-recursive policies
CREATE POLICY "conversation_members_select_simple" ON conversation_members
FOR SELECT USING (
  user_id = auth.uid()
);

-- Allow users to view other members in conversations they belong to
CREATE POLICY "conversation_members_view_conversation_peers" ON conversation_members
FOR SELECT USING (
  conversation_id IN (
    SELECT cm.conversation_id 
    FROM conversation_members cm 
    WHERE cm.user_id = auth.uid()
  )
);

-- Fix conversation_presence policies to avoid recursion
DROP POLICY IF EXISTS "Users can view presence in their conversations" ON conversation_presence;

CREATE POLICY "conversation_presence_select_simple" ON conversation_presence
FOR SELECT USING (
  user_id = auth.uid() OR 
  conversation_id IN (
    SELECT cm.conversation_id 
    FROM conversation_members cm 
    WHERE cm.user_id = auth.uid()
  )
);

-- Refresh the materialized view if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'popular_rooms') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_rooms;
  END IF;
END $$;