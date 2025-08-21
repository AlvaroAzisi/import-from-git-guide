

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




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "btree_gin" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






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
    'audio',
    'video',
    'system'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'message',
    'friend_request',
    'mention',
    'system'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."reaction_type" AS ENUM (
    'like',
    'love',
    'laugh',
    'sad',
    'angry',
    'thumbs_up',
    'thumbs_down'
);


ALTER TYPE "public"."reaction_type" OWNER TO "postgres";


CREATE TYPE "public"."relationship_status" AS ENUM (
    'pending',
    'accepted',
    'blocked',
    'declined'
);


ALTER TYPE "public"."relationship_status" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'online',
    'away',
    'busy',
    'offline'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_action_type" "text", "p_limit" integer, "p_window_minutes" integer DEFAULT 60) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
BEGIN
    -- Clean expired limits first
    DELETE FROM rate_limits WHERE expires_at < NOW();
    
    -- Count recent actions
    SELECT COALESCE(SUM(count), 0) INTO v_count
    FROM rate_limits
    WHERE user_id = p_user_id
        AND action_type = p_action_type
        AND window_start > v_window_start;
    
    -- Check if limit exceeded
    IF v_count >= p_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Record this action
    INSERT INTO rate_limits (user_id, action_type, count, window_start, expires_at)
    VALUES (p_user_id, p_action_type, 1, NOW(), NOW() + (p_window_minutes || ' minutes')::INTERVAL)
    ON CONFLICT (user_id, action_type, window_start) 
    DO UPDATE SET count = rate_limits.count + 1;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_user_id" "uuid", "p_action_type" "text", "p_limit" integer, "p_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_expired_typing_indicators"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM typing_indicators 
    WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$;


ALTER FUNCTION "public"."clean_expired_typing_indicators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."cleanup_expired_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_dm_conversation"("other_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_dm_conversation"("other_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_monthly_partitions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."create_monthly_partitions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_room_and_join"("p_name" "text", "p_description" "text" DEFAULT ''::"text", "p_subject" "text" DEFAULT ''::"text", "p_is_public" boolean DEFAULT true, "p_max_members" integer DEFAULT 10) RETURNS TABLE("room" json, "membership" json)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."create_thread_reply"("p_parent_message_id" "uuid", "p_parent_created_at" timestamp with time zone, "p_content" "text", "p_message_type" "public"."message_type" DEFAULT 'text'::"public"."message_type") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_message_id UUID;
    v_conversation_id UUID;
    v_thread_id UUID;
    current_user_id UUID := auth.uid();
BEGIN
    -- Get conversation and thread info
    SELECT conversation_id, COALESCE(thread_id, id) 
    INTO v_conversation_id, v_thread_id
    FROM messages 
    WHERE id = p_parent_message_id AND created_at = p_parent_created_at;
    
    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Parent message not found';
    END IF;
    
    -- Insert reply
    INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_id, thread_id)
    VALUES (v_conversation_id, current_user_id, p_content, p_message_type, p_parent_message_id, v_thread_id)
    RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$;


