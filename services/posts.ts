// src/services/posts.ts
import { supabase } from '../lib/supabaseClient';
import { subscribeToTable } from './realtime';

export type Post = {
  id: string;
  user_id: string;
  content: string;
  media_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Get all posts (newest first)
 */
export async function getAllPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Post[]) || [];
}

/**
 * Get all posts for a specific user
 */
export async function getPostsByUser(userId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Post[]) || [];
}

/**
 * Create a new post
 */
export async function createPost(p: {
  content: string;
  media_url?: string | null;
}): Promise<Post> {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const payload = {
    user_id: user.id,
    content: p.content,
    media_url: p.media_url ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('posts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as Post;
}

/**
 * Update an existing post
 */
export async function updatePost(
  id: string,
  updates: Partial<Post>
): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Post;
}

/**
 * Delete a post
 */
export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Subscribe to realtime post changes.
 *
 * @param onChange - callback fired when posts are inserted/updated/deleted
 * @returns cleanup function to unsubscribe
 */
export function subscribeToPosts(onChange: (payload: any) => void) {
  return subscribeToTable('posts', onChange);
}
