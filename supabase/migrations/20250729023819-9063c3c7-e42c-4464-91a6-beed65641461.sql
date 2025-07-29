-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_media', 'chat_media', true);

-- Create storage policies for chat media
CREATE POLICY "Chat media files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat_media');

CREATE POLICY "Users can upload chat media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat_media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own chat media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chat_media' AND auth.uid() IS NOT NULL);

-- Enable realtime for tables
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- Add triggers for automatic room management
CREATE TRIGGER rooms_updated_at_trigger
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER messages_updated_at_trigger
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to automatically add creator as admin when room is created
CREATE TRIGGER add_creator_as_admin_trigger
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_admin();

-- Add trigger to update user stats when joining/leaving rooms
CREATE TRIGGER update_rooms_joined_trigger
AFTER INSERT OR DELETE ON public.room_members
FOR EACH ROW
EXECUTE FUNCTION public.update_rooms_joined();

-- Add trigger to update message count when sending messages
CREATE TRIGGER update_messages_sent_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_messages_sent();