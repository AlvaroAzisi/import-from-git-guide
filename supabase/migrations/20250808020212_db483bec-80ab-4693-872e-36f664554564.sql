-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;

-- Update existing profiles with usernames based on email
UPDATE public.profiles 
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL;

-- Make username NOT NULL after setting values
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

-- Create badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  requirement_type TEXT NOT NULL, -- 'xp', 'streak', 'manual'
  requirement_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles_badges junction table
CREATE TABLE public.profiles_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- Enable RLS on new tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for badges (public read)
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges 
FOR SELECT 
USING (true);

-- RLS policies for profiles_badges
CREATE POLICY "Profile badges are viewable by everyone" 
ON public.profiles_badges 
FOR SELECT 
USING (true);

CREATE POLICY "Users can view their own badge awards" 
ON public.profiles_badges 
FOR SELECT 
USING (true);

CREATE POLICY "System can award badges" 
ON public.profiles_badges 
FOR INSERT 
WITH CHECK (true);

-- Insert default badges
INSERT INTO public.badges (name, description, icon_name, color, requirement_type, requirement_value) VALUES
('Welcome', 'Joined the community', 'UserPlus', '#10B981', 'manual', NULL),
('First Steps', 'Earned first 100 XP', 'Star', '#F59E0B', 'xp', 100),
('Rising Star', 'Earned 500 XP', 'Sparkles', '#8B5CF6', 'xp', 500),
('Expert', 'Earned 1000 XP', 'Crown', '#EF4444', 'xp', 1000),
('Consistent', '7-day streak', 'Flame', '#F97316', 'streak', 7),
('Dedicated', '30-day streak', 'Zap', '#06B6D4', 'streak', 30),
('Champion', '100-day streak', 'Trophy', '#DC2626', 'streak', 100);

-- Function to award badges automatically
CREATE OR REPLACE FUNCTION public.award_badges_on_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Award XP-based badges
  INSERT INTO public.profiles_badges (profile_id, badge_id)
  SELECT NEW.id, b.id
  FROM public.badges b
  WHERE b.requirement_type = 'xp' 
    AND NEW.xp >= b.requirement_value
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles_badges pb 
      WHERE pb.profile_id = NEW.id AND pb.badge_id = b.id
    );
  
  -- Award streak-based badges
  INSERT INTO public.profiles_badges (profile_id, badge_id)
  SELECT NEW.id, b.id
  FROM public.badges b
  WHERE b.requirement_type = 'streak' 
    AND NEW.streak >= b.requirement_value
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles_badges pb 
      WHERE pb.profile_id = NEW.id AND pb.badge_id = b.id
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic badge awards
CREATE TRIGGER award_badges_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.award_badges_on_profile_update();

-- Award welcome badge to existing users
INSERT INTO public.profiles_badges (profile_id, badge_id)
SELECT p.id, b.id
FROM public.profiles p
CROSS JOIN public.badges b
WHERE b.name = 'Welcome'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles_badges pb 
    WHERE pb.profile_id = p.id AND pb.badge_id = b.id
  );