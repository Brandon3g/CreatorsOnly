import { supabase } from '../lib/supabaseClient';

export type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  updated_at?: string | null;
};

export async function getMyProfile() {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) return { data: null, error: userErr };
  if (!user?.id) return { data: null, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  return { data, error };
}

export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle<Profile>();

  return { data, error };
}

export type UpsertProfileInput = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

/**
 * Canonical upsert used everywhere.
 */
export async function upsertMyProfile(input: UpsertProfileInput) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(input, { onConflict: 'id' })
    .select()
    .single<Profile>();

  return { data, error };
}

/**
 * Back-compat wrapper for components that import `updateMyProfile`.
 * If `id` is omitted, the current auth user id is used.
 */
export async function updateMyProfile(
  patch: Omit<UpsertProfileInput, 'id'> & { id?: string }
) {
  let id = patch.id;
  if (!id) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return { data: null, error };
    if (!user?.id) return { data: null, error: new Error('Not signed in') };
    id = user.id;
  }
  return upsertMyProfile({ id, ...patch });
}
