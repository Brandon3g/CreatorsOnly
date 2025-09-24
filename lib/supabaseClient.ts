import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase envs:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set at build time.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// -------------------------
// Realtime Subscriptions
// -------------------------

// Callback registry
type ChangeCallback = (payload: any) => void;
const listeners: Record<string, ChangeCallback[]> = {};

/**
 * Subscribe to changes on a given table.
 * Example:
 *   onTableChange("posts", (payload) => { console.log(payload) })
 */
export function onTableChange(table: string, callback: ChangeCallback) {
  if (!listeners[table]) listeners[table] = [];
  listeners[table].push(callback);
}

// Setup subscriptions for all key tables
["users", "posts", "friend_requests", "messages", "feedback", "collabs"].forEach(
  (table) => {
    supabase
      .channel(`public:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          // Notify all registered callbacks
          listeners[table]?.forEach((cb) => cb(payload));
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription for ${table}:`, status);
      });
  }
);
