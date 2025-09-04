/*
  # Fix Schema and Permissions for Kupintar

  1. Schema Fixes
    - Add missing columns to profiles table
    - Create missing database functions
    - Add proper foreign key relationships
    
  2. RLS Policies
    - Enable RLS on all tables
    - Create comprehensive access policies
    - Grant proper permissions
    
  3. Performance
    - Add missing indexes
    - Optimize query performance
*/

-- 1. Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rooms_created INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rooms_joined INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS friends_count INTEGER DEFAULT 0;

-- 2. Ensure all required tables exist with proper structure
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE,
  short_code TEXT UNIQUE,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user, to_user)
);

-- 3. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON profiles;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can search profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Create RLS policies for rooms
DROP POLICY IF EXISTS "Users can read accessible rooms" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON rooms;

CREATE POLICY "Users can read accessible rooms" ON rooms
  FOR SELECT USING (
    is_public = true OR 
    creator_id = auth.uid() OR 
    created_by = auth.uid() OR
    id IN (
      SELECT room_id 
      FROM room_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT WITH CHECK (creator_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can update own rooms" ON rooms
  FOR UPDATE USING (creator_id = auth.uid() OR created_by = auth.uid());

-- 6. Create RLS policies for room_members
DROP POLICY IF EXISTS "Users can read room members" ON room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON room_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON room_members;

CREATE POLICY "Users can read room members" ON room_members
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM rooms 
      WHERE is_public = true OR 
            creator_id = auth.uid() OR 
            created_by = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "Users can join rooms" ON room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave rooms" ON room_members
  FOR DELETE USING (user_id = auth.uid());

-- 7. Create RLS policies for friends
DROP POLICY IF EXISTS "Users can read own friends" ON friends;
DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
DROP POLICY IF EXISTS "Users can update friend requests" ON friends;

CREATE POLICY "Users can read own friends" ON friends
  FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can create friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Users can update friend requests" ON friends
  FOR UPDATE USING (auth.uid() = from_user OR auth.uid() = to_user);

-- 8. Create RLS policies for conversations
DROP POLICY IF EXISTS "Users can read own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;

CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (
      SELECT conversation_id 
      FROM conversation_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (created_by = auth.uid());

-- 9. Create RLS policies for conversation_members
DROP POLICY IF EXISTS "Users can read conversation members" ON conversation_members;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_members;
DROP POLICY IF EXISTS "Users can leave conversations" ON conversation_members;

CREATE POLICY "Users can read conversation members" ON conversation_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations" ON conversation_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave conversations" ON conversation_members
  FOR DELETE USING (user_id = auth.uid());

-- 10. Create RLS policies for messages
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

CREATE POLICY "Users can read messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- 11. Create missing database functions
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code TEXT)
RETURNS TABLE(
    room_id UUID,
    room_name TEXT,
    creator_id UUID,
    valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.name, r.creator_id, true as valid
    FROM rooms r
    WHERE (r.join_code = p_code OR r.short_code = p_code)
    AND r.is_active = true;
    
    -- If no results, return invalid
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::TEXT, NULL::UUID, false as valid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_room_and_join(
    p_name TEXT,
    p_description TEXT DEFAULT '',
    p_subject TEXT DEFAULT '',
    p_is_public BOOLEAN DEFAULT true,
    p_max_members INTEGER DEFAULT 10
)
RETURNS TABLE(
    room JSON,
    membership JSON
) AS $$
DECLARE
    new_room_id UUID;
    room_code TEXT;
    room_record RECORD;
    member_record RECORD;
BEGIN
    -- Generate unique short code
    room_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Create room
    INSERT INTO rooms (
        name, 
        description, 
        subject, 
        creator_id, 
        created_by,
        short_code,
        join_code,
        is_public, 
        max_members,
        is_active
    ) VALUES (
        p_name,
        p_description,
        p_subject,
        auth.uid(),
        auth.uid(),
        room_code,
        room_code,
        p_is_public,
        p_max_members,
        true
    ) RETURNING id INTO new_room_id;
    
    -- Add creator as admin member
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (new_room_id, auth.uid(), 'admin', NOW());
    
    -- Get room data
    SELECT r.*, p.full_name as creator_name, p.avatar_url as creator_avatar
    INTO room_record
    FROM rooms r
    LEFT JOIN profiles p ON p.id = r.creator_id
    WHERE r.id = new_room_id;
    
    -- Get membership data
    SELECT rm.*, p.full_name, p.avatar_url, p.username
    INTO member_record
    FROM room_members rm
    LEFT JOIN profiles p ON p.id = rm.user_id
    WHERE rm.room_id = new_room_id AND rm.user_id = auth.uid();
    
    RETURN QUERY
    SELECT 
        row_to_json(room_record)::JSON as room,
        row_to_json(member_record)::JSON as membership;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.join_room_safe(p_room_identifier TEXT)
RETURNS JSON AS $$
DECLARE
    target_room_id UUID;
    room_record RECORD;
    member_record RECORD;
    current_members INTEGER;
    max_capacity INTEGER;
BEGIN
    -- Find room by ID or code
    IF p_room_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[0-9a-f]{3}-[0-9a-f]{12}$' THEN
        -- UUID format
        SELECT id INTO target_room_id FROM rooms WHERE id = p_room_identifier::UUID AND is_active = true;
    ELSE
        -- Short code format
        SELECT id INTO target_room_id FROM rooms WHERE (short_code = upper(p_room_identifier) OR join_code = upper(p_room_identifier)) AND is_active = true;
    END IF;
    
    IF target_room_id IS NULL THEN
        RETURN json_build_object('status', 'error', 'code', 'ROOM_NOT_FOUND');
    END IF;
    
    -- Check if already a member
    IF EXISTS (SELECT 1 FROM room_members WHERE room_id = target_room_id AND user_id = auth.uid()) THEN
        RETURN json_build_object('status', 'ok', 'code', 'ALREADY_MEMBER');
    END IF;
    
    -- Check capacity
    SELECT COUNT(*), r.max_members INTO current_members, max_capacity
    FROM room_members rm
    JOIN rooms r ON r.id = rm.room_id
    WHERE rm.room_id = target_room_id
    GROUP BY r.max_members;
    
    IF current_members >= max_capacity THEN
        RETURN json_build_object('status', 'error', 'code', 'MAX_CAPACITY');
    END IF;
    
    -- Check if room is public or user has permission
    SELECT * INTO room_record FROM rooms WHERE id = target_room_id;
    IF NOT room_record.is_public THEN
        RETURN json_build_object('status', 'error', 'code', 'ROOM_PRIVATE');
    END IF;
    
    -- Join room
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (target_room_id, auth.uid(), 'member', NOW());
    
    -- Get membership data
    SELECT rm.*, p.full_name, p.avatar_url, p.username
    INTO member_record
    FROM room_members rm
    LEFT JOIN profiles p ON p.id = rm.user_id
    WHERE rm.room_id = target_room_id AND rm.user_id = auth.uid();
    
    RETURN json_build_object(
        'status', 'ok', 
        'code', 'JOINED',
        'membership', row_to_json(member_record)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_room_member_count(p_room_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM room_members 
        WHERE room_id = p_room_id
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_join_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_and_join(TEXT, TEXT, TEXT, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_safe(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_member_count(UUID) TO authenticated;

-- 12. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_rooms_active_public ON rooms(is_active, is_public) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_join_code ON rooms(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_short_code ON rooms(short_code) WHERE short_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_from_user ON friends(from_user);
CREATE INDEX IF NOT EXISTS idx_friends_to_user ON friends(to_user);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- 13. Create materialized view for popular rooms
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_rooms AS
SELECT 
    r.*,
    COUNT(rm.user_id) as member_count,
    p.full_name as creator_name,
    p.avatar_url as creator_avatar
FROM rooms r
LEFT JOIN room_members rm ON rm.room_id = r.id
LEFT JOIN profiles p ON p.id = r.creator_id
WHERE r.is_active = true AND r.is_public = true
GROUP BY r.id, p.full_name, p.avatar_url
ORDER BY member_count DESC, r.created_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_rooms_id ON popular_rooms(id);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_popular_rooms()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_rooms;
END;
$$ LANGUAGE plpgsql;

-- 14. Add triggers for updating stats
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'rooms' THEN
            UPDATE profiles SET rooms_created = rooms_created + 1 WHERE id = NEW.creator_id;
        ELSIF TG_TABLE_NAME = 'room_members' THEN
            UPDATE profiles SET rooms_joined = rooms_joined + 1 WHERE id = NEW.user_id;
        ELSIF TG_TABLE_NAME = 'messages' THEN
            UPDATE profiles SET messages_sent = messages_sent + 1 WHERE id = NEW.sender_id;
        ELSIF TG_TABLE_NAME = 'friends' AND NEW.status = 'accepted' THEN
            UPDATE profiles SET friends_count = friends_count + 1 WHERE id = NEW.from_user;
            UPDATE profiles SET friends_count = friends_count + 1 WHERE id = NEW.to_user;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'room_members' THEN
            UPDATE profiles SET rooms_joined = rooms_joined - 1 WHERE id = OLD.user_id;
        ELSIF TG_TABLE_NAME = 'friends' AND OLD.status = 'accepted' THEN
            UPDATE profiles SET friends_count = friends_count - 1 WHERE id = OLD.from_user;
            UPDATE profiles SET friends_count = friends_count - 1 WHERE id = OLD.to_user;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_rooms_created ON rooms;
CREATE TRIGGER trigger_update_rooms_created
    AFTER INSERT ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

DROP TRIGGER IF EXISTS trigger_update_rooms_joined ON room_members;
CREATE TRIGGER trigger_update_rooms_joined
    AFTER INSERT OR DELETE ON room_members
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

DROP TRIGGER IF EXISTS trigger_update_messages_sent ON messages;
CREATE TRIGGER trigger_update_messages_sent
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

DROP TRIGGER IF EXISTS trigger_update_friends_count ON friends;
CREATE TRIGGER trigger_update_friends_count
    AFTER INSERT OR UPDATE OR DELETE ON friends
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_stats();

-- 15. Refresh schema cache
NOTIFY pgrst, 'reload schema';