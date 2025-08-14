/*
  # Atomic Room Operations and Performance Optimization

  1. New Functions
    - `create_room_and_join` - Atomic room creation and membership
    - `join_room` - Safe room joining with validation
    - `leave_room` - Safe room leaving
    - `get_room_details` - Optimized room info retrieval

  2. Performance Improvements
    - Optimized indexes for high-read queries
    - Composite indexes for common query patterns
    - Partial indexes for active rooms

  3. Data Integrity
    - Additional constraints and validations
    - Atomic operations to prevent race conditions
    - Proper error handling and status codes

  4. Security
    - Enhanced RLS policies
    - Input validation in functions
    - Rate limiting considerations
*/

-- Add missing columns and constraints
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_active_public_created 
  ON public.rooms(created_at DESC) 
  WHERE is_active = true AND is_public = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_rooms_creator_active 
  ON public.rooms(creator_id, created_at DESC) 
  WHERE is_active = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_room_members_user_joined 
  ON public.room_members(user_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_members_room_role 
  ON public.room_members(room_id, role);

CREATE INDEX IF NOT EXISTS idx_messages_room_created_desc 
  ON public.messages(room_id, created_at DESC);

-- Partial index for short codes (only active rooms)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_short_code_active 
  ON public.rooms(short_code) 
  WHERE is_active = true AND is_deleted = false AND short_code IS NOT NULL;

-- Atomic room creation and joining
CREATE OR REPLACE FUNCTION public.create_room_and_join(
  p_user_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_subject text DEFAULT '',
  p_is_public boolean DEFAULT true,
  p_max_members integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id uuid;
  new_membership_id uuid;
  room_data jsonb;
  membership_data jsonb;
  generated_code text;
BEGIN
  -- Validate authentication
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'UNAUTHORIZED',
      'message', 'Invalid user authentication'
    );
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'INVALID_INPUT',
      'message', 'Room name is required'
    );
  END IF;

  IF p_max_members < 2 OR p_max_members > 100 THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'INVALID_INPUT',
      'message', 'Max members must be between 2 and 100'
    );
  END IF;

  -- Generate unique short code
  generated_code := public.generate_short_code();

  -- Create room (atomic with membership)
  BEGIN
    INSERT INTO public.rooms (
      name,
      description,
      subject,
      creator_id,
      is_public,
      max_members,
      is_active,
      short_code
    ) VALUES (
      trim(p_name),
      trim(p_description),
      trim(p_subject),
      p_user_id,
      p_is_public,
      p_max_members,
      true,
      generated_code
    ) RETURNING id INTO new_room_id;

    -- Add creator as admin member
    INSERT INTO public.room_members (
      room_id,
      user_id,
      role
    ) VALUES (
      new_room_id,
      p_user_id,
      'admin'
    ) RETURNING id INTO new_membership_id;

    -- Get room data for response
    SELECT to_jsonb(r.*) INTO room_data
    FROM public.rooms r
    WHERE r.id = new_room_id;

    -- Get membership data for response
    SELECT to_jsonb(rm.*) INTO membership_data
    FROM public.room_members rm
    WHERE rm.id = new_membership_id;

    RETURN jsonb_build_object(
      'status', 'ok',
      'code', 'CREATED',
      'room', room_data,
      'membership', membership_data
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'code', 'DATABASE_ERROR',
        'message', SQLERRM
      );
  END;
END;
$$;

