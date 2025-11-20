-- Phase 2: Room Join Requests, Message Pagination, and Notification Preferences

-- Create room_join_requests table for private room approval flow
CREATE TABLE IF NOT EXISTS room_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  UNIQUE(room_id, user_id)
);

ALTER TABLE room_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create join requests"
  ON room_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
  ON room_join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Room admins can view requests"
  ON room_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_join_requests.room_id
      AND (r.created_by = auth.uid() OR r.creator_id = auth.uid())
    )
  );

CREATE POLICY "Room admins can update requests"
  ON room_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      WHERE r.id = room_join_requests.room_id
      AND (r.created_by = auth.uid() OR r.creator_id = auth.uid())
    )
  );

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  friend_requests boolean DEFAULT true,
  messages boolean DEFAULT true,
  room_invites boolean DEFAULT true,
  system_updates boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for room join requests
CREATE OR REPLACE FUNCTION handle_room_join_request_changes()
RETURNS TRIGGER AS $$
DECLARE
  room_name text;
  requester_name text;
  room_creator uuid;
BEGIN
  SELECT name, created_by INTO room_name, room_creator
  FROM rooms WHERE id = NEW.room_id;
  
  SELECT full_name INTO requester_name
  FROM profiles WHERE id = NEW.user_id;
  
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, title, content, data)
    VALUES (
      room_creator,
      'room_invite',
      'New Room Join Request',
      requester_name || ' wants to join ' || room_name,
      jsonb_build_object(
        'request_id', NEW.id,
        'room_id', NEW.room_id,
        'user_id', NEW.user_id
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (NEW.room_id, NEW.user_id, 'member', NOW())
    ON CONFLICT DO NOTHING;
    
    INSERT INTO notifications (user_id, type, title, content, data)
    VALUES (
      NEW.user_id,
      'room_invite',
      'Join Request Approved',
      'Your request to join ' || room_name || ' was approved',
      jsonb_build_object('room_id', NEW.room_id, 'status', 'approved')
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'declined' THEN
    INSERT INTO notifications (user_id, type, title, content, data)
    VALUES (
      NEW.user_id,
      'room_invite',
      'Join Request Declined',
      'Your request to join ' || room_name || ' was declined',
      jsonb_build_object('room_id', NEW.room_id, 'status', 'declined')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_room_join_requests
AFTER INSERT OR UPDATE ON room_join_requests
FOR EACH ROW EXECUTE FUNCTION handle_room_join_request_changes();

ALTER PUBLICATION supabase_realtime ADD TABLE room_join_requests;
ALTER TABLE room_join_requests REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
ALTER TABLE notification_preferences REPLICA IDENTITY FULL;
