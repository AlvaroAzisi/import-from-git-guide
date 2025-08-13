-- Tighten profiles table RLS: remove any public SELECT policies that might expose emails and personal data
-- Keep existing connection-based policies intact

-- 1) Ensure RLS is enabled (safe no-op if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) Drop any overly-permissive public-view policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "View all profiles" ON public.profiles;
DROP POLICY IF EXISTS "View all profiles (public)" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- 3) (Optional) Ensure self/connection-based policies remain; we do not recreate to avoid duplicates
-- Existing policy expected:
-- CREATE POLICY "View profiles of connected users"
-- ON public.profiles FOR SELECT
-- USING (
--   (id = auth.uid())
--   OR EXISTS (
--     SELECT 1
--     FROM room_members rm_self
--     JOIN room_members rm_other ON rm_self.room_id = rm_other.room_id
--     WHERE rm_self.user_id = auth.uid() AND rm_other.user_id = profiles.id
--   )
--   OR EXISTS (
--     SELECT 1 FROM friends f
--     WHERE f.status = 'accepted' AND (
--       (f.user_id = auth.uid() AND f.friend_id = profiles.id)
--       OR (f.friend_id = auth.uid() AND f.user_id = profiles.id)
--     )
--   )
-- );