-- Safe room joining with comprehensive validation
CREATE OR REPLACE FUNCTION public.join_room(
  p_user_id uuid,
  p_room_identifier text -- Can be room ID or short_code
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room_id uuid;
  room_record record;
  member_count integer;
  new_membership_id uuid;
  membership_data jsonb;
  room_data jsonb;
BEGIN
  -- Validate authentication
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'UNAUTHORIZED',
      'message', 'Invalid user authentication'
    );
  END IF;

  -- Find room by ID or short_code
  IF length(p_room_identifier) > 10 AND p_room_identifier ~ '^[0-9a-f\-]+$' THEN
    -- Looks like UUID
    SELECT * INTO room_record
    FROM public.rooms
    WHERE id = p_room_identifier::uuid 
      AND is_active = true 
      AND is_deleted = false;
  ELSE
    -- Treat as short_code
    SELECT * INTO room_record
    FROM public.rooms
    WHERE short_code = upper(trim(p_room_identifier)) 
      AND is_active = true 
      AND is_deleted = false;
  END IF;

  -- Check if room exists
  IF room_record IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'ROOM_NOT_FOUND',
      'message', 'Room not found or inactive'
    );
  END IF;

  target_room_id := room_record.id;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = target_room_id AND user_id = p_user_id
  ) THEN
    -- Get room data for response
    SELECT to_jsonb(r.*) INTO room_data
    FROM public.rooms r
    WHERE r.id = target_room_id;

    RETURN jsonb_build_object(
      'status', 'ok',
      'code', 'ALREADY_MEMBER',
      'room_id', target_room_id,
      'room', room_data,
      'message', 'Already a member of this room'
    );
  END IF;

  -- Check room capacity
  SELECT COUNT(*) INTO member_count
  FROM public.room_members
  WHERE room_id = target_room_id;

  IF member_count >= room_record.max_members THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'ROOM_FULL',
      'message', 'Room is at maximum capacity'
    );
  END IF;

  -- Check if room is public or user has permission
  IF NOT room_record.is_public THEN
    -- Check if user has a pending accepted request
    IF NOT EXISTS (
      SELECT 1 FROM public.room_requests
      WHERE room_id = target_room_id 
        AND user_id = p_user_id 
        AND status = 'accepted'
    ) THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'code', 'ROOM_PRIVATE',
        'message', 'Room is private and requires invitation'
      );
    END IF;
  END IF;

  -- Add user as member
  BEGIN
    INSERT INTO public.room_members (
      room_id,
      user_id,
      role
    ) VALUES (
      target_room_id,
      p_user_id,
      'member'
    ) RETURNING id INTO new_membership_id;

    -- Get room and membership data for response
    SELECT to_jsonb(r.*) INTO room_data
    FROM public.rooms r
    WHERE r.id = target_room_id;

    SELECT to_jsonb(rm.*) INTO membership_data
    FROM public.room_members rm
    WHERE rm.id = new_membership_id;

    RETURN jsonb_build_object(
      'status', 'ok',
      'code', 'JOINED',
      'room_id', target_room_id,
      'room', room_data,
      'membership', membership_data,
      'message', 'Successfully joined room'
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'status', 'ok',
        'code', 'ALREADY_MEMBER',
        'room_id', target_room_id,
        'message', 'Already a member of this room'
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'code', 'DATABASE_ERROR',
        'message', SQLERRM
      );
  END;
END;
$$;

-- Safe room leaving
CREATE OR REPLACE FUNCTION public.leave_room(
  p_user_id uuid,
  p_room_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_record record;
  remaining_admins integer;
BEGIN
  -- Validate authentication
  IF p_user_id IS NULL OR p_user_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'UNAUTHORIZED',
      'message', 'Invalid user authentication'
    );
  END IF;

  -- Check if user is a member
  SELECT * INTO member_record
  FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;

  IF member_record IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'NOT_MEMBER',
      'message', 'Not a member of this room'
    );
  END IF;

  -- If user is admin, check if there are other admins
  IF member_record.role = 'admin' THEN
    SELECT COUNT(*) INTO remaining_admins
    FROM public.room_members
    WHERE room_id = p_room_id 
      AND role = 'admin' 
      AND user_id != p_user_id;

    IF remaining_admins = 0 THEN
      -- Last admin leaving - mark room as inactive
      UPDATE public.rooms
      SET is_active = false, updated_at = now()
      WHERE id = p_room_id;
    END IF;
  END IF;

  -- Remove membership
  DELETE FROM public.room_members
  WHERE room_id = p_room_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'code', 'LEFT',
    'message', 'Successfully left room'
  );
END;
$$;

-- Optimized room details retrieval
CREATE OR REPLACE FUNCTION public.get_room_details(
  p_room_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_data jsonb;
  member_count integer;
  user_is_member boolean;
  user_role text;
BEGIN
  -- Get room data
  SELECT to_jsonb(r.*) INTO room_data
  FROM public.rooms r
  WHERE r.id = p_room_id 
    AND r.is_active = true 
    AND r.is_deleted = false;

  IF room_data IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'code', 'ROOM_NOT_FOUND',
      'message', 'Room not found'
    );
  END IF;

  -- Get member count
  SELECT COUNT(*) INTO member_count
  FROM public.room_members
  WHERE room_id = p_room_id;

  -- Check user membership
  SELECT 
    EXISTS(SELECT 1 FROM public.room_members WHERE room_id = p_room_id AND user_id = p_user_id),
    COALESCE((SELECT role FROM public.room_members WHERE room_id = p_room_id AND user_id = p_user_id), 'none')
  INTO user_is_member, user_role;

  RETURN jsonb_build_object(
    'status', 'ok',
    'room', room_data,
    'member_count', member_count,
    'user_is_member', user_is_member,
    'user_role', user_role
  );
END;
$$;

