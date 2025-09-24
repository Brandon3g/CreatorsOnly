// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// These must be set in Vercel → Project Settings → Environment Variables
// (and locally in a .env file if you run dev):
// VITE_SUPABASE_URL = https://YOUR-PROJECT.supabase.co
// VITE_SUPABASE_ANON_KEY = <anon public key>
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Add them in Vercel → Project Settings → Environment Variables.'
  );
}

// Create a single supabase client for the whole app
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // Good defaults for SPAs
    persistSession: true,
    autoRefreshToken: true,
    // Parses ?code=... on first load (PKCE flow). For hash tokens we handle it in NewPassword.tsx.
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
