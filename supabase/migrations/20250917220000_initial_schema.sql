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

-- Create tables
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" uuid NOT NULL DEFAULT auth.uid(),
    "username" text,
    "avatar_url" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_username_key" UNIQUE ("username")
);

CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" character varying NOT NULL,
    "description" text,
    "created_by" uuid NOT NULL,
    "privacy" room_privacy NOT NULL DEFAULT 'public'::room_privacy,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "last_activity" timestamp with time zone NOT NULL DEFAULT now(),
    "join_code" character varying,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT "rooms_join_code_key" UNIQUE (join_code)
);

CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "room_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text DEFAULT 'member'::text,
    "joined_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "room_members_pkey" PRIMARY KEY ("room_id", "user_id"),
    CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" bigint NOT NULL,
    "room_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."friend_requests" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "sender_id" uuid NOT NULL,
    "receiver_id" uuid NOT NULL,
    "status" friend_request_status NOT NULL DEFAULT 'pending'::friend_request_status,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "friend_requests_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT "friend_requests_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."friends" (
    "user_id1" uuid NOT NULL,
    "user_id2" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "friends_pkey" PRIMARY KEY ("user_id1", "user_id2"),
    CONSTRAINT "friends_user_id1_fkey" FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT "friends_user_id2_fkey" FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "type" notification_type NOT NULL,
    "data" jsonb,
    "is_read" boolean NOT NULL DEFAULT false,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."room_join_requests" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "room_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "status" friend_request_status NOT NULL DEFAULT 'pending'::friend_request_status,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "room_join_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "room_join_requests_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT "room_join_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "type" conversation_type NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text,
    "description" text,
    "image_url" text,
    "created_by" uuid,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "joined_at" timestamp with time zone NOT NULL DEFAULT now(),
    "role" text,
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id"),
    CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."conversation_messages" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "parent_message_id" uuid,
    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT "conversation_messages_parent_message_id_fkey" FOREIGN KEY (parent_message_id) REFERENCES conversation_messages(id),
    CONSTRAINT "conversation_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sequence and primary key for messages
CREATE SEQUENCE IF NOT EXISTS "public"."messages_id_seq"
    AS bigint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."messages" ALTER COLUMN "id" SET DEFAULT nextval('public.messages_id_seq'::regclass);
ALTER SEQUENCE "public"."messages_id_seq" OWNED BY "public"."messages"."id";

-- Realtime publications
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;