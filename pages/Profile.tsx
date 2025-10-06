// pages/Profile.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProfileHeader from '../components/ProfileHeader';
import UserCard from '../components/UserCard';
import PostCard from '../components/PostCard';
import CollabCard from '../components/CollabCard';
import type { User } from '../types';

const ProfilePage: React.FC = () => {
  const {
    currentUser,
    users,
    viewingProfileId,
    getUserById,
    isAuthenticated,
    navigate,
    posts,
    collaborations,
  } = useAppContext();

  type TabKey = 'posts' | 'opportunities' | 'friends';

  // Pick the profile being viewed; fall back to the current user
  const profile = useMemo(() => {
    const id = viewingProfileId ?? currentUser?.id ?? null;
    return id ? getUserById(id) ?? null : null;
  }, [viewingProfileId, currentUser?.id, getUserById]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('posts');

  useEffect(() => {
    setIsEditingProfile(false);
  }, [profile?.id]);

  // Safe fallbacks so UI never crashes when data is still loading
  const safeFriends: User[] = (profile?.friendIds ?? [])
    .map((id) => users.find((u) => u.id === id) ?? null)
    .filter((friend): friend is User => Boolean(friend));

  const profilePosts = useMemo(
    () =>
      (posts ?? [])
        .filter((post) => post.authorId === profile?.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
    [posts, profile?.id],
  );

  const profileCollaborations = useMemo(
    () =>
      (collaborations ?? [])
        .filter((collab) => collab.authorId === profile?.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
    [collaborations, profile?.id],
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        if (profilePosts.length === 0) {
          return (
            <div className="p-6 text-center text-text-secondary">
              No posts yet.
            </div>
          );
        }
        return (
          <>
            {profilePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </>
        );
      case 'opportunities':
        if (profileCollaborations.length === 0) {
          return (
            <div className="p-6 text-center text-text-secondary">
              No opportunities posted yet.
            </div>
          );
        }
        return (
          <>
            {profileCollaborations.map((collab) => (
              <CollabCard key={collab.id} collab={collab} />
            ))}
          </>
        );
      case 'friends':
      default:
        if (safeFriends.length === 0) {
          return (
            <div className="p-6 text-center text-text-secondary">
              No friends yet.
            </div>
          );
        }
        return (
          <div className="p-4 space-y-3">
            {safeFriends.map((friend) => (
              <UserCard key={friend.id} user={friend} />
            ))}
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    // keep this simple: if somehow unauth, send them to login
    navigate('login');
    return null;
  }

  if (!profile) {
    return (
      <div className="p-6 text-sm text-neutral-300">
        Profile not found.
      </div>
    );
  }

  return (
   <div className="max-w-4xl mx-auto px-4">
      <ProfileHeader
        user={profile}
        isEditing={isEditingProfile}
        setIsEditing={setIsEditingProfile}
      />

      <section className="mt-6">
        <div className="rounded-2xl border border-surface-light overflow-hidden bg-surface">
          <nav className="flex border-b border-surface-light">
            {[
              { label: 'Posts', value: 'posts' },
              { label: 'Opportunities', value: 'opportunities' },
              { label: 'Friends', value: 'friends' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.value
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setActiveTab(tab.value as TabKey)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="bg-surface">{renderTabContent()}</div>
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
