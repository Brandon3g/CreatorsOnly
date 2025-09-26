// src/pages/Feed.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useRealtimeContext } from '../context/RealtimeProvider';
import PostCard from '../components/PostCard';
import { ICONS } from '../constants';
import { User, NotificationType } from '../types';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';

const Feed: React.FC = () => {
  const {
    currentUser,
    viewProfile,
    navigate,
    isMasterUser,
    addPost,
    history,
    goBack,
    notifications,
    refreshData,
  } = useAppContext();

  const {
    posts,
    profiles: users,
    isLoadingPosts,
    isLoadingProfiles,
    on, // realtime subscription API
  } = useRealtimeContext();

  // SAFETY: always work with arrays even while data is loading
  const safePosts = Array.isArray(posts) ? posts : [];
  const safeUsers = Array.isArray(users) ? users : [];

  // Pull-to-refresh
  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({
    onRefresh: refreshData,
  });

  const [copied, setCopied] = useState(false);

  // New Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const newPostTextAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mentions
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);

  const hasOtherNotifications =
    notifications?.some(
      (n) =>
        n.userId === currentUser?.id &&
        n.type !== NotificationType.NEW_MESSAGE &&
        !n.isRead
    ) ?? false;

  // ——— Realtime: refetch feed when posts table changes ———
  useEffect(() => {
    const off = on({ table: 'posts', event: '*' }, () => {
      // Keep it simple: call your existing loader
      refreshData();
    });
    return off;
  }, [on, refreshData]);

  // Mentions: recompute suggestions as the user types "@…"
  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    if (!currentUser) return;

    const q = mentionQuery.toLowerCase();
    const filtered = safeUsers
      .filter(
        (user: any) =>
          user.id !== currentUser.id &&
          (user.username?.toLowerCase().includes(q) ||
            user.name?.toLowerCase().includes(q))
      )
      .slice(0, 5);

    setSuggestions(filtered as User[]);
  }, [mentionQuery, safeUsers, currentUser]);

  // Efficiently compute the feed list
  const feedPosts = useMemo(() => {
    if (!currentUser) return [];

    const base = isMasterUser
      ? safePosts
      : safePosts.filter(
          (post: any) =>
            currentUser.friendIds?.includes?.(post.authorId) ||
            post.authorId === currentUser.id
        );

    return base
      .filter(
        (post: any) => !currentUser.blockedUserIds?.includes?.(post.authorId)
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [safePosts, isMasterUser, currentUser]);

  const handleShareApp = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'CreatorsOnly',
      text:
        'Join me on CreatorsOnly, the platform for creators to connect, collaborate, and grow!',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreatePost = () => {
    if (newPostContent.trim() || newPostImage) {
      addPost(newPostContent, newPostImage || undefined);
      setNewPostContent('');
      setNewPostImage(null);
      setMentionQuery(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPostImage((event.target?.result as string) || null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewPostContent(text);

    const caretPos = e.target.selectionStart || 0;
    const textBeforeCaret = text.substring(0, caretPos);
    const atMatch = textBeforeCaret.match(/@(\w+)$/);

    setMentionQuery(atMatch ? atMatch[1] : null);
  };

  const handleSelectMention = (username: string) => {
    const textarea = newPostTextAreaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const caretPos = textarea.selectionStart || 0;
    const textBeforeCaret = text.substring(0, caretPos);
    const atMatch = textBeforeCaret.match(/@(\w+)$/);

    if (atMatch) {
      const mentionStartIndex = atMatch.index ?? 0;
      const injected = `@${username} `;
      const newText =
        text.substring(0, mentionStartIndex) +
        injected +
        text.substring(caretPos);
      setNewPostContent(newText);

      const newCaretPos = mentionStartIndex + injected.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCaretPos, newCaretPos);
      }, 0);
    }
    setMentionQuery(null);
  };

  return (
    <div className="min-h-screen">
      {/* Pull-to-refresh area */}
      <div {...handlers} className="relative">
        <PullToRefreshIndicator
          isPulling={isPulling}
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-surface">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center space-x-2">
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
            <div>
              <div className="font-bold">CreatorsOnly</div>
              <div className="text-sm text-text-secondary">Home</div>
            </div>
            {isMasterUser && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-surface-light">
                Master Profile
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                handleShareApp();
              }}
              aria-label="Share App"
              className="p-2 rounded-full hover:bg-surface-light"
              title="Share"
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
              className="p-2 rounded-full hover:bg-surface-light"
              title="Search"
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
              className="relative p-2 rounded-full hover:bg-surface-light"
              title="Notifications"
            >
              {ICONS.notifications}
              {hasOtherNotifications && (
                <span className="absolute top-1.5 right-1.5 inline-block w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {currentUser && (
              <button
                onClick={() => viewProfile(currentUser.id)}
                onTouchStart={() => viewProfile(currentUser.id)}
                aria-label="Your profile"
                className="p-1.5 rounded-full hover:bg-surface-light"
                title="Profile"
              >
                {/* your avatar would normally be here */}
                {ICONS.user}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <textarea
            ref={newPostTextAreaRef}
            value={newPostContent}
            onChange={handleContentChange}
            placeholder="Share something… @mention people"
            className="w-full bg-transparent outline-none resize-none min-h-[80px]"
          />

          {/* Mention dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-surface rounded-md shadow-lg border border-surface-light mt-1 z-10 max-h-48 overflow-y-auto">
              {suggestions.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectMention(user.username)}
                  onTouchStart={() => handleSelectMention(user.username)}
                  className="flex items-center space-x-3 p-2 hover:bg-surface-light cursor-pointer"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="font-bold text-sm">{user.name}</p>
                    <p className="text-xs text-text-secondary">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Image preview */}
          {newPostImage && (
            <div className="mt-2 relative">
              <img
                src={newPostImage}
                alt="Preview"
                className="rounded-lg object-contain w-full max-h-80"
              />
              <button
                onClick={() => setNewPostImage(null)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setNewPostImage(null);
                }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
                aria-label="Remove image"
              >
                {ICONS.close}
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              onTouchEnd={(e) => {
                e.preventDefault();
                imageInputRef.current?.click();
              }}
              className="text-primary hover:text-primary-hover p-2 rounded-full"
              aria-label="Add photo"
            >
              {ICONS.camera}
            </button>

            <button
              onClick={handleCreatePost}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleCreatePost();
              }}
              className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-full disabled:opacity-50"
              disabled={!newPostContent.trim() && !newPostImage}
            >
              Post
            </button>
          </div>
        </div>

        {/* Feed list */}
        <div className="mt-6">
          {isLoadingPosts || isLoadingProfiles ? (
            <div className="p-8 text-center text-text-secondary">Loading feed…</div>
          ) : feedPosts.length > 0 ? (
            feedPosts.map((post: any) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-8 text-center text-text-secondary">
              <h2 className="text-xl font-bold mb-2">Your Feed is Quiet</h2>
              <p>
                Posts from your friends will appear here. Go to the Explore page to
                find new creators to connect with!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feed;
