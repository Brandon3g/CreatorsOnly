// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

/**
 * These must be set in your environment (Vercel → Project → Settings → Environment Variables)
 * and locally in a .env/.env.local if you run dev:
 *
 *  VITE_SUPABASE_URL       = https://<PROJECT>.supabase.co
 *  VITE_SUPABASE_ANON_KEY  = <anon public key>
 */
const FALLBACK_SUPABASE_URL = 'https://supabase-placeholder.invalid';
const FALLBACK_SUPABASE_ANON_KEY = 'public-anon-key';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  // Keep this as a console warning so the app still mounts and you can see the message.
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Add them in Vercel → Project Settings → Environment Variables (Production & Preview), ' +
      'then redeploy. Until then the app will use a no-op Supabase client so it can still render.'
  );
}

const effectiveUrl = hasSupabaseConfig ? supabaseUrl! : FALLBACK_SUPABASE_URL;
const effectiveAnonKey = hasSupabaseConfig ? supabaseAnonKey! : FALLBACK_SUPABASE_ANON_KEY;

/**
 * Single Supabase client for the whole app.
 *
 * We explicitly use the **implicit** flow so password recovery emails land on:
 *   /#/NewPassword#access_token=...&refresh_token=...
 * which our NewPassword page handles without needing ?code=...
 */
export const supabase = createClient(effectiveUrl, effectiveAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // parse tokens on first load
    flowType: 'implicit',
  },
});

export const isSupabaseConfigured = hasSupabaseConfig;