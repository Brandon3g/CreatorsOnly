// pages/Profile.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProfileHeader from '../components/ProfileHeader';
import UserCard from '../components/UserCard';

const ProfilePage: React.FC = () => {
  const {
    currentUser,
    users,
    viewingProfileId,
    getUserById,
    isAuthenticated,
    navigate,
  } = useAppContext();

  // Pick the profile being viewed; fall back to the current user
  const profile = useMemo(() => {
    const id = viewingProfileId ?? currentUser?.id ?? null;
    return id ? getUserById(id) ?? null : null;
  }, [viewingProfileId, currentUser?.id, getUserById]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    setIsEditingProfile(false);
  }, [profile?.id]);

  // Safe fallbacks so UI never crashes when data is still loading
  const safeTags = profile?.tags ?? [];
  const safePlatforms = profile?.platformLinks ?? [];
  const safeFriends =
    (profile?.friendIds ?? [])
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean) ?? [];

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
    <div className="max-w-4xl mx-auto">
       <ProfileHeader
        user={profile}
        isEditing={isEditingProfile}
        setIsEditing={setIsEditingProfile}
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {/* Bio */}
          <div className="rounded-xl border border-neutral-800 p-4">
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <p className="text-sm text-neutral-300">
              {profile.bio || 'No bio yet.'}
            </p>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-neutral-800 p-4">
            <h2 className="text-lg font-semibold mb-2">Tags</h2>
            {safeTags.length === 0 ? (
              <p className="text-sm text-neutral-400">No tags added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {safeTags.map((t: string, i: number) => (
                  <span
                    key={`${t}-${i}`}
                    className="px-2 py-1 rounded-md bg-neutral-800 text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Platforms */}
          <div className="rounded-xl border border-neutral-800 p-4">
            <h3 className="text-base font-semibold mb-2">Platforms</h3>
            {safePlatforms.length === 0 ? (
              <p className="text-sm text-neutral-400">No links yet.</p>
            ) : (
              <ul className="space-y-1">
                {safePlatforms.map((p: any, i: number) => (
                  <li key={p?.url ?? i} className="text-sm truncate">
                    <a
                      className="text-sky-400 hover:underline"
                      href={p?.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {p?.label ?? p?.url ?? 'Link'}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Friends */}
          <div className="rounded-xl border border-neutral-800 p-4">
            <h3 className="text-base font-semibold mb-2">Friends</h3>
            {safeFriends.length === 0 ? (
              <p className="text-sm text-neutral-400">No friends yet.</p>
            ) : (
              <div className="space-y-2">
                {safeFriends.map((u: any) => (
                  <UserCard key={u!.id} user={u!} compact />
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
};

export default ProfilePage;
