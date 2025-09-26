// components/ProfileHeader.tsx
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { updateMyProfile } from '../services/profile';

type Props = {
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  } | null;
  onProfileUpdated?: (p: any) => void; // parent can lift state
};

const ProfileHeader: React.FC<Props> = ({ profile, onProfileUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return null;
  }

  const onSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        display_name: displayName,
        bio,
      });
      onProfileUpdated?.(updated);
      setEditing(false);
    } catch (e: any) {
      console.error('[ProfileHeader] update failed', e);
      setError(e?.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Banner + avatar omitted for brevity; keep your existing markup */}
      <div className="flex items-center justify-between mt-4">
        {!editing ? (
          <>
            <div>
              <div className="text-xl font-semibold">{profile.display_name ?? '—'}</div>
              <div className="text-sm text-neutral-content/70">@{profile.username ?? '—'}</div>
            </div>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => { setDisplayName(profile.display_name ?? ''); setBio(profile.bio ?? ''); setEditing(true); }}
            >
              Edit Profile
            </button>
          </>
        ) : (
          <div className="w-full max-w-xl">
            <label className="label"><span className="label-text">Name</span></label>
            <input
              className="input input-bordered w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <label className="label mt-3"><span className="label-text">Bio</span></label>
            <textarea
              className="textarea textarea-bordered w-full"
              value={bio ?? ''}
              onChange={(e) => setBio(e.target.value)}
            />
            {error && <div className="mt-3 text-error">{error}</div>}
            <div className="mt-4 flex gap-2">
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
