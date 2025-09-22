import { supabase } from '../lib/supabaseClient';
import { getCurrentUser } from './auth';

export async function getMyProfile() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? { id: user.id, display_name: '', bio: '', avatar_url: '' };
}

export async function upsertMyProfile(updates: Partial<{ display_name: string; bio: string; avatar_url: string }>) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const payload = { id: user.id, ...updates, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
