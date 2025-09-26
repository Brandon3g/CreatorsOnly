// services/profile.ts
import { supabase } from '../lib/supabaseClient';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

const PROFILE_COLUMNS =
  'id, username, display_name, bio, avatar_url, updated_at';

/** Ensure the caller is signed in and return their user id */
async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/** Fetch the currently signed-in user's profile */
export async function getMyProfile(): Promise<Profile | null> {
  const id = await getMyUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

/** Fetch any profile by id */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

/** Update the current user's profile (PATCH semantics) */
export async function updateMyProfile(
  patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url'>>
): Promise<Profile> {
  const id = await getMyUserId();
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Upsert the current user's profile (keeps TestAuth.tsx happy).
 * If the row exists, it updates; if not, it inserts.
 */
export async function upsertMyProfile(
  patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url'>>
): Promise<Profile> {
  const id = await getMyUserId();
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, ...patch }, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Subscribe to realtime changes for a single profile id.
 * Returns an unsubscribe function.
 */
export function subscribeToProfile(
  userId: string,
  onChange: (row: Profile) => void
): () => void {
  const channel = supabase
    .channel(`profiles:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload) => {
        const next = (payload.new ?? payload.old) as Profile;
        onChange(next);
      }
    )
    .subscribe((status) => {
      // Optional console logs for debugging:
      // console.log('[profiles subscription]', status);
    });

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* no-op */
    }
  };
}
