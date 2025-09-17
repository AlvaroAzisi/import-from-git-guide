

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


CREATE SCHEMA IF NOT EXISTS "backup_before_cleanup";


ALTER SCHEMA "backup_before_cleanup" OWNER TO "postgres";




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."conversation_type" AS ENUM (
    'dm',
    'group',
    'channel'
);


ALTER TYPE "public"."conversation_type" OWNER TO "postgres";


CREATE TYPE "public"."message_type" AS ENUM (
    'text',
    'image',
    'file',
    'system'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'message',
    'friend_request',
    'room_invite',
    'system'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."reaction_type" AS ENUM (
    'like',
    'love',
    'laugh',
    'angry',
    'sad',
    'thumbs_up',
    'thumbs_down'
);


ALTER TYPE "public"."reaction_type" OWNER TO "postgres";


CREATE TYPE "public"."relationship_status" AS ENUM (
    'pending',
    'accepted',
    'blocked'
);


ALTER TYPE "public"."relationship_status" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'online',
    'offline',
    'away',
    'busy'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


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


ALTER FUNCTION "public"."create_room_and_join"("p_name" "text", "p_description" "text", "p_subject" "text", "p_is_public" boolean, "p_max_members" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_room_member_count"("p_room_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_friends_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update both users' counts
  UPDATE profiles
  SET friends_count = COALESCE(friends_count, 0) + 1
  WHERE id IN (NEW.from_user, NEW.to_user);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_friends_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_messages_sent"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles
  SET messages_sent = COALESCE(messages_sent, 0) + 1
  WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_messages_sent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_rooms_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles
  SET rooms_created = COALESCE(rooms_created, 0) + 1
  WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_rooms_created"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."is_room_member_secure"("room_id" "uuid", "user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."join_room_safe"("p_room_identifier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_popular_rooms"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_rooms;
END;
$$;


ALTER FUNCTION "public"."refresh_popular_rooms"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."update_profile_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."validate_join_code"("p_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."audit_logs" (
    "id" "uuid",
    "user_id" "uuid",
    "action" "text",
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."audit_logs_2025_01" (
    "id" "uuid",
    "user_id" "uuid",
    "action" "text",
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."audit_logs_2025_01" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."audit_logs_2025_02" (
    "id" "uuid",
    "user_id" "uuid",
    "action" "text",
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."audit_logs_2025_02" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."audit_logs_2025_03" (
    "id" "uuid",
    "user_id" "uuid",
    "action" "text",
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."audit_logs_2025_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."conversation_members" (
    "id" "uuid",
    "conversation_id" "uuid",
    "user_id" "uuid",
    "role" "text",
    "joined_at" timestamp with time zone,
    "last_read_at" timestamp with time zone,
    "is_muted" boolean
);


ALTER TABLE "backup_before_cleanup"."conversation_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."conversations" (
    "id" "uuid",
    "type" "public"."conversation_type",
    "name" "text",
    "description" "text",
    "avatar_url" "text",
    "is_active" boolean,
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "last_message_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."friends" (
    "id" "uuid",
    "from_user" "uuid",
    "to_user" "uuid",
    "status" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."friends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."message_attachments" (
    "id" "uuid",
    "message_id" "uuid",
    "message_created_at" timestamp with time zone,
    "file_name" "text",
    "file_url" "text",
    "file_type" "text",
    "file_size" bigint,
    "thumbnail_url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."message_reactions" (
    "id" "uuid",
    "message_id" "uuid",
    "message_created_at" timestamp with time zone,
    "user_id" "uuid",
    "reaction" "public"."reaction_type",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."message_reads" (
    "id" "uuid",
    "message_id" "uuid",
    "message_created_at" timestamp with time zone,
    "user_id" "uuid",
    "read_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages_2025_01" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages_2025_01" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages_2025_02" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages_2025_02" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages_2025_03" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages_2025_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages_2025_04" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages_2025_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages_2025_05" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages_2025_05" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."messages_2025_06" (
    "id" "uuid",
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "message_type" "public"."message_type",
    "reply_to_id" "uuid",
    "thread_id" "uuid",
    "mentions" "uuid"[],
    "attachments" "jsonb",
    "metadata" "jsonb",
    "is_edited" boolean,
    "is_deleted" boolean,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."messages_2025_06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."notifications" (
    "id" "uuid",
    "user_id" "uuid",
    "type" "public"."notification_type",
    "title" "text",
    "content" "text",
    "data" "jsonb",
    "is_read" boolean,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."notifications_0" (
    "id" "uuid",
    "user_id" "uuid",
    "type" "public"."notification_type",
    "title" "text",
    "content" "text",
    "data" "jsonb",
    "is_read" boolean,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."notifications_0" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."notifications_1" (
    "id" "uuid",
    "user_id" "uuid",
    "type" "public"."notification_type",
    "title" "text",
    "content" "text",
    "data" "jsonb",
    "is_read" boolean,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."notifications_1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."notifications_2" (
    "id" "uuid",
    "user_id" "uuid",
    "type" "public"."notification_type",
    "title" "text",
    "content" "text",
    "data" "jsonb",
    "is_read" boolean,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."notifications_2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."notifications_3" (
    "id" "uuid",
    "user_id" "uuid",
    "type" "public"."notification_type",
    "title" "text",
    "content" "text",
    "data" "jsonb",
    "is_read" boolean,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."notifications_3" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."post_interactions" (
    "id" "uuid",
    "post_id" "uuid",
    "user_id" "uuid",
    "interaction_type" "text",
    "content" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."post_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."posts" (
    "id" "uuid",
    "author_id" "uuid",
    "content" "text",
    "attachments" "jsonb",
    "visibility" "text",
    "is_deleted" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."profiles" (
    "id" "uuid",
    "username" character varying(30),
    "full_name" "text",
    "email" "text",
    "avatar_url" "text",
    "bio" "text",
    "xp" integer,
    "level" integer,
    "streak" integer,
    "rooms_joined" integer,
    "rooms_created" integer,
    "messages_sent" integer,
    "friends_count" integer,
    "is_online_visible" boolean,
    "email_notifications" boolean,
    "push_notifications" boolean,
    "interests" "text"[],
    "phone" character varying(20),
    "phone_verified" boolean,
    "status" "public"."user_status",
    "is_verified" boolean,
    "is_deleted" boolean,
    "last_seen_at" timestamp with time zone,
    "location" "text",
    "website" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."reports" (
    "id" "uuid",
    "reporter_id" "uuid",
    "reported_content_type" "text",
    "reported_content_id" "uuid",
    "reason" "text",
    "description" "text",
    "status" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."room_members" (
    "id" "uuid",
    "room_id" "uuid",
    "user_id" "uuid",
    "role" "text",
    "joined_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."room_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."rooms" (
    "id" "uuid",
    "name" "text",
    "description" "text",
    "subject" "text",
    "creator_id" "uuid",
    "created_by" "uuid",
    "join_code" "text",
    "short_code" "text",
    "is_public" boolean,
    "is_active" boolean,
    "max_members" integer,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."typing_indicators" (
    "id" "uuid",
    "conversation_id" "uuid",
    "user_id" "uuid",
    "started_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."typing_indicators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."user_relationships" (
    "id" "uuid",
    "user_id" "uuid",
    "target_user_id" "uuid",
    "status" "public"."relationship_status",
    "created_by" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."user_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "backup_before_cleanup"."user_sessions" (
    "id" "uuid",
    "user_id" "uuid",
    "session_token" "text",
    "device_info" "jsonb",
    "ip_address" "inet",
    "is_active" boolean,
    "last_activity" timestamp with time zone,
    "created_at" timestamp with time zone
);


ALTER TABLE "backup_before_cleanup"."user_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user" "uuid",
    "to_user" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_friend" CHECK (("from_user" <> "to_user"))
);


ALTER TABLE "public"."friends" OWNER TO "postgres";


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
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
)
PARTITION BY HASH ("user_id");


ALTER TABLE "public"."notifications" OWNER TO "postgres";


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


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_member_role" CHECK (("role" = ANY (ARRAY['member'::"text", 'admin'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."room_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "created_by" "uuid",
    "join_code" "text",
    "short_code" "text",
    "is_public" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "max_members" integer DEFAULT 10,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


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


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "uuid" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "last_activity_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



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


ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_from_user_to_user_key" UNIQUE ("from_user", "to_user");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_room_id_user_id_key" UNIQUE ("room_id", "user_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "uniq_friend_pair" UNIQUE ("from_user", "to_user");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_friends_from_to" ON "public"."friends" USING "btree" ("from_user", "to_user");



CREATE INDEX "idx_friends_from_user" ON "public"."friends" USING "btree" ("from_user");



CREATE INDEX "idx_friends_status" ON "public"."friends" USING "btree" ("status");



CREATE INDEX "idx_friends_to_user" ON "public"."friends" USING "btree" ("to_user");



CREATE INDEX "idx_messages_conversation" ON ONLY "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_created" ON ONLY "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_id" ON ONLY "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON ONLY "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_sender" ON ONLY "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_sender_id" ON ONLY "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_thread" ON ONLY "public"."messages" USING "btree" ("thread_id") WHERE ("thread_id" IS NOT NULL);



CREATE INDEX "idx_notifications_is_read" ON ONLY "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user" ON ONLY "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON ONLY "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_status" ON "public"."profiles" USING "btree" ("status") WHERE (NOT "is_deleted");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_room_members_room" ON "public"."room_members" USING "btree" ("room_id");



CREATE INDEX "idx_room_members_room_id" ON "public"."room_members" USING "btree" ("room_id");



CREATE INDEX "idx_room_members_user" ON "public"."room_members" USING "btree" ("user_id");



CREATE INDEX "idx_room_members_user_id" ON "public"."room_members" USING "btree" ("user_id");



CREATE INDEX "idx_rooms_active_public" ON "public"."rooms" USING "btree" ("is_active", "is_public") WHERE ("is_active" = true);



CREATE INDEX "idx_rooms_created_by" ON "public"."rooms" USING "btree" ("created_by");



CREATE INDEX "idx_rooms_is_public" ON "public"."rooms" USING "btree" ("is_public");



CREATE INDEX "idx_rooms_join_code" ON "public"."rooms" USING "btree" ("join_code") WHERE ("join_code" IS NOT NULL);



CREATE INDEX "idx_rooms_short_code" ON "public"."rooms" USING "btree" ("short_code") WHERE ("short_code" IS NOT NULL);



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_badge_id" ON "public"."user_badges" USING "btree" ("badge_id");



CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_streaks_user_id" ON "public"."user_streaks" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_increment_friends_count" AFTER UPDATE ON "public"."friends" FOR EACH ROW WHEN (("new"."status" = 'accepted'::"text")) EXECUTE FUNCTION "public"."increment_friends_count"();



CREATE OR REPLACE TRIGGER "trg_increment_messages_sent" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."increment_messages_sent"();



CREATE OR REPLACE TRIGGER "trg_increment_rooms_created" AFTER INSERT ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."increment_rooms_created"();



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



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_to_user_fkey" FOREIGN KEY ("to_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "All users can view badges" ON "public"."badges" FOR SELECT USING (true);



CREATE POLICY "Anyone can view public rooms" ON "public"."rooms" FOR SELECT USING (true);



CREATE POLICY "Creators can delete own rooms" ON "public"."rooms" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Creators can update own rooms" ON "public"."rooms" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Members can view room members (secure)" ON "public"."room_members" FOR SELECT TO "authenticated" USING ("public"."is_room_member_secure"("room_id", "auth"."uid"()));



CREATE POLICY "Other users can view user badges" ON "public"."user_badges" FOR SELECT USING (true);



CREATE POLICY "Other users can view user streaks" ON "public"."user_streaks" FOR SELECT USING (true);



CREATE POLICY "Participants can delete friend requests" ON "public"."friends" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));



CREATE POLICY "Participants can update friend requests" ON "public"."friends" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user"))) WITH CHECK ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));



CREATE POLICY "Room creators can manage members" ON "public"."room_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_members"."room_id") AND ("rooms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Room creators can remove members" ON "public"."room_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."id" = "room_members"."room_id") AND ("rooms"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can create rooms" ON "public"."rooms" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can join rooms" ON "public"."room_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave rooms" ON "public"."room_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read accessible rooms" ON "public"."rooms" FOR SELECT USING ((("is_public" = true) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can read own friends" ON "public"."friends" FOR SELECT USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read room members" ON "public"."room_members" FOR SELECT USING (("room_id" IN ( SELECT "rooms"."id"
   FROM "public"."rooms"
  WHERE ("rooms"."created_by" = "auth"."uid"()))));



CREATE POLICY "Users can send friend requests" ON "public"."friends" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "from_user"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own rooms" ON "public"."rooms" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can view own memberships" ON "public"."room_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view public profile data" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((NOT "is_deleted"));



CREATE POLICY "Users can view their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own badges" ON "public"."user_badges" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own streaks" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;

























































































































































GRANT ALL ON FUNCTION "public"."create_room_and_join"("p_name" "text", "p_description" "text", "p_subject" "text", "p_is_public" boolean, "p_max_members" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_room_member_count"("p_room_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."join_room_safe"("p_room_identifier" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_profile_stats"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."validate_join_code"("p_code" "text") TO "authenticated";


















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."friends" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."messages" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."room_members" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rooms" TO "authenticated";

































RESET ALL;
