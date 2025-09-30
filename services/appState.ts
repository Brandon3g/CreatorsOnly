// services/appState.ts (per-user version)
import { supabase } from '../lib/supabaseClient';

export interface AppStateRow<T> {
  user_id: string;
  key: string;
  data: T;
  updated_at?: string;
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[AppState] getUser error', error);
    throw error;
  }
  const user = data?.user;
  if (!user) throw new Error('[AppState] No authenticated user');
  return user.id;
}

export async function fetchAppState<T>(key: string): Promise<T | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`[AppState] Failed to fetch key "${key}"`, error);
    throw error;
  }
  return data?.data ?? null;
}

export async function upsertAppState<T>(key: string, value: T): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('app_state').upsert({
    user_id: userId,
    key,
    data: value,
  }); // PK (user_id, key) makes this an upsert
  if (error) {
    console.error(`[AppState] Failed to upsert key "${key}"`, error);
    throw error;
  }
}

export async function deleteAppState(key: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('app_state')
    .delete()
    .eq('user_id', userId)
    .eq('key', key);

  if (error) {
    console.error(`[AppState] Failed to delete key "${key}"`, error);
    throw error;
  }
}
