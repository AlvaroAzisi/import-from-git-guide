# Supabase Storage Setup

This directory contains information about Supabase Storage buckets needed for the application.

## Required Buckets

### avatars

- **Purpose**: Store user profile pictures
- **Public**: Yes (for public access to avatar images)
- **File size limit**: 5MB
- **Allowed file types**: image/\*

## Setup Instructions

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket called `avatars`
4. Set it as public
5. Configure RLS policies as needed

## RLS Policies for avatars bucket

```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```
