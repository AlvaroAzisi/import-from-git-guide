-- Create enum for request status if not exists
DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending','accepted','declined');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Room requests table
CREATE TABLE IF NOT EXISTS public.room_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  message text,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate pending requests per user/room
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_requests_unique_pending
  ON public.room_requests(user_id, room_id)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.room_requests ENABLE ROW LEVEL SECURITY;

-- Policies: requester can view their own requests
CREATE POLICY IF NOT EXISTS "Requester can view their room requests"
ON public.room_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Policies: room admins can view requests for their rooms
CREATE POLICY IF NOT EXISTS "Room admins can view requests for their rooms"
ON public.room_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_requests.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
);

-- Policies: users can create their own requests
CREATE POLICY IF NOT EXISTS "Users can create room requests for themselves"
ON public.room_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policies: room admins can update request status
CREATE POLICY IF NOT EXISTS "Room admins can update request status"
ON public.room_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_requests.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_requests.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
);

-- Join codes table
CREATE TABLE IF NOT EXISTS public.join_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  expires_at timestamptz,
  uses_remaining integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.profiles(id)
);

ALTER TABLE public.join_codes ENABLE ROW LEVEL SECURITY;

-- Policies: room admins can view join codes
CREATE POLICY IF NOT EXISTS "Room admins can view join codes"
ON public.join_codes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = join_codes.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
);

-- Policies: room admins can insert join codes
CREATE POLICY IF NOT EXISTS "Room admins can insert join codes"
ON public.join_codes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = join_codes.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
);

-- Policies: room admins can update join codes
CREATE POLICY IF NOT EXISTS "Room admins can update join codes"
ON public.join_codes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = join_codes.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = join_codes.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
);

-- Policies: room admins can delete join codes
CREATE POLICY IF NOT EXISTS "Room admins can delete join codes"
ON public.join_codes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = join_codes.room_id
      AND rm.user_id = auth.uid()
      AND rm.role = 'admin'
  )
);

-- RPC: Create room request (prevents duplicates and checks membership)
CREATE OR REPLACE FUNCTION public.create_room_request(p_room_id uuid, p_message text DEFAULT NULL)
RETURNS public.room_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_req public.room_requests;
  v_is_member boolean;
  v_existing_request uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id AND user_id = v_user_id
  ) INTO v_is_member;

  IF v_is_member THEN
    RAISE EXCEPTION 'Already a member of this room';
  END IF;

  SELECT id INTO v_existing_request
  FROM public.room_requests
  WHERE room_id = p_room_id AND user_id = v_user_id AND status = 'pending'
  LIMIT 1;

  IF v_existing_request IS NOT NULL THEN
    SELECT * INTO v_req FROM public.room_requests WHERE id = v_existing_request;
    RETURN v_req;
  END IF;

  INSERT INTO public.room_requests (user_id, room_id, message)
  VALUES (v_user_id, p_room_id, p_message)
  RETURNING * INTO v_req;

  RETURN v_req;
END;
$$;

-- RPC: Accept room request (admin only)
CREATE OR REPLACE FUNCTION public.accept_room_request(p_request_id uuid)
RETURNS public.room_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_req public.room_requests;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT room_id INTO v_room_id FROM public.room_requests WHERE id = p_request_id;
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room_id AND user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.room_requests
  SET status = 'accepted'
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  INSERT INTO public.room_members (room_id, user_id, role)
  SELECT v_req.room_id, v_req.user_id, 'member'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.room_members WHERE room_id = v_req.room_id AND user_id = v_req.user_id
  );

  RETURN v_req;
END;
$$;

-- RPC: Decline room request (admin only)
CREATE OR REPLACE FUNCTION public.decline_room_request(p_request_id uuid)
RETURNS public.room_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_room_id uuid;
  v_req public.room_requests;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT room_id INTO v_room_id FROM public.room_requests WHERE id = p_request_id;
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.room_members
    WHERE room_id = v_room_id AND user_id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.room_requests
  SET status = 'declined'
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  RETURN v_req;
END;
$$;

-- RPC: Validate join code and auto-join if valid
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code text)
RETURNS TABLE (room_id uuid, valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code RECORD;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_code FROM public.join_codes
  WHERE code = p_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false;
    RETURN;
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN QUERY SELECT v_code.room_id, false;
    RETURN;
  END IF;

  IF v_code.uses_remaining IS NOT NULL AND v_code.uses_remaining <= 0 THEN
    RETURN QUERY SELECT v_code.room_id, false;
    RETURN;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.room_members (room_id, user_id, role)
    SELECT v_code.room_id, v_user_id, 'member'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.room_members WHERE room_id = v_code.room_id AND user_id = v_user_id
    );
  END IF;

  IF v_code.uses_remaining IS NOT NULL THEN
    UPDATE public.join_codes SET uses_remaining = GREATEST(uses_remaining - 1, 0)
    WHERE id = v_code.id;
  END IF;

  RETURN QUERY SELECT v_code.room_id, true;
END;
$$;