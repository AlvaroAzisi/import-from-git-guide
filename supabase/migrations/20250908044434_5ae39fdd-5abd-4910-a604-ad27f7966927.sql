-- STEP 2: CLEANUP SCRIPT - DROP REDUNDANT TABLES

-- Drop all audit_logs tables (partitioned and main)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.audit_logs_2025_01 CASCADE;
DROP TABLE IF EXISTS public.audit_logs_2025_02 CASCADE;
DROP TABLE IF EXISTS public.audit_logs_2025_03 CASCADE;

-- Drop all partitioned messages_* tables (keep only main messages table)
DROP TABLE IF EXISTS public.messages_2025_01 CASCADE;
DROP TABLE IF EXISTS public.messages_2025_02 CASCADE;
DROP TABLE IF EXISTS public.messages_2025_03 CASCADE;
DROP TABLE IF EXISTS public.messages_2025_04 CASCADE;
DROP TABLE IF EXISTS public.messages_2025_05 CASCADE;
DROP TABLE IF EXISTS public.messages_2025_06 CASCADE;

-- Drop all partitioned notifications_* tables (keep only main notifications table)
DROP TABLE IF EXISTS public.notifications_0 CASCADE;
DROP TABLE IF EXISTS public.notifications_1 CASCADE;
DROP TABLE IF EXISTS public.notifications_2 CASCADE;
DROP TABLE IF EXISTS public.notifications_3 CASCADE;

-- Drop other unnecessary tables
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.post_interactions CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.typing_indicators CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Drop user_relationships (keeping friends as preferred)
DROP TABLE IF EXISTS public.user_relationships CASCADE;