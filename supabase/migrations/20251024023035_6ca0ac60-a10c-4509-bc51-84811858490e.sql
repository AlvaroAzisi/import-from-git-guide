-- 1) Ensure profiles has necessary columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- 2) Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester, recipient)
);

-- 3) Create friendships table (bidirectional)
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- 4) Create direct_chats table
CREATE TABLE IF NOT EXISTS direct_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint for canonical ordering
CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_chats_canonical 
ON direct_chats (LEAST(user_a::text, user_b::text), GREATEST(user_a::text, user_b::text));

-- 5) Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  sender uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_chat_id ON direct_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);

-- 7) Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- 8) RLS Policies for friend_requests
DROP POLICY IF EXISTS friend_request_insert_by_requester ON friend_requests;
CREATE POLICY friend_request_insert_by_requester ON friend_requests
  FOR INSERT 
  WITH CHECK (requester = auth.uid());

DROP POLICY IF EXISTS friend_request_update_by_recipient ON friend_requests;
CREATE POLICY friend_request_update_by_recipient ON friend_requests
  FOR UPDATE 
  USING (recipient = auth.uid())
  WITH CHECK (recipient = auth.uid());

DROP POLICY IF EXISTS friend_request_select ON friend_requests;
CREATE POLICY friend_request_select ON friend_requests
  FOR SELECT 
  USING (requester = auth.uid() OR recipient = auth.uid());

DROP POLICY IF EXISTS friend_request_delete_by_participants ON friend_requests;
CREATE POLICY friend_request_delete_by_participants ON friend_requests
  FOR DELETE 
  USING (requester = auth.uid() OR recipient = auth.uid());

-- 9) RLS Policies for friendships
DROP POLICY IF EXISTS friendship_select ON friendships;
CREATE POLICY friendship_select ON friendships
  FOR SELECT 
  USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS friendships_insert_owner ON friendships;
CREATE POLICY friendships_insert_owner ON friendships
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS friendships_delete_owner ON friendships;
CREATE POLICY friendships_delete_owner ON friendships
  FOR DELETE 
  USING (user_id = auth.uid());

-- 10) RLS Policies for direct_chats
DROP POLICY IF EXISTS direct_chats_select ON direct_chats;
CREATE POLICY direct_chats_select ON direct_chats
  FOR SELECT 
  USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS direct_chats_insert ON direct_chats;
CREATE POLICY direct_chats_insert ON direct_chats
  FOR INSERT 
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- 11) RLS Policies for direct_messages
DROP POLICY IF EXISTS direct_messages_select ON direct_messages;
CREATE POLICY direct_messages_select ON direct_messages
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM direct_chats dc 
      WHERE dc.id = direct_messages.chat_id 
      AND (dc.user_a = auth.uid() OR dc.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS direct_messages_insert ON direct_messages;
CREATE POLICY direct_messages_insert ON direct_messages
  FOR INSERT 
  WITH CHECK (
    sender = auth.uid() AND
    EXISTS (
      SELECT 1 FROM direct_chats dc 
      WHERE dc.id = direct_messages.chat_id 
      AND (dc.user_a = auth.uid() OR dc.user_b = auth.uid())
    )
  );

-- 12) Trigger function to handle friend request status changes
CREATE OR REPLACE FUNCTION handle_friend_request_status_change()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Send notification to recipient
    INSERT INTO notifications(user_id, type, title, content, data)
    VALUES (
      NEW.recipient, 
      'friend_request',
      'New Friend Request',
      (SELECT full_name FROM profiles WHERE id = NEW.requester) || ' sent you a friend request',
      jsonb_build_object('request_id', NEW.id, 'from_user_id', NEW.requester, 'message', NEW.message)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.status = 'pending' AND NEW.status = 'accepted') THEN
      -- Create mutual friendships
      INSERT INTO friendships(user_id, friend_id) 
      VALUES (NEW.requester, NEW.recipient) 
      ON CONFLICT DO NOTHING;
      
      INSERT INTO friendships(user_id, friend_id) 
      VALUES (NEW.recipient, NEW.requester) 
      ON CONFLICT DO NOTHING;
      
      -- Notify requester of acceptance
      INSERT INTO notifications(user_id, type, title, content, data)
      VALUES (
        NEW.requester, 
        'system',
        'Friend Request Accepted',
        (SELECT full_name FROM profiles WHERE id = NEW.recipient) || ' accepted your friend request',
        jsonb_build_object('request_id', NEW.id, 'accepted_by', NEW.recipient)
      );
      
      RETURN NEW;
    ELSIF (OLD.status = 'pending' AND NEW.status = 'declined') THEN
      -- Notify requester of decline
      INSERT INTO notifications(user_id, type, title, content, data)
      VALUES (
        NEW.requester, 
        'system',
        'Friend Request Declined',
        (SELECT full_name FROM profiles WHERE id = NEW.recipient) || ' declined your friend request',
        jsonb_build_object('request_id', NEW.id, 'declined_by', NEW.recipient)
      );
      
      RETURN NEW;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trg_friend_request_changes ON friend_requests;
CREATE TRIGGER trg_friend_request_changes
AFTER INSERT OR UPDATE ON friend_requests
FOR EACH ROW EXECUTE FUNCTION handle_friend_request_status_change();

-- 13) Recommendation algorithm function
CREATE OR REPLACE FUNCTION recommendations_for_user(p_user uuid, p_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid, 
  username text, 
  full_name text, 
  avatar_url text, 
  bio text,
  interests text[], 
  last_active_at timestamptz,
  xp int,
  level int,
  score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.username, 
    p.full_name, 
    p.avatar_url,
    p.bio,
    p.interests, 
    p.last_active_at,
    p.xp,
    p.level,
    (
      -- Shared interests score (weighted heavily)
      COALESCE(
        array_length(
          ARRAY(
            SELECT unnest(p.interests) 
            INTERSECT 
            SELECT unnest((SELECT interests FROM profiles WHERE id = p_user))
          ), 
          1
        ), 
        0
      ) * 2.0
      -- Recent activity boost
      + CASE 
          WHEN p.last_active_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (now() - p.last_active_at)) * -0.000001
          ELSE -1
        END
      -- Randomness factor
      + random() * 0.5
    ) AS score
  FROM profiles p
  WHERE p.id <> p_user
    AND p.is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM friendships f 
      WHERE f.user_id = p_user AND f.friend_id = p.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM friend_requests fr
      WHERE (fr.requester = p_user AND fr.recipient = p.id)
         OR (fr.requester = p.id AND fr.recipient = p_user)
    )
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 14) Helper function to find or create direct chat
CREATE OR REPLACE FUNCTION find_or_create_direct_chat(p_user_a uuid, p_user_b uuid)
RETURNS uuid AS $$
DECLARE
  v_chat_id uuid;
  v_canonical_a uuid;
  v_canonical_b uuid;
BEGIN
  -- Ensure users are friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships 
    WHERE user_id = p_user_a AND friend_id = p_user_b
  ) THEN
    RAISE EXCEPTION 'Users must be friends to create a chat';
  END IF;

  -- Canonical ordering
  IF p_user_a::text < p_user_b::text THEN
    v_canonical_a := p_user_a;
    v_canonical_b := p_user_b;
  ELSE
    v_canonical_a := p_user_b;
    v_canonical_b := p_user_a;
  END IF;

  -- Try to find existing chat
  SELECT id INTO v_chat_id
  FROM direct_chats
  WHERE user_a = v_canonical_a AND user_b = v_canonical_b;

  -- Create if doesn't exist
  IF v_chat_id IS NULL THEN
    INSERT INTO direct_chats (user_a, user_b)
    VALUES (v_canonical_a, v_canonical_b)
    RETURNING id INTO v_chat_id;
  END IF;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15) Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_chats;