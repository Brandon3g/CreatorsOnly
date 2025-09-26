// pages/Feed.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { fetchHomeFeed, type Post } from '../services/posts';
import { subscribeToAppRealtime } from '../services/realtime';

export default function Feed() {
  const { session, track } = useAppContext();
  const dbUserId = session?.user?.id ?? null;
  const analyticsId = dbUserId ?? 'anon';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track('feed_open', { page: 'home' }, analyticsId);
  }, [track, analyticsId]);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const initial = await fetchHomeFeed(30);
        if (!cancel) setPosts(initial);
      } catch (err) {
        console.error('[Feed] load error ›', err);
        if (!cancel) setPosts([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    const unsub = subscribeToAppRealtime({
      dbUserId: dbUserId ?? undefined,
      onPostsInsert: (payload) => {
        setPosts((prev) => [payload.new as Post, ...prev]);
      },
    });

    return () => {
      cancel = true;
      unsub();
    };
  }, [dbUserId]);

  if (loading) {
    return <div className="p-6 text-sm opacity-70">Loading feed…</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="font-semibold text-lg">Your Feed is Quiet</div>
        <div className="opacity-70 text-sm mt-1">
          Follow creators or make a post to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {posts.map((p) => (
        <div key={p.id} className="rounded-xl bg-base-200 p-4">
          <div className="text-xs opacity-60">
            {new Date(p.created_at).toLocaleString()}
          </div>
          <div className="mt-1 whitespace-pre-wrap">{p.content}</div>
        </div>
      ))}
    </div>
  );
}
