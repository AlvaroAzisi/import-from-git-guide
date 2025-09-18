CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "username" text UNIQUE,
    "full_name" text,
    "avatar_url" text,
    "bio" text,
    "xp" integer DEFAULT 0,
    "streak" integer DEFAULT 0,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
