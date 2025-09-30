// services/appState.ts — per-user, safe when no session
import { supabase } from '../lib/supabaseClient';

export interface AppStateRow<T> {
  user_id: string;
  key: string;
  data: T;
  updated_at?: string;
}

// Returns the user id if logged in, else null (no throw)
async function getUserIdOptional(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('[AppState] getSession error', error);
    return null;
  }
  return data?.session?.user?.id ?? null;
}

export async function fetchAppState<T>(key: string): Promise<T | null> {
  const userId = await getUserIdOptional();
  if (!userId) return null; // not logged in yet

  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`[AppState] Failed to fetch key "${key}"`, error);
    return null;
  }
  return (data?.data as T) ?? null;
}

export async function upsertAppState<T>(key: string, value: T): Promise<void> {
  const userId = await getUserIdOptional();
  if (!userId) return; // no-op until logged in

  const { error } = await supabase
    .from('app_state')
    .upsert({ user_id: userId, key, data: value });

  if (error) {
    console.error(`[AppState] Failed to upsert key "${key}"`, error);
  }
}

export async function deleteAppState(key: string): Promise<void> {
  const userId = await getUserIdOptional();
  if (!userId) return; // no-op until logged in

  const { error } = await supabase
    .from('app_state')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);

  if (error) {
    console.error(`[AppState] Failed to delete key "${key}"`, error);
  }
}
