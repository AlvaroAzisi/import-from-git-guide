-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

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