ALTER FUNCTION "public"."create_thread_reply"("p_parent_message_id" "uuid", "p_parent_created_at" timestamp with time zone, "p_content" "text", "p_message_type" "public"."message_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enhanced_cleanup_expired_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Clean expired typing indicators
    DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
    
    -- Clean expired rate limits
    DELETE FROM rate_limits WHERE expires_at < NOW();
    
    -- Clean old inactive sessions
    DELETE FROM user_sessions WHERE last_activity < NOW() - INTERVAL '30 days';
    
    -- Clean old audit logs (keep 90 days)
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean inactive conversation presence
    DELETE FROM conversation_presence WHERE last_seen < NOW() - INTERVAL '5 minutes';
    
    -- Soft delete old messages (keep 1 year)
    UPDATE messages SET is_deleted = TRUE 
    WHERE created_at < NOW() - INTERVAL '1 year' AND NOT is_deleted;
    
    -- Clean search vectors for deleted messages
    DELETE FROM message_search_vectors 
    WHERE (message_id, message_created_at) IN (
        SELECT id, created_at FROM messages WHERE is_deleted = TRUE
    );
END;
$$;


ALTER FUNCTION "public"."enhanced_cleanup_expired_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer DEFAULT 50, "p_cursor" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_direction" "text" DEFAULT 'before'::"text") RETURNS TABLE("id" "uuid", "sender_id" "uuid", "content" "text", "message_type" "public"."message_type", "created_at" timestamp with time zone, "sender_username" "text", "sender_avatar_url" "text", "reply_to_id" "uuid", "reactions" "jsonb", "is_edited" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.sender_id,
        m.content,
        m.message_type,
        m.created_at,
        p.username,
        p.avatar_url,
        m.reply_to_id,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'reaction', mr.reaction,
                    'count', COUNT(*)
                ) ORDER BY mr.reaction
            ) FILTER (WHERE mr.reaction IS NOT NULL),
            '[]'::jsonb
        ) as reactions,
        m.is_edited
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    LEFT JOIN message_reactions mr ON mr.message_id = m.id AND mr.message_created_at = m.created_at
    WHERE m.conversation_id = p_conversation_id
        AND NOT m.is_deleted
        AND CASE 
            WHEN p_cursor IS NULL THEN TRUE
            WHEN p_direction = 'before' THEN m.created_at < p_cursor
            WHEN p_direction = 'after' THEN m.created_at > p_cursor
            ELSE TRUE
        END
    GROUP BY m.id, m.sender_id, m.content, m.message_type, m.created_at, p.username, p.avatar_url, m.reply_to_id, m.is_edited
    ORDER BY 
        CASE WHEN p_direction = 'after' THEN m.created_at END ASC,
        CASE WHEN p_direction = 'before' THEN m.created_at END DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_cursor" timestamp with time zone, "p_direction" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_room_member_count"("p_room_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
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


CREATE OR REPLACE FUNCTION "public"."join_room_safe"("p_room_identifier" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."queue_push_notification"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, content, data)
    VALUES (p_user_id, 'message', p_title, p_body, p_data);
    
    -- Here you would typically queue to external push service
    -- For now, just log the intent
    INSERT INTO audit_logs (user_id, action, resource_type, details)
    VALUES (p_user_id, 'push_notification_queued', 'notification', 
            jsonb_build_object('title', p_title, 'body', p_body));
END;
$$;


ALTER FUNCTION "public"."queue_push_notification"("p_user_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_popular_rooms"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_rooms;
END;
$$;


ALTER FUNCTION "public"."refresh_popular_rooms"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text", "p_message_type" "public"."message_type" DEFAULT 'text'::"public"."message_type", "p_reply_to_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    
    -- Insert message (reply_to_id will be handled by application logic if needed)
    INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_id)
    VALUES (p_conversation_id, current_user_id, p_content, p_message_type, p_reply_to_id)
    RETURNING id INTO message_id;
    
    -- Update user message count
    UPDATE profiles SET messages_sent = messages_sent + 1 WHERE id = current_user_id;
    
    RETURN message_id;
END;
$$;


ALTER FUNCTION "public"."send_message"("p_conversation_id" "uuid", "p_content" "text", "p_message_type" "public"."message_type", "p_reply_to_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_user_activity"("p_user_id" "uuid", "p_action" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update last seen
    UPDATE profiles SET last_seen_at = NOW() WHERE id = p_user_id;
    
    -- Log activity
    INSERT INTO audit_logs (user_id, action, resource_type, details)
    VALUES (p_user_id, p_action, 'user_activity', p_details);
    
    -- Update XP for certain actions
    CASE p_action
        WHEN 'message_sent' THEN
            UPDATE profiles SET xp = xp + 1 WHERE id = p_user_id;
        WHEN 'friend_added' THEN
            UPDATE profiles SET xp = xp + 5 WHERE id = p_user_id;
        ELSE
            -- No XP for other actions
    END CASE;
END;
$$;


ALTER FUNCTION "public"."track_user_activity"("p_user_id" "uuid", "p_action" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_message_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO message_search_vectors (message_id, message_created_at, search_vector)
    VALUES (NEW.id, NEW.created_at, to_tsvector('english', NEW.content))
    ON CONFLICT (message_id, message_created_at)
    DO UPDATE SET search_vector = to_tsvector('english', NEW.content);
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_message_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_join_code"("p_code" "text") RETURNS TABLE("room_id" "uuid", "room_name" "text", "creator_id" "uuid", "valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE TABLE IF NOT EXISTS "public"."admin_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."admin_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "permissions" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs_2025_01" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs_2025_01" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs_2025_02" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs_2025_02" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs_2025_03" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs_2025_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone DEFAULT "now"(),
    "is_muted" boolean DEFAULT false
);


ALTER TABLE "public"."conversation_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_presence" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."conversation_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "public"."conversation_type" NOT NULL,
    "name" "text",
    "description" "text",
    "avatar_url" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "group_has_name" CHECK ((("type" = 'dm'::"public"."conversation_type") OR (("type" = ANY (ARRAY['group'::"public"."conversation_type", 'channel'::"public"."conversation_type"])) AND ("name" IS NOT NULL))))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_user" "uuid",
    "to_user" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."friends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "message_created_at" timestamp with time zone NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "file_type" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_file_size" CHECK ((("file_size" > 0) AND ("file_size" <= 104857600)))
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_delivery_status" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "message_created_at" timestamp with time zone NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text",
    "delivered_at" timestamp with time zone,
    CONSTRAINT "valid_delivery_status" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."message_delivery_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "message_created_at" timestamp with time zone NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" "public"."reaction_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "message_created_at" timestamp with time zone NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_search_vectors" (
    "message_id" "uuid" NOT NULL,
    "message_created_at" timestamp with time zone NOT NULL,
    "search_vector" "tsvector" NOT NULL
);


ALTER TABLE "public"."message_search_vectors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_01" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_01" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_02" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_02" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_03" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_03" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_04" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_04" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_05" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_05" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_06" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_06" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_07" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_07" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_08" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_08" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_09" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_09" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_10" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_10" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_11" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_11" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages_2025_12" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_content" CHECK (("length"("content") <= 10000))
);


ALTER TABLE "public"."messages_2025_12" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moderation_flags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "flag_type" "text" NOT NULL,
    "confidence_score" numeric(3,2),
    "flagged_by" "text" DEFAULT 'system'::"text",
    "flagged_by_user_id" "uuid",
    "is_reviewed" boolean DEFAULT false,
    "is_approved" boolean DEFAULT false,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_confidence" CHECK ((("confidence_score" IS NULL) OR (("confidence_score" >= 0.00) AND ("confidence_score" <= 1.00)))),
    CONSTRAINT "valid_content_type_mod" CHECK (("content_type" = ANY (ARRAY['message'::"text", 'post'::"text", 'profile'::"text"]))),
    CONSTRAINT "valid_flag_type" CHECK (("flag_type" = ANY (ARRAY['spam'::"text", 'hate'::"text", 'violence'::"text", 'adult'::"text", 'fake'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."moderation_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_title" CHECK (("length"("title") <= 255))
)
PARTITION BY HASH ("user_id");


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_0" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_title" CHECK (("length"("title") <= 255))
);


ALTER TABLE "public"."notifications_0" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_1" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_title" CHECK (("length"("title") <= 255))
);


ALTER TABLE "public"."notifications_1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_2" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_title" CHECK (("length"("title") <= 255))
);


ALTER TABLE "public"."notifications_2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_3" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_title" CHECK (("length"("title") <= 255))
);


ALTER TABLE "public"."notifications_3" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_interactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "interaction_type" "text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_has_content" CHECK ((("interaction_type" <> 'comment'::"text") OR (("content" IS NOT NULL) AND ("length"("content") > 0)))),
    CONSTRAINT "valid_interaction" CHECK (("interaction_type" = ANY (ARRAY['like'::"text", 'share'::"text", 'comment'::"text"])))
);


