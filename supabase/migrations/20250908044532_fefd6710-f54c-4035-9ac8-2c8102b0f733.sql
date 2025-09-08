-- STEP 4: FIX SECURITY ISSUES AND APPLY RLS POLICIES

-- Fix function security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Enable RLS on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view public rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Creators can update own rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_members;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_members;
DROP POLICY IF EXISTS "Room creators can manage members" ON public.room_members;
DROP POLICY IF EXISTS "Members can view room members" ON public.room_members;
DROP POLICY IF EXISTS "Room members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Room members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friends;
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;