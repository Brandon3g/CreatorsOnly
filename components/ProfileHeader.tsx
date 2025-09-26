// components/ProfileHeader.tsx
import React from 'react';
import { ICONS } from '../constants';

export type DbProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

type Props = {
  profile: DbProfile | null;
  canEdit?: boolean;
  onEditClick?: () => void;
};

const ProfileHeader: React.FC<Props> = ({ profile, canEdit = false, onEditClick }) => {
  const name = profile?.display_name || 'Unnamed';
  const username = profile?.username ? `@${profile.username}` : '';
  const bio = profile?.bio || '';
  const avatar = profile?.avatar_url || '';
  const banner = profile?.banner_url || '';

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-base-200 shadow">
      {/* Banner */}
      <div className="relative h-40 md:h-56 bg-base-300">
        {banner ? (
          <img
            src={banner}
            alt="Banner"
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-60">
            <ICONS.Image className="w-10 h-10" />
          </div>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-12 left-4">
          <div className="avatar">
            <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 bg-base-100 overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-60">
                  <ICONS.User className="w-10 h-10" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Name / bio / actions */}
      <div className="pt-14 px-4 pb-4 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{name}</h1>
            {username && <div className="text-sm opacity-70">{username}</div>}
          </div>

          {canEdit && (
            <button
              className="btn btn-sm md:btn-md btn-primary"
              onClick={onEditClick}
              type="button"
            >
              <ICONS.Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>

        {bio && <p className="mt-3 text-sm md:text-base whitespace-pre-wrap">{bio}</p>}
      </div>
    </div>
  );
};

export default ProfileHeader;
