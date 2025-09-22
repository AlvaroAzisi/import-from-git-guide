-- Policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can update their own avatar."
  ON storage.objects FOR UPDATE
  USING ( auth.uid() = owner )
  WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can delete their own avatar."
  ON storage.objects FOR DELETE
  USING ( auth.uid() = owner );
