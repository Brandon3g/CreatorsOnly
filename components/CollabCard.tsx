import React, { useState, useRef, useEffect } from 'react';
import { Collaboration, User } from '../types';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';

interface CollabCardProps {
  collab: Collaboration;
}

const CollabCard: React.FC<CollabCardProps> = ({ collab }) => {
  const { getUserById, viewProfile, currentUser, toggleCollaborationInterest, setEditingCollaborationId, deleteCollaboration, updateCollaboration, navigate } = useAppContext();
  const author = getUserById(collab.authorId);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!author || !currentUser) return null;

  const isAuthor = currentUser.id === collab.authorId;
  const isInterested = collab.interestedUserIds.includes(currentUser.id);
  const interestedUsers = collab.interestedUserIds.map(id => getUserById(id)).filter(Boolean) as User[];
  const MAX_AVATARS_SHOWN = 4;

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return Math.floor(seconds) + "s";
  };
  
  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: `Opportunity on CreatorsOnly: ${collab.title}`,
      text: `${author.name} is looking for collaborators for a new opportunity: "${collab.title}"`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      console.error('Share failed:', err);
      navigator.clipboard.writeText(shareData.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) {
        deleteCollaboration(collab.id);
    }
    setIsMenuOpen(false);
  };

  const handleToggleStatus = () => {
    const newStatus = collab.status === 'open' ? 'closed' : 'open';
    updateCollaboration({ ...collab, status: newStatus });
    setIsMenuOpen(false);
  };

  const handleEdit = () => {
    setEditingCollaborationId(collab.id);
    setIsMenuOpen(false);
  };

  const handleInterestedUsersClick = () => {
    navigate('interestedUsers', { viewingCollaborationId: collab.id });
  };

  return (
    <div className="bg-surface p-4 border-b border-surface-light">
      <div className="flex items-start space-x-4">
        <img
          src={author.avatar}
          alt={author.name}
          className="w-12 h-12 rounded-full cursor-pointer"
          onClick={() => viewProfile(author.id)}
          onTouchStart={() => viewProfile(author.id)}
        />
        <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3
                  className="font-bold cursor-pointer hover:underline"
                  onClick={() => viewProfile(author.id)}
                  onTouchStart={() => viewProfile(author.id)}
                >
                  {author.name}
                </h3>
                {author.isVerified && ICONS.verified}
                <span className="text-text-secondary">@{author.username}</span>
                <span className="text-text-secondary">·</span>
                <span className="text-text-secondary">{timeAgo(collab.timestamp)}</span>
              </div>
              {isAuthor && (
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} onTouchStart={() => {}} className="text-text-secondary hover:text-text-primary p-1 rounded-full">
                        {ICONS.ellipsis}
                    </button>
                    {isMenuOpen && (
                        <div className="absolute top-8 right-0 bg-surface rounded-md shadow-lg z-10 w-48 py-1 border border-surface-light">
                            <button onClick={handleEdit} onTouchStart={handleEdit} className="flex items-center w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light">Edit Opportunity</button>
                            <button onClick={handleToggleStatus} onTouchStart={handleToggleStatus} className="flex items-center w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light">
                                {collab.status === 'open' ? 'Close Opportunity' : 'Reopen Opportunity'}
                            </button>
                            <div className="border-t border-surface-light my-1"></div>
                            <button onClick={handleDelete} onTouchStart={handleDelete} className="flex items-center w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-surface-light">Delete Opportunity</button>
                        </div>
                    )}
                </div>
              )}
            </div>
          <h2 className="mt-2 text-lg font-bold text-text-primary">{collab.title}</h2>
          <p className="mt-1 text-text-primary whitespace-pre-wrap">{collab.description}</p>
          {collab.image && (
            <img src={collab.image} alt="Opportunity image" className="mt-3 rounded-2xl border border-surface-light w-full h-auto" />
          )}
          <div className="flex justify-between items-center text-text-secondary mt-4">
            <div className="flex items-center space-x-4">
                <button
                    onClick={() => toggleCollaborationInterest(collab.id)}
                    onTouchStart={() => {}}
                    className={`text-sm font-bold py-2 px-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isInterested
                            ? 'bg-transparent border border-primary text-primary'
                            : 'bg-primary text-white hover:bg-primary-hover'
                    }`}
                    disabled={collab.status === 'closed' || isAuthor}
                >
                    {isAuthor
                        ? "Your Opportunity"
                        : (collab.status === 'open' ? (isInterested ? "Interested" : "I'm Interested") : 'Closed')
                    }
                </button>
                 {isAuthor && interestedUsers.length > 0 ? (
                    <button onClick={handleInterestedUsersClick} onTouchStart={handleInterestedUsersClick} className="flex items-center group">
                        <div className="flex items-center -space-x-2" title={`${interestedUsers.map(u => u.name).join(', ')} are interested.`}>
                            {interestedUsers.slice(0, MAX_AVATARS_SHOWN).map(user => (
                                <img
                                    key={user.id}
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full border-2 border-surface"
                                />
                            ))}
                            {interestedUsers.length > MAX_AVATARS_SHOWN && (
                                <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-xs font-bold text-text-secondary border-2 border-surface">
                                    +{interestedUsers.length - MAX_AVATARS_SHOWN}
                                </div>
                            )}
                        </div>
                         <span className="text-sm font-semibold ml-2 text-text-secondary group-hover:text-primary group-hover:underline">
                            {interestedUsers.length} interested
                        </span>
                    </button>
                ) : (
                    !isAuthor && collab.interestedUserIds.length > 0 && (
                        <span className="text-sm font-semibold">{collab.interestedUserIds.length} interested</span>
                    )
                )}
            </div>
             <div className="flex items-center space-x-4">
                <button onClick={handleShare} onTouchStart={() => {}} className="flex items-center space-x-2 hover:text-accent-green transition-colors">
                  {copied ? ICONS.copy : ICONS.share}
                  <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
                </button>
                 {collab.status === 'open' ? 
                    <span className="text-xs font-semibold uppercase text-accent-green">Open</span> :
                    <span className="text-xs font-semibold uppercase text-accent-red">Closed</span>
                }
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollabCard;