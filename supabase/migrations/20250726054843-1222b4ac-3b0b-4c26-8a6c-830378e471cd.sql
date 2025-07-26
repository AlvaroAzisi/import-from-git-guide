-- Add interests column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN interests TEXT[] DEFAULT '{}';

-- Add index for better performance on interests searches
CREATE INDEX idx_profiles_interests ON public.profiles USING GIN(interests);