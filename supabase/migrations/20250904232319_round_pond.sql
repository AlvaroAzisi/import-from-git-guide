/*
  # Fix table permissions and RLS policies

  1. Table Permissions
    - Grant SELECT, INSERT, UPDATE, DELETE permissions to authenticated role
    - Ensure all tables have proper access for authenticated users

  2. RLS Policies
    - Enable RLS on all tables that need it
    - Add comprehensive policies for profiles, user_relationships, rooms, conversations
    - Ensure authenticated users can access their own data and public data

  3. Security
    - Maintain data isolation between users
    - Allow public read access where appropriate
    - Ensure users can only modify their own data
*/

-- Grant basic table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON room_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages_2025_01 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages_2025_02 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages_2025_03 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages_2025_04 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages_2025_05 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages_2025_06 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON typing_indicators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications_0 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications_1 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications_2 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications_3 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON friends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs_2025_01 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs_2025_02 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs_2025_03 TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS on tables that don't have it yet
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view public profile data" ON profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view public profile data"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (NOT is_deleted);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop existing conflicting policies for user_relationships
DROP POLICY IF EXISTS "Users can create relationships" ON user_relationships;
DROP POLICY IF EXISTS "Users can view their relationships" ON user_relationships;
DROP POLICY IF EXISTS "Users can update their relationships" ON user_relationships;
DROP POLICY IF EXISTS "Users can delete their relationships" ON user_relationships;

-- Create comprehensive RLS policies for user_relationships
CREATE POLICY "Users can create relationships"
  ON user_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their relationships"
  ON user_relationships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can update their relationships"
  ON user_relationships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can delete their relationships"
  ON user_relationships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = target_user_id);

-- Drop existing conflicting policies for rooms
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can read accessible rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON rooms;

-- Create comprehensive RLS policies for rooms
CREATE POLICY "Users can create rooms"
  ON rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = created_by);

CREATE POLICY "Users can read accessible rooms"
  ON rooms
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    OR auth.uid() = creator_id 
    OR auth.uid() = created_by 
    OR EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_members.room_id = rooms.id 
      AND room_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own rooms"
  ON rooms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = created_by);

-- Drop existing conflicting policies for room_members
DROP POLICY IF EXISTS "Users can join rooms" ON room_members;
DROP POLICY IF EXISTS "Users can read room members" ON room_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_members;

-- Create comprehensive RLS policies for room_members
CREATE POLICY "Users can join rooms"
  ON room_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read room members"
  ON room_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = room_members.room_id 
      AND (
        rooms.is_public = true 
        OR rooms.creator_id = auth.uid() 
        OR rooms.created_by = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM room_members rm2 
      WHERE rm2.room_id = room_members.room_id 
      AND rm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave rooms"
  ON room_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop existing conflicting policies for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view member conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

-- Create comprehensive RLS policies for conversations
CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can read own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can view member conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Drop existing conflicting policies for conversation_members
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_members;
DROP POLICY IF EXISTS "Users can view conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON conversation_members;
DROP POLICY IF EXISTS "Users can update their membership" ON conversation_members;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_members;

-- Create comprehensive RLS policies for conversation_members
CREATE POLICY "Users can join conversations"
  ON conversation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view conversation members"
  ON conversation_members
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_members_1.conversation_id
      FROM conversation_members conversation_members_1
      WHERE conversation_members_1.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their memberships"
  ON conversation_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their membership"
  ON conversation_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations"
  ON conversation_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable RLS on message tables and create policies
ALTER TABLE messages_2025_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2025_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2025_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2025_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2025_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_2025_06 ENABLE ROW LEVEL SECURITY;

-- Create message policies for each partitioned table
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['messages_2025_01', 'messages_2025_02', 'messages_2025_03', 'messages_2025_04', 'messages_2025_05', 'messages_2025_06'])
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can send messages" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view messages in their conversations" ON %I', table_name);
        
        -- Create new policies
        EXECUTE format('
            CREATE POLICY "Users can send messages"
            ON %I
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = sender_id)
        ', table_name);
        
        EXECUTE format('
            CREATE POLICY "Users can view messages in their conversations"
            ON %I
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM conversation_members
                    WHERE conversation_members.conversation_id = %I.conversation_id
                    AND conversation_members.user_id = auth.uid()
                )
            )
        ', table_name, table_name);
    END LOOP;
END $$;

-- Enable RLS on notification tables
ALTER TABLE notifications_0 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_3 ENABLE ROW LEVEL SECURITY;

-- Create notification policies for each table
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['notifications_0', 'notifications_1', 'notifications_2', 'notifications_3'])
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own notifications" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can create notifications" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own notifications" ON %I', table_name);
        
        -- Create new policies
        EXECUTE format('
            CREATE POLICY "Users can view own notifications"
            ON %I
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id)
        ', table_name);
        
        EXECUTE format('
            CREATE POLICY "Users can create notifications"
            ON %I
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id)
        ', table_name);
        
        EXECUTE format('
            CREATE POLICY "Users can update own notifications"
            ON %I
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id)
        ', table_name);
    END LOOP;
END $$;

-- Ensure audit log tables have RLS enabled
ALTER TABLE audit_logs_2025_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2025_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs_2025_03 ENABLE ROW LEVEL SECURITY;

-- Create audit log policies
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['audit_logs_2025_01', 'audit_logs_2025_02', 'audit_logs_2025_03'])
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own audit logs" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "System can create audit logs" ON %I', table_name);
        
        -- Create new policies
        EXECUTE format('
            CREATE POLICY "Users can view own audit logs"
            ON %I
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id)
        ', table_name);
        
        EXECUTE format('
            CREATE POLICY "System can create audit logs"
            ON %I
            FOR INSERT
            TO authenticated
            WITH CHECK (true)
        ', table_name);
    END LOOP;
END $$;

-- Grant permissions on functions to authenticated role
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_last_message() TO authenticated;

-- Grant access to materialized views
GRANT SELECT ON popular_rooms TO authenticated;

-- Refresh materialized view to ensure it's accessible
REFRESH MATERIALIZED VIEW popular_rooms;