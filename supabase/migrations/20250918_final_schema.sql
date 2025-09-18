-- Create Schemas
CREATE SCHEMA IF NOT EXISTS public;

-- Enums
CREATE TYPE public.user_status AS ENUM ('online', 'offline', 'away', 'busy');
CREATE TYPE public.room_privacy AS ENUM ('public', 'private', 'invite_only');
CREATE TYPE public.room_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.friend_request_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE public.message_type AS ENUM ('text', 'image', 'system');
CREATE TYPE public.notification_type AS ENUM ('friend_request', 'room_invite', 'message', 'badge_awarded', 'system');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
CREATE TYPE public.payment_status AS ENUM ('success', 'failed', 'pending');

-- Tables

-- profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    status public.user_status DEFAULT 'offline'::public.user_status NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    xp INT DEFAULT 0 NOT NULL,
    level INT DEFAULT 1 NOT NULL,
    streak_count INT DEFAULT 0 NOT NULL,
    streak_last_updated DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.profiles IS 'User profiles for public display.';

-- rooms table
CREATE TABLE public.rooms (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    max_members INT DEFAULT 50 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL, -- active, archived, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.rooms IS 'Study rooms created by users.';

-- room_members table
CREATE TABLE public.room_members (
    room_id UUID REFERENCES public.rooms ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    role public.room_member_role DEFAULT 'member'::public.room_member_role NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (room_id, user_id)
);
COMMENT ON TABLE public.room_members IS 'Members of study rooms.';

-- messages table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    room_id UUID REFERENCES public.rooms ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type public.message_type DEFAULT 'text'::public.message_type NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.messages IS 'Chat messages within rooms.';

-- friend_requests table
CREATE TABLE public.friend_requests (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    status public.friend_request_status DEFAULT 'pending'::public.friend_request_status NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (sender_id, receiver_id)
);
COMMENT ON TABLE public.friend_requests IS 'Friend requests between users.';

-- badges table
CREATE TABLE public.badges (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    criteria TEXT, -- e.g., 'join 10 rooms', 'send 100 messages'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.badges IS 'Definitions of badges that can be awarded.';

-- user_badges table
CREATE TABLE public.user_badges (
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES public.badges ON DELETE CASCADE NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, badge_id)
);
COMMENT ON TABLE public.user_badges IS 'Badges awarded to users.';

-- subscriptions table
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    plan_id UUID, -- In a real app, this would reference a plans table
    status public.subscription_status DEFAULT 'trialing'::public.subscription_status NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.subscriptions IS 'User subscriptions to plans.';

-- notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.notifications IS 'User notifications.';

-- Indexes
CREATE INDEX idx_profiles_username ON public.profiles (username);
CREATE INDEX idx_rooms_owner_id ON public.rooms (owner_id);
CREATE INDEX idx_room_members_room_id ON public.room_members (room_id);
CREATE INDEX idx_room_members_user_id ON public.room_members (user_id);
CREATE INDEX idx_messages_room_id ON public.messages (room_id);
CREATE INDEX idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX idx_friend_requests_sender_id ON public.friend_requests (sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON public.friend_requests (receiver_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges (user_id);
CREATE INDEX idx_user_badges_badge_id ON public.user_badges (badge_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);

-- Functions

-- Function to create a new profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email); -- Using email as initial username, can be changed later
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to create a room and add the creator as a member
CREATE OR REPLACE FUNCTION public.create_room_and_join(
    room_name TEXT,
    room_description TEXT,
    p_is_public BOOLEAN,
    max_members_count INT DEFAULT 50
)
RETURNS UUID AS $$
DECLARE
    new_room_id UUID;
    owner_id UUID := auth.uid();
BEGIN
    IF owner_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated.';
    END IF;

    INSERT INTO public.rooms (name, description, owner_id, is_public, max_members)
    VALUES (room_name, room_description, owner_id, p_is_public, max_members_count)
    RETURNING id INTO new_room_id;

    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (new_room_id, owner_id, 'owner');

    RETURN new_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a room
CREATE OR REPLACE FUNCTION public.join_room(p_room_id UUID)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID := auth.uid();
    room_owner_id UUID;
    room_is_public BOOLEAN;
    member_count INT;
    max_members_allowed INT;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated.';
    END IF;

    SELECT owner_id, is_public, max_members INTO room_owner_id, room_is_public, max_members_allowed
    FROM public.rooms
    WHERE id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found.';
    END IF;

    IF NOT room_is_public AND current_user_id != room_owner_id THEN
        RAISE EXCEPTION 'Cannot join private room without an invite or being the owner.';
    END IF;

    SELECT COUNT(*) INTO member_count FROM public.room_members WHERE room_id = p_room_id;
    IF member_count >= max_members_allowed THEN
        RAISE EXCEPTION 'Room is full.';
    END IF;

    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (p_room_id, current_user_id, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING; -- If already a member, do nothing
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave a room
CREATE OR REPLACE FUNCTION public.leave_room(p_room_id UUID)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID := auth.uid();
    member_role public.room_member_role;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated.';
    END IF;

    SELECT role INTO member_role FROM public.room_members WHERE room_id = p_room_id AND user_id = current_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User is not a member of this room.';
    END IF;

    IF member_role = 'owner' THEN
        RAISE EXCEPTION 'Room owner cannot leave the room directly. Transfer ownership or delete the room.';
    END IF;

    DELETE FROM public.room_members
    WHERE room_id = p_room_id AND user_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile." ON public.profiles FOR DELETE USING (auth.uid() = id);

-- rooms table
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public rooms are viewable by everyone." ON public.rooms FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can create rooms." ON public.rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their rooms." ON public.rooms FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their rooms." ON public.rooms FOR DELETE USING (auth.uid() = owner_id);
-- Allow members to view private rooms they are part of
CREATE POLICY "Members can view private rooms they belong to." ON public.rooms FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = rooms.id AND user_id = auth.uid())
);

-- room_members table
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
-- Allow any authenticated user to view members of rooms they belong to
CREATE POLICY "Authenticated users can view room members if they are a member" ON public.room_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_members.room_id AND user_id = auth.uid())
);

