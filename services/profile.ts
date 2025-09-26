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

const baseColumns =
  'id, username, display_name, bio, avatar_url, updated_at';

/** Load the currently-authenticated user’s profile (by UUID). */
export async function getMyProfile(dbUserId: string) {
  if (!dbUserId) throw new Error('getMyProfile: missing user id');
  const { data, error } = await supabase
    .from('profiles')
    .select(baseColumns)
    .eq('id', dbUserId)
    .single();
  if (error) throw error;
  return data as Profile;
}

/** Load any profile by id (UUID). */
export async function getProfileById(profileId: string) {
  if (!profileId) throw new Error('getProfileById: missing id');
  const { data, error } = await supabase
    .from('profiles')
    .select(baseColumns)
    .eq('id', profileId)
    .single();
  if (error) throw error;
  return data as Profile;
}

/** Update *the signed-in* user’s profile (partial). */
export async function updateMyProfile(
  dbUserId: string,
  patch: Partial<Omit<Profile, 'id'>>
) {
  if (!dbUserId) throw new Error('updateMyProfile: missing user id');
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch })
    .eq('id', dbUserId)
    .select(baseColumns)
    .single();
  if (error) throw error;
  return data as Profile;
}