-- Enhanced room member count function with caching considerations
CREATE OR REPLACE FUNCTION public.get_room_member_count(p_room_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.room_members
  WHERE room_id = p_room_id;
$$;

-- Function to check if user can join room
CREATE OR REPLACE FUNCTION public.can_join_room(
  p_room_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_record record;
  member_count integer;
  is_member boolean;
BEGIN
  -- Get room info
  SELECT * INTO room_record
  FROM public.rooms
  WHERE id = p_room_id 
    AND is_active = true 
    AND is_deleted = false;

  IF room_record IS NULL THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'ROOM_NOT_FOUND'
    );
  END IF;

  -- Check if already member
  SELECT EXISTS(
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  ) INTO is_member;

  IF is_member THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'ALREADY_MEMBER'
    );
  END IF;

  -- Check capacity
  SELECT COUNT(*) INTO member_count
  FROM public.room_members
  WHERE room_id = p_room_id;

  IF member_count >= room_record.max_members THEN
    RETURN jsonb_build_object(
      'can_join', false,
      'reason', 'ROOM_FULL'
    );
  END IF;

  -- Check privacy
  IF NOT room_record.is_public THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.room_requests
      WHERE room_id = p_room_id 
        AND user_id = p_user_id 
        AND status = 'accepted'
    ) THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'ROOM_PRIVATE'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'can_join', true,
    'reason', 'OK'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_room_and_join(uuid, text, text, text, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_room(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_details(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_join_room(uuid, uuid) TO authenticated;

-- Update RLS policies for better performance
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.rooms;
CREATE POLICY "Users can view rooms they are members of" 
ON public.rooms 
FOR SELECT 
USING (
  is_active = true 
  AND is_deleted = false 
  AND (
    is_public = true 
    OR creator_id = auth.uid()
    OR public.is_user_room_member(id, auth.uid())
  )
);

-- Enhanced room members policy
DROP POLICY IF EXISTS "Room members can view other members" ON public.room_members;
CREATE POLICY "Room members can view other members" 
ON public.room_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
      AND r.is_active = true
      AND r.is_deleted = false
      AND (
        r.is_public = true
        OR public.is_user_room_member(r.id, auth.uid())
      )
  )
);

-- Add trigger to update room updated_at on member changes
CREATE OR REPLACE FUNCTION public.update_room_on_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.rooms 
    SET updated_at = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE public.rooms 
    SET updated_at = now()
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_room_on_member_change_trigger
  AFTER INSERT OR DELETE ON public.room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_room_on_member_change();

-- Add materialized view for popular rooms (for caching)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.popular_rooms AS
SELECT 
  r.*,
  COUNT(rm.id) as member_count,
  COUNT(m.id) as message_count
FROM public.rooms r
LEFT JOIN public.room_members rm ON rm.room_id = r.id
LEFT JOIN public.messages m ON m.room_id = r.id AND m.created_at > now() - interval '7 days'
WHERE r.is_active = true 
  AND r.is_deleted = false 
  AND r.is_public = true
GROUP BY r.id
ORDER BY member_count DESC, message_count DESC, r.created_at DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_rooms_member_count 
  ON public.popular_rooms(member_count DESC, created_at DESC);

-- Function to refresh popular rooms (call periodically)
CREATE OR REPLACE FUNCTION public.refresh_popular_rooms()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW public.popular_rooms;
$$;

-- Add connection pooling recommendations as comments
/*
  CONNECTION POOLING RECOMMENDATIONS:
  
  1. Configure pgbouncer with:
     - pool_mode = transaction (for better concurrency)
     - max_client_conn = 100 (adjust based on expected load)
     - default_pool_size = 20 (adjust based on DB capacity)
  
  2. Use Supabase connection pooling:
     - Enable connection pooling in Supabase dashboard
     - Use pooled connection string for high-traffic operations
  
  3. Application-level optimizations:
     - Implement connection retry logic
     - Use read replicas for read-heavy operations
     - Cache popular rooms data in Redis/memory
*/

-- Add performance monitoring views
CREATE OR REPLACE VIEW public.room_performance_stats AS
SELECT 
  r.id,
  r.name,
  COUNT(DISTINCT rm.user_id) as member_count,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT CASE WHEN m.created_at > now() - interval '24 hours' THEN m.id END) as messages_24h,
  COUNT(DISTINCT CASE WHEN m.created_at > now() - interval '7 days' THEN m.id END) as messages_7d,
  r.created_at,
  r.updated_at
FROM public.rooms r
LEFT JOIN public.room_members rm ON rm.room_id = r.id
LEFT JOIN public.messages m ON m.room_id = r.id
WHERE r.is_active = true AND r.is_deleted = false
GROUP BY r.id, r.name, r.created_at, r.updated_at
ORDER BY messages_24h DESC, member_count DESC;

-- Enable realtime for new functions (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;