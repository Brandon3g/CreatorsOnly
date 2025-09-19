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
    const { currentUser, updateUserProfile, viewConversation, sendFriendRequest, cancelFriendRequest, getFriendRequest, navigate, removeFriend, toggleBlockUser } = useAppContext();
    const isCurrentUser = currentUser?.id === user.id;

    const [formData, setFormData] = useState<User>(user);
    const [copied, setCopied] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const states = Object.keys(US_COUNTIES_BY_STATE);
    const counties = formData.state ? US_COUNTIES_BY_STATE[formData.state] : [];
    const BIO_LIMIT = 150;

    useEffect(() => {
        if (isEditing) {
            const tempFormData = { ...user };
            const links = [...tempFormData.platformLinks];
            
            const hasInsta = links.some(l => l.platform === Platform.Instagram);
            const hasTiktok = links.some(l => l.platform === Platform.TikTok);

            if (!hasInsta) {
                links.push({ platform: Platform.Instagram, url: '' });
            }
            if (!hasTiktok) {
                links.push({ platform: Platform.TikTok, url: '' });
            }
            
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
        if(setIsEditing) setIsEditing(false);
    };

    const handleSave = () => {
        const cleanedFormData = {
            ...formData,
            platformLinks: formData.platformLinks.filter(link => link.url.trim() !== '')
        };
        updateUserProfile(cleanedFormData);
        if(setIsEditing) setIsEditing(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'bio' && value.length > BIO_LIMIT) {
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'banner') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const newImageUrl = event.target.result as string;
                    // Update local state for immediate UI feedback
                    setFormData(prev => ({ ...prev, [field]: newImageUrl }));

                    // If the user is NOT in the 'Edit Profile' form, this is a direct
                    // action to add a missing image, so we save it immediately.
                    if (!isEditing) {
                        // We create the updated object from the original `user` prop
                        // to ensure we only save this single change.
                        const updatedUser = { ...user, [field]: newImageUrl };
                        updateUserProfile(updatedUser);
                    }
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newState = e.target.value;
        setFormData(prev => ({
            ...prev,
            state: newState,
            county: '', // Reset county when state changes
        }));
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
            console.log("Sharing failed, copying to clipboard as a fallback", error);
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const PlatformLink: React.FC<{ platform: Platform; url: string }> = ({ platform, url }) => (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary transition-colors">
            {ICONS[platform]}
        </a>
    );

    const handleRemoveFriend = () => {
        if(window.confirm(`Are you sure you want to remove ${user.name} as a friend?`)) {
            removeFriend(user.id);
        }
        setIsMenuOpen(false);
    };

    const handleToggleBlock = () => {
        const isBlocked = currentUser?.blockedUserIds?.includes(user.id);
        if (isBlocked) {
            toggleBlockUser(user.id);
        } else {
            if (window.confirm(`Block @${user.username}? They will not be able to find your profile, post, or message you. You will be unfriended.`)) {
                toggleBlockUser(user.id);
            }
        }
        setIsMenuOpen(false);
    };

    const getFriendshipButton = () => {
        if (!currentUser || isCurrentUser) return null;

        const friendRequest = getFriendRequest(currentUser.id, user.id);
        if (friendRequest && friendRequest.status === FriendRequestStatus.PENDING) {
            if (friendRequest.fromUserId === currentUser.id) {
                return (
                    <button 
                        onClick={() => { cancelFriendRequest(user.id); setIsMenuOpen(false); }}
                        onTouchEnd={(e) => { e.preventDefault(); cancelFriendRequest(user.id); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                    >
                        Cancel Request
                    </button>
                );
            } else {
                 return (
                    <button 
                        onClick={() => { navigate('notifications'); setIsMenuOpen(false); }}
                        onTouchEnd={(e) => { e.preventDefault(); navigate('notifications'); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
                    >
                        Respond to Request
                    </button>
                );
            }
        }
        
        return (
            <button 
                onClick={() => { sendFriendRequest(user.id); setIsMenuOpen(false); }}
                onTouchEnd={(e) => { e.preventDefault(); sendFriendRequest(user.id); setIsMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light"
            >
                Add Friend
            </button>
        );
    };
    
    const bannerContent = formData.banner ? (
        <img src={formData.banner} alt={`${user.name}'s banner`} className="w-full h-48 object-cover" />
    ) : (
        <div className="w-full h-48 bg-surface-light flex items-center justify-center">
            {isCurrentUser && (
                <label className="cursor-pointer text-text-secondary flex flex-col items-center">
                    {ICONS.plus}
                    <span className="font-bold text-sm mt-1">Add Banner Image</span>
                    <input type="file" name="banner" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
                </label>
            )}
        </div>
    );
    
    const avatarContent = formData.avatar ? (
        <img
          src={formData.avatar}
          alt={user.name}
          className="absolute bottom-0 left-4 translate-y-1/2 w-32 h-32 rounded-full border-4 border-background object-cover"
        />
    ) : (
        <div className="absolute bottom-0 left-4 translate-y-1/2 w-32 h-32 rounded-full border-4 border-background bg-surface-light flex items-center justify-center">
             {isCurrentUser && (
                 <label className="cursor-pointer text-text-secondary text-center flex flex-col items-center">
                    {ICONS.plus}
                    <span className="font-bold text-xs mt-1">Add Avatar</span>
                    <input type="file" name="avatar" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                </label>
             )}
        </div>
    );

    const isBlockedByYou = currentUser?.blockedUserIds?.includes(user.id);

  return (
    <div>
      <div className="relative">
        {bannerContent}
        {avatarContent}
        
        {isEditing && (
            <>
                {formData.banner && (
                    <div className="absolute top-0 left-0 w-full h-48 bg-black/50 flex items-center justify-center p-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <label className="cursor-pointer text-white flex flex-col items-center">
                            {ICONS.camera}
                            <span className="font-bold text-sm mt-1">Change Banner</span>
                            <input type="file" name="banner" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
                        </label>
                    </div>
                )}
                {formData.avatar && (
                    <div className="absolute bottom-0 left-4 translate-y-1/2 w-32 h-32 rounded-full bg-black/50 flex items-center justify-center p-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <label className="cursor-pointer text-white text-center flex flex-col items-center">
                            {ICONS.camera}
                            <span className="font-bold text-xs mt-1">Change Avatar</span>
                            <input type="file" name="avatar" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                        </label>
                    </div>
                )}
            </>
        )}
      </div>
      <div className="flex justify-end p-4">
        {isCurrentUser ? (
            isEditing ? (
                 <div className="flex space-x-2">
                    <button onClick={handleCancel} onTouchEnd={(e) => { e.preventDefault(); handleCancel(); }} className="font-bold py-2 px-4 rounded-full border border-text-secondary hover:bg-surface-light transition-colors">Cancel</button>
                    <button onClick={handleSave} onTouchEnd={(e) => { e.preventDefault(); handleSave(); }} className="font-bold py-2 px-4 rounded-full bg-primary text-white hover:bg-primary-hover transition-opacity">Save Changes</button>
                 </div>
            ) : (
                <button onClick={() => setIsEditing && setIsEditing(true)} onTouchEnd={(e) => { e.preventDefault(); setIsEditing && setIsEditing(true); }} className="font-bold py-2 px-4 rounded-full border border-text-secondary hover:bg-surface-light transition-colors">Edit Profile</button>
            )
        ) : (
          <div className="flex items-center space-x-2">
            {!isBlockedByYou && (
                <button onClick={() => viewConversation(user.id)} onTouchEnd={(e) => { e.preventDefault(); viewConversation(user.id); }} className="font-bold py-2 px-4 rounded-full border border-text-secondary hover:bg-surface-light transition-colors">Message</button>
            )}
             <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsMenuOpen(prev => !prev)} 
                    onTouchEnd={(e) => { e.preventDefault(); setIsMenuOpen(prev => !prev); }}
                    className="p-2 rounded-full border border-text-secondary hover:bg-surface-light"
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                >
                    {React.cloneElement(ICONS.ellipsis as React.ReactElement<{ className: string }>, { className: 'h-5 w-5' })}
                </button>
                {isMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-surface rounded-lg shadow-lg z-20 border border-surface-light py-1">
                        {isBlockedByYou ? (
                            <button onClick={handleToggleBlock} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light">Unblock @{user.username}</button>
                        ) : (
                            <>
                                {currentUser?.friendIds.includes(user.id) ? (
                                    <button onClick={handleRemoveFriend} className="w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-surface-light">Remove Friend</button>
                                ) : getFriendshipButton()}
                                <div className="border-t border-surface-light my-1"></div>
                                <button onClick={handleToggleBlock} className="w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-surface-light">Block @{user.username}</button>
                            </>
                        )}
                        <div className="border-t border-surface-light my-1"></div>
                        <button onClick={handleShareProfile} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-light flex items-center space-x-2">
                            {copied ? ICONS.copy : ICONS.share}
                            <span>{copied ? 'Link Copied!' : 'Share Profile'}</span>
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 pt-0">
        {isEditing ? (
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-text-secondary">Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                    <label className="text-sm text-text-secondary">Username</label>
                    <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                 <div className="relative">
                    <label className="text-sm text-text-secondary">Bio</label>
                    <textarea name="bio" value={formData.bio} onChange={handleInputChange} className="w-full bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" rows={4}/>
                    <span className="absolute bottom-2 right-2 text-xs text-text-secondary">{formData.bio.length}/{BIO_LIMIT}</span>
                </div>
                <div>
                    <label className="text-sm text-text-secondary">Location</label>
                    <div className="flex space-x-2">
                        <select name="state" value={formData.state || ''} onChange={handleStateChange} className="w-1/2 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">Select State</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                         <select name="county" value={formData.county || ''} onChange={handleInputChange} className="w-1/2 bg-surface-light p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" disabled={!formData.state}>
                            <option value="">Select County</option>
                            {counties.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-sm text-text-secondary">Links</label>
                    {formData.platformLinks.map((link, index) => (
                        <div key={link.platform} className="flex items-center space-x-2 mt-1">
                            <span className="font-semibold w-24 flex items-center">{ICONS[link.platform]} <span className="ml-2">{link.platform}</span></span>
                            <input 
                                type="text" 
                                value={link.url} 
                                onChange={(e) => handlePlatformLinkChange(index, e.target.value)}
                                className="w-full bg-surface-light p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    ))}
                     <div className="flex items-center space-x-2 mt-1">
                        <span className="font-semibold w-24 flex items-center">{ICONS.link} <span className="ml-2">Website</span></span>
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
                        {ICONS.location}
                        <span>{user.county}, {user.state}</span>
                     </div>
                )}
                <div className="flex items-center space-x-2">
                    {user.platformLinks.map(link => (
                        <PlatformLink key={link.platform} platform={link.platform} url={link.url} />
                    ))}
                    {user.customLink && (
                        <a href={user.customLink} target="_blank" rel="noopener noreferrer" title="Website" className="text-text-secondary hover:text-primary transition-colors">
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