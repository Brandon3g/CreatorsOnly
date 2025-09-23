// src/pages/Explore.tsx
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useRealtimeContext } from '../context/RealtimeProvider'; // ✅ NEW
import PostCard from '../components/PostCard';
import UserCard from '../components/UserCard';
import { User, NotificationType } from '../types';
import { ICONS } from '../constants';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';

// Map realtime post -> your app's legacy Post shape expected by PostCard
function toLegacyPost(p: any) {
  return {
    id: p.id,
    authorId: p.user_id,
    content: p.content ?? '',
    image: p.media_url ?? null,
    timestamp: p.created_at ?? new Date().toISOString(),
    likes: p.likes ?? 0, // default if not present in realtime row
    // pass-thru for debugging if needed
    _rt: p,
  };
}

/**
 * Overlay live profile data onto your existing User type.
 * We keep proximity info (state/county/friendIds/blockedUserIds) from your app's user record,
 * but refresh the display name / avatar from the realtime profile when available.
 */
function mergeUserWithLiveProfile(user: User, liveProfile?: { display_name?: string | null; avatar_url?: string | null }) {
  if (!liveProfile) return user;
  return {
    ...user,
    name: liveProfile.display_name ?? user.name,
    avatar: liveProfile.avatar_url ?? user.avatar,
  } as User;
}

const Explore: React.FC = () => {
  const {
    users,                 // keep from AppContext for proximity logic
    currentUser,
    getUserById,
    navigate,
    isMasterUser,
    history,
    goBack,
    notifications,
    refreshData,
  } = useAppContext();

  const {
    posts: rtPosts,        // ✅ live posts
    profiles: rtProfiles,  // ✅ live profiles (for overlaying name/avatar)
  } = useRealtimeContext();

  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({
    onRefresh: refreshData,
  });

  if (!currentUser) return null;

  const hasOtherNotifications = notifications.some(
    (n) => n.userId === currentUser.id && n.type !== NotificationType.NEW_MESSAGE && !n.isRead
  );

  const liveProfileById = useMemo(() => {
    const map = new Map<string, any>();
    rtProfiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [rtProfiles]);

  const getProximityScore = (user: User | undefined): number => {
    if (!user || !currentUser.state) return 0;
    if (user.state === currentUser.state) {
      if (user.county && user.county === currentUser.county) {
        return 2; // Same county
      }
      return 1; // Same state
    }
    return 0; // Different state
  };

  // Build legacy-shaped posts from realtime
  const legacyPosts = useMemo(() => rtPosts.map(toLegacyPost), [rtPosts]);

  const postFilter = (post: { authorId: string }) => {
    if (post.authorId === currentUser.id) return false;
    if (currentUser.blockedUserIds?.includes(post.authorId)) return false;
    const postAuthor = getUserById(post.authorId);
    if (postAuthor?.blockedUserIds?.includes(currentUser.id)) return false;
    if (isMasterUser) return true;
    return !currentUser.friendIds.includes(post.authorId);
  };

  const explorePosts = useMemo(() => {
    return legacyPosts
      .filter(postFilter)
      .sort((a, b) => {
        const authorA = getUserById(a.authorId);
        const authorB = getUserById(b.authorId);

        const scoreA = getProximityScore(authorA);
        const scoreB = getProximityScore(authorB);

        if (scoreB !== scoreA) {
          return scoreB - scoreA; // Prioritize by proximity
        }

        // Then by likes (trending) – legacy field; defaults to 0 if not present
        return (b.likes || 0) - (a.likes || 0);
      });
  }, [legacyPosts, getUserById, getProximityScore]);

  const userFilter = (user: User) => {
    if (user.id === currentUser.id) return false;
    if (currentUser.blockedUserIds?.includes(user.id)) return false;
    if (user.blockedUserIds?.includes(currentUser.id)) return false;
    if (isMasterUser) return true;
    return !currentUser.friendIds.includes(user.id);
  };

  // Suggest users using your existing app users for proximity, but overlay live name/avatar if available
  const suggestedUsers = useMemo(() => {
    const base = users.filter(userFilter);
    base.sort((a, b) => getProximityScore(b) - getProximityScore(a));
    // Overlay live profile fields for display polish
    return base.slice(0, 4).map((u) => mergeUserWithLiveProfile(u, liveProfileById.get(u.id)));
  }, [users, userFilter, getProximityScore, liveProfileById]);

  return (
    <div className="w-full">
      <header className="app-header flex items-center space-x-4">
        {history.length > 1 && (
          <button
            onClick={goBack}
            onTouchEnd={(e) => {
              e.preventDefault();
              goBack();
            }}
            aria-label="Go back"
            className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2"
          >
            {ICONS.arrowLeft}
          </button>
        )}
        <div className="flex-grow flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-primary lg:hidden">Explore</h1>
            <h1 className="hidden lg:block text-xl font-bold">Explore</h1>
          </div>
          <div className="flex md:hidden items-center space-x-4">
            <button
              onClick={() => navigate('search')}
              onTouchEnd={(e) => {
                e.preventDefault();
                navigate('search');
              }}
              aria-label="Search"
            >
              {ICONS.search}
            </button>
            <button
              onClick={() => navigate('notifications')}
              onTouchEnd={(e) => {
                e.preventDefault();
                navigate('notifications');
              }}
              aria-label="Notifications"
              className="relative"
            >
              {ICONS.notifications}
              {hasOtherNotifications && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-red ring-2 ring-background" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />
        <div
          {...handlers}
          style={{
            transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div className="p-4">
            <h2 className="text-lg font-bold mb-4">Suggested for you</h2>
            {suggestedUsers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="bg-surface rounded-lg">
                    <UserCard user={user} variant="follow" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary">No new creators to suggest right now.</p>
            )}
          </div>

          <div className="border-t border-surface-light">
            <h2 className="p-4 text-lg font-bold">Discover Posts</h2>
            {explorePosts.length > 0 ? (
              explorePosts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <p className="p-4 text-center text-text-secondary">No posts to discover right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
