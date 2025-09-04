-- Fix database functions to set search_path for security
-- This addresses the security warnings from the linter

-- Fix is_room_member_secure function
CREATE OR REPLACE FUNCTION public.is_room_member_secure(room_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_members 
    WHERE room_members.room_id = is_room_member_secure.room_id 
    AND room_members.user_id = is_room_member_secure.user_id
  );
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Fix update_conversation_last_message function
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    UPDATE public.conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$function$;

-- Fix validate_join_code function
CREATE OR REPLACE FUNCTION public.validate_join_code(p_code text)
 RETURNS TABLE(room_id uuid, room_name text, creator_id uuid, valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix create_room_and_join function
CREATE OR REPLACE FUNCTION public.create_room_and_join(p_name text, p_description text DEFAULT ''::text, p_subject text DEFAULT ''::text, p_is_public boolean DEFAULT true, p_max_members integer DEFAULT 10)
 RETURNS TABLE(room json, membership json)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix join_room_safe function
CREATE OR REPLACE FUNCTION public.join_room_safe(p_room_identifier text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Fix get_room_member_count function
CREATE OR REPLACE FUNCTION public.get_room_member_count(p_room_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM room_members 
        WHERE room_id = p_room_id
    );
END;
$function$;

-- Fix refresh_popular_rooms function
CREATE OR REPLACE FUNCTION public.refresh_popular_rooms()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_rooms;
END;
$function$;

-- Fix update_profile_stats function
CREATE OR REPLACE FUNCTION public.update_profile_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
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
$function$;