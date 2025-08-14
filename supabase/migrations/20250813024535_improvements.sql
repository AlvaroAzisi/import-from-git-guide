-- Add data validation constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT chk_bio_length CHECK (char_length(bio) <= 500),
  ADD CONSTRAINT chk_full_name_length CHECK (char_length(full_name) <= 100),
  ADD CONSTRAINT chk_username_format CHECK (username ~* '^[A-Za-z0-9_]{3,30}$'),
  ADD CONSTRAINT chk_xp_range CHECK (xp >= 0),
  ADD CONSTRAINT chk_streak_range CHECK (streak >= 0),
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN username SET NOT NULL;

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_room_members_user_role ON public.room_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friends_users_status ON public.friends(user_id, friend_id, status);

-- Add partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_active_public_rooms 
  ON public.rooms(created_at DESC) 
  WHERE is_active = true AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_pending_friend_requests 
  ON public.friends(created_at DESC) 
  WHERE status = 'pending';

-- Add BRIN indexes for timestamp columns (efficient for large, sequential data)
CREATE INDEX IF NOT EXISTS idx_messages_created_brin ON public.messages USING BRIN(created_at);
CREATE INDEX IF NOT EXISTS idx_rooms_created_brin ON public.rooms USING BRIN(created_at);

-- Add rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  userid uuid,
  action text,
  max_requests int,
  window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count int;
BEGIN
  SELECT COUNT(*)
  INTO request_count
  FROM ( 
    SELECT created_at 
    FROM audit_logs 
    WHERE user_id = userid 
    AND action_type = action
    AND created_at > now() - (window_seconds || ' seconds')::interval
    LIMIT max_requests
  ) AS recent_requests;
  
  RETURN request_count < max_requests;
END;
$$;

-- Create audit_logs table for rate limiting
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_time 
  ON public.audit_logs(user_id, action_type, created_at DESC);

-- Add more granular RLS policies
CREATE POLICY "Users can only view profiles of connections"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.friends
    WHERE status = 'accepted' 
    AND ((user_id = auth.uid() AND friend_id = profiles.id)
    OR (friend_id = auth.uid() AND user_id = profiles.id))
  ) OR
  EXISTS (
    SELECT 1 FROM public.room_members rm1
    JOIN public.room_members rm2 ON rm1.room_id = rm2.room_id
    WHERE rm1.user_id = auth.uid() AND rm2.user_id = profiles.id
  )
);

-- Add function to automatically clean old audit logs
CREATE OR REPLACE FUNCTION public.clean_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;

-- Note: To enable automated cleanup, you need to:
-- 1. Contact Supabase support to enable pg_cron extension
-- 2. Once enabled, uncomment and run:
/*
-- Enable pg_cron extension (requires superuser privileges)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a scheduled job to clean old audit logs
-- SELECT cron.schedule(
--   'clean_audit_logs_daily',
--   '0 0 * * *',  -- Run at midnight every day
--   $$SELECT public.clean_old_audit_logs()$$
-- );
*/

-- For now, you can manually run this function periodically:
-- SELECT public.clean_old_audit_logs();

-- Add triggers for automatic data cleanup
CREATE OR REPLACE FUNCTION public.delete_old_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE room_id = NEW.id
  AND created_at < now() - INTERVAL '90 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER clean_old_messages_trigger
  AFTER UPDATE OF is_active ON public.rooms
  FOR EACH ROW
  WHEN (NEW.is_active = false)
  EXECUTE FUNCTION public.delete_old_messages();
