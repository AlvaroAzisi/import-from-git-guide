-- Add missing RLS policies for tables without any policies

-- Message attachments policies
CREATE POLICY "Users can view attachments in their conversations" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id 
        AND m.created_at = message_attachments.message_created_at
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create attachments for their messages" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id 
        AND m.created_at = message_attachments.message_created_at
        AND m.sender_id = auth.uid()
    )
  );

-- Message reactions policies
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id 
        AND m.created_at = message_reactions.message_created_at
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Message reads policies
CREATE POLICY "Users can view read status in their conversations" ON public.message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reads.message_id 
        AND m.created_at = message_reads.message_created_at
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read" ON public.message_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Typing indicators policies
CREATE POLICY "Users can view typing in their conversations" ON public.typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = typing_indicators.conversation_id 
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send typing indicators" ON public.typing_indicators
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their typing indicators" ON public.typing_indicators
  FOR UPDATE USING (user_id = auth.uid());

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Posts policies
CREATE POLICY "Users can view public posts" ON public.posts
  FOR SELECT USING (NOT is_deleted AND visibility = 'public');

CREATE POLICY "Users can create posts" ON public.posts
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (author_id = auth.uid());

-- Post interactions policies
CREATE POLICY "Users can view public post interactions" ON public.post_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_interactions.post_id 
        AND NOT p.is_deleted 
        AND p.visibility = 'public'
    )
  );

CREATE POLICY "Users can create interactions" ON public.post_interactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Reports policies
CREATE POLICY "Users can view their own reports" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Audit logs policies (read-only for users)
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());