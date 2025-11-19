-- ============================================================================
-- Phase 1 Part 1: Schema fixes and indexes
-- ============================================================================

-- Add missing columns to friend_requests
ALTER TABLE friend_requests 
ADD COLUMN IF NOT EXISTS message text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure friend_requests.id is UUID (not bigint)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'friend_requests' 
    AND column_name = 'id' 
    AND data_type = 'bigint'
  ) THEN
    ALTER TABLE friend_requests ADD COLUMN id_new uuid DEFAULT gen_random_uuid();
    UPDATE friend_requests SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    ALTER TABLE friend_requests DROP COLUMN id CASCADE;
    ALTER TABLE friend_requests RENAME COLUMN id_new TO id;
    ALTER TABLE friend_requests ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Ensure friends.id is UUID (not bigint)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'friends' 
    AND column_name = 'id' 
    AND data_type = 'bigint'
  ) THEN
    ALTER TABLE friends ADD COLUMN id_new uuid DEFAULT gen_random_uuid();
    UPDATE friends SET id_new = gen_random_uuid() WHERE id_new IS NULL;
    ALTER TABLE friends DROP COLUMN id CASCADE;
    ALTER TABLE friends RENAME COLUMN id_new TO id;
    ALTER TABLE friends ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Add unique constraints and indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_unique_pending
ON friend_requests(sender_id, receiver_id) WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_friends_unique
ON friends(user_id, friend_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Set replica identity for realtime
ALTER TABLE friend_requests REPLICA IDENTITY FULL;
ALTER TABLE friends REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
