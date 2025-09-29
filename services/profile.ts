// src/services/profile.ts
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

/**
 * Shape returned from the `profiles` table. Extend as your schema evolves.
 */
type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/**
 * Fetch a single profile by user ID.
 */
export async function getProfileById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, bio, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile by ID:', error);
    return null;
  }

  return data as unknown as User;
}

/**
 * Alias used by some pages (e.g., TestAuth). Returns the current user's profile.
 */
export async function getMyProfile(userId: string): Promise<User | null> {
  return getProfileById(userId);
}

/**
 * Fetch multiple profiles by a list of IDs.
 */
export async function getProfilesByIds(userIds: string[]): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, bio, created_at, updated_at')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching profiles by IDs:', error);
    return [];
  }

  return (data as unknown as User[]) ?? [];
}

/**
 * Update specific fields on a user's profile.
 * Pass only the fields you want to change.
 */
export async function updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<User | null> {
  const payload: Partial<ProfileRow> = {
    display_name: updates.display_name ?? undefined,
    username: updates.username ?? undefined,
    avatar_url: updates.avatar_url ?? undefined,
    bio: updates.bio ?? undefined,
    // updated_at is maintained by DB trigger if you have one; otherwise set it here
    updated_at: new Date().toISOString() as unknown as never,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data as unknown as User;
}

/**
 * Upsert (insert or update) the current user's profile row.
 * This matches existing imports in AppContext: `upsertMyProfile`.
 */
export async function upsertMyProfile(userId: string, updates: Partial<ProfileRow> = {}): Promise<User | null> {
  const base: Partial<ProfileRow> = {
    id: userId,
    display_name: updates.display_name ?? null,
    username: updates.username ?? null,
    avatar_url: updates.avatar_url ?? null,
    bio: updates.bio ?? null,
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(base, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting my profile:', error);
    return null;
  }

  return data as unknown as User;
}

/**
 * Ensure a profile exists for a given user ID. If it doesn't, create a minimal row.
 * Returns the profile after ensuring.
 */
export async function ensureProfile(userId: string, defaultDisplayName: string | null = null): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: defaultDisplayName }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error ensuring profile:', error);
    return null;
  }

  return data as unknown as User;
}
