import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import ProfileHeader from '../components/ProfileHeader';
import PostCard from '../components/PostCard';
import UserCard from '../components/UserCard';
import CollabCard from '../components/CollabCard';
import { ICONS } from '../constants';
import { NotificationType, User } from '../types';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';

interface ProfileProps {
  userId: string;
  onOpenFeedbackModal: () => void;
}

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    onTouchEnd={(e) => { e.preventDefault(); onClick(); }}
    className={`flex-1 p-4 text-center font-bold transition-colors ${
      isActive ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:bg-surface-light'
    }`}
  >
    {label}
  </button>
);

const Profile: React.FC<ProfileProps> = ({ userId, onOpenFeedbackModal }) => {
  const { getUserById, posts, collaborations, currentUser, navigate, logout, history, goBack, theme, setTheme, notifications, refreshData, toggleBlockUser } = useAppContext();
  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({ onRefresh: refreshData });
  
  const user = getUserById(userId);
  const userPosts = posts.filter(p => p.authorId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const userCollaborations = collaborations.filter(c => c.authorId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'friends' | 'opportunities'>('posts');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  const hasOtherNotifications = notifications.some(n => n.userId === currentUser?.id && n.type !== NotificationType.NEW_MESSAGE && !n.isRead);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        menuToggleRef.current && !menuToggleRef.current.contains(event.target as Node)
        ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);
  
  useEffect(() => {
    setIsEditing(false);
    setActiveTab('posts');
  }, [userId]);

  if (!user || !currentUser) {
    return <div className="p-4 text-center">User not found.</div>;
  }

  const userFriends = user.friendIds
    .map(friendId => getUserById(friendId))
    .filter((friend): friend is User => !!friend)
    .filter(friend => 
        !currentUser.blockedUserIds?.includes(friend.id) && 
        !friend.blockedUserIds?.includes(currentUser.id)
    );
  
  const isBlockedByYou = currentUser.blockedUserIds?.includes(user.id);
  const hasBlockedYou = user.blockedUserIds?.includes(currentUser.id);

  if (hasBlockedYou) {
      return (
          <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
              <h2 className="text-xl font-bold">Profile Unavailable</h2>
              <p className="text-text-secondary mt-2">You can't view this profile.</p>
          </div>
      );
  }

  const handleShareProfile = async () => {
    if (!user) return;
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

  const isCurrentUserProfile = currentUser.id === userId;

  return (
    <div className="w-full">
      <header className="app-header flex items-center space-x-4">
        {history.length > 1 && (
            <button onClick={goBack} onTouchEnd={(e) => { e.preventDefault(); goBack(); }} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                {ICONS.arrowLeft}
            </button>
        )}
        <div className="flex-grow">
            <h1 className="text-xl font-bold text-primary lg:hidden">CreatorsOnly</h1>
            <div className="hidden lg:block">
                <h1 className="text-xl font-bold">{user.name}</h1>
            </div>
        </div>
        <div className="flex-shrink-0 flex md:hidden items-center space-x-4">
            <button onClick={handleShareProfile} onTouchEnd={(e) => { e.preventDefault(); handleShareProfile(); }} aria-label="Share Profile">
              {copied ? ICONS.copy : ICONS.share}
            </button>
            <button onClick={() => navigate('search')} onTouchEnd={(e) => { e.preventDefault(); navigate('search'); }} aria-label="Search">{ICONS.search}</button>
            <button onClick={() => navigate('notifications')} onTouchEnd={(e) => { e.preventDefault(); navigate('notifications'); }} aria-label="Notifications" className="relative">
                {ICONS.notifications}
                {hasOtherNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-red ring-2 ring-background" />}
            </button>
            {isCurrentUserProfile && (
              <div className="relative">
                  <button 
                      ref={menuToggleRef}
                      onClick={() => setIsMobileMenuOpen(prev => !prev)}
                      onTouchEnd={(e) => { e.preventDefault(); setIsMobileMenuOpen(prev => !prev); }}
                      className="text-text-secondary hover:text-text-primary" 
                      aria-label="Settings" 
                      aria-haspopup="true" 
                      aria-expanded={isMobileMenuOpen}
                  >
                      {ICONS.ellipsis}
                  </button>
                  {isMobileMenuOpen && (
                      <div ref={menuRef} className="absolute top-full mt-2 right-0 bg-surface rounded-lg shadow-lg py-1 z-50 w-56">
                           <div className="w-full text-left px-4 py-2 text-sm text-text-primary flex justify-between items-center">
                                <span>Theme</span>
                                <div className={`flex items-center rounded-full p-0.5 bg-background`}>
                                    <button onClick={() => setTheme('light')} onTouchEnd={(e) => { e.preventDefault(); setTheme('light'); }} aria-label="Switch to light theme" className={`p-1 rounded-full ${theme === 'light' ? 'bg-primary text-white' : 'text-text-secondary'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </button>
                                    <button onClick={() => setTheme('dark')} onTouchEnd={(e) => { e.preventDefault(); setTheme('dark'); }} aria-label="Switch to dark theme" className={`p-1 rounded-full ${theme === 'dark' ? 'bg-primary text-white' : 'text-text-secondary'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-surface my-1"></div>
                           <button 
                              onClick={() => { onOpenFeedbackModal(); setIsMobileMenuOpen(false); }}
                              onTouchEnd={(e) => { e.preventDefault(); onOpenFeedbackModal(); setIsMobileMenuOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light"
                          >
                              Send Feedback
                          </button>
                          <button 
                              onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                              onTouchEnd={(e) => { e.preventDefault(); logout(); setIsMobileMenuOpen(false); }}
                              className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light"
                          >
                              Log out @{currentUser.username}
                          </button>
                      </div>
                  )}
              </div>
            )}
        </div>
      </header>
      <div className="relative">
        <PullToRefreshIndicator isRefreshing={isRefreshing} pullDistance={pullDistance} />
        <div
          {...handlers}
          style={{
            transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div key={userId}>
            <ProfileHeader 
              user={user}
              isEditing={isCurrentUserProfile ? isEditing : false}
              setIsEditing={isCurrentUserProfile ? setIsEditing : undefined}
            />
            {isBlockedByYou ? (
              <div className="p-8 text-center border-t border-surface-light">
                  <h2 className="text-lg font-bold">You have blocked @{user.username}</h2>
                  <p className="text-text-secondary my-2">They can't see your profile or contact you.</p>
                  <button
                      onClick={() => toggleBlockUser(user.id)}
                      onTouchEnd={(e) => { e.preventDefault(); toggleBlockUser(user.id); }}
                      className="mt-2 font-bold py-2 px-4 rounded-full border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                      Unblock
                  </button>
              </div>
            ) : (
              <>
                <div className="border-t border-b border-surface-light flex">
                  <TabButton label="Posts" isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
                  <TabButton label="Opportunities" isActive={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} />
                  <TabButton label="Friends" isActive={activeTab === 'friends'} onClick={() => setActiveTab('friends')} />
                </div>
                <div>
                  {activeTab === 'posts' && (
                    <div>
                      {userPosts.length > 0 ? (
                          userPosts.map(post => <PostCard key={post.id} post={post} />)
                      ) : (
                          <p className="p-4 text-text-secondary text-center">@{user.username} hasn't posted yet.</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'opportunities' && (
                     <div>
                      {userCollaborations.length > 0 ? (
                          userCollaborations.map(collab => <CollabCard key={collab.id} collab={collab} />)
                      ) : (
                          <p className="p-4 text-text-secondary text-center">@{user.username} hasn't posted any opportunities yet.</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'friends' && (
                    <div>
                      {userFriends.length > 0 ? (
                          userFriends.map(friend => <UserCard key={friend.id} user={friend} />)
                      ) : (
                          <p className="p-4 text-text-secondary text-center">@{user.username} hasn't added any friends yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;