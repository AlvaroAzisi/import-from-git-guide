-- Fixes schema inconsistencies and restores missing tables

-- 1. Restore conversations table
CREATE TABLE public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type public.conversation_type NOT NULL,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by uuid REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ
);

-- 2. Restore conversation_members table
CREATE TABLE public.conversation_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    is_muted BOOLEAN DEFAULT false,
    UNIQUE(conversation_id, user_id)
);
CREATE INDEX idx_conversation_members_user_id ON public.conversation_members(user_id);

-- 3. Add RLS policies for conversations and members
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they are a member of" ON public.conversations
FOR SELECT USING (id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own membership" ON public.conversation_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can insert their own membership" ON public.conversation_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- 4. Add creator_id to rooms table
ALTER TABLE public.rooms ADD COLUMN creator_id uuid REFERENCES public.profiles(id);

-- 5. Clean up redundant triggers and functions
DROP TRIGGER IF EXISTS trg_increment_friends_count ON public.friends;
DROP FUNCTION IF EXISTS public.increment_friends_count();

DROP TRIGGER IF EXISTS trg_increment_messages_sent ON public.messages;
DROP FUNCTION IF EXISTS public.increment_messages_sent();

DROP TRIGGER IF EXISTS trg_increment_rooms_created ON public.rooms;
DROP FUNCTION IF EXISTS public.increment_rooms_created();
