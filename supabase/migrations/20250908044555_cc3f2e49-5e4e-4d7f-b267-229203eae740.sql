-- STEP 5: CREATE RLS POLICIES

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- ROOMS POLICIES  
CREATE POLICY "Anyone can view public rooms" ON public.rooms
FOR SELECT USING (true);

CREATE POLICY "Users can create rooms" ON public.rooms
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own rooms" ON public.rooms
FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete own rooms" ON public.rooms
FOR DELETE USING (auth.uid() = created_by);

-- ROOM_MEMBERS POLICIES
CREATE POLICY "Users can join rooms" ON public.room_members
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON public.room_members
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Room creators can manage members" ON public.room_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = room_members.room_id 
    AND rooms.created_by = auth.uid()
  )
);

CREATE POLICY "Room creators can remove members" ON public.room_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = room_members.room_id 
    AND rooms.created_by = auth.uid()
  )
);

CREATE POLICY "Members can view room members" ON public.room_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm2
    WHERE rm2.room_id = room_members.room_id 
    AND rm2.user_id = auth.uid()
  )
);