ALTER TABLE "public"."post_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "visibility" "text" DEFAULT 'public'::"text",
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_post_content" CHECK (("length"("content") <= 5000)),
    CONSTRAINT "valid_visibility" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'friends'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" character varying(30) NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "status" "public"."user_status" DEFAULT 'offline'::"public"."user_status",
    "is_verified" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "interests" "text"[],
    "location" "text",
    "website" "text",
    "xp" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "streak" integer DEFAULT 0,
    "messages_sent" integer DEFAULT 0,
    "friends_count" integer DEFAULT 0,
    "is_online_visible" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "phone" character varying(20),
    "phone_verified" boolean DEFAULT false,
    "rooms_created" integer DEFAULT 0,
    "rooms_joined" integer DEFAULT 0,
    CONSTRAINT "username_length" CHECK ((("length"(("username")::"text") >= 3) AND ("length"(("username")::"text") <= 30))),
    CONSTRAINT "valid_level" CHECK (("level" >= 1)),
    CONSTRAINT "valid_phone" CHECK (((("phone")::"text" ~ '^\+?[1-9]\d{1,14}$'::"text") OR ("phone" IS NULL))),
    CONSTRAINT "valid_username" CHECK ((("username")::"text" ~ '^[a-zA-Z0-9_]+$'::"text")),
    CONSTRAINT "valid_xp" CHECK (("xp" >= 0))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "device_type" "text" NOT NULL,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_device_type" CHECK (("device_type" = ANY (ARRAY['ios'::"text", 'android'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "action_type" "text" NOT NULL,
    "count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '01:00:00'::interval),
    CONSTRAINT "rate_limit_target" CHECK ((("user_id" IS NOT NULL) OR ("ip_address" IS NOT NULL))),
    CONSTRAINT "valid_action_type" CHECK (("action_type" = ANY (ARRAY['message'::"text", 'api_call'::"text", 'login_attempt'::"text", 'friend_request'::"text"])))
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_content_type" "text" NOT NULL,
    "reported_content_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_content_type" CHECK (("reported_content_type" = ANY (ARRAY['message'::"text", 'post'::"text", 'user'::"text"]))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_members" OWNER TO "postgres";


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


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."typing_indicators" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."typing_indicators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_block" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_relationships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "status" "public"."relationship_status" DEFAULT 'pending'::"public"."relationship_status",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_relationship" CHECK (("user_id" <> "target_user_id"))
);


ALTER TABLE "public"."user_relationships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_token" "text" NOT NULL,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "is_active" boolean DEFAULT true,
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_token" CHECK (("length"("session_token") > 10))
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs" ATTACH PARTITION "public"."audit_logs_2025_01" FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');



ALTER TABLE ONLY "public"."audit_logs" ATTACH PARTITION "public"."audit_logs_2025_02" FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');



ALTER TABLE ONLY "public"."audit_logs" ATTACH PARTITION "public"."audit_logs_2025_03" FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_01" FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_02" FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_03" FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_04" FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_05" FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_06" FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_07" FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_08" FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_09" FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_10" FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_11" FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');



ALTER TABLE ONLY "public"."messages" ATTACH PARTITION "public"."messages_2025_12" FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');



ALTER TABLE ONLY "public"."notifications" ATTACH PARTITION "public"."notifications_0" FOR VALUES WITH (modulus 4, remainder 0);



ALTER TABLE ONLY "public"."notifications" ATTACH PARTITION "public"."notifications_1" FOR VALUES WITH (modulus 4, remainder 1);



ALTER TABLE ONLY "public"."notifications" ATTACH PARTITION "public"."notifications_2" FOR VALUES WITH (modulus 4, remainder 2);



ALTER TABLE ONLY "public"."notifications" ATTACH PARTITION "public"."notifications_3" FOR VALUES WITH (modulus 4, remainder 3);



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



