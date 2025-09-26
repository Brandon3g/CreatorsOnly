import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { createPost, fetchRecentPosts } from '../services/posts';
import PostCard from '../components/PostCard';

type NewPostState = {
  content: string;
  media_url?: string | null;
  isSubmitting: boolean;
  error?: string | null;
};

export default function Feed() {
  const { currentUser } = useAppContext();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [composer, setComposer] = useState<NewPostState>({
    content: '',
    media_url: null,
    isSubmitting: false,
  });

  // initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await fetchRecentPosts(30);
        if (error) throw error;
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error('[Feed] initial load error', e);
        if (!cancelled) setErr(e?.message ?? 'Failed to load feed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // realtime for posts (INSERT/UPDATE/DELETE)
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onSubmit = async () => {
    if (!currentUser?.id) return;
    if (!composer.content.trim()) return;

    try {
      setComposer((s) => ({ ...s, isSubmitting: true, error: null }));
      const { error } = await createPost({
        user_id: currentUser.id,
        content: composer.content.trim(),
        media_url: composer.media_url ?? null,
      });
      if (error) throw error;
      setComposer({ content: '', media_url: null, isSubmitting: false });
      // We do NOT refetch; realtime INSERT will prepend automatically
    } catch (e: any) {
      console.error('[Feed] create post error', e);
      setComposer((s) => ({
        ...s,
        isSubmitting: false,
        error: e?.message ?? 'Failed to create post.',
      }));
    }
  };

  const list = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Composer */}
      <div className="rounded-2xl border border-base-300 bg-base-200/40 p-4 mb-6">
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="Share something... @mention people"
          value={composer.content}
          onChange={(e) =>
            setComposer((s) => ({ ...s, content: e.target.value }))
          }
          rows={3}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            className="btn btn-primary"
            disabled={composer.isSubmitting || !composer.content.trim()}
            onClick={onSubmit}
          >
            {composer.isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
        {!!composer.error && (
          <p className="text-error text-sm mt-2">{composer.error}</p>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="py-16 text-center opacity-70">Loading…</div>
      ) : err ? (
        <div className="py-16 text-center text-error">{err}</div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center opacity-70">
          <h3 className="font-semibold text-lg mb-1">Your Feed is Quiet</h3>
          <p className="text-sm">
            Posts from your friends will appear here. Go to the Explore page to
            find new creators to connect with!
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((p: any) => (
            <li key={p.id}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
