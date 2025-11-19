-- ============================================================================
-- Phase 1 Part 2: Functions, triggers, and security
-- ============================================================================

-- Rate limiting for friend requests (anti-spam)
CREATE OR REPLACE FUNCTION check_friend_request_rate_limit(p_sender_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM friend_requests
  WHERE sender_id = p_sender_id
    AND created_at > NOW() - INTERVAL '1 hour';
  RETURN request_count < 10;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_friend_request_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_friend_request_rate_limit(NEW.sender_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more friend requests.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_request_rate_limit ON friend_requests;
CREATE TRIGGER trg_friend_request_rate_limit
BEFORE INSERT ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION enforce_friend_request_rate_limit();

-- Friend recommendation algorithm
CREATE OR REPLACE FUNCTION recommend_friends(
  p_user_id uuid,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  username varchar,
  full_name text,
  avatar_url text,
  bio text,
  xp int,
  level int,
  interests text[],
  score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_data AS (
    SELECT p.interests, p.level
    FROM profiles p
    WHERE p.id = p_user_id
  ),
  excluded_users AS (
    SELECT friend_id FROM friends WHERE user_id = p_user_id
    UNION
    SELECT receiver_id FROM friend_requests WHERE sender_id = p_user_id AND status = 'pending'
    UNION
    SELECT sender_id FROM friend_requests WHERE receiver_id = p_user_id AND status = 'pending'
    UNION
    SELECT p_user_id
  )
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.xp,
    p.level,
    p.interests,
    (
      (SELECT COUNT(*) * 5.0 FROM unnest(p.interests) i WHERE i = ANY((SELECT interests FROM user_data))) +
      CASE 
        WHEN ABS(p.level - (SELECT level FROM user_data)) <= 2 THEN 3.0
        ELSE 0.0
      END +
      CASE 
        WHEN p.last_active_at > NOW() - INTERVAL '7 days' THEN 2.0
        ELSE 0.0
      END +
      RANDOM()
    ) AS score
  FROM profiles p
  WHERE p.id NOT IN (SELECT * FROM excluded_users)
    AND p.is_deleted = false
  ORDER BY score DESC, p.last_active_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- DM limit enforcement
CREATE OR REPLACE FUNCTION check_dm_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  dm_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriptions.user_id = p_user_id
      AND status = 'active'
      AND end_date > NOW()
  ) INTO is_premium;
  
  IF is_premium THEN
    RETURN true;
  END IF;
  
  SELECT COUNT(DISTINCT dc.id) INTO dm_count
  FROM direct_chats dc
  WHERE dc.user_a = p_user_id OR dc.user_b = p_user_id;
  
  RETURN dm_count < 3;
END;
$$;

-- Blocking and reporting tables
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('spam', 'harassment', 'inappropriate_content', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id)
);

-- RLS for blocked_users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_blocks ON blocked_users;
CREATE POLICY select_own_blocks ON blocked_users
FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS insert_own_block ON blocked_users;
CREATE POLICY insert_own_block ON blocked_users
FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS delete_own_block ON blocked_users;
CREATE POLICY delete_own_block ON blocked_users
FOR DELETE USING (auth.uid() = blocker_id);

-- RLS for user_reports
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_reports ON user_reports;
CREATE POLICY select_own_reports ON user_reports
FOR SELECT USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS insert_own_report ON user_reports;
CREATE POLICY insert_own_report ON user_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Update friend_requests trigger
CREATE OR REPLACE FUNCTION handle_friend_request_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_profile profiles%ROWTYPE;
  receiver_profile profiles%ROWTYPE;
  is_blocked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = NEW.sender_id AND blocked_id = NEW.receiver_id)
       OR (blocker_id = NEW.receiver_id AND blocked_id = NEW.sender_id)
  ) INTO is_blocked;
  
  IF is_blocked AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Cannot send friend request to blocked user';
  END IF;
  
  SELECT * INTO sender_profile FROM profiles WHERE id = NEW.sender_id;
  SELECT * INTO receiver_profile FROM profiles WHERE id = NEW.receiver_id;
  
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, content, data, is_read)
    VALUES (
      NEW.receiver_id,
      'friend_request',
      'New Friend Request',
      sender_profile.full_name || ' sent you a friend request',
      jsonb_build_object(
        'request_id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_username', sender_profile.username,
        'sender_name', sender_profile.full_name,
        'sender_avatar', sender_profile.avatar_url,
        'message', NEW.message
      ),
      false
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO friends (user_id, friend_id) 
    VALUES (NEW.sender_id, NEW.receiver_id), (NEW.receiver_id, NEW.sender_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    INSERT INTO notifications (user_id, type, title, content, data, is_read)
    VALUES (
      NEW.sender_id,
      'friend_accept',
      'Friend Request Accepted',
      receiver_profile.full_name || ' accepted your friend request',
      jsonb_build_object(
        'request_id', NEW.id,
        'receiver_id', NEW.receiver_id,
        'receiver_username', receiver_profile.username
      ),
      false
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'declined' THEN
    INSERT INTO notifications (user_id, type, title, content, data, is_read)
    VALUES (
      NEW.sender_id,
      'friend_decline',
      'Friend Request Declined',
      'Your friend request was declined',
      jsonb_build_object(
        'request_id', NEW.id,
        'receiver_id', NEW.receiver_id
      ),
      false
    );
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_requests_after ON friend_requests;
CREATE TRIGGER trg_friend_requests_after
BEFORE INSERT OR UPDATE ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION handle_friend_request_changes();
