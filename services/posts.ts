// services/posts.ts
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
}

export type Post = {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
};

const baseColumns = 'id, user_id, content, media_url, created_at';

/** Create a post for the signed-in user. */
export async function createPost(dbUserId: string, content: string, mediaUrl?: string) {
  if (!dbUserId) throw new Error('createPost: missing user id');
  requireSupabase();
  const { data, error } = await supabase
    .from('posts')
    .insert([{ user_id: dbUserId, content, media_url: mediaUrl ?? null }])
  .select(baseColumns)
  .single();
  if (error) throw error;
  return data as Post;
}

/** Home feed: for now, latest posts across the network. (You can refine later.) */
export async function fetchHomeFeed(limit = 30) {
  requireSupabase();
  const { data, error } = await supabase
    .from('posts')
    .select(baseColumns)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Post[];
}

/** Posts for a given profile id (UUID). */
export async function fetchProfilePosts(profileId: string, limit = 30) {
  if (!profileId) throw new Error('fetchProfilePosts: missing profileId');
  requireSupabase();
  const { data, error } = await supabase
    .from('posts')
    .select(baseColumns)
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function deletePost(postId: string) {
  if (!postId) throw new Error('deletePost: missing postId');
  requireSupabase();
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
}
