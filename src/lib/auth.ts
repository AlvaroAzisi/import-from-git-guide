import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

export const signInWithGoogle = async (): Promise<{ data: unknown; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    const redirectTo = `${window.location.origin}/home`;
    console.log(`[Auth] Signing in with Google, redirect: ${redirectTo}`);
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
    console.error('[Auth] Google sign-in failed:', error);
    return { data: null, error: error.message };
  }
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<{ data: { user: User } | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Signing in with email: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { data: data.user ? { user: data.user } : null, error: null };
  } catch (error: any) {
    console.error('[Auth] Email sign-in failed:', error);
    return { data: null, error: error.message };
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<{ data: { user: User } | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Signing up with email: ${email}`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
      },
    });
    if (error) throw error;
    return { data: data.user ? { user: data.user } : null, error: null };
  } catch (error: any) {
    console.error('[Auth] Email sign-up failed:', error);
    return { data: null, error: error.message };
  }
};

export const signOut = async (): Promise<{ data: null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log('[Auth] Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/';
    return { data: null, error: null };
  } catch (error: any) {
    console.error('[Auth] Sign out failed:', error);
    return { data: null, error: error.message };
  }
};

export const getCurrentUser = async (): Promise<{ data: User | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log('[Auth] Getting current user');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { data: user, error: null };
  } catch (error: any) {
    console.error('[Auth] Get current user failed:', error);
    return { data: null, error: error.message };
  }
};

export const createOrUpdateProfile = async (
  user: User
): Promise<{ data: UserProfile | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Creating/updating profile for user: ${user.id}`);
    // First, check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      throw fetchError;
    }
    // If profile exists, return it without overwriting
    if (existingProfile) {
      console.log('[Auth] Profile already exists, returning existing profile:', existingProfile);
      return { data: existingProfile, error: null };
    }
    // Only create new profile if it doesn't exist
    console.log('[Auth] Profile does not exist, creating new profile...');
    const username = user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const profileData: Database['public']['Tables']['profiles']['Insert'] = {
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
    console.log('[Auth] Profile data to insert:', profileData);
    // Use INSERT instead of UPSERT for new profiles
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();
    console.log('[Auth] Insert result:', { data, error });
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Create/update profile failed:', error.message || error);
    return { data: null, error: error.message };
  }
};

export const getProfile = async (
  userId: string
): Promise<{ data: UserProfile | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Getting profile for user: ${userId}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    console.log('[Auth] Get profile result:', { data, error });
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Get profile failed:', error);
    return { data: null, error: error.message };
  }
};

export const getProfileByUsername = async (
  username: string
): Promise<{ data: UserProfile | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Getting profile by username: ${username}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    console.log('[Auth] Get profile by username result:', { data, error });
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Get profile by username failed:', error);
    return { data: null, error: error.message };
  }
};

export const updateProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ data: UserProfile | null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] updateProfile called with:`, { userId, updates });
    // Add updated_at timestamp
    const updateData: Partial<Database['public']['Tables']['profiles']['Update']> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    console.log('[Auth] Final update data:', updateData);
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();
    console.log('[Auth] Supabase update response:', { data, error });
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error('[Auth] Update profile failed:', error);
    return { data: null, error: error.message };
  }
};

export const searchUsers = async (
  query: string
): Promise<{ data: UserProfile[]; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Searching users with query: ${query}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(10);
    console.log('[Auth] Search users result:', { data, error });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('[Auth] Search users failed:', error);
    return { data: [], error: error.message };
  }
};

export const incrementUserXP = async (
  userId: string,
  xpAmount: number = 10
): Promise<{ data: null; error: string | null }> => {
  if (!supabase) throw new Error('Supabase client is not initialized');
  try {
    console.log(`[Auth] Incrementing XP for user: ${userId}, amount: ${xpAmount}`);
    const { error } = await supabase.rpc('increment_user_xp', {
      user_id: userId,
      xp_amount: xpAmount,
    });
    console.log('[Auth] Increment XP result:', { error });
    if (error) throw error;
    return { data: null, error: null };
  } catch (error: any) {
    console.error('[Auth] Increment XP failed:', error);
    return { data: null, error: error.message };
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

export const validateForm = (
  email: string,
  password: string,
  confirmPassword?: string
): { isValid: boolean; errors: { [key: string]: string } } => {
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