CREATE MATERIALIZED VIEW "public"."popular_rooms" AS
 SELECT "r"."id",
    "r"."name",
    "r"."description",
    "r"."subject",
    "r"."creator_id",
    "r"."created_by",
    "r"."join_code",
    "r"."short_code",
    "r"."is_public",
    "r"."is_active",
    "r"."max_members",
    "r"."created_at",
    "r"."updated_at",
    "count"("rm"."user_id") AS "member_count",
    "p"."full_name" AS "creator_name",
    "p"."avatar_url" AS "creator_avatar"
   FROM (("public"."rooms" "r"
     LEFT JOIN "public"."room_members" "rm" ON (("rm"."room_id" = "r"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("p"."id" = "r"."creator_id")))
  WHERE (("r"."is_active" = true) AND ("r"."is_public" = true))
  GROUP BY "r"."id", "p"."full_name", "p"."avatar_url"
  ORDER BY ("count"("rm"."user_id")) DESC, "r"."created_at" DESC
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."popular_rooms" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_assignments"
    ADD CONSTRAINT "admin_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_assignments"
    ADD CONSTRAINT "admin_assignments_user_id_role_id_key" UNIQUE ("user_id", "role_id");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."audit_logs_2025_01"
    ADD CONSTRAINT "audit_logs_2025_01_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."audit_logs_2025_02"
    ADD CONSTRAINT "audit_logs_2025_02_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."audit_logs_2025_03"
    ADD CONSTRAINT "audit_logs_2025_03_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_presence"
    ADD CONSTRAINT "conversation_presence_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_presence"
    ADD CONSTRAINT "conversation_presence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_from_user_to_user_key" UNIQUE ("from_user", "to_user");



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_delivery_status"
    ADD CONSTRAINT "message_delivery_status_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_delivery_status"
    ADD CONSTRAINT "message_delivery_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_reaction_key" UNIQUE ("message_id", "user_id", "reaction");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_search_vectors"
    ADD CONSTRAINT "message_search_vectors_pkey" PRIMARY KEY ("message_id", "message_created_at");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_01"
    ADD CONSTRAINT "messages_2025_01_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_02"
    ADD CONSTRAINT "messages_2025_02_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_03"
    ADD CONSTRAINT "messages_2025_03_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_04"
    ADD CONSTRAINT "messages_2025_04_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_05"
    ADD CONSTRAINT "messages_2025_05_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_06"
    ADD CONSTRAINT "messages_2025_06_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_07"
    ADD CONSTRAINT "messages_2025_07_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_08"
    ADD CONSTRAINT "messages_2025_08_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_09"
    ADD CONSTRAINT "messages_2025_09_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_10"
    ADD CONSTRAINT "messages_2025_10_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_11"
    ADD CONSTRAINT "messages_2025_11_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."messages_2025_12"
    ADD CONSTRAINT "messages_2025_12_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."moderation_flags"
    ADD CONSTRAINT "moderation_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."notifications_0"
    ADD CONSTRAINT "notifications_0_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."notifications_1"
    ADD CONSTRAINT "notifications_1_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."notifications_2"
    ADD CONSTRAINT "notifications_2_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."notifications_3"
    ADD CONSTRAINT "notifications_3_pkey" PRIMARY KEY ("id", "user_id");



ALTER TABLE ONLY "public"."post_interactions"
    ADD CONSTRAINT "post_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_interactions"
    ADD CONSTRAINT "post_interactions_post_id_user_id_interaction_type_key" UNIQUE ("post_id", "user_id", "interaction_type");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_token_key" UNIQUE ("user_id", "token");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_room_id_user_id_key" UNIQUE ("room_id", "user_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_user_id_target_user_id_key" UNIQUE ("user_id", "target_user_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_session_token_key" UNIQUE ("session_token");



CREATE INDEX "idx_conversation_members_composite" ON "public"."conversation_members" USING "btree" ("conversation_id", "user_id");



CREATE INDEX "idx_conversation_members_conversation" ON "public"."conversation_members" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_members_conversation_id" ON "public"."conversation_members" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_members_last_read" ON "public"."conversation_members" USING "btree" ("last_read_at");



CREATE INDEX "idx_conversation_members_user" ON "public"."conversation_members" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_members_user_id" ON "public"."conversation_members" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_presence_active" ON "public"."conversation_presence" USING "btree" ("conversation_id", "is_active", "last_seen");



CREATE INDEX "idx_conversations_active" ON "public"."conversations" USING "btree" ("is_active");



CREATE INDEX "idx_conversations_created_by" ON "public"."conversations" USING "btree" ("created_by");



CREATE INDEX "idx_conversations_last_message" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_type" ON "public"."conversations" USING "btree" ("type");



CREATE INDEX "idx_friends_from_user" ON "public"."friends" USING "btree" ("from_user");



CREATE INDEX "idx_friends_status" ON "public"."friends" USING "btree" ("status");



CREATE INDEX "idx_friends_to_user" ON "public"."friends" USING "btree" ("to_user");



CREATE INDEX "idx_message_delivery_message" ON "public"."message_delivery_status" USING "btree" ("message_id", "status");



CREATE INDEX "idx_message_delivery_user" ON "public"."message_delivery_status" USING "btree" ("user_id", "status");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_message_reactions_user_id" ON "public"."message_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_message_reads_message_id" ON "public"."message_reads" USING "btree" ("message_id");



CREATE INDEX "idx_message_reads_user_id" ON "public"."message_reads" USING "btree" ("user_id");



CREATE INDEX "idx_message_search_vectors" ON "public"."message_search_vectors" USING "gin" ("search_vector");



CREATE INDEX "idx_messages_content_search" ON ONLY "public"."messages" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_messages_conversation_created" ON ONLY "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_id" ON ONLY "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_created_at" ON ONLY "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_mentions" ON ONLY "public"."messages" USING "gin" ("mentions");



CREATE INDEX "idx_messages_sender_id" ON ONLY "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_moderation_flags_content" ON "public"."moderation_flags" USING "btree" ("content_type", "content_id");



CREATE INDEX "idx_moderation_flags_unreviewed" ON "public"."moderation_flags" USING "btree" ("is_reviewed", "created_at");



CREATE INDEX "idx_notifications_unread" ON ONLY "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON ONLY "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_popular_rooms_id" ON "public"."popular_rooms" USING "btree" ("id");



CREATE INDEX "idx_posts_author_id" ON "public"."posts" USING "btree" ("author_id", "created_at" DESC);



CREATE INDEX "idx_posts_content_search" ON "public"."posts" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_posts_visibility" ON "public"."posts" USING "btree" ("visibility", "created_at" DESC);



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_last_seen" ON "public"."profiles" USING "btree" ("last_seen_at");



CREATE INDEX "idx_profiles_search" ON "public"."profiles" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("full_name" || ' '::"text") || ("username")::"text")));



CREATE INDEX "idx_profiles_status" ON "public"."profiles" USING "btree" ("status");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_push_tokens_device" ON "public"."push_tokens" USING "btree" ("device_type", "is_active");



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_rate_limits_cleanup" ON "public"."rate_limits" USING "btree" ("expires_at");



CREATE INDEX "idx_rate_limits_ip" ON "public"."rate_limits" USING "btree" ("ip_address", "action_type", "expires_at");



CREATE INDEX "idx_rate_limits_user" ON "public"."rate_limits" USING "btree" ("user_id", "action_type", "expires_at");



CREATE INDEX "idx_room_members_room" ON "public"."room_members" USING "btree" ("room_id");



CREATE INDEX "idx_room_members_room_id" ON "public"."room_members" USING "btree" ("room_id");



CREATE INDEX "idx_room_members_user" ON "public"."room_members" USING "btree" ("user_id");



CREATE INDEX "idx_room_members_user_id" ON "public"."room_members" USING "btree" ("user_id");



CREATE INDEX "idx_rooms_active_public" ON "public"."rooms" USING "btree" ("is_active", "is_public") WHERE ("is_active" = true);



CREATE INDEX "idx_rooms_created_by" ON "public"."rooms" USING "btree" ("created_by");



CREATE INDEX "idx_rooms_creator" ON "public"."rooms" USING "btree" ("creator_id");



CREATE INDEX "idx_rooms_join_code" ON "public"."rooms" USING "btree" ("join_code") WHERE ("join_code" IS NOT NULL);



CREATE INDEX "idx_rooms_short_code" ON "public"."rooms" USING "btree" ("short_code") WHERE ("short_code" IS NOT NULL);



CREATE INDEX "idx_user_blocks_blocked" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_relationships_composite" ON "public"."user_relationships" USING "btree" ("user_id", "status");



CREATE INDEX "idx_user_relationships_status" ON "public"."user_relationships" USING "btree" ("status");



CREATE INDEX "idx_user_relationships_target_user_id" ON "public"."user_relationships" USING "btree" ("target_user_id");



CREATE INDEX "idx_user_relationships_user_id" ON "public"."user_relationships" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_active" ON "public"."user_sessions" USING "btree" ("is_active", "last_activity");



CREATE INDEX "idx_user_sessions_token" ON "public"."user_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "messages_2025_01_conversation_id_created_at_idx" ON "public"."messages_2025_01" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_01_conversation_id_created_at_idx1" ON "public"."messages_2025_01" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_01_created_at_idx" ON "public"."messages_2025_01" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_01_mentions_idx" ON "public"."messages_2025_01" USING "gin" ("mentions");



CREATE INDEX "messages_2025_01_sender_id_idx" ON "public"."messages_2025_01" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_01_to_tsvector_idx" ON "public"."messages_2025_01" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_02_conversation_id_created_at_idx" ON "public"."messages_2025_02" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_02_conversation_id_created_at_idx1" ON "public"."messages_2025_02" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_02_created_at_idx" ON "public"."messages_2025_02" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_02_mentions_idx" ON "public"."messages_2025_02" USING "gin" ("mentions");



CREATE INDEX "messages_2025_02_sender_id_idx" ON "public"."messages_2025_02" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_02_to_tsvector_idx" ON "public"."messages_2025_02" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_03_conversation_id_created_at_idx" ON "public"."messages_2025_03" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_03_conversation_id_created_at_idx1" ON "public"."messages_2025_03" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_03_created_at_idx" ON "public"."messages_2025_03" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_03_mentions_idx" ON "public"."messages_2025_03" USING "gin" ("mentions");



CREATE INDEX "messages_2025_03_sender_id_idx" ON "public"."messages_2025_03" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_03_to_tsvector_idx" ON "public"."messages_2025_03" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_04_conversation_id_created_at_idx" ON "public"."messages_2025_04" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_04_conversation_id_created_at_idx1" ON "public"."messages_2025_04" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_04_created_at_idx" ON "public"."messages_2025_04" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_04_mentions_idx" ON "public"."messages_2025_04" USING "gin" ("mentions");



CREATE INDEX "messages_2025_04_sender_id_idx" ON "public"."messages_2025_04" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_04_to_tsvector_idx" ON "public"."messages_2025_04" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_05_conversation_id_created_at_idx" ON "public"."messages_2025_05" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_05_conversation_id_created_at_idx1" ON "public"."messages_2025_05" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_05_created_at_idx" ON "public"."messages_2025_05" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_05_mentions_idx" ON "public"."messages_2025_05" USING "gin" ("mentions");



CREATE INDEX "messages_2025_05_sender_id_idx" ON "public"."messages_2025_05" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_05_to_tsvector_idx" ON "public"."messages_2025_05" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_06_conversation_id_created_at_idx" ON "public"."messages_2025_06" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_06_conversation_id_created_at_idx1" ON "public"."messages_2025_06" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_06_created_at_idx" ON "public"."messages_2025_06" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_06_mentions_idx" ON "public"."messages_2025_06" USING "gin" ("mentions");



CREATE INDEX "messages_2025_06_sender_id_idx" ON "public"."messages_2025_06" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_06_to_tsvector_idx" ON "public"."messages_2025_06" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_07_conversation_id_created_at_idx" ON "public"."messages_2025_07" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_07_conversation_id_created_at_idx1" ON "public"."messages_2025_07" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_07_created_at_idx" ON "public"."messages_2025_07" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_07_mentions_idx" ON "public"."messages_2025_07" USING "gin" ("mentions");



CREATE INDEX "messages_2025_07_sender_id_idx" ON "public"."messages_2025_07" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_07_to_tsvector_idx" ON "public"."messages_2025_07" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_08_conversation_id_created_at_idx" ON "public"."messages_2025_08" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_08_conversation_id_created_at_idx1" ON "public"."messages_2025_08" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_08_created_at_idx" ON "public"."messages_2025_08" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_08_mentions_idx" ON "public"."messages_2025_08" USING "gin" ("mentions");



CREATE INDEX "messages_2025_08_sender_id_idx" ON "public"."messages_2025_08" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_08_to_tsvector_idx" ON "public"."messages_2025_08" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_09_conversation_id_created_at_idx" ON "public"."messages_2025_09" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_09_conversation_id_created_at_idx1" ON "public"."messages_2025_09" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_09_created_at_idx" ON "public"."messages_2025_09" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_09_mentions_idx" ON "public"."messages_2025_09" USING "gin" ("mentions");



CREATE INDEX "messages_2025_09_sender_id_idx" ON "public"."messages_2025_09" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_09_to_tsvector_idx" ON "public"."messages_2025_09" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_10_conversation_id_created_at_idx" ON "public"."messages_2025_10" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_10_conversation_id_created_at_idx1" ON "public"."messages_2025_10" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_10_created_at_idx" ON "public"."messages_2025_10" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_10_mentions_idx" ON "public"."messages_2025_10" USING "gin" ("mentions");



CREATE INDEX "messages_2025_10_sender_id_idx" ON "public"."messages_2025_10" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_10_to_tsvector_idx" ON "public"."messages_2025_10" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_11_conversation_id_created_at_idx" ON "public"."messages_2025_11" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_11_conversation_id_created_at_idx1" ON "public"."messages_2025_11" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_11_created_at_idx" ON "public"."messages_2025_11" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_11_mentions_idx" ON "public"."messages_2025_11" USING "gin" ("mentions");



CREATE INDEX "messages_2025_11_sender_id_idx" ON "public"."messages_2025_11" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_11_to_tsvector_idx" ON "public"."messages_2025_11" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "messages_2025_12_conversation_id_created_at_idx" ON "public"."messages_2025_12" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_12_conversation_id_created_at_idx1" ON "public"."messages_2025_12" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "messages_2025_12_created_at_idx" ON "public"."messages_2025_12" USING "btree" ("created_at" DESC);



CREATE INDEX "messages_2025_12_mentions_idx" ON "public"."messages_2025_12" USING "gin" ("mentions");



CREATE INDEX "messages_2025_12_sender_id_idx" ON "public"."messages_2025_12" USING "btree" ("sender_id");



CREATE INDEX "messages_2025_12_to_tsvector_idx" ON "public"."messages_2025_12" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "notifications_0_user_id_created_at_idx" ON "public"."notifications_0" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_0_user_id_is_read_created_at_idx" ON "public"."notifications_0" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "notifications_1_user_id_created_at_idx" ON "public"."notifications_1" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_1_user_id_is_read_created_at_idx" ON "public"."notifications_1" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "notifications_2_user_id_created_at_idx" ON "public"."notifications_2" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_2_user_id_is_read_created_at_idx" ON "public"."notifications_2" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "notifications_3_user_id_created_at_idx" ON "public"."notifications_3" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "notifications_3_user_id_is_read_created_at_idx" ON "public"."notifications_3" USING "btree" ("user_id", "is_read", "created_at" DESC);



ALTER INDEX "public"."audit_logs_pkey" ATTACH PARTITION "public"."audit_logs_2025_01_pkey";



ALTER INDEX "public"."audit_logs_pkey" ATTACH PARTITION "public"."audit_logs_2025_02_pkey";



ALTER INDEX "public"."audit_logs_pkey" ATTACH PARTITION "public"."audit_logs_2025_03_pkey";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_01_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_01_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_01_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_01_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_01_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_01_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_01_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_02_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_02_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_02_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_02_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_02_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_02_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_02_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_03_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_03_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_03_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_03_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_03_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_03_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_03_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_04_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_04_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_04_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_04_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_04_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_04_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_04_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_05_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_05_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_05_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_05_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_05_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_05_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_05_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_06_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_06_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_06_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_06_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_06_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_06_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_06_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_07_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_07_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_07_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_07_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_07_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_07_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_07_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_08_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_08_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_08_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_08_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_08_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_08_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_08_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_09_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_09_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_09_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_09_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_09_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_09_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_09_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_10_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_10_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_10_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_10_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_10_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_10_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_10_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_11_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_11_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_11_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_11_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_11_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_11_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_11_to_tsvector_idx";



ALTER INDEX "public"."idx_messages_conversation_id" ATTACH PARTITION "public"."messages_2025_12_conversation_id_created_at_idx";



ALTER INDEX "public"."idx_messages_conversation_created" ATTACH PARTITION "public"."messages_2025_12_conversation_id_created_at_idx1";



ALTER INDEX "public"."idx_messages_created_at" ATTACH PARTITION "public"."messages_2025_12_created_at_idx";



ALTER INDEX "public"."idx_messages_mentions" ATTACH PARTITION "public"."messages_2025_12_mentions_idx";



ALTER INDEX "public"."messages_pkey" ATTACH PARTITION "public"."messages_2025_12_pkey";



ALTER INDEX "public"."idx_messages_sender_id" ATTACH PARTITION "public"."messages_2025_12_sender_id_idx";



ALTER INDEX "public"."idx_messages_content_search" ATTACH PARTITION "public"."messages_2025_12_to_tsvector_idx";



ALTER INDEX "public"."notifications_pkey" ATTACH PARTITION "public"."notifications_0_pkey";



ALTER INDEX "public"."idx_notifications_user_id" ATTACH PARTITION "public"."notifications_0_user_id_created_at_idx";



ALTER INDEX "public"."idx_notifications_unread" ATTACH PARTITION "public"."notifications_0_user_id_is_read_created_at_idx";



ALTER INDEX "public"."notifications_pkey" ATTACH PARTITION "public"."notifications_1_pkey";



ALTER INDEX "public"."idx_notifications_user_id" ATTACH PARTITION "public"."notifications_1_user_id_created_at_idx";



ALTER INDEX "public"."idx_notifications_unread" ATTACH PARTITION "public"."notifications_1_user_id_is_read_created_at_idx";



ALTER INDEX "public"."notifications_pkey" ATTACH PARTITION "public"."notifications_2_pkey";



ALTER INDEX "public"."idx_notifications_user_id" ATTACH PARTITION "public"."notifications_2_user_id_created_at_idx";



ALTER INDEX "public"."idx_notifications_unread" ATTACH PARTITION "public"."notifications_2_user_id_is_read_created_at_idx";



ALTER INDEX "public"."notifications_pkey" ATTACH PARTITION "public"."notifications_3_pkey";



ALTER INDEX "public"."idx_notifications_user_id" ATTACH PARTITION "public"."notifications_3_user_id_created_at_idx";



ALTER INDEX "public"."idx_notifications_unread" ATTACH PARTITION "public"."notifications_3_user_id_is_read_created_at_idx";



CREATE OR REPLACE TRIGGER "trigger_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_message_search_vector" AFTER INSERT OR UPDATE OF "content" ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_search_vector"();



CREATE OR REPLACE TRIGGER "trigger_messages_update_conversation" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trigger_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_update_friends_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."friends" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_messages_sent" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_rooms_created" AFTER INSERT ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_rooms_joined" AFTER INSERT OR DELETE ON "public"."room_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_profile_stats"();



CREATE OR REPLACE TRIGGER "trigger_user_relationships_updated_at" BEFORE UPDATE ON "public"."user_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_assignments"
    ADD CONSTRAINT "admin_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_assignments"
    ADD CONSTRAINT "admin_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_assignments"
    ADD CONSTRAINT "admin_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_members"
    ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_presence"
    ADD CONSTRAINT "conversation_presence_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_presence"
    ADD CONSTRAINT "conversation_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."messages"
    ADD CONSTRAINT "fk_messages_reply_to" FOREIGN KEY ("reply_to_id", "created_at") REFERENCES "public"."messages"("id", "created_at") DEFERRABLE;



ALTER TABLE "public"."messages"
    ADD CONSTRAINT "fk_messages_thread" FOREIGN KEY ("thread_id", "created_at") REFERENCES "public"."messages"("id", "created_at") DEFERRABLE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friends"
    ADD CONSTRAINT "friends_to_user_fkey" FOREIGN KEY ("to_user") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_message_created_at_fkey" FOREIGN KEY ("message_id", "message_created_at") REFERENCES "public"."messages"("id", "created_at") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_delivery_status"
    ADD CONSTRAINT "message_delivery_status_message_id_message_created_at_fkey" FOREIGN KEY ("message_id", "message_created_at") REFERENCES "public"."messages"("id", "created_at") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_delivery_status"
    ADD CONSTRAINT "message_delivery_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_message_created_at_fkey" FOREIGN KEY ("message_id", "message_created_at") REFERENCES "public"."messages"("id", "created_at") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_message_created_at_fkey" FOREIGN KEY ("message_id", "message_created_at") REFERENCES "public"."messages"("id", "created_at") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_search_vectors"
    ADD CONSTRAINT "message_search_vectors_message_id_message_created_at_fkey" FOREIGN KEY ("message_id", "message_created_at") REFERENCES "public"."messages"("id", "created_at") ON DELETE CASCADE;



ALTER TABLE "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."moderation_flags"
    ADD CONSTRAINT "moderation_flags_flagged_by_user_id_fkey" FOREIGN KEY ("flagged_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."moderation_flags"
    ADD CONSTRAINT "moderation_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_interactions"
    ADD CONSTRAINT "post_interactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_interactions"
    ADD CONSTRAINT "post_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_relationships"
    ADD CONSTRAINT "user_relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can search profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Delete own profile" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "Insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Members can update their membership" ON "public"."conversation_members" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Members can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "messages"."conversation_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view their own membership" ON "public"."conversation_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Public select on profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can add reactions" ON "public"."message_reactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create attachments for their messages" ON "public"."message_attachments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_attachments"."message_id") AND ("m"."created_at" = "message_attachments"."message_created_at") AND ("m"."sender_id" = "auth"."uid"())))));



