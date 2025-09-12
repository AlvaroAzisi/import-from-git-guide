-- Fix recursive RLS and friend insert issues, and harden member count RPC

-- 1) ROOM MEMBERS: remove recursive SELECT policy and replace with secure function-based policy
DO $$
BEGIN
  -- Drop old recursive policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'room_members' 
      AND policyname = 'Members can view room members'
  ) THEN
    DROP POLICY "Members can view room members" ON public.room_members;
  END IF;
END $$;

-- Create a secure policy that relies on SECURITY DEFINER function
CREATE POLICY IF NOT EXISTS "Members can view room members (secure)"
ON public.room_members
FOR SELECT
TO authenticated
USING (public.is_room_member_secure(room_id, auth.uid()));

-- Allow users to see their own membership rows directly (quality of life)
CREATE POLICY IF NOT EXISTS "Users can view own memberships"
ON public.room_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Make get_room_member_count SECURITY DEFINER so it bypasses RLS safely
CREATE OR REPLACE FUNCTION public.get_room_member_count(p_room_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM room_members 
    WHERE room_id = p_room_id
  );
END;
$$;

-- 3) FRIENDS: enable creating requests and managing them by participants
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Allow inserts where the current user is the sender
CREATE POLICY IF NOT EXISTS "Users can send friend requests"
ON public.friends
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user);

-- Allow participants to update a friend request (e.g., accept/decline)
CREATE POLICY IF NOT EXISTS "Participants can update friend requests"
ON public.friends
FOR UPDATE
TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user)
WITH CHECK (auth.uid() = from_user OR auth.uid() = to_user);

-- Allow participants to delete a friend relationship if needed
CREATE POLICY IF NOT EXISTS "Participants can delete friend requests"
ON public.friends
FOR DELETE
TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user);
