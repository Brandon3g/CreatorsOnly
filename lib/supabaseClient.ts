import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase envs:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
  // Throw a clear error but don’t crash the whole UI silently.
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set at build time.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
