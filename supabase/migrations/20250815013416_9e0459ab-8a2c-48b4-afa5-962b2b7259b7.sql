-- ============================================================
-- NUCLEAR RESET: Complete Database Rebuild for Kupintar Chat App
-- ============================================================

-- Phase 1: Nuclear Reset
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Phase 2: Build Production Schema

-- ============================================================
-- ENUMS AND TYPES
-- ============================================================

CREATE TYPE user_status AS ENUM ('online', 'away', 'busy', 'offline');
CREATE TYPE relationship_status AS ENUM ('pending', 'accepted', 'blocked', 'declined');
CREATE TYPE conversation_type AS ENUM ('dm', 'group', 'channel');
CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'audio', 'video', 'system');
CREATE TYPE notification_type AS ENUM ('message', 'friend_request', 'mention', 'system');
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'laugh', 'sad', 'angry', 'thumbs_up', 'thumbs_down');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- User profiles with enhanced features
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    status user_status DEFAULT 'offline',
    is_verified BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Social features
    interests TEXT[],
    location TEXT,
    website TEXT,
    
    -- Gamification
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    
    -- Statistics
    messages_sent INTEGER DEFAULT 0,
    friends_count INTEGER DEFAULT 0,
    
    -- Settings
    is_online_visible BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_username CHECK (username ~ '^[a-zA-Z0-9_]+$'),
    CONSTRAINT username_length CHECK (length(username) BETWEEN 3 AND 30),
    CONSTRAINT valid_xp CHECK (xp >= 0),
    CONSTRAINT valid_level CHECK (level >= 1)
);

-- User relationships (friends/contacts)
CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status relationship_status DEFAULT 'pending',
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, target_user_id),
    CONSTRAINT no_self_relationship CHECK (user_id != target_user_id)
);

-- Conversations (DMs, groups, channels)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type conversation_type NOT NULL,
    name TEXT,
    description TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT group_has_name CHECK (
        (type = 'dm') OR (type IN ('group', 'channel') AND name IS NOT NULL)
    )
);

-- Conversation members with roles and permissions
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- member, admin, owner
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    
    UNIQUE(conversation_id, user_id)
);

-- Messages table (partitioned by month for performance)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    thread_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Rich content
    mentions UUID[],
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- Moderation
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_content CHECK (length(content) <= 10000),
    CONSTRAINT no_self_reply CHECK (reply_to_id != id)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for messages (current + 12 months ahead)
CREATE TABLE messages_2025_01 PARTITION OF messages 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE messages_2025_02 PARTITION OF messages 
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE messages_2025_03 PARTITION OF messages 
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE messages_2025_04 PARTITION OF messages 
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE messages_2025_05 PARTITION OF messages 
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE messages_2025_06 PARTITION OF messages 
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE messages_2025_07 PARTITION OF messages 
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE messages_2025_08 PARTITION OF messages 
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE messages_2025_09 PARTITION OF messages 
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE messages_2025_10 PARTITION OF messages 
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE messages_2025_11 PARTITION OF messages 
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE messages_2025_12 PARTITION OF messages 
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Message attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 104857600) -- 100MB limit
);

-- Message read receipts
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

-- Message reactions
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id, reaction)
);

-- Real-time typing indicators
CREATE TABLE typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(conversation_id, user_id)
);

-- User sessions for online status
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_token CHECK (length(session_token) > 10)
);

-- Notifications (partitioned by user)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_title CHECK (length(title) <= 255)
) PARTITION BY HASH (user_id);

-- Create notification partitions (4 partitions for load distribution)
CREATE TABLE notifications_0 PARTITION OF notifications FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE notifications_1 PARTITION OF notifications FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE notifications_2 PARTITION OF notifications FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE notifications_3 PARTITION OF notifications FOR VALUES WITH (modulus 4, remainder 3);

-- Social posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    visibility TEXT DEFAULT 'public', -- public, friends, private
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_post_content CHECK (length(content) <= 5000),
    CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'friends', 'private'))
);

-- Post interactions
CREATE TABLE post_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- like, share, comment
    content TEXT, -- for comments
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_interaction CHECK (interaction_type IN ('like', 'share', 'comment')),
    CONSTRAINT comment_has_content CHECK (
        (interaction_type != 'comment') OR (content IS NOT NULL AND length(content) > 0)
    ),
    UNIQUE(post_id, user_id, interaction_type) -- one like/share per user per post
);

-- Content reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_content_type TEXT NOT NULL, -- message, post, user
    reported_content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, reviewed, resolved
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_content_type CHECK (reported_content_type IN ('message', 'post', 'user')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'reviewed', 'resolved'))
);

