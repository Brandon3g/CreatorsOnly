// pages/Profile.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getMyProfile, type Profile } from '../services/profile';
import { fetchProfilePosts, type Post } from '../services/posts';
import { subscribeToAppRealtime } from '../services/realtime';
import ProfileHeader from '../components/ProfileHeader';

export default function ProfilePage() {
  const { session, track } = useAppContext();
  const dbUserId = session?.user?.id ?? null;
  const analyticsId = dbUserId ?? 'anon';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track('profile_open', { page: 'profile' }, analyticsId);
  }, [track, analyticsId]);

  useEffect(() => {
    if (!dbUserId) {
      setProfile(null);
      setPosts([]);
      setLoading(false);
      return;
    }

    let cancel = false;

    (async () => {
      try {
        const p = await getMyProfile(dbUserId);
        const ps = await fetchProfilePosts(dbUserId, 30);
        if (!cancel) {
          setProfile(p);
          setPosts(ps);
        }
      } catch (err) {
        console.error('[Profile] load error ›', err);
        if (!cancel) {
          setProfile(null);
          setPosts([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    const unsub = subscribeToAppRealtime({
      dbUserId: dbUserId ?? undefined,
      onProfilesUpdate: (payload) => {
        if (payload.new?.id === dbUserId) {
          setProfile((prev) => ({ ...(prev ?? {} as any), ...(payload.new as Profile) }));
        }
      },
      onPostsInsert: (payload) => {
        if (payload.new?.user_id === dbUserId) {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      },
    });

    return () => {
      cancel = true;
      unsub();
    };
  }, [dbUserId]);

  if (!dbUserId) {
    return (
      <div className="p-6 text-sm opacity-70">
        Sign in to view your profile.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm opacity-70">Loading profile…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <ProfileHeader
        profile={profile ?? ({} as Profile)}
        onUpdated={(p) => setProfile(p)}
      />

      {posts.length === 0 ? (
        <div className="opacity-70 text-sm">No posts yet.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-base-200 p-4">
              <div className="text-xs opacity-60">
                {new Date(p.created_at).toLocaleString()}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{p.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
