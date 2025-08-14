-- Create atomic room creation and joining procedures
-- This ensures room creation + membership insertion happens atomically

CREATE OR REPLACE FUNCTION public.create_room_and_join(
  p_name text,
  p_description text DEFAULT '',
  p_subject text DEFAULT '',
  p_is_public boolean DEFAULT true,
  p_max_members integer DEFAULT 10
)
RETURNS TABLE(
  room_id uuid,
  membership_id uuid,
  room jsonb,
  membership jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id uuid;
  new_membership_id uuid;
  current_user_id uuid := auth.uid();
  room_data jsonb;
  membership_data jsonb;
BEGIN
  -- Check authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Room name is required';
  END IF;

  -- Create room within transaction
  INSERT INTO public.rooms (
    name,
    description,
    subject,
    creator_id,
    is_public,
    max_members,
    is_active
  ) VALUES (
    trim(p_name),
    trim(p_description),
    trim(p_subject),
    current_user_id,
    p_is_public,
    p_max_members,
    true
  ) RETURNING id INTO new_room_id;

  -- Add creator as admin member
  INSERT INTO public.room_members (
    room_id,
    user_id,
    role
  ) VALUES (
    new_room_id,
    current_user_id,
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

  RETURN QUERY SELECT 
    new_room_id,
    new_membership_id,
    room_data,
    membership_data;
END;
$$;

-- Create safe room joining procedure
CREATE OR REPLACE FUNCTION public.join_room_safe(
  p_room_identifier text -- Can be room ID or short_code
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room_id uuid;
  current_user_id uuid := auth.uid();
  room_record record;
  member_count integer;
  new_membership_id uuid;
  membership_data jsonb;
BEGIN
  -- Check authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find room by ID or short_code
  IF length(p_room_identifier) > 10 AND p_room_identifier ~ '^[0-9a-f\-]+$' THEN
    -- Looks like UUID
    SELECT * INTO room_record
    FROM public.rooms
    WHERE id = p_room_identifier::uuid AND is_active = true;
  ELSE
    -- Treat as short_code
    SELECT * INTO room_record
    FROM public.rooms
    WHERE short_code = upper(trim(p_room_identifier)) AND is_active = true;
  END IF;

  -- Check if room exists
  IF room_record IS NULL THEN
    RAISE EXCEPTION 'Room not found or inactive';
  END IF;

  target_room_id := room_record.id;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = target_room_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this room';
  END IF;

  -- Check room capacity
  SELECT COUNT(*) INTO member_count
  FROM public.room_members
  WHERE room_id = target_room_id;

  IF member_count >= room_record.max_members THEN
    RAISE EXCEPTION 'Room is at maximum capacity';
  END IF;

  -- Check if room is public or user has permission
  IF NOT room_record.is_public THEN
    -- For now, private rooms require invitation (could extend this logic)
    RAISE EXCEPTION 'Room is private and requires invitation';
  END IF;

  -- Add user as member
  INSERT INTO public.room_members (
    room_id,
    user_id,
    role
  ) VALUES (
    target_room_id,
    current_user_id,
    'member'
  ) RETURNING id INTO new_membership_id;

  -- Return membership data
  SELECT to_jsonb(rm.*) INTO membership_data
  FROM public.room_members rm
  WHERE rm.id = new_membership_id;

  RETURN membership_data;
END;
$$;

-- Add performance indexes for common room queries
CREATE INDEX IF NOT EXISTS idx_rooms_active_public 
  ON public.rooms(created_at DESC) 
  WHERE is_active = true AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_rooms_short_code_active 
  ON public.rooms(short_code) 
  WHERE is_active = true AND short_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_room_members_room_user 
  ON public.room_members(room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_room_members_user_role 
  ON public.room_members(user_id, role);

-- Add constraint to ensure short_codes are unique and uppercase
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_short_code_unique 
  ON public.rooms(upper(short_code)) 
  WHERE short_code IS NOT NULL AND is_active = true;