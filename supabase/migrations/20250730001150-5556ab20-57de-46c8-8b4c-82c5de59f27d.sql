-- Fix infinite recursion in RLS policies

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_user_room_member(room_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_id = room_uuid AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_room_count(room_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.room_members
  WHERE room_id = room_uuid;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Room members can view other members" ON public.room_members;
DROP POLICY IF EXISTS "Users can join public rooms" ON public.room_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
DROP POLICY IF EXISTS "Room admins can manage members" ON public.room_members;

-- Create new policies using security definer functions
CREATE POLICY "Room members can view other members" 
ON public.room_members 
FOR SELECT 
USING (public.is_user_room_member(room_id, auth.uid()));

CREATE POLICY "Users can join public rooms" 
ON public.room_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id 
    AND is_public = true 
    AND is_active = true
    AND public.get_user_room_count(room_id) < max_members
  )
);

CREATE POLICY "Users can leave rooms" 
ON public.room_members 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Room admins can manage members" 
ON public.room_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id 
    AND rm.user_id = auth.uid() 
    AND rm.role IN ('admin', 'moderator')
  )
);

-- Fix rooms policies to use security definer functions
DROP POLICY IF EXISTS "Users can view rooms they are members of" ON public.rooms;

CREATE POLICY "Users can view rooms they are members of" 
ON public.rooms 
FOR SELECT 
USING (public.is_user_room_member(id, auth.uid()));

-- Fix storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix chat media storage policies
CREATE POLICY "Chat media images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat_media');

CREATE POLICY "Room members can upload chat media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat_media' AND 
  public.is_user_room_member(
    ((storage.foldername(name))[1])::uuid, 
    auth.uid()
  )
);

CREATE POLICY "Users can delete their own chat media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chat_media' AND 
  auth.uid()::text = (storage.foldername(name))[2]
);