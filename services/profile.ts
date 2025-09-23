// src/pages/Profile.tsx
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useRealtimeContext } from '../context/RealtimeProvider';
import type { MyProfile } from '../services/profile';
import type { Post as RTPost } from '../services/posts';
import PostCard from '../components/PostCard';
import { ICONS } from '../constants';

type ProfileProps = {
  userId: string;
  onOpenFeedbackModal?: () => void;
};

// Helper: map realtime Post -> shape PostCard likely expects in your app
function toLegacyPost(p: RTPost) {
  return {
    id: p.id,
    authorId: p.user_id,
    content: (p as any).content ?? '',
    image: (p as any).media_url ?? null,
    timestamp: p.created_at ?? new Date().toISOString(),
    // pass through any extra fields safely if PostCard ignores them
    _rt: p,
  };
}

const LoadingBlock: React.FC = () => (
  <div className="p-6 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-16 h-16 rounded-full bg-surface-light" />
      <div className="flex-1">
        <div className="h-4 w-1/3 bg-surface-light rounded" />
        <div className="h-3 w-1/4 bg-surface-light rounded mt-2" />
      </div>
    </div>
    <div className="h-3 w-2/3 bg-surface-light rounded mt-6" />
    <div className="h-3 w-1/2 bg-surface-light rounded mt-2" />
  </div>
);

const EmptyPosts: React.FC = () => (
  <div className="p-10 text-center text-text-secondary">
    <h3 className="text-lg font-bold mb-2">No posts yet</h3>
    <p>When this creator shares something, it’ll show up here instantly.</p>
  </div>
);

const ProfileHeader: React.FC<{
  profile: MyProfile;
  isCurrentUser: boolean;
  onOpenFeedbackModal?: () => void;
  onEdit?: () => void;
}> = ({ profile, isCurrentUser, onOpenFeedbackModal, onEdit }) => {
  const displayName = profile.display_name || 'Creator';
  const avatar = profile.avatar_url || undefined;
  const bio = profile.bio || '';

  return (
    <div className="p-4 md:p-6 border-b border-surface-light">
      <div className="flex items-center md:items-start md:space-x-6">
        <img
          src={avatar || 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA=='}
          alt={displayName}
          className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover bg-surface-light"
        />
        <div className="ml-4 md:ml-0 flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold">{displayName}</h1>
            <div className="flex items-center space-x-2">
              {onOpenFeedbackModal && (
                <button
                  onPointerUp={onOpenFeedbackModal}
                  className="px-3 py-1.5 rounded-full bg-surface-light hover:bg-surface text-sm"
                  aria-label="Send feedback"
                >
                  {ICONS.feedback ?? '💬'} <span className="ml-1">Feedback</span>
                </button>
              )}
              {isCurrentUser ? (
                <button
                  onPointerUp={onEdit}
                  className="px-3 py-1.5 rounded-full bg-primary text-white text-sm hover:bg-primary-hover"
                >
                  {ICONS.edit ?? '✏️'} <span className="ml-1">Edit</span>
                </button>
              ) : null}
            </div>
          </div>
          {bio && <p className="text-text-secondary mt-2 whitespace-pre-wrap">{bio}</p>}
        </div>
      </div>
    </div>
  );
};

const Profile: React.FC<ProfileProps> = ({ userId, onOpenFeedbackModal }) => {
  const {
    currentUser,
    isAuthenticated,
    navigate,
    // If you have an edit-profile route/modal in AppContext, wire it here:
    // openEditProfile,
  } = useAppContext();

  const {
    profiles,
    posts,
    isLoadingProfiles,
    isLoadingPosts,
  } = useRealtimeContext();

  const profile = useMemo(
    () => profiles.find((p) => p.id === userId),
    [profiles, userId]
  );

  const userPosts = useMemo(() => {
    const mine = posts.filter((p) => p.user_id === userId);
    mine.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    return mine;
  }, [posts, userId]);

  const isMe = currentUser?.id === userId;

  // Loading state while either profiles or posts are fetching
  if (isLoadingProfiles || isLoadingPosts) {
    return (
      <div>
        <LoadingBlock />
        <div className="divide-y divide-surface-light">
          <div className="p-4 animate-pulse">
            <div className="h-3 w-1/2 bg-surface-light rounded" />
            <div className="h-3 w-2/3 bg-surface-light rounded mt-2" />
            <div className="h-40 w-full bg-surface-light rounded-xl mt-4" />
          </div>
          <div className="p-4 animate-pulse">
            <div className="h-3 w-1/3 bg-surface-light rounded" />
            <div className="h-3 w-1/2 bg-surface-light rounded mt-2" />
            <div className="h-48 w-full bg-surface-light rounded-xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!profile) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-2">Profile not found</h2>
        <p className="text-text-secondary">
          This user may have been removed or doesn’t exist.
        </p>
        <button
          onPointerUp={() => navigate('explore')}
          className="mt-6 px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-hover"
        >
          Explore creators
        </button>
      </div>
    );
  }

  return (
    <div>
      <ProfileHeader
        profile={profile}
        isCurrentUser={!!isMe}
        onOpenFeedbackModal={onOpenFeedbackModal}
        onEdit={() => {
          // If you have a dedicated edit flow, navigate or open modal here:
          // openEditProfile?.();
          navigate('profile'); // no-op if you already are; adjust if needed
        }}
      />

      {/* Stats / Actions row (optional placeholder to align with your style) */}
      <div className="px-4 md:px-6 py-3 border-b border-surface-light flex items-center space-x-4 text-sm">
        {/* Fill these with your real counts if you track them */}
        <div className="text-text-secondary">
          <span className="font-bold text-text-primary">{userPosts.length}</span> posts
        </div>
        {/* Example buttons; wire to your flows as desired */}
        {!isMe && isAuthenticated && (
          <>
            <button className="px-3 py-1 rounded-full bg-surface-light hover:bg-surface">
              {ICONS.plus} <span className="ml-1">Follow</span>
            </button>
            <button className="px-3 py-1 rounded-full bg-surface-light hover:bg-surface">
              {ICONS.messages} <span className="ml-1">Message</span>
            </button>
          </>
        )}
      </div>

      {/* Posts */}
      <div>
        {userPosts.length === 0 ? (
          <EmptyPosts />
        ) : (
          userPosts.map((p) => <PostCard key={p.id} post={toLegacyPost(p)} />)
        )}
      </div>
    </div>
  );
};

export default Profile;
