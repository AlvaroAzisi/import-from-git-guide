-- =============================================
-- KUPINTAR LEARNING HUB - COMPREHENSIVE BACKEND SETUP
-- =============================================

-- =============================================
-- 1. STORAGE BUCKETS FOR AVATARS
-- =============================================

-- Create avatars bucket for user profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- 2. ROOMS SYSTEM
-- =============================================

-- Create rooms table for learning spaces
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  creator_id UUID NOT NULL,
  max_members INTEGER DEFAULT 10,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create room_members junction table
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles search indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username_search ON public.profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_search ON public.profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON public.profiles USING gin(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_creator_id ON public.rooms(creator_id);
CREATE INDEX IF NOT EXISTS idx_rooms_public_active ON public.rooms(is_public, is_active) WHERE is_public = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_subject ON public.rooms(subject) WHERE subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);

-- Room members indexes
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_role ON public.room_members(role);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_room_id_created ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- Friends indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id_status ON public.friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id_status ON public.friends(friend_id, status);

-- =============================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Public rooms are viewable by everyone" 
ON public.rooms 
FOR SELECT 
USING (is_public = true AND is_active = true);

CREATE POLICY "Users can view their own rooms" 
ON public.rooms 
FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can view rooms they are members of" 
ON public.rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their rooms" 
ON public.rooms 
FOR DELETE 
USING (auth.uid() = creator_id);

-- Room members policies
CREATE POLICY "Room members can view other members" 
ON public.room_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm 
    WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join public rooms" 
ON public.room_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_id AND is_public = true AND is_active = true
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

-- Messages policies
CREATE POLICY "Room members can view messages" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Room members can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- =============================================
-- 5. HELPFUL FUNCTIONS
-- =============================================

-- Function to get room member count
CREATE OR REPLACE FUNCTION public.get_room_member_count(room_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.room_members
  WHERE room_id = room_uuid;
$$;

-- Function to check if user is room member
CREATE OR REPLACE FUNCTION public.is_room_member(room_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_id = room_uuid AND user_id = user_uuid
  );
$$;

-- Function to increment user XP (for gamification)
CREATE OR REPLACE FUNCTION public.increment_user_xp(user_id UUID, xp_amount INTEGER DEFAULT 10)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles 
  SET xp = xp + xp_amount, updated_at = now()
  WHERE id = user_id;
$$;

-- =============================================
-- 6. TRIGGERS FOR AUTO-UPDATES
-- =============================================

-- Trigger to update updated_at on rooms
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on messages
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-add creator as room admin when room is created
CREATE OR REPLACE FUNCTION public.add_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  
  -- Increment rooms_created count
  UPDATE public.profiles 
  SET rooms_created = rooms_created + 1, updated_at = now()
  WHERE id = NEW.creator_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_room_created
  AFTER INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_admin();

-- Trigger to update rooms_joined count when user joins room
CREATE OR REPLACE FUNCTION public.update_rooms_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count if not the creator (they're already counted in rooms_created)
    IF NOT EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = NEW.room_id AND creator_id = NEW.user_id
    ) THEN
      UPDATE public.profiles 
      SET rooms_joined = rooms_joined + 1, updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Only decrease count if not the creator
    IF NOT EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE id = OLD.room_id AND creator_id = OLD.user_id
    ) THEN
      UPDATE public.profiles 
      SET rooms_joined = GREATEST(rooms_joined - 1, 0), updated_at = now()
      WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_room_member_change
  AFTER INSERT OR DELETE ON public.room_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rooms_joined();

-- Trigger to update messages_sent count
CREATE OR REPLACE FUNCTION public.update_messages_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET messages_sent = messages_sent + 1, updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_sent
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_messages_sent();

-- =============================================
-- 7. REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Set replica identity for realtime
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;