// src/pages/Feed.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useRealtimeContext } from '../context/RealtimeProvider'; // ✅ NEW
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
    profiles: users, // ✅ replace users from realtime
    isLoadingPosts,
    isLoadingProfiles,
  } = useRealtimeContext();

  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({
    onRefresh: refreshData,
  });

  const [copied, setCopied] = useState(false);

  // New Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const newPostTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);

  const hasOtherNotifications = notifications.some(
    (n) =>
      n.userId === currentUser?.id &&
      n.type !== NotificationType.NEW_MESSAGE &&
      !n.isRead
  );

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    if (!currentUser) return;
    const filteredUsers = users
      .filter(
        (user) =>
          user.id !== currentUser.id &&
          (user.username?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            user.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
      )
      .slice(0, 5);
    setSuggestions(filteredUsers as User[]);
  }, [mentionQuery, users, currentUser]);

  // ✅ Memoize feed posts so sort/filter recalcs only on change
  const feedPosts = useMemo(() => {
    if (!currentUser) return [];
    const base = isMasterUser
      ? posts
      : posts.filter(
          (post) =>
            currentUser.friendIds.includes(post.authorId) ||
            post.authorId === currentUser.id
        );
    return base
      .filter((post) => !currentUser.blockedUserIds?.includes(post.authorId))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [posts, isMasterUser, currentUser]);

  const handleShareApp = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'CreatorsOnly',
      text: 'Join me on CreatorsOnly, the platform for creators to connect, collaborate, and grow!',
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (error) {
      console.log('Sharing failed, copying to clipboard as a fallback', error);
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleCreatePost = () => {
    if (newPostContent.trim() || newPostImage) {
      addPost(newPostContent, newPostImage || undefined);
      setNewPostContent('');
      setNewPostImage(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPostImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewPostContent(text);

    const caretPos = e.target.selectionStart;
    const textBeforeCaret = text.substring(0, caretPos);
    const atMatch = textBeforeCaret.match(/@(\w+)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (username: string) => {
    const textarea = newPostTextAreaRef.current;
    if (!textarea) return;

    const text = textarea.value;
    const caretPos = textarea.selectionStart;

    const textBeforeCaret = text.substring(0, caretPos);
    const atMatch = textBeforeCaret.match(/@(\w+)$/);

    if (atMatch) {
      const mentionStartIndex = atMatch.index || 0;
      const newText =
        text.substring(0, mentionStartIndex) +
        `@${username} ` +
        text.substring(caretPos);
      setNewPostContent(newText);

      const newCaretPos = mentionStartIndex + `@${username} `.length;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCaretPos, newCaretPos);
      }, 0);
    }
    setMentionQuery(null);
  };

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
        <div className="flex-grow flex items-center space-x-4">
          {/* Mobile & Tablet Title */}
          <h1 className="text-xl font-bold text-primary lg:hidden">CreatorsOnly</h1>
          {/* Desktop Title */}
          <h1 className="hidden lg:block text-xl font-bold">Home</h1>
          {isMasterUser && (
            <span className="text-xs font-bold bg-accent-blue text-white px-2 py-1 rounded-full">
              Master Profile
            </span>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center space-x-4 md:hidden">
          <button
            onClick={handleShareApp}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleShareApp();
            }}
            aria-label="Share App"
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
      </header>
      <div className="relative">
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
        />
        <div
          {...handlers}
          style={{
            transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div className="p-4 border-b border-surface-light">
            <div className="flex space-x-4">
              <img
                src={currentUser.avatar}
                alt="Your avatar"
                className="w-12 h-12 rounded-full cursor-pointer"
                onClick={() => viewProfile(currentUser.id)}
                onTouchStart={() => viewProfile(currentUser.id)}
              />
              <div className="flex-1 relative">
                <textarea
                  ref={newPostTextAreaRef}
                  placeholder="What's happening? Mention others with @"
                  className="w-full bg-transparent text-xl placeholder-text-secondary focus:outline-none resize-none"
                  rows={2}
                  value={newPostContent}
                  onChange={handleContentChange}
                  onBlur={() => setTimeout(() => setMentionQuery(null), 200)}
                />
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
                          <p className="text-xs text-text-secondary">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
            </div>
          </div>

          <div>
            {isLoadingPosts || isLoadingProfiles ? (
              <div className="p-8 text-center text-text-secondary">Loading feed…</div>
            ) : feedPosts.length > 0 ? (
              feedPosts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="p-8 text-center text-text-secondary">
                <h2 className="text-xl font-bold mb-2">Your Feed is Quiet</h2>
                <p>
                  Posts from your friends will appear here. Go to the Explore page
                  to find new creators to connect with!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Feed;
