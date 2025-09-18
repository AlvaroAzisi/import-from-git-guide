DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN
        CREATE TYPE "public"."conversation_type" AS ENUM (
            'dm',
            'group',
            'channel'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friend_request_status') THEN
        CREATE TYPE "public"."friend_request_status" AS ENUM (
            'pending',
            'accepted',
            'rejected'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE "public"."notification_type" AS ENUM (
            'friend_request',
            'friend_request_accepted',
            'new_message',
            'new_room_message',
            'room_invite',
            'room_join_request',
            'room_join_request_accepted'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_privacy') THEN
        CREATE TYPE "public"."room_privacy" AS ENUM (
            'public',
            'private',
            'invite_only'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE "public"."message_type" AS ENUM (
            'text',
            'image',
            'file',
            'system'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_type') THEN
        CREATE TYPE "public"."reaction_type" AS ENUM (
            'like',
            'love',
            'laugh',
            'angry',
            'sad',
            'thumbs_up',
            'thumbs_down'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status') THEN
        CREATE TYPE "public"."relationship_status" AS ENUM (
            'pending',
            'accepted',
            'blocked'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE "public"."user_status" AS ENUM (
            'online',
            'offline',
            'away',
            'busy'
        );
    END IF;
END$$;
