import React from 'react';
import { useAppContext } from '../context/AppContext';
import PostCard from '../components/PostCard';
import UserCard from '../components/UserCard';
import { User, NotificationType } from '../types';
import { ICONS } from '../constants';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';

const Explore: React.FC = () => {
  const { posts, users, currentUser, getUserById, navigate, isMasterUser, history, goBack, notifications, refreshData } = useAppContext();
  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({ onRefresh: refreshData });

  if (!currentUser) return null;

  const hasOtherNotifications = notifications.some(n => n.userId === currentUser.id && n.type !== NotificationType.NEW_MESSAGE && !n.isRead);

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
  
  const postFilter = (post: { authorId: string; }) => {
    if (post.authorId === currentUser.id) return false;
    if (currentUser.blockedUserIds?.includes(post.authorId)) return false;
    const postAuthor = getUserById(post.authorId);
    if (postAuthor?.blockedUserIds?.includes(currentUser.id)) return false;
    if (isMasterUser) return true;
    return !currentUser.friendIds.includes(post.authorId);
  };

  const explorePosts = posts
    .filter(postFilter)
    .sort((a, b) => {
        const authorA = getUserById(a.authorId);
        const authorB = getUserById(b.authorId);
        
        const scoreA = getProximityScore(authorA);
        const scoreB = getProximityScore(authorB);

        if (scoreB !== scoreA) {
            return scoreB - scoreA; // Prioritize by proximity
        }

        return b.likes - a.likes; // Then by likes (trending)
    });

  const userFilter = (user: User) => {
    if (user.id === currentUser.id) return false;
    if (currentUser.blockedUserIds?.includes(user.id)) return false;
    if (user.blockedUserIds?.includes(currentUser.id)) return false;
    if (isMasterUser) return true;
    return !currentUser.friendIds.includes(user.id);
  };

  const suggestedUsers = users
    .filter(userFilter)
    .sort((a, b) => getProximityScore(b) - getProximityScore(a)) // Sort by proximity
    .slice(0, 4);

  return (
    <div className="w-full">
      <header className="app-header flex items-center space-x-4">
        {history.length > 1 && (
            <button onClick={goBack} onTouchEnd={(e) => { e.preventDefault(); goBack(); }} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                {ICONS.arrowLeft}
            </button>
        )}
        <div className="flex-grow flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold text-primary lg:hidden">Explore</h1>
                <h1 className="hidden lg:block text-xl font-bold">Explore</h1>
            </div>
            <div className="flex md:hidden items-center space-x-4">
                <button onClick={() => navigate('search')} onTouchEnd={(e) => { e.preventDefault(); navigate('search'); }} aria-label="Search">{ICONS.search}</button>
                <button onClick={() => navigate('notifications')} onTouchEnd={(e) => { e.preventDefault(); navigate('notifications'); }} aria-label="Notifications" className="relative">
                    {ICONS.notifications}
                    {hasOtherNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-red ring-2 ring-background" />}
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
                {suggestedUsers.map(user => (
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
                explorePosts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))
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