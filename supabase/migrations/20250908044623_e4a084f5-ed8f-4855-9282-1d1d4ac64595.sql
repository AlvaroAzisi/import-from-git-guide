-- STEP 6: COMPLETE RLS POLICIES FOR MESSAGES, FRIENDS, AND NOTIFICATIONS

-- MESSAGES POLICIES
CREATE POLICY "Room members can view messages" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = messages.room_id 
    AND room_members.user_id = auth.uid()
  )
);

CREATE POLICY "Room members can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = messages.room_id 
    AND room_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages" ON public.messages
FOR DELETE USING (auth.uid() = sender_id);

-- FRIENDS POLICIES
CREATE POLICY "Users can view own friendships" ON public.friends
FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can create friend requests" ON public.friends
FOR INSERT WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Users can update friend requests" ON public.friends
FOR UPDATE USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can delete friend connections" ON public.friends
FOR DELETE USING (auth.uid() = from_user OR auth.uid() = to_user);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- No INSERT policy for notifications - they should be created via backend logic only