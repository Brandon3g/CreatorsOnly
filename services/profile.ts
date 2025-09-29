// src/services/profile.ts
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

/**
 * Fetch a profile by user ID.
 * Always includes display_name and username for proper rendering.
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

  return data as User;
}

/**
 * Fetch multiple profiles by IDs.
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

  return data as User[];
}

/**
 * Update the current user's profile.
 * Accepts a partial object with fields to update (e.g., display_name, bio, avatar_url).
 */
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: updates.display_name,
      username: updates.username,
      avatar_url: updates.avatar_url,
      bio: updates.bio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data as User;
}

/**
 * Ensure a profile row exists for the given user.
 * Use after signup if needed.
 */
export async function ensureProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: 'New User' })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error ensuring profile:', error);
    return null;
  }

  return data as User;
}
