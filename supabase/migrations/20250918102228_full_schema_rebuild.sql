
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Enums
CREATE TYPE "public"."conversation_type" AS ENUM (
    'dm',
    'group',
    'channel'
);

CREATE TYPE "public"."friend_request_status" AS ENUM (
    'pending',
    'accepted',
    'rejected'
);

CREATE TYPE "public"."message_type" AS ENUM (
    'text',
    'image',
    'file',
    'system'
);

CREATE TYPE "public"."notification_type" AS ENUM (
    'friend_request',
    'friend_request_accepted',
    'new_message',
    'new_room_message',
    'room_invite',
    'room_join_request',
    'room_join_request_accepted',
    'system'
);

CREATE TYPE "public"."reaction_type" AS ENUM (
    'like',
    'love',
    'laugh',
    'angry',
    'sad',
    'thumbs_up',
    'thumbs_down'
);

CREATE TYPE "public"."relationship_status" AS ENUM (
    'pending',
    'accepted',
    'blocked'
);

CREATE TYPE "public"."room_privacy" AS ENUM (
    'public',
    'private',
    'invite_only'
);

CREATE TYPE "public"."user_status" AS ENUM (
    'online',
    'offline',
    'away',
    'busy'
);

-- Functions
CREATE OR REPLACE FUNCTION "public"."create_room_and_join"("p_name" "text", "p_description" "text" DEFAULT ''::"text", "p_subject" "text" DEFAULT ''::"text", "p_is_public" boolean DEFAULT true, "p_max_members" integer DEFAULT 10) RETURNS TABLE("room" json, "membership" json)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    new_room_id UUID;
    room_code TEXT;
    room_record RECORD;
    member_record RECORD;
