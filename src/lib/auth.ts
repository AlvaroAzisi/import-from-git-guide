import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  username: string;
  bio: string;
  xp: number;
  streak: number;
  rooms_created: number;
  rooms_joined: number;
  messages_sent: number;
  interests: string[];
  created_at: string;
  updated_at: string;
}

export const signInWithGoogle = async () => {
  try {
    const redirectTo = `${window.location.origin}/home`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { data: null, error: error.message };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return { data: null, error: error.message };
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('Email sign-up error:', error);
    return { data: null, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/';
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

export const createOrUpdateProfile = async (user: User): Promise<UserProfile | null> => {
  try {
    console.log('Creating/updating profile for user:', user.id);
    
    const username = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const profileData = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Anonymous User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
      username,
      bio: '',
      xp: 0,
      streak: 0,
      rooms_created: 0,
      rooms_joined: 0,
      messages_sent: 0,
      interests: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Profile data to upsert:', profileData);

    const { data, error } = await supabase
      .from('profiles')
      .upsert([profileData], { onConflict: 'id' })
      .select()
      .single();

    console.log('Upsert result:', { data, error });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Create/update profile error:', error.message || error);
    return null;
  }
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('Getting profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Get profile result:', { data, error });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

export const getProfileByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    console.log('Getting profile by username:', username);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    console.log('Get profile by username result:', { data, error });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get profile by username error:', error);
    return null;
  }
};

export const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    console.log('updateProfile called with:', { userId, updates });
    
    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    console.log('Final update data:', updateData);

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    console.log('Supabase update response:', { data, error });

    if (error) {
      console.error('Supabase update error details:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Update profile error:', error);
    throw error;
  }
};

export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  try {
    console.log('Searching users with query:', query);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10);

    console.log('Search users result:', { data, error });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Search users error:', error);
    return [];
  }
};

export const incrementUserXP = async (userId: string, xpAmount: number = 10): Promise<boolean> => {
  try {
    console.log('Incrementing XP for user:', userId, 'amount:', xpAmount);
    
    const { error } = await supabase.rpc('increment_user_xp', {
      user_id: userId,
      xp_amount: xpAmount
    });

    console.log('Increment XP result:', { error });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Increment XP error:', error);
    return false;
  }
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }
  return null;
};

export const validateForm = (email: string, password: string, confirmPassword?: string) => {
  const errors: { [key: string]: string } = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.password = passwordError;
    }
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};