CREATE POLICY "Users can create blocks" ON "public"."user_blocks" FOR INSERT WITH CHECK (("blocker_id" = "auth"."uid"()));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can create interactions" ON "public"."post_interactions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create posts" ON "public"."posts" FOR INSERT WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Users can create relationships" ON "public"."user_relationships" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Users can create their own sessions" ON "public"."user_sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can join conversations" ON "public"."conversation_members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can leave conversations" ON "public"."conversation_members" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own push tokens" ON "public"."push_tokens" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can mark messages as read" ON "public"."message_reads" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read messages in their conversations" ON "public"."messages" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "conversation_members"."conversation_id"
   FROM "public"."conversation_members"
  WHERE ("conversation_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can read own conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR ("id" IN ( SELECT "conversation_members"."conversation_id"
   FROM "public"."conversation_members"
  WHERE ("conversation_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can remove their own blocks" ON "public"."user_blocks" FOR DELETE USING (("blocker_id" = "auth"."uid"()));



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND ("conversation_id" IN ( SELECT "conversation_members"."conversation_id"
   FROM "public"."conversation_members"
  WHERE ("conversation_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can send messages to conversations they're in" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "messages"."conversation_id") AND ("cm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can send typing indicators" ON "public"."typing_indicators" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own conversations" ON "public"."conversations" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update own messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("sender_id" = "auth"."uid"())) WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own posts" ON "public"."posts" FOR UPDATE USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own presence" ON "public"."conversation_presence" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own sessions" ON "public"."user_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their relationships" ON "public"."user_relationships" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("target_user_id" = "auth"."uid"())));



CREATE POLICY "Users can update their typing indicators" ON "public"."typing_indicators" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view attachments in their conversations" ON "public"."message_attachments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_members" "cm" ON (("cm"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_attachments"."message_id") AND ("m"."created_at" = "message_attachments"."message_created_at") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view blocks they created or that affect them" ON "public"."user_blocks" FOR SELECT USING ((("blocker_id" = "auth"."uid"()) OR ("blocked_id" = "auth"."uid"())));



CREATE POLICY "Users can view conversation members" ON "public"."conversation_members" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "conversation_members_1"."conversation_id"
   FROM "public"."conversation_members" "conversation_members_1"
  WHERE ("conversation_members_1"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view delivery status for their messages" ON "public"."message_delivery_status" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_delivery_status"."message_id") AND ("m"."sender_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view flags on their content" ON "public"."moderation_flags" FOR SELECT USING ((("flagged_by_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."admin_assignments" "aa"
     JOIN "public"."admin_roles" "ar" ON (("ar"."id" = "aa"."role_id")))
  WHERE (("aa"."user_id" = "auth"."uid"()) AND ('moderate_content'::"text" = ANY ("ar"."permissions")))))));



CREATE POLICY "Users can view public post interactions" ON "public"."post_interactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_interactions"."post_id") AND (NOT "p"."is_deleted") AND ("p"."visibility" = 'public'::"text")))));