-- Audit logs (partitioned by date)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create audit log partitions (monthly)
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE audit_logs_2025_03 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- ============================================================
-- INDEXES FOR PERFORMANCE (Sub-100ms queries)
-- ============================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_last_seen ON profiles(last_seen_at);
CREATE INDEX idx_profiles_search ON profiles USING gin(to_tsvector('english', full_name || ' ' || username));

-- Relationships indexes
CREATE INDEX idx_user_relationships_user_id ON user_relationships(user_id);
CREATE INDEX idx_user_relationships_target_user_id ON user_relationships(target_user_id);
CREATE INDEX idx_user_relationships_status ON user_relationships(status);
CREATE INDEX idx_user_relationships_composite ON user_relationships(user_id, status);

-- Conversations indexes
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_active ON conversations(is_active);

-- Conversation members indexes
CREATE INDEX idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX idx_conversation_members_composite ON conversation_members(conversation_id, user_id);
CREATE INDEX idx_conversation_members_last_read ON conversation_members(last_read_at);

-- Messages indexes (applied to all partitions)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
CREATE INDEX idx_messages_mentions ON messages USING gin(mentions);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Message reads indexes
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);

-- Message reactions indexes
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

-- Sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, last_activity);

-- Posts indexes
CREATE INDEX idx_posts_author_id ON posts(author_id, created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility, created_at DESC);
CREATE INDEX idx_posts_content_search ON posts USING gin(to_tsvector('english', content));

-- ============================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_relationships_updated_at
    BEFORE UPDATE ON user_relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation last_message_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_messages_update_conversation
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Clean expired typing indicators
CREATE OR REPLACE FUNCTION clean_expired_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators 
    WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Auto-create notification partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    -- Create message partitions for next 6 months
    FOR i IN 1..6 LOOP
        start_date := DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'messages_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF messages 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
    
    -- Create audit log partitions for next 6 months
    FOR i IN 1..6 LOOP
        start_date := DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
        
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view public profile data" ON profiles
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User relationships policies
CREATE POLICY "Users can view their relationships" ON user_relationships
    FOR SELECT USING (user_id = auth.uid() OR target_user_id = auth.uid());

CREATE POLICY "Users can create relationships" ON user_relationships
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their relationships" ON user_relationships
    FOR UPDATE USING (user_id = auth.uid() OR target_user_id = auth.uid());

-- Conversation members policies
CREATE POLICY "Members can view conversations they belong to" ON conversation_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations" ON conversation_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update their membership" ON conversation_members
    FOR UPDATE USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Members can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_members cm 
            WHERE cm.conversation_id = messages.conversation_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to conversations they're in" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversation_members cm 
            WHERE cm.conversation_id = messages.conversation_id 
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Similar policies for other tables...
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- INITIAL DATA AND CLEANUP
-- ============================================================

-- Create a cleanup function for expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean expired typing indicators
    DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
    
    -- Clean old inactive sessions
    DELETE FROM user_sessions WHERE last_activity < NOW() - INTERVAL '30 days';
    
    -- Clean old audit logs (keep 90 days)
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Soft delete old messages (keep 1 year)
    UPDATE messages SET is_deleted = TRUE 
    WHERE created_at < NOW() - INTERVAL '1 year' AND NOT is_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- API FUNCTIONS
-- ============================================================

-- Create DM conversation
CREATE OR REPLACE FUNCTION create_dm_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    current_user_id UUID := auth.uid();
BEGIN
    -- Check if DM already exists
    SELECT c.id INTO conversation_id
    FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id = c.id
    JOIN conversation_members cm2 ON cm2.conversation_id = c.id
    WHERE c.type = 'dm'
        AND cm1.user_id = current_user_id
        AND cm2.user_id = other_user_id
        AND (
            SELECT COUNT(*) FROM conversation_members
            WHERE conversation_id = c.id
        ) = 2;
    
    -- Create new DM if doesn't exist
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (type, created_by)
        VALUES ('dm', current_user_id)
        RETURNING id INTO conversation_id;
        
        -- Add both users as members
        INSERT INTO conversation_members (conversation_id, user_id, role)
        VALUES 
            (conversation_id, current_user_id, 'member'),
            (conversation_id, other_user_id, 'member');
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send message function
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_content TEXT,
    p_message_type message_type DEFAULT 'text',
    p_reply_to_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    message_id UUID;
    current_user_id UUID := auth.uid();
BEGIN
    -- Check if user is member of conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_members 
        WHERE conversation_id = p_conversation_id AND user_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this conversation';
    END IF;
    
    -- Insert message
    INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_id)
    VALUES (p_conversation_id, current_user_id, p_content, p_message_type, p_reply_to_id)
    RETURNING id INTO message_id;
    
    -- Update user message count
    UPDATE profiles SET messages_sent = messages_sent + 1 WHERE id = current_user_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;