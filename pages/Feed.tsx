// pages/Feed.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useRealtimeContext } from '../context/RealtimeProvider';
import PostCard from '../components/PostCard';
import { ICONS } from '../constants';
import { NotificationType, User } from '../types';

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

  const { posts, profiles: users, isLoadingPosts, isLoadingProfiles, on } =
    useRealtimeContext();

  // Always operate on arrays (even while loading)
  const safePosts = Array.isArray(posts) ? posts : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const [copied, setCopied] = useState(false);

  // New Post
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

  // Realtime: re-fetch when posts change
  useEffect(() => {
    if (typeof on === 'function') {
      const off = on({ table: 'posts', event: '*' }, () => {
        refreshData();
      });
      return off;
    }
    return undefined;
  }, [on, refreshData]);

  // Mention suggestions
  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    if (!currentUser) return;

    const q = mentionQuery.toLowerCase();
    const filtered = safeUsers
      .filter(
        (u: any) =>
          u.id !== currentUser.id &&
          (u.username?.toLowerCase().includes(q) ||
            u.name?.toLowerCase().includes(q))
      )
      .slice(0, 5);

    setSuggestions(filtered as User[]);
  }, [mentionQuery, safeUsers, currentUser]);

  // Build the feed
  const feedPosts = useMemo(() => {
    if (!currentUser) return [];

    const base = isMasterUser
      ? safePosts
      : safePosts.filter(
          (p: any) =>
            currentUser.friendIds?.includes?.(p.authorId) ||
            p.authorId === currentUser.id
        );

    return base
      .filter(
        (p: any) => !currentUser.blockedUserIds?.includes?.(p.authorId)
      )
      .sort((a: any, b: any) => {
        const ta = new Date(a.created_at ?? a.timestamp ?? 0).getTime();
        const tb = new Date(b.created_at ?? b.timestamp ?? 0).getTime();
        return tb - ta;
      });
  }, [safePosts, isMasterUser, currentUser]);

  // Actions
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
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewPostImage((ev.target?.result as string) || null);
    };
    reader.readAsDataURL(file);
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
      const start = atMatch.index ?? 0;
      const injected = `@${username} `;
      const next =
        text.substring(0, start) + injected + text.substring(caretPos);
      setNewPostContent(next);

      const newCaretPos = start + injected.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCaretPos, newCaretPos);
      }, 0);
    }
    setMentionQuery(null);
  };

  return (
    <div className="min-h-screen">
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
