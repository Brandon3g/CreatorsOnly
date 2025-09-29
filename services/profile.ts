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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProfileId(
  id: string | null | undefined,
): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function assertValidProfileId(id: string | null | undefined, caller: string) {
  if (!isValidProfileId(id)) {
    throw new Error(`${caller}: Supabase profile id must be a valid UUID`);
  }
}

/** Load the currently-authenticated user’s profile (by UUID). */
export async function getMyProfile(dbUserId: string): Promise<Profile> {
  assertValidProfileId(dbUserId, 'getMyProfile');

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
  assertValidProfileId(profileId, 'getProfileById');

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
  assertValidProfileId(dbUserId, 'updateMyProfile');

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
  assertValidProfileId(dbUserId, 'upsertMyProfile');

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
