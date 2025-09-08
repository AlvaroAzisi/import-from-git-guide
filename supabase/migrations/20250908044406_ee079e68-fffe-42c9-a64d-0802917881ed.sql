-- STEP 1: FULL BACKUP SCRIPT
-- This creates a backup of all existing data before cleanup

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_before_cleanup;

-- Backup all existing tables
CREATE TABLE backup_before_cleanup.audit_logs AS SELECT * FROM public.audit_logs;
CREATE TABLE backup_before_cleanup.audit_logs_2025_01 AS SELECT * FROM public.audit_logs_2025_01;
CREATE TABLE backup_before_cleanup.audit_logs_2025_02 AS SELECT * FROM public.audit_logs_2025_02;
CREATE TABLE backup_before_cleanup.audit_logs_2025_03 AS SELECT * FROM public.audit_logs_2025_03;
CREATE TABLE backup_before_cleanup.conversations AS SELECT * FROM public.conversations;
CREATE TABLE backup_before_cleanup.conversation_members AS SELECT * FROM public.conversation_members;
CREATE TABLE backup_before_cleanup.friends AS SELECT * FROM public.friends;
CREATE TABLE backup_before_cleanup.message_attachments AS SELECT * FROM public.message_attachments;
CREATE TABLE backup_before_cleanup.message_reactions AS SELECT * FROM public.message_reactions;
CREATE TABLE backup_before_cleanup.message_reads AS SELECT * FROM public.message_reads;
CREATE TABLE backup_before_cleanup.messages AS SELECT * FROM public.messages;
CREATE TABLE backup_before_cleanup.messages_2025_01 AS SELECT * FROM public.messages_2025_01;
CREATE TABLE backup_before_cleanup.messages_2025_02 AS SELECT * FROM public.messages_2025_02;
CREATE TABLE backup_before_cleanup.messages_2025_03 AS SELECT * FROM public.messages_2025_03;
CREATE TABLE backup_before_cleanup.messages_2025_04 AS SELECT * FROM public.messages_2025_04;
CREATE TABLE backup_before_cleanup.messages_2025_05 AS SELECT * FROM public.messages_2025_05;
CREATE TABLE backup_before_cleanup.messages_2025_06 AS SELECT * FROM public.messages_2025_06;
CREATE TABLE backup_before_cleanup.notifications AS SELECT * FROM public.notifications;
CREATE TABLE backup_before_cleanup.notifications_0 AS SELECT * FROM public.notifications_0;
CREATE TABLE backup_before_cleanup.notifications_1 AS SELECT * FROM public.notifications_1;
CREATE TABLE backup_before_cleanup.notifications_2 AS SELECT * FROM public.notifications_2;
CREATE TABLE backup_before_cleanup.notifications_3 AS SELECT * FROM public.notifications_3;
CREATE TABLE backup_before_cleanup.post_interactions AS SELECT * FROM public.post_interactions;
CREATE TABLE backup_before_cleanup.posts AS SELECT * FROM public.posts;
CREATE TABLE backup_before_cleanup.profiles AS SELECT * FROM public.profiles;
CREATE TABLE backup_before_cleanup.reports AS SELECT * FROM public.reports;
CREATE TABLE backup_before_cleanup.room_members AS SELECT * FROM public.room_members;
CREATE TABLE backup_before_cleanup.rooms AS SELECT * FROM public.rooms;
CREATE TABLE backup_before_cleanup.typing_indicators AS SELECT * FROM public.typing_indicators;
CREATE TABLE backup_before_cleanup.user_relationships AS SELECT * FROM public.user_relationships;
CREATE TABLE backup_before_cleanup.user_sessions AS SELECT * FROM public.user_sessions;