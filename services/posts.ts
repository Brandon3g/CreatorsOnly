import { supabase } from '../lib/supabaseClient';

type NewPost = {
  user_id: string;
  content: string;
  media_url?: string | null;
};

export async function createPost(input: NewPost) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: input.user_id,
      content: input.content,
      media_url: input.media_url ?? null,
    })
    .select()
    .single();

  return { data, error };
}

export async function fetchRecentPosts(limit = 30) {
  // Global feed for now; you can switch to friends-only later
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}

export async function fetchUserPosts(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
}