CREATE POLICY "Users can view public posts" ON "public"."posts" FOR SELECT USING (((NOT "is_deleted") AND ("visibility" = 'public'::"text")));



CREATE POLICY "Users can view public profile data" ON "public"."profiles" FOR SELECT USING ((NOT "is_deleted"));



CREATE POLICY "Users can view reactions in their conversations" ON "public"."message_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_members" "cm" ON (("cm"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_reactions"."message_id") AND ("m"."created_at" = "message_reactions"."message_created_at") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view read status in their conversations" ON "public"."message_reads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_members" "cm" ON (("cm"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_reads"."message_id") AND ("m"."created_at" = "message_reads"."message_created_at") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT USING (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own sessions" ON "public"."user_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their relationships" ON "public"."user_relationships" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("target_user_id" = "auth"."uid"())));



CREATE POLICY "Users can view typing in their conversations" ON "public"."typing_indicators" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_members" "cm"
  WHERE (("cm"."conversation_id" = "typing_indicators"."conversation_id") AND ("cm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."admin_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_assignments_delete_own" ON "public"."admin_assignments" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "admin_assignments_insert_own" ON "public"."admin_assignments" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "admin_assignments_select_own" ON "public"."admin_assignments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "admin_assignments_update_own" ON "public"."admin_assignments" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."admin_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs_2025_01" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_2025_01_delete_own" ON "public"."audit_logs_2025_01" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_01_insert_own" ON "public"."audit_logs_2025_01" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_01_select_own" ON "public"."audit_logs_2025_01" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_01_update_own" ON "public"."audit_logs_2025_01" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."audit_logs_2025_02" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_2025_02_delete_own" ON "public"."audit_logs_2025_02" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_02_insert_own" ON "public"."audit_logs_2025_02" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_02_select_own" ON "public"."audit_logs_2025_02" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_02_update_own" ON "public"."audit_logs_2025_02" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."audit_logs_2025_03" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_2025_03_delete_own" ON "public"."audit_logs_2025_03" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_03_insert_own" ON "public"."audit_logs_2025_03" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_03_select_own" ON "public"."audit_logs_2025_03" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_2025_03_update_own" ON "public"."audit_logs_2025_03" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_delete_own" ON "public"."audit_logs" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_insert_own" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_select_own" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "audit_logs_update_own" ON "public"."audit_logs" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."conversation_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_members_delete_own" ON "public"."conversation_members" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "conversation_members_insert_own" ON "public"."conversation_members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "conversation_members_select_own" ON "public"."conversation_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "conversation_members_update_own" ON "public"."conversation_members" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."conversation_presence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_presence_delete_own" ON "public"."conversation_presence" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "conversation_presence_insert_own" ON "public"."conversation_presence" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "conversation_presence_select_own" ON "public"."conversation_presence" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "conversation_presence_select_simple" ON "public"."conversation_presence" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("conversation_id" IN ( SELECT "cm"."conversation_id"
   FROM "public"."conversation_members" "cm"
  WHERE ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "conversation_presence_update_own" ON "public"."conversation_presence" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enable_insert_for_authenticated_users" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "enable_select_for_authenticated_users" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "enable_update_for_authenticated_users" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."friends" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friends_delete_own" ON "public"."friends" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));



CREATE POLICY "friends_insert_own" ON "public"."friends" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "from_user"));



