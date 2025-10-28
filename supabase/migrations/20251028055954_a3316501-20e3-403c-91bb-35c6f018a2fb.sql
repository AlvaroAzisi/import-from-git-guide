-- ================================================================
-- Security Fixes for Warning-Level Issues
-- ================================================================

-- 1. Create user_roles system for proper authorization
-- ================================================================
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only admins can view all roles (requires has_role function first)
-- We'll add this after the function is created

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Now add the admin-only policy
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2. Fix room_members UPDATE policy
-- ================================================================
-- Drop conflicting/overlapping policies first
DROP POLICY IF EXISTS "Room creators can manage members" ON room_members;
DROP POLICY IF EXISTS "Users can read room members" ON room_members;

-- Allow room creators to update member details (like role changes)
CREATE POLICY "Room creators can update member details" ON room_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE id = room_members.room_id
        AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE id = room_members.room_id
        AND created_by = auth.uid()
    )
  );

-- 3. Add RLS policies for room admins (not just creators)
-- ================================================================
-- Replace the existing policies with ones that support room admins
DROP POLICY IF EXISTS "Creators can update own rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update own rooms" ON rooms;

CREATE POLICY "Creators and admins can update rooms" ON rooms
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = rooms.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Creators can delete own rooms" ON rooms;

CREATE POLICY "Creators and admins can delete rooms" ON rooms
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_id = rooms.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 4. Badges table management policies
-- ================================================================
-- Allow admins to manage badges
CREATE POLICY "Admins can insert badges" ON badges
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update badges" ON badges
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete badges" ON badges
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 5. Add validation constraints for notifications
-- ================================================================
-- Limit notification content length
ALTER TABLE notifications
  ADD CONSTRAINT notifications_content_length
  CHECK (content IS NULL OR length(content) <= 500);

-- Limit notification data JSONB size
ALTER TABLE notifications
  ADD CONSTRAINT notifications_data_size
  CHECK (pg_column_size(data) < 4096);

-- 6. Add validation for notification title
ALTER TABLE notifications
  ADD CONSTRAINT notifications_title_length
  CHECK (length(title) > 0 AND length(title) <= 200);