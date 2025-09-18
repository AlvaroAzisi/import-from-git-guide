CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "description" text,
    "icon_url" text,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "badge_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "plan" text NOT NULL,
    "status" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "expires_at" timestamp with time zone,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "streak_count" integer DEFAULT 0,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);