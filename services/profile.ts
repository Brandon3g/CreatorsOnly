// services/profile.ts
import { supabase } from '../lib/supabaseClient';

/** DB-backed profile shape (matches `public.profiles`) */
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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProfileId(id: string | null | undefined): id is string {
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

/** Only the columns that actually exist in the DB table. */
type EditableFields = Pick<
  Profile,
  'username' | 'display_name' | 'bio' | 'avatar_url'
>;

/** Defensive filter: drop any keys the table doesn’t have. */
function toAllowedPatch(patch: Partial<EditableFields>): Partial<EditableFields> {
  const out: Partial<EditableFields> = {};
  if ('username' in patch) out.username = patch.username ?? null;
  if ('display_name' in patch) out.display_name = patch.display_name ?? null;
  if ('bio' in patch) out.bio = patch.bio ?? null;
  if ('avatar_url' in patch) out.avatar_url = patch.avatar_url ?? null;
  return out;
}

/** Update *the signed-in* user’s profile (partial). */
export async function updateMyProfile(
  dbUserId: string,
  patch: Partial<EditableFields>
): Promise<Profile> {
  assertValidProfileId(dbUserId, 'updateMyProfile');

  const allowed = toAllowedPatch(patch);

  const { data, error } = await supabase
    .from('profiles')
    .update(allowed)
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
 * (Kept for older callers.)
 */
export async function upsertMyProfile(
  dbUserId: string,
  patch: Partial<EditableFields>
): Promise<Profile> {
  assertValidProfileId(dbUserId, 'upsertMyProfile');

  const allowed = toAllowedPatch(patch);

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: dbUserId, ...allowed }, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}
