// pages/Profile.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ProfileHeader, { DbProfile } from '../components/ProfileHeader';
import { updateMyProfile, getMyProfile } from '../services/profile';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  // Load auth + profile
  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!isMounted) return;

      setDbUserId(uid);

      if (uid) {
        const p = await getMyProfile(uid);
        if (isMounted) setProfile(p);
      }
      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleEdit() {
    // You can open a modal/sheet here. For now, a quick demo that toggles a suffix:
    if (!dbUserId || !profile) return;
    const patch: Partial<DbProfile> = {
      display_name: profile.display_name
        ? profile.display_name.replace(/\s+\(edited\)$/, '')
        : 'Unnamed',
    };
    patch.display_name = `${patch.display_name} (edited)`;

    const updated = await updateMyProfile(dbUserId, patch);
    setProfile(updated);
  }

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!dbUserId) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>Please sign in to view your profile.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <ProfileHeader profile={profile} canEdit onEditClick={handleEdit} />

      {/* Your posts / tabs can continue here */}
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h2 className="card-title">Your posts</h2>
          <p className="opacity-70">Coming next…</p>
        </div>
      </div>
    </div>
  );
}
