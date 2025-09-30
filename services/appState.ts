import { supabase } from '../lib/supabaseClient';

export interface AppStateRow<T = any> {
  key: string;
  data: T;
  updated_at?: string;
}

export async function fetchAppState<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`[AppState] Failed to fetch key "${key}"`, error);
    throw error;
  }

  if (!data) return null;
  return (data.data as T) ?? null;
}

export async function upsertAppState<T>(key: string, value: T): Promise<void> {
  const { error } = await supabase.from('app_state').upsert({ key, data: value });
  if (error) {
    console.error(`[AppState] Failed to upsert key "${key}"`, error);
    throw error;
  }
}

export async function deleteAppState(key: string): Promise<void> {
  const { error } = await supabase.from('app_state').delete().eq('key', key);
  if (error) {
    console.error(`[AppState] Failed to delete key "${key}"`, error);
    throw error;
  }
}
