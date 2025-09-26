// services/profile.ts
import { supabase } from '../lib/supabaseClient';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  updated_at: string;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateMyProfile(patch: Partial<Profile>): Promise<Profile> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('No auth session');

  const payload: Partial<Profile> = {};
  if (patch.username !== undefined) payload.username = patch.username;
  if (patch.display_name !== undefined) payload.display_name = patch.display_name;
  if (patch.bio !== undefined) payload.bio = patch.bio;
  if (patch.avatar_url !== undefined) payload.avatar_url = patch.avatar_url;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}
