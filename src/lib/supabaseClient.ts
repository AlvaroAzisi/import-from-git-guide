import { supabase } from '../lib/supabase';

export { supabase };

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
