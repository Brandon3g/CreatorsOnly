import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import ProfileHeader from '../components/ProfileHeader';
import PostCard from '../components/PostCard';
import { fetchUserPosts } from '../services/posts';
import { getMyProfile } from '../services/profile';

export default function Profile() {
  const { currentUser } = useAppContext();
  const [profile, setProfile] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // load profile + posts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!currentUser?.id) return;
        setLoading(true);
        const [{ data: me, error: pe }, { data: ps, error: fe }] =
          await Promise.all([
            getMyProfile(),
            fetchUserPosts(currentUser.id, 30),
          ]);
        if (pe) throw pe;
        if (fe) throw fe;
        if (!cancelled) {
          setProfile(me ?? null);
          setPosts(Array.isArray(ps) ? ps : []);
        }
      } catch (e: any) {
        console.error('[Profile] load error', e);
        if (!cancelled) setErr(e?.message ?? 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // realtime for own posts
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`public:posts:profile:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => setPosts((prev) => [payload.new, ...prev])
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) =>
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          )
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) =>
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const list = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  if (loading) return <div className="py-16 text-center opacity-70">Loading…</div>;
  if (err) return <div className="py-16 text-center text-error">{err}</div>;

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <ProfileHeader profile={profile} />
      <div className="mt-6 space-y-4">
        {list.length === 0 ? (
          <div className="py-12 text-center opacity-70">No posts yet.</div>
        ) : (
          list.map((p: any) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
