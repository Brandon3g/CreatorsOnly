// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Set these in Vercel → Project → Settings → Environment Variables (Prod + Preview):
// VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Add them in Vercel → Project Settings → Environment Variables.'
  );
}

// Use the implicit flow so recovery links land with #access_token/#refresh_token
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // parses tokens on first load
    flowType: 'implicit',
  },
});
