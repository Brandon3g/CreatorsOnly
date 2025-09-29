import React, { useState, useEffect, useRef } from 'react';
import { User, Platform, FriendRequestStatus } from '../types';
import { ICONS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { US_COUNTIES_BY_STATE } from '../data/locations';

interface ProfileHeaderProps {
  user: User;
  isEditing?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, isEditing, setIsEditing }) => {
  const {
    currentUser,
    updateUserProfile,
    viewConversation,
    sendFriendRequest,
    cancelFriendRequest,
    getFriendRequest,
    navigate,
    removeFriend,
    toggleBlockUser,
  } = useAppContext();

  const isCurrentUser = currentUser?.id === user.id;
  const [formData, setFormData] = useState<User>(user);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const states = Object.keys(US_COUNTIES_BY_STATE);
  const counties = formData.state ? US_COUNTIES_BY_STATE[formData.state] : [];
  const BIO_LIMIT = 150;

  useEffect(() => {
    if (isEditing) {
      const tempFormData = { ...user };
      const links = [...tempFormData.platformLinks];
      const hasInsta = links.some(l => l.platform === Platform.Instagram);
      const hasTiktok = links.some(l => l.platform === Platform.TikTok);
      if (!hasInsta) links.push({ platform: Platform.Instagram, url: '' });
      if (!hasTiktok) links.push({ platform: Platform.TikTok, url: '' });
      tempFormData.platformLinks = links;
      setFormData(tempFormData);
    } else {
      setFormData(user);
    }
  }, [user, isEditing]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCancel = () => {
    if (setIsEditing) setIsEditing(false);
  };

  // OPTION A: Map UI fields -> DB columns that exist (no banner_url in DB)
  const buildDbPatch = () => {
    return {
      // DB columns only:
      username: formData.username?.trim() || null,
      display_name:
        (formData as any).display_name ??
        (formData.name ? formData.name.trim() : null),
      bio: (formData.bio ?? '').slice(0, BIO_LIMIT),
      // map UI avatar -> DB avatar_url
      avatar_url: formData.avatar || null,
      // NOTE: banner is intentionally NOT sent because DB has no banner_url
    };
  };

  const handleSave = () => {
    const cleanedLinks = formData.platformLinks.filter(link => link.url.trim() !== '');
    setFormData(prev => ({ ...prev, platformLinks: cleanedLinks }));

    // Send only DB-allowed fields
    updateUserProfile(buildDbPatch());

    if (setIsEditing) setIsEditing(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    if (name === 'bio' && value.length > BIO_LIMIT) return;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'avatar' | 'banner'
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          const newImageUrl = event.target.result as string;

          // Update local state for immediate UI feedback
          setFormData(prev => ({ ...prev, [field]: newImageUrl }));

          // If NOT in edit mode, persist immediately (map avatar -> avatar_url; ignore banner)
          if (!isEditing) {
            if (field === 'avatar') {
              updateUserProfile({
                username: user.username,
                display_name: (user as any).display_name ?? user.name ?? null,
                bio: user.bio ?? null,
                avatar_url: newImageUrl,
              });
            }
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setFormData(prev => ({ ...prev, state: newState, county: '' }));
  };

  const handlePlatformLinkChange = (index: number, newUrl: string) => {
    setFormData(prev => {
      const newLinks = [...prev.platformLinks];
      newLinks[index] = { ...newLinks[index], url: newUrl };
      return { ...prev, platformLinks: newLinks };
    });
  };

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
    } catch (error) {
      console.log('Sharing failed, copying to clipboard as a fallback', error);
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const PlatformLink: React.FC<{ platform: Platform; url: string }> = ({ platform, url }) => (
    <a
      key={platform}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-secondary hover:text-primary transition-colors"
      aria-label={platform}
      title={platform}
    >
      {ICONS[platform]}
    </a>
  );

  const handleRemoveFriend = () => {
    if (window.confirm(`Are you sure you want to remove ${user.name} as a friend?`)) {
      removeFriend(user.id);
    }
    setIsMenuOpen(false);
  };

  const handleToggleBlock = () => {
    const isBlocked = currentUser?.blockedUserIds?.includes(user.id);
    if (isBlocked) {
      toggleBlockUser(user.id);
    } else {
      if (
        window.confirm(
          `Block @${user.username}? They will not be able to find your profile, post, or message you.
You will be unfriended.`
        )
      ) {
        toggleBlockUser(user.id);
      }
    }
    setIsMenuOpen(false);
  };

  // … UI below is unchanged except the input handlers and the file inputs call our new mappers …

  const bannerContent = formData.banner ? (
    <div className="w-full h-40 sm:h-48 bg-cover bg-center rounded-2xl" style={{ backgroundImage: `url(${formData.banner})` }} />
  ) : (
    <div className="w-full h-40 sm:h-48 bg-surface-light rounded-2xl flex items-center justify-center text-text-secondary">
      {isCurrentUser && (
        <label className="cursor-pointer flex items-center space-x-2">
          {ICONS.plus} <span>Add Banner Image</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
        </label>
      )}
    </div>
  );

  const avatarContent = formData.avatar ? (
    <img
      src={formData.avatar}
      alt={`${user.username} avatar`}
      className="w-24 h-24 rounded-full border-4 border-background -mt-12 ml-4 object-cover"
    />
  ) : (
    <div className="w-24 h-24 rounded-full border-4 border-background -mt-12 ml-4 bg-surface-light flex items-center justify-center text-text-secondary">
      {isCurrentUser && (
        <label className="cursor-pointer flex items-center space-x-2">
          {ICONS.plus} <span>Add Avatar</span>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
        </label>
      )}
    </div>
  );

  const isBlockedByYou = currentUser?.blockedUserIds?.includes(user.id);

  return (
    <div className="bg-background">
      <div className="relative">
        {bannerContent}
        {avatarContent}

        {isEditing && (
          <>
            {formData.banner && (
              <label className="absolute top-2 right-2 cursor-pointer flex items-center space-x-2">
                {ICONS.camera} <span>Change Banner</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
              </label>
            )}
            {formData.avatar && (
              <label className="absolute -bottom-2 left-28 cursor-pointer flex items-center space-x-2">
                {ICONS.camera} <span>Change Avatar</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
              </label>
            )}
          </>
        )}
      </div>

      <div className="p-4">
        {isCurrentUser ? (
          isEditing ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleCancel();
                }}
                className="font-bold py-2 px-4 rounded-full border border-text-secondary hover:bg-surface-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="font-bold py-2 px-4 rounded-full bg-primary text-white hover:bg-primary-hover transition-opacity"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsEditing && setIsEditing(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsEditing && setIsEditing(true);
              }}
              className="font-bold py-2 px-4 rounded-full border border-text-secondary hover:bg-surface-light transition-colors"
            >
              Edit Profile
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                viewConversation(user.id);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                viewConversation(user.id);
              }}
              className="font-bold py-2 px-4 rounded-full border border-text-secondary hover:bg-surface-light transition-colors"
            >
              Message
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen((prev) => !prev);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setIsMenuOpen((prev) => !prev);
                }}
                className="p-2 rounded-full border border-text-secondary hover:bg-surface-light"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                {React.cloneElement(ICONS.ellipsis as React.ReactElement<{ className: string }>, {
                  className: 'h-5 w-5',
                })}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background border rounded-xl shadow-lg overflow-hidden z-10">
                  {currentUser?.friendIds.includes(user.id) ? (
                    <button
                      onClick={handleRemoveFriend}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                    >
                      Remove Friend
                    </button>
                  ) : (
                    (() => {
                      const friendRequest = getFriendRequest(currentUser!.id, user.id);
                      if (friendRequest && friendRequest.status === FriendRequestStatus.PENDING) {
                        if (friendRequest.fromUserId === currentUser!.id) {
                          return (
                            <button
                              onClick={() => cancelFriendRequest(user.id)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                            >
                              Cancel Request
                            </button>
                          );
                        }
                        return (
                          <button
                            onClick={() => navigate('notifications')}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                          >
                            Respond to Request
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => sendFriendRequest(user.id)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                        >
                          Add Friend
                        </button>
                      );
                    })()
                  )}

                  <button
                    onClick={handleToggleBlock}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                  >
                    {currentUser?.blockedUserIds?.includes(user.id) ? `Unblock @${user.username}` : `Block @${user.username}`}
                  </button>

                  <button
                    onClick={async () => {
                      await handleShareProfile();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                  >
                    {copied ? 'Link Copied!' : 'Share Profile'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3 mt-4">
            <div>
              <label className="text-sm text-text-secondary">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username || ''}
                onChange={handleInputChange}
                className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="relative">
              <label className="text-sm text-text-secondary">Bio</label>
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleInputChange}
                className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
              <span className="absolute bottom-2 right-2 text-xs text-text-secondary">
                {(formData.bio || '').length}/{BIO_LIMIT}
              </span>
            </div>

            <div>
              <label className="text-sm text-text-secondary">Location</label>
              <div className="flex space-x-2">
                <select
                  name="state"
                  value={formData.state || ''}
                  onChange={handleStateChange}
                  className="w-1/2 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select State</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  name="county"
                  value={formData.county || ''}
                  onChange={handleInputChange}
                  className="w-1/2 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!formData.state}
                >
                  <option value="">Select County</option>
                  {counties.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary">Links</label>
              {formData.platformLinks.map((link, index) => (
                <div key={link.platform} className="flex items-center space-x-2 mt-1">
                  <span className="font-semibold w-24 flex items-center">
                    {ICONS[link.platform]} <span className="ml-2">{link.platform}</span>
                  </span>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => handlePlatformLinkChange(index, e.target.value)}
                    className="w-full bg-surface-light p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-semibold w-24 flex items-center">
                  {ICONS.link} <span className="ml-2">Website</span>
                </span>
                <input
                  type="text"
                  name="customLink"
                  placeholder="https://example.com"
                  value={formData.customLink || ''}
                  onChange={handleInputChange}
                  className="w-full bg-surface-light p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              {user.isVerified && ICONS.verified}
            </div>
            <p className="text-text-secondary">@{user.username}</p>
            <p className="mt-4 whitespace-pre-wrap">{user.bio}</p>
          </>
        )}

        {!isEditing && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-text-secondary">
            {user.county && user.state && (
              <div className="flex items-center space-x-1">
                {ICONS.location} <span>{user.county}, {user.state}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {user.platformLinks.map(link => (
                <PlatformLink key={link.platform} platform={link.platform} url={link.url} />
              ))}
              {user.customLink && (
                <a
                  href={user.customLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Website"
                  className="text-text-secondary hover:text-primary transition-colors"
                >
                  {ICONS.link}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
