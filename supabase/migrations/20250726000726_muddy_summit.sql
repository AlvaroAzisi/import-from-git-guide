/*
  # Complete Kupintar Database Schema

  1. Tables
    - profiles (user profiles with XP, streak, etc.)
    - rooms (study rooms)
    - room_members (room membership)
    - messages (chat messages)
    - friends (friend relationships)

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for each table
    - Add proper indexes for performance

  3. Functions
    - increment_user_xp function for XP management
    - update_updated_at_column trigger function
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  username text UNIQUE NOT NULL,
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  interests text DEFAULT '',
  xp integer DEFAULT 0,
  streak integer DEFAULT 0,
  rooms_created integer DEFAULT 0,
  rooms_joined integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  subject text NOT NULL,
  max_members integer DEFAULT 10,
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_xp_idx ON profiles(xp DESC);

CREATE INDEX IF NOT EXISTS rooms_created_by_idx ON rooms(created_by);
CREATE INDEX IF NOT EXISTS rooms_subject_idx ON rooms(subject);
CREATE INDEX IF NOT EXISTS rooms_is_public_idx ON rooms(is_public);
CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON rooms(created_at DESC);

CREATE INDEX IF NOT EXISTS room_members_room_id_idx ON room_members(room_id);
CREATE INDEX IF NOT EXISTS room_members_user_id_idx ON room_members(user_id);

CREATE INDEX IF NOT EXISTS messages_room_id_idx ON messages(room_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS friends_user_id_idx ON friends(user_id);
CREATE INDEX IF NOT EXISTS friends_friend_id_idx ON friends(friend_id);
CREATE INDEX IF NOT EXISTS friends_status_idx ON friends(status);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Anyone can view public rooms" ON rooms
  FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Room members can view private rooms" ON rooms
  FOR SELECT TO authenticated USING (
    NOT is_public AND EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_id = rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can update their rooms" ON rooms
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Room creators can delete their rooms" ON rooms
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Room members policies
CREATE POLICY "Room members can view room membership" ON room_members
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM room_members rm 
      WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join rooms" ON room_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" ON room_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Room admins can manage members" ON room_members
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_id = room_members.room_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Messages policies
CREATE POLICY "Room members can view messages" ON messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_id = messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Room members can send messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM room_members 
      WHERE room_id = messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Friends policies
CREATE POLICY "Users can view their own friend requests" ON friends
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their friend requests" ON friends
  FOR UPDATE TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

CREATE POLICY "Users can delete their friendships" ON friends
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment user XP
CREATE OR REPLACE FUNCTION increment_user_xp(user_id uuid, xp_amount integer DEFAULT 10)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET xp = xp + xp_amount,
      updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS void AS $$
BEGIN
  -- Update rooms_created count
  UPDATE profiles SET rooms_created = (
    SELECT COUNT(*) FROM rooms WHERE created_by = profiles.id
  );
  
  -- Update rooms_joined count
  UPDATE profiles SET rooms_joined = (
    SELECT COUNT(*) FROM room_members WHERE user_id = profiles.id
  );
  
  -- Update messages_sent count
  UPDATE profiles SET messages_sent = (
    SELECT COUNT(*) FROM messages WHERE user_id = profiles.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;