-- Fix recursive RLS and friend insert issues, and harden member count RPC

-- 1) ROOM MEMBERS: drop and recreate secure policies
-- Drop old recursive policy if it exists
DROP POLICY IF EXISTS "Members can view room members" ON public.room_members;

-- Create secure policies using SECURITY DEFINER function
CREATE POLICY "Members can view room members (secure)"
ON public.room_members
FOR SELECT
TO authenticated
USING (public.is_room_member_secure(room_id, auth.uid()));

-- Allow users to see their own membership rows directly (quality of life)
CREATE POLICY "Users can view own memberships"
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
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Participants can update friend requests" ON public.friends;
DROP POLICY IF EXISTS "Participants can delete friend requests" ON public.friends;

-- Allow inserts where the current user is the sender
CREATE POLICY "Users can send friend requests"
ON public.friends
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user);

-- Allow participants to update a friend request (e.g., accept/decline)
CREATE POLICY "Participants can update friend requests"
ON public.friends
FOR UPDATE
TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user)
WITH CHECK (auth.uid() = from_user OR auth.uid() = to_user);

-- Allow participants to delete a friend relationship if needed
CREATE POLICY "Participants can delete friend requests"
ON public.friends
FOR DELETE
TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user);