BEGIN
    -- Generate unique short code
    room_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Create room
    INSERT INTO rooms (
        name, 
        description, 
        subject, 
        creator_id, 
        created_by,
        short_code,
        join_code,
        is_public, 
        max_members,
        is_active
    ) VALUES (
        p_name,
        p_description,
        p_subject,
        auth.uid(),
        auth.uid(),
        room_code,
        room_code,
        p_is_public,
        p_max_members,
        true
    ) RETURNING id INTO new_room_id;
    
    -- Add creator as admin member
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (new_room_id, auth.uid(), 'admin', NOW());
    
    -- Get room data
    SELECT r.*, p.full_name as creator_name, p.avatar_url as creator_avatar
    INTO room_record
    FROM rooms r
    LEFT JOIN profiles p ON p.id = r.creator_id
    WHERE r.id = new_room_id;
    
    -- Get membership data
    SELECT rm.*, p.full_name, p.avatar_url, p.username
    INTO member_record
    FROM room_members rm
    LEFT JOIN profiles p ON p.id = rm.user_id
    WHERE rm.room_id = new_room_id AND rm.user_id = auth.uid();
    
    RETURN QUERY
    SELECT 
        row_to_json(room_record)::JSON as room,
        row_to_json(member_record)::JSON as membership;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_room_member_count"("p_room_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM room_members 
    WHERE room_id = p_room_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."is_room_member_secure"("room_id" "uuid", "user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_members 
    WHERE room_members.room_id = is_room_member_secure.room_id 
    AND room_members.user_id = is_room_member_secure.user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."join_room_safe"("p_room_identifier" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
    target_room_id UUID;
    room_record RECORD;
    member_record RECORD;
    current_members INTEGER;
    max_capacity INTEGER;
BEGIN
    -- Find room by ID or code
    IF p_room_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[0-9a-f]{3}-[0-9a-f]{12}$' THEN
        -- UUID format
        SELECT id INTO target_room_id FROM rooms WHERE id = p_room_identifier::UUID AND is_active = true;
    ELSE
        -- Short code format
        SELECT id INTO target_room_id FROM rooms WHERE (short_code = upper(p_room_identifier) OR join_code = upper(p_room_identifier)) AND is_active = true;
    END IF;
    
    IF target_room_id IS NULL THEN
        RETURN json_build_object('status', 'error', 'code', 'ROOM_NOT_FOUND');
    END IF;
    
    -- Check if already a member
    IF EXISTS (SELECT 1 FROM room_members WHERE room_id = target_room_id AND user_id = auth.uid()) THEN
        RETURN json_build_object('status', 'ok', 'code', 'ALREADY_MEMBER');
    END IF;
    
    -- Check capacity
    SELECT COUNT(*), r.max_members INTO current_members, max_capacity
    FROM room_members rm
    JOIN rooms r ON r.id = rm.room_id
    WHERE rm.room_id = target_room_id
    GROUP BY r.max_members;
    
    IF current_members >= max_capacity THEN
        RETURN json_build_object('status', 'error', 'code', 'MAX_CAPACITY');
    END IF;
    
    -- Check if room is public or user has permission
    SELECT * INTO room_record FROM rooms WHERE id = target_room_id;
    IF NOT room_record.is_public THEN
        RETURN json_build_object('status', 'error', 'code', 'ROOM_PRIVATE');
    END IF;
    
    -- Join room
    INSERT INTO room_members (room_id, user_id, role, joined_at)
    VALUES (target_room_id, auth.uid(), 'member', NOW());
    
    -- Get membership data
    SELECT rm.*, p.full_name, p.avatar_url, p.username
    INTO member_record
    FROM room_members rm
    LEFT JOIN profiles p ON p.id = rm.user_id
    WHERE rm.room_id = target_room_id AND rm.user_id = auth.uid();
    
    RETURN json_build_object(
        'status', 'ok', 
        'code', 'JOINED',
        'membership', row_to_json(member_record)
    );
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."refresh_popular_rooms"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_rooms;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_profile_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'rooms' THEN
            UPDATE profiles SET rooms_created = rooms_created + 1 WHERE id = NEW.creator_id;
        ELSIF TG_TABLE_NAME = 'room_members' THEN
            UPDATE profiles SET rooms_joined = rooms_joined + 1 WHERE id = NEW.user_id;
        ELSIF TG_TABLE_NAME = 'messages' THEN
            UPDATE profiles SET messages_sent = messages_sent + 1 WHERE id = NEW.sender_id;
        ELSIF TG_TABLE_NAME = 'friends' AND NEW.status = 'accepted' THEN
            UPDATE profiles SET friends_count = friends_count + 1 WHERE id = NEW.from_user;
            UPDATE profiles SET friends_count = friends_count + 1 WHERE id = NEW.to_user;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'room_members' THEN
            UPDATE profiles SET rooms_joined = rooms_joined - 1 WHERE id = OLD.user_id;
        ELSIF TG_TABLE_NAME = 'friends' AND OLD.status = 'accepted' THEN
            UPDATE profiles SET friends_count = friends_count - 1 WHERE id = OLD.from_user;
            UPDATE profiles SET friends_count = friends_count - 1 WHERE id = OLD.to_user;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."validate_join_code"("p_code" "text") RETURNS TABLE("room_id" "uuid", "room_name" "text", "creator_id" "uuid", "valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.name, r.creator_id, true as valid
    FROM rooms r
    WHERE (r.join_code = p_code OR r.short_code = p_code)
    AND r.is_active = true;
    
    -- If no results, return invalid
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT NULL::UUID, NULL::TEXT, NULL::UUID, false as valid;
    END IF;
END;
$$;

-- Tables
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" character varying(30) NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "xp" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "rooms_joined" integer DEFAULT 0,
    "rooms_created" integer DEFAULT 0,
    "messages_sent" integer DEFAULT 0,
    "friends_count" integer DEFAULT 0,
    "is_online_visible" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "interests" "text"[],
    "phone" character varying(20),
    "phone_verified" boolean DEFAULT false,
    "status" "public"."user_status" DEFAULT 'offline'::"public"."user_status",
    "is_verified" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "location" "text",
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "creator_id" "uuid",
    "created_by" "uuid",
    "join_code" "text",
    "short_code" "text",
    "is_public" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "max_members" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_member_role" CHECK (("role" = ANY (ARRAY['member'::"text", 'admin'::"text", 'owner'::"text'])))
);

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "message_type" "public"."message_type" DEFAULT 'text'::"public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_edited" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."friends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user" "uuid",
    "to_user" "uuid",
    "status" "public"."friend_request_status" DEFAULT 'pending'::"public"."friend_request_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_friend" CHECK (("from_user" <> "to_user"))
);

CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan" "text" NOT NULL,
    "status" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'pro'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'expired'::"text", 'past_due'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_activity_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."conversation_type" NOT NULL,
    "name" "text",
    "description" "text",
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_message_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "public"."conversation_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone,
    "is_muted" boolean DEFAULT false
);

-- Primary Keys
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."rooms" ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."room_members" ADD CONSTRAINT "room_members_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."friends" ADD CONSTRAINT "friends_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."badges" ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscriptions" ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_streaks" ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_badges" ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."conversations" ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."conversation_members" ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id");

-- Unique Constraints
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");
ALTER TABLE ONLY "public"."rooms" ADD CONSTRAINT "rooms_join_code_key" UNIQUE ("join_code");
ALTER TABLE ONLY "public"."rooms" ADD CONSTRAINT "rooms_short_code_key" UNIQUE ("short_code");
ALTER TABLE ONLY "public"."friends" ADD CONSTRAINT "friends_from_user_to_user_key" UNIQUE ("from_user", "to_user");
ALTER TABLE ONLY "public"."badges" ADD CONSTRAINT "badges_name_key" UNIQUE ("name");
ALTER TABLE ONLY "public"."user_streaks" ADD CONSTRAINT "user_streaks_user_id_key" UNIQUE ("user_id");
ALTER TABLE ONLY "public"."user_badges" ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");
ALTER TABLE ONLY "public"."conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");
ALTER TABLE ONLY "public"."room_members" ADD CONSTRAINT "room_members_room_id_user_id_key" UNIQUE ("room_id", "user_id");

-- Foreign Keys
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."rooms" ADD CONSTRAINT "rooms_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."rooms" ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."friends" ADD CONSTRAINT "friends_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."friends" ADD CONSTRAINT "friends_to_user_fkey" FOREIGN KEY ("to_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");
CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");
CREATE INDEX "idx_profiles_status" ON "public"."profiles" USING "btree" ("status") WHERE (NOT "is_deleted");
CREATE INDEX "idx_rooms_created_by" ON "public"."rooms" USING "btree" ("created_by");
CREATE INDEX "idx_rooms_is_public" ON "public"."rooms" USING "btree" ("is_public");
CREATE INDEX "idx_rooms_join_code" ON "public"."rooms" USING "btree" ("join_code") WHERE ("join_code" IS NOT NULL);
CREATE INDEX "idx_rooms_short_code" ON "public"."rooms" USING "btree" ("short_code") WHERE ("short_code" IS NOT NULL);
CREATE INDEX "idx_room_members_room_id" ON "public"."room_members" USING "btree" ("room_id");
CREATE INDEX "idx_room_members_user_id" ON "public"."room_members" USING "btree" ("user_id");
CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");
CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");
CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_messages_thread_id" ON "public"."messages" USING "btree" ("thread_id") WHERE ("thread_id" IS NOT NULL);
CREATE INDEX "idx_friends_from_user" ON "public"."friends" USING "btree" ("from_user");
CREATE INDEX "idx_friends_to_user" ON "public"."friends" USING "btree" ("to_user");
CREATE INDEX "idx_friends_status" ON "public"."friends" USING "btree" ("status");
CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");
CREATE INDEX "idx_user_streaks_user_id" ON "public"."user_streaks" USING "btree" ("user_id");
CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");
CREATE INDEX "idx_user_badges_badge_id" ON "public"."user_badges" USING "btree" ("badge_id");
CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");
CREATE INDEX "idx_conversation_members_user_id" ON "public"."conversation_members" USING "btree" ("user_id");

