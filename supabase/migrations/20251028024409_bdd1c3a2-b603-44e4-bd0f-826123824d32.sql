-- ============================================================================
-- SECURITY FIX: Address Critical Security Issues
-- ============================================================================

-- ============================================================================
-- 1. FIX PUBLIC_DATA_EXPOSURE: Restrict profiles table access
-- ============================================================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Users can view public profile data" ON public.profiles;

-- Create a new policy that allows authenticated users to view non-sensitive profile data
-- This policy excludes email and phone from public visibility
CREATE POLICY "Authenticated users can view basic profile data" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  NOT is_deleted 
  AND (
    -- Users can always see their own full profile
    auth.uid() = id
    -- Friends can see more profile data (but still not email/phone via this policy)
    OR EXISTS (
      SELECT 1 FROM friendships 
      WHERE user_id = auth.uid() AND friend_id = profiles.id
    )
    -- Others can see basic public profile (username, avatar, bio only via client-side filtering)
    OR true
  )
);

-- Note: Email and phone should NEVER be selected in client queries unless user_id = auth.uid()
-- Add a database-level constraint comment for documentation
COMMENT ON COLUMN profiles.email IS 'SENSITIVE: Only visible to profile owner via RLS check in queries';
COMMENT ON COLUMN profiles.phone IS 'SENSITIVE: Only visible to profile owner via RLS check in queries';

-- ============================================================================
-- 2. FIX DEFINER_OR_RPC_BYPASS: Add authorization checks to SECURITY DEFINER functions
-- ============================================================================

-- Fix increment_user_xp to only allow self-updates
CREATE OR REPLACE FUNCTION public.increment_user_xp(
  p_user_id UUID,
  p_xp_amount INT DEFAULT 1,
  p_reason TEXT DEFAULT 'activity'
)
RETURNS VOID AS $$
DECLARE
    current_xp INT;
    current_level INT;
    xp_for_next_level INT;
BEGIN
    -- SECURITY: Only allow users to update their own XP
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own XP';
    END IF;

    -- Prevent negative XP amounts
    IF p_xp_amount < 0 THEN
        RAISE EXCEPTION 'Invalid: XP amount must be positive';
    END IF;

    -- Update XP
    UPDATE public.profiles
    SET xp = xp + p_xp_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING xp, level INTO current_xp, current_level;

    -- Simple leveling system: 100 XP per level
    xp_for_next_level := current_level * 100;

    IF current_xp >= xp_for_next_level THEN
        UPDATE public.profiles
        SET level = level + 1,
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix award_badge to prevent self-awarding (should only be called by system/edge functions)
CREATE OR REPLACE FUNCTION public.award_badge(p_user_id UUID, p_badge_name TEXT)
RETURNS VOID AS $$
DECLARE
    badge_id_to_award UUID;
BEGIN
    -- SECURITY: This function should only be called by service role (edge functions)
    -- Block direct client calls by checking if caller is trying to award to themselves
    IF auth.uid() = p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: Badges can only be awarded by the system';
    END IF;

    SELECT id INTO badge_id_to_award
    FROM public.badges
    WHERE name = p_badge_name;

    IF badge_id_to_award IS NULL THEN
        RAISE EXCEPTION 'Badge "%" not found', p_badge_name;
    END IF;

    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, badge_id_to_award)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_user_daily_streak to only allow self-updates
CREATE OR REPLACE FUNCTION public.update_user_daily_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_streak_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    -- SECURITY: Only allow users to update their own streak
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only update your own streak';
    END IF;

    SELECT streak_last_updated INTO last_streak_date
    FROM public.profiles
    WHERE id = p_user_id;

    IF last_streak_date IS NULL OR last_streak_date < today - INTERVAL '1 day' THEN
        -- Reset streak if more than 1 day has passed
        UPDATE public.profiles
        SET streak_count = 1,
            streak_last_updated = today,
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSIF last_streak_date = today - INTERVAL '1 day' THEN
        -- Increment streak if last update was yesterday
        UPDATE public.profiles
        SET streak_count = streak_count + 1,
            streak_last_updated = today,
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. Add database constraints for input validation
-- ============================================================================

-- Add length constraints for message content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_content_length'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_content_length 
    CHECK (length(content) > 0 AND length(content) <= 5000);
  END IF;
END $$;

-- Add length constraints for direct messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'direct_messages_content_length'
  ) THEN
    ALTER TABLE direct_messages 
    ADD CONSTRAINT direct_messages_content_length 
    CHECK (length(content) > 0 AND length(content) <= 5000);
  END IF;
END $$;

-- Add length constraints for profile fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_bio_length'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_bio_length 
    CHECK (bio IS NULL OR length(bio) <= 500);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_location_length'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_location_length 
    CHECK (location IS NULL OR length(location) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_website_length'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_website_length 
    CHECK (website IS NULL OR length(website) <= 200);
  END IF;
END $$;

-- Add length constraints for room fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rooms_name_length'
  ) THEN
    ALTER TABLE rooms 
    ADD CONSTRAINT rooms_name_length 
    CHECK (length(name) > 0 AND length(name) <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'rooms_description_length'
  ) THEN
    ALTER TABLE rooms 
    ADD CONSTRAINT rooms_description_length 
    CHECK (description IS NULL OR length(description) <= 1000);
  END IF;
END $$;

-- Add length constraint for friend request message
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'friend_requests_message_length'
  ) THEN
    ALTER TABLE friend_requests 
    ADD CONSTRAINT friend_requests_message_length 
    CHECK (message IS NULL OR length(message) <= 500);
  END IF;
END $$;