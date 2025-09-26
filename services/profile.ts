// services/profile.ts
import { supabase } from '../lib/supabaseClient';

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  updated_at: string | null;
};

const PROFILE_COLUMNS =
  'id, username, display_name, bio, avatar_url, banner_url, updated_at';

/** Load the currently-authenticated user’s profile (by UUID). */
export async function getMyProfile(dbUserId: string): Promise<Profile> {
  if (!dbUserId) throw new Error('getMyProfile: missing user id');

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', dbUserId)
    .single();

  if (error) throw error;
  return data as Profile;
}

/** Load any profile by id (UUID). */
export async function getProfileById(profileId: string): Promise<Profile> {
  if (!profileId) throw new Error('getProfileById: missing id');

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', profileId)
    .single();

  if (error) throw error;
  return data as Profile;
}

type EditableFields = Omit<Profile, 'id' | 'updated_at'>;

/** Update *the signed-in* user’s profile (partial). */
export async function updateMyProfile(
  dbUserId: string,
  patch: Partial<EditableFields>
): Promise<Profile> {
  if (!dbUserId) throw new Error('updateMyProfile: missing user id');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch })
    .eq('id', dbUserId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}

/**
 * Upsert the signed-in user’s profile.
 * - Creates a row if it doesn't exist
 * - Updates existing row otherwise
 *
 * This satisfies older callers (e.g., TestAuth.tsx) that expect `upsertMyProfile`.
 */
export async function upsertMyProfile(
  dbUserId: string,
  patch: Partial<EditableFields>
): Promise<Profile> {
  if (!dbUserId) throw new Error('upsertMyProfile: missing user id');

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: dbUserId, ...patch },
      { onConflict: 'id' } // ensure it merges on the PK
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}