-- Triggers
CREATE OR REPLACE TRIGGER "trigger_update_friends_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."friends" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();
CREATE OR REPLACE TRIGGER "trigger_update_messages_sent" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();
CREATE OR REPLACE TRIGGER "trigger_update_rooms_created" AFTER INSERT ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();
CREATE OR REPLACE TRIGGER "trigger_update_rooms_joined" AFTER INSERT OR DELETE ON "public"."room_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();
CREATE OR REPLACE TRIGGER "update_conversation_last_message_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();
CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_user_streaks_updated_at" BEFORE UPDATE ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- RLS Policies
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));
CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));
CREATE POLICY "Users can view public profile data" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((NOT "is_deleted"));

ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create rooms" ON "public"."rooms" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));
CREATE POLICY "Anyone can view public rooms" ON "public"."rooms" FOR SELECT USING (("is_public" = true));
CREATE POLICY "Users can read accessible rooms" ON "public"."rooms" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));
CREATE POLICY "Creators can update own rooms" ON "public"."rooms" FOR UPDATE USING (("auth"."uid"() = "created_by"));
CREATE POLICY "Creators can delete own rooms" ON "public"."rooms" FOR DELETE USING (("auth"."uid"() = "created_by"));

ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can join rooms" ON "public"."room_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can leave rooms" ON "public"."room_members" FOR DELETE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view own memberships" ON "public"."room_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Members can view room members (secure)" ON "public"."room_members" FOR SELECT TO "authenticated" USING ("public"."is_room_member_secure"("room_id", "auth"."uid"()));
CREATE POLICY "Room creators can manage members" ON "public"."room_members" FOR SELECT USING ((EXISTS ( SELECT 1 FROM "public"."rooms" WHERE (("rooms"."id" = "room_members"."room_id") AND ("rooms"."created_by" = "auth"."uid"())))));
CREATE POLICY "Room creators can remove members" ON "public"."room_members" FOR DELETE USING ((EXISTS ( SELECT 1 FROM "public"."rooms" WHERE (("rooms"."id" = "room_members"."room_id") AND ("rooms"."created_by" = "auth"."uid"())))));

ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));
CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING (("conversation_id" IN ( SELECT "conversation_members"."conversation_id" FROM "public"."conversation_members" WHERE ("conversation_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "Users can send messages in their conversations" ON "public"."messages" FOR INSERT WITH CHECK (("sender_id" = "auth"."uid"()) AND ("conversation_id" IN ( SELECT "conversation_members"."conversation_id" FROM "public"."conversation_members" WHERE ("conversation_members"."user_id" = "auth"."uid"()))));

ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can send friend requests" ON "public"."friends" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "from_user"));
CREATE POLICY "Users can read own friends" ON "public"."friends" FOR SELECT USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Participants can update friend requests" ON "public"."friends" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user"))) WITH CHECK ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));
CREATE POLICY "Participants can delete friend requests" ON "public"."friends" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));

ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view badges" ON "public"."badges" FOR SELECT USING (true);

ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own subscriptions" ON "public"."subscriptions" FOR UPDATE USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own streaks" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own streaks" ON "public"."user_streaks" FOR UPDATE USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));

ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can insert their own badges" ON "public"."user_badges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversations they are a member of" ON "public"."conversations" FOR SELECT USING (("id" IN ( SELECT "conversation_members"."conversation_id" FROM "public"."conversation_members" WHERE ("conversation_members"."user_id" = "auth"."uid"()))));
CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));
CREATE POLICY "Users can update their own conversations" ON "public"."conversations" FOR UPDATE USING (("created_by" = "auth"."uid"()));

ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own membership" ON "public"."conversation_members" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "Members can insert their own membership" ON "public"."conversation_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Members can delete their own membership" ON "public"."conversation_members" FOR DELETE USING (("user_id" = "auth"."uid"()));

-- Grants
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- Materialized Views
CREATE MATERIALIZED VIEW "public"."popular_rooms" AS
 SELECT "r"."id",
    "r"."name",
    "r"."description",
    "r"."created_by",
    "count"("m"."user_id") AS "member_count"
   FROM ("public"."rooms" "r"
     LEFT JOIN "public"."room_members" "m" ON (("m"."room_id" = "r"."id")))
  GROUP BY "r"."id"
  WITH NO DATA;
ALTER MATERIALIZED VIEW "public"."popular_rooms" OWNER TO "postgres";

RESET ALL;
