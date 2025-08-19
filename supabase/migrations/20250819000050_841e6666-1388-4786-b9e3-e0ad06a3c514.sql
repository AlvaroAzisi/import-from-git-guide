-- Fix storage policies (remove existing ones first)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat media in their conversations" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;

-- Recreate storage policies with unique names
CREATE POLICY "public_avatar_access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "user_avatar_upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "chat_media_access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat_media');

CREATE POLICY "user_chat_media_upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'chat_media' AND auth.uid() IS NOT NULL);