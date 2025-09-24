// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

/**
 * These must be set in your environment (Vercel → Project → Settings → Environment Variables)
 * and locally in a .env/.env.local if you run dev:
 *
 *  VITE_SUPABASE_URL       = https://<PROJECT>.supabase.co
 *  VITE_SUPABASE_ANON_KEY  = <anon public key>
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep this as a console warning so the app still mounts and you can see the message.
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Add them in Vercel → Project Settings → Environment Variables (Production & Preview), ' +
      'then redeploy.'
  );
}

/**
 * Single Supabase client for the whole app.
 *
 * We explicitly use the **implicit** flow so password recovery emails land on:
 *   /#/NewPassword#access_token=...&refresh_token=...
 * which our NewPassword page handles without needing ?code=...
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // parse tokens on first load
    flowType: 'implicit',
  },
});
