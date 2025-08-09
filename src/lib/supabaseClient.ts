// Re-export the existing Supabase client so imports stay consistent
export { supabase } from '../lib/supabase';

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
