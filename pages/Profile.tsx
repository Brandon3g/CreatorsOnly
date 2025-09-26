// pages/Profile.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProfileHeader from '../components/ProfileHeader';
import PostCard from '../components/PostCard';
import UserCard from '../components/UserCard';
import CollabCard from '../components/CollabCard';
import { ICONS } from '../constants';
import { NotificationType, User } from '../types';
import {
  usePullToRefresh,
  PullToRefreshIndicator,
} from '../components/PullToRefresh';
import { supabase } from '../lib/supabaseClient';

interface ProfileProps {
  userId: string;
  onOpenFeedbackModal: () => void;
}

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`flex-1 p-4 text-center font-bold transition-colors ${
      isActive
        ? 'text-primary border-b-2 border-primary'
        : 'text-text-secondary hover:bg-surface-light'
    }`}
  >
    {label}
  </button>
);

const Profile: React.FC<ProfileProps> = ({ userId, onOpenFeedbackModal }) => {
  const {
    getUserById,
    posts,
    collaborations,
    currentUser,
    navigate,
    logout,
    history,
    goBack,
    theme,
    setTheme,
    notifications,
    refreshData,
    toggleBlockUser,
  } = useAppContext();

  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({
    onRefresh: refreshData,
  });

  const user = getUserById?.(userId);
  const safePosts = posts ?? [];
  const safeCollabs = collaborations ?? [];

  const userPosts = useMemo(
    () =>
      safePosts
        .filter((p) => p.authorId === userId)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [safePosts, userId]
  );

  const userCollaborations = useMemo(
    () =>
      safeCollabs
        .filter((c) => c.authorId === userId)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
    [safeCollabs, userId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<'posts' | 'friends' | 'opportunities'>('posts');

  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);

  const hasOtherNotifications = notifications?.some(
    (n) =>
      n.userId === currentUser?.id &&
      n.type !== NotificationType.NEW_MESSAGE &&
      !n.isRead
  );

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuToggleRef.current &&
        !menuToggleRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Reset tab/editing when switching profile
  useEffect(() => {
    setIsEditing(false);
    setActiveTab('posts');
  }, [userId]);

  // ---------- Realtime for THIS profile ----------
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile:${userId}`)
      // posts by this user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshData?.();
        }
      )
      // collaborations by this user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaborations',
          filter: `author_id=eq.${userId}`,
        },
        () => {
          refreshData?.();
        }
      )
      // this profile row (display_name, avatar, bio, etc)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => {
          refreshData?.();
        }
      )
      .subscribe((status) => {
        // optional: console.log('[Profile realtime] status:', status);
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* no-op */
      }
    };
  }, [userId, refreshData]);

  if (!user || !currentUser) {
    return (
      <div className="p-6 text-text-secondary">
        <h2 className="text-xl font-bold mb-2">User not found.</h2>
      </div>
    );
  }

  const userFriends = (user.friendIds ?? [])
    .map((friendId) => getUserById?.(friendId))
    .filter((friend): friend is User => !!friend)
    .filter(
      (friend) =>
        !(currentUser.blockedUserIds ?? []).includes(friend.id) &&
        !(friend.blockedUserIds ?? []).includes(currentUser.id)
    );

  const isBlockedByYou = (currentUser.blockedUserIds ?? []).includes(user.id);
  const hasBlockedYou = (user.blockedUserIds ?? []).includes(currentUser.id);

  if (hasBlockedYou) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2 text-text-primary">
          Profile Unavailable
        </h2>
        <p className="text-text-secondary">You can&apos;t view this profile.</p>
      </div>
    );
  }

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/profile/${user.username}`;
    const shareData = {
      title: `${user.name}'s Profile on CreatorsOnly`,
      text: `Check out ${user.name} (@${user.username}) on CreatorsOnly!`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCurrentUserProfile = currentUser.id === userId;

  return (
    <div className="relative min-h-full" {...handlers}>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        isPulling={isPulling}
        pullDistance={pullDistance}
      />

      {/* Header actions */}
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/80 backdrop-blur py-3 px-4">
        {history.length > 1 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              goBack();
            }}
            aria-label="Go back"
            className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2"
          >
            {ICONS.arrowLeft}
          </button>
        )}

        <h1 className="text-xl font-bold text-text-primary flex-1">
          CreatorsOnly
        </h1>
        <button
          onClick={(e) => {
            e.preventDefault();
            handleShareProfile();
          }}
          aria-label="Share Profile"
          className="text-text-secondary hover:text-text-primary p-2 rounded-full"
          title={copied ? 'Copied!' : 'Share'}
        >
          {copied ? ICONS.copy : ICONS.share}
        </button>

        <button
          onClick={() => navigate('search')}
          onTouchEnd={(e) => {
            e.preventDefault();
            navigate('search');
          }}
          aria-label="Search"
          className="text-text-secondary hover:text-text-primary p-2 rounded-full"
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
          className="relative text-text-secondary hover:text-text-primary p-2 rounded-full"
        >
          {ICONS.notifications}
          {hasOtherNotifications && (
            <span className="absolute top-1.5 right-1.5 inline-block h-2 w-2 rounded-full bg-primary" />
          )}
        </button>

        {isCurrentUserProfile && (
          <div className="relative">
            <button
              ref={menuToggleRef}
              onClick={() => setIsMobileMenuOpen((p) => !p)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen((p) => !p);
              }}
              className="text-text-secondary hover:text-text-primary p-2 rounded-full"
              aria-label="Settings"
              aria-haspopup="true"
              aria-expanded={isMobileMenuOpen}
            >
              {ICONS.ellipsis}
            </button>

            {isMobileMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-surface-light bg-surface shadow-lg overflow-hidden"
              >
                <div className="px-4 py-2 text-xs font-semibold text-text-secondary">
                  Theme
                </div>
                <div className="flex items-center gap-2 px-4 pb-2">
                  <button
                    onClick={() => setTheme('light')}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setTheme('light');
                    }}
                    aria-label="Switch to light theme"
                    className={`p-1 rounded-full ${
                      theme === 'light'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary'
                    }`}
                    title="Light"
                  >
                    ☀️
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setTheme('dark');
                    }}
                    aria-label="Switch to dark theme"
                    className={`p-1 rounded-full ${
                      theme === 'dark'
                        ? 'bg-primary text-white'
                        : 'text-text-secondary'
                    }`}
                    title="Dark"
                  >
                    🌙
                  </button>
                </div>

                <button
                  onClick={() => {
                    onOpenFeedbackModal();
                    setIsMobileMenuOpen(false);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onOpenFeedbackModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light"
                >
                  Send Feedback
                </button>

                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light"
                >
                  Log out @{currentUser.username}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile header */}
      <ProfileHeader
        user={user}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
      />

      {/* Blocked notice / actions */}
      {isBlockedByYou ? (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            You have blocked @{user.username}
          </h2>
          <p className="text-text-secondary mb-3">
            They can&apos;t see your profile or contact you.
          </p>
          <button
            onClick={() => toggleBlockUser?.(user.id)}
            onTouchEnd={(e) => {
              e.preventDefault();
              toggleBlockUser?.(user.id);
            }}
            className="mt-2 font-bold py-2 px-4 rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
          >
            Unblock
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-surface-light">
            <TabButton
              label="Posts"
              isActive={activeTab === 'posts'}
              onClick={() => setActiveTab('posts')}
            />
            <TabButton
              label="Opportunities"
              isActive={activeTab === 'opportunities'}
              onClick={() => setActiveTab('opportunities')}
            />
            <TabButton
              label="Friends"
              isActive={activeTab === 'friends'}
              onClick={() => setActiveTab('friends')}
            />
          </div>

          {/* Posts */}
          {activeTab === 'posts' && (
            <div>
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <PostCard key={post.id} post={post} compact={false} />
                ))
              ) : (
                <div className="p-6 text-center text-text-secondary">
                  @{user.username} hasn&apos;t posted yet.
                </div>
              )}
            </div>
          )}

          {/* Opportunities */}
          {activeTab === 'opportunities' && (
            <div>
              {userCollaborations.length > 0 ? (
                userCollaborations.map((collab) => (
                  <CollabCard key={collab.id} collab={collab} />
                ))
              ) : (
                <div className="p-6 text-center text-text-secondary">
                  @{user.username} hasn&apos;t posted any opportunities yet.
                </div>
              )}
            </div>
          )}

          {/* Friends */}
          {activeTab === 'friends' && (
            <div>
              {userFriends.length > 0 ? (
                userFriends.map((friend) => (
                  <UserCard key={friend.id} user={friend} />
                ))
              ) : (
                <div className="p-6 text-center text-text-secondary">
                  @{user.username} hasn&apos;t added any friends yet.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;
