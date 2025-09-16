// TODO adapted for new Supabase backend
import { supabase } from '../integrations/supabase/client';

export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    // Structure path for RLS policy: userId/filename
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }
};

export const deleteAvatar = async (url: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `avatars/${fileName}`;

    const { error } = await supabase.storage.from('avatars').remove([filePath]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return false;
  }
};

export const uploadChatMedia = async (
  file: File,
  roomId: string,
  userId: string
): Promise<string | null> => {
  try {
    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('File size must be less than 3MB');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only image files are allowed');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    // Structure path for RLS policy: roomId/userId/filename
    const filePath = `${roomId}/${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(filePath, file, {
        cacheControl: '3600',
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('chat_media').getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading chat media:', error);
    throw error;
  }
};

export const deleteChatMedia = async (url: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlPath = new URL(url).pathname;
    const filePath = urlPath.split('/chat_media/')[1];

    if (!filePath) {
      throw new Error('Invalid file URL');
    }

    const { error } = await supabase.storage.from('chat_media').remove([filePath]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting chat media:', error);
    return false;
  }
};