CREATE POLICY "friends_select_own" ON "public"."friends" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));



CREATE POLICY "friends_update_own" ON "public"."friends" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "from_user") OR ("auth"."uid"() = "to_user")));



ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_delivery_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_delivery_status_delete_own" ON "public"."message_delivery_status" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "message_delivery_status_insert_own" ON "public"."message_delivery_status" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "message_delivery_status_select_own" ON "public"."message_delivery_status" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "message_delivery_status_update_own" ON "public"."message_delivery_status" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_reactions_delete_own" ON "public"."message_reactions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "message_reactions_insert_own" ON "public"."message_reactions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "message_reactions_select_own" ON "public"."message_reactions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "message_reactions_update_own" ON "public"."message_reactions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_reads_delete_own" ON "public"."message_reads" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "message_reads_insert_own" ON "public"."message_reads" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "message_reads_select_own" ON "public"."message_reads" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "message_reads_update_own" ON "public"."message_reads" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."message_search_vectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moderation_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications_0" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_0_delete_own" ON "public"."notifications_0" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_0_insert_own" ON "public"."notifications_0" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_0_select_own" ON "public"."notifications_0" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_0_update_own" ON "public"."notifications_0" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications_1" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_1_delete_own" ON "public"."notifications_1" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_1_insert_own" ON "public"."notifications_1" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_1_select_own" ON "public"."notifications_1" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_1_update_own" ON "public"."notifications_1" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications_2" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_2_delete_own" ON "public"."notifications_2" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_2_insert_own" ON "public"."notifications_2" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_2_select_own" ON "public"."notifications_2" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_2_update_own" ON "public"."notifications_2" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications_3" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_3_delete_own" ON "public"."notifications_3" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_3_insert_own" ON "public"."notifications_3" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_3_select_own" ON "public"."notifications_3" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_3_update_own" ON "public"."notifications_3" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."post_interactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "post_interactions_delete_own" ON "public"."post_interactions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "post_interactions_insert_own" ON "public"."post_interactions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "post_interactions_select_own" ON "public"."post_interactions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "post_interactions_update_own" ON "public"."post_interactions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_public" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((NOT "is_deleted"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_tokens_delete_own" ON "public"."push_tokens" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_tokens_insert_own" ON "public"."push_tokens" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "push_tokens_select_own" ON "public"."push_tokens" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_tokens_update_own" ON "public"."push_tokens" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rate_limits_delete_own" ON "public"."rate_limits" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rate_limits_insert_own" ON "public"."rate_limits" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "rate_limits_select_own" ON "public"."rate_limits" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rate_limits_update_own" ON "public"."rate_limits" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_members_delete_own" ON "public"."room_members" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "room_members_insert_own" ON "public"."room_members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "room_members_select_own" ON "public"."room_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "room_members_update_own" ON "public"."room_members" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms_insert_authenticated" ON "public"."rooms" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "rooms_select_member" ON "public"."rooms" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."room_members"
  WHERE (("room_members"."room_id" = "rooms"."id") AND ("room_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "rooms_update_member" ON "public"."rooms" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."room_members"
  WHERE (("room_members"."room_id" = "rooms"."id") AND ("room_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."typing_indicators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "typing_indicators_delete_own" ON "public"."typing_indicators" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "typing_indicators_insert_own" ON "public"."typing_indicators" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "typing_indicators_select_own" ON "public"."typing_indicators" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "typing_indicators_update_own" ON "public"."typing_indicators" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_relationships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_relationships_delete_own" ON "public"."user_relationships" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_relationships_insert_own" ON "public"."user_relationships" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_relationships_select_own" ON "public"."user_relationships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_relationships_update_own" ON "public"."user_relationships" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_sessions_delete_own" ON "public"."user_sessions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_sessions_insert_own" ON "public"."user_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_sessions_select_own" ON "public"."user_sessions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_sessions_update_own" ON "public"."user_sessions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_presence";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_delivery_status";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."push_tokens";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."typing_indicators";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_sessions";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "authenticated";






















































































































































































































































GRANT ALL ON FUNCTION "public"."create_room_and_join"("p_name" "text", "p_description" "text", "p_subject" "text", "p_is_public" boolean, "p_max_members" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_room_member_count"("p_room_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."join_room_safe"("p_room_identifier" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."validate_join_code"("p_code" "text") TO "authenticated";


















GRANT ALL ON TABLE "public"."admin_assignments" TO "authenticated";



GRANT ALL ON TABLE "public"."admin_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs_2025_01" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs_2025_02" TO "authenticated";



GRANT ALL ON TABLE "public"."audit_logs_2025_03" TO "authenticated";



GRANT ALL ON TABLE "public"."conversation_members" TO "authenticated";



GRANT ALL ON TABLE "public"."conversation_presence" TO "authenticated";



GRANT ALL ON TABLE "public"."conversations" TO "authenticated";



GRANT ALL ON TABLE "public"."friends" TO "authenticated";



GRANT ALL ON TABLE "public"."message_attachments" TO "authenticated";



GRANT ALL ON TABLE "public"."message_delivery_status" TO "authenticated";



GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";



GRANT ALL ON TABLE "public"."message_reads" TO "authenticated";



GRANT ALL ON TABLE "public"."message_search_vectors" TO "authenticated";



GRANT ALL ON TABLE "public"."messages" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_01" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_02" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_03" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_04" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_05" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_06" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_07" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_08" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_09" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_10" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_11" TO "authenticated";



GRANT ALL ON TABLE "public"."messages_2025_12" TO "authenticated";



GRANT ALL ON TABLE "public"."moderation_flags" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications_0" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications_1" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications_2" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications_3" TO "authenticated";



GRANT ALL ON TABLE "public"."post_interactions" TO "authenticated";



GRANT ALL ON TABLE "public"."posts" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";



GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";



GRANT ALL ON TABLE "public"."reports" TO "authenticated";



GRANT ALL ON TABLE "public"."room_members" TO "authenticated";



GRANT ALL ON TABLE "public"."rooms" TO "authenticated";



GRANT ALL ON TABLE "public"."typing_indicators" TO "authenticated";



GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";



GRANT ALL ON TABLE "public"."user_relationships" TO "authenticated";



GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";









GRANT ALL ON TABLE "public"."popular_rooms" TO "authenticated";



























RESET ALL;