-- Allow room owners/admins to insert new members
CREATE POLICY "Room owners/admins can insert members" ON public.room_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_members.room_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Allow room owners/admins to update member roles
CREATE POLICY "Room owners/admins can update members" ON public.room_members FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_members.room_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Allow users to remove themselves from a room
CREATE POLICY "Users can remove themselves from a room" ON public.room_members FOR DELETE USING (auth.uid() = user_id);

-- Allow room owners/admins to remove any member
CREATE POLICY "Room owners/admins can remove any member" ON public.room_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_members.room_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room members can view messages in their room." ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = messages.room_id AND user_id = auth.uid())
);
CREATE POLICY "Room members can send messages." ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.room_members WHERE room_id = messages.room_id AND user_id = auth.uid())
);
CREATE POLICY "Sender can update their own messages." ON public.messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Sender can delete their own messages." ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- friend_requests table
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can send friend requests." ON public.friend_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view their own sent and received friend requests." ON public.friend_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can update their own received friend requests (accept/reject/block)." ON public.friend_requests FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete their own sent friend requests (cancel)." ON public.friend_requests FOR DELETE USING (auth.uid() = sender_id);

-- badges table
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are viewable by everyone." ON public.badges FOR SELECT USING (TRUE);

-- user_badges table
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own awarded badges." ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
-- User badges should only be inserted by functions/triggers, not directly by users
CREATE POLICY "Allow function to insert user badges." ON public.user_badges FOR INSERT WITH CHECK (TRUE); -- Handled by function

-- subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions." ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions (e.g., cancel)." ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
-- Insertions handled by payment/webhook functions

-- notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications." ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications (e.g., mark as read)." ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
-- Insertions handled by functions/triggers

-- Function to increment user XP and handle leveling
CREATE OR REPLACE FUNCTION public.increment_user_xp(p_user_id UUID, p_xp_amount INT, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    current_xp INT;
    current_level INT;
    xp_for_next_level INT;
BEGIN
    -- Update XP in profiles table
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
        -- Optionally, award a badge for leveling up
        -- SELECT public.award_badge(p_user_id, 'Level Up!'); -- This would require the badge to exist
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user streak
CREATE OR REPLACE FUNCTION public.update_user_daily_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    last_streak_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    SELECT streak_last_updated INTO last_streak_date
    FROM public.profiles
    WHERE id = p_user_id;

    IF last_streak_date IS NULL OR last_streak_date < today - INTERVAL '1 day' THEN
        -- Reset streak if not updated yesterday
        UPDATE public.profiles
        SET streak_count = 1,
            streak_last_updated = today,
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSIF last_streak_date = today - INTERVAL '1 day' THEN
        -- Increment streak if updated yesterday
        UPDATE public.profiles
        SET streak_count = streak_count + 1,
            streak_last_updated = today,
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award a badge to a user
CREATE OR REPLACE FUNCTION public.award_badge(p_user_id UUID, p_badge_name TEXT)
RETURNS VOID AS $$
DECLARE
    badge_id_to_award UUID;
BEGIN
    SELECT id INTO badge_id_to_award
    FROM public.badges
    WHERE name = p_badge_name;

    IF badge_id_to_award IS NULL THEN
        RAISE EXCEPTION 'Badge with name % not found.', p_badge_name;
    END IF;

    -- Check if user already has the badge
    IF NOT EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = badge_id_to_award) THEN
        INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
        VALUES (p_user_id, badge_id_to_award, NOW());
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;