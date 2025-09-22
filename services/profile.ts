// src/services/profile.ts
import { supabase } from '../lib/supabaseClient';

export type MyProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  updated_at?: string;
};

// Supabase returns PGRST116 for `.single()` when no row exists.
// Some stacks surface it as “Row not found”.
function isRowNotFound(err: any) {
  return (
    err?.code === 'PGRST116' ||
    err?.message?.toLowerCase?.().includes('row not found') ||
    err?.status === 406
  );
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (isRowNotFound(error)) return null; // no profile yet
    throw error;
  }
  return data as MyProfile;
}

export async function upsertMyProfile(p: Partial<MyProfile>): Promise<MyProfile> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const payload = {
    id: user.id,
    display_name: p.display_name ?? null,
    bio: p.bio ?? null,
    avatar_url: p.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as MyProfile;
}
