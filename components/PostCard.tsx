import React, { useState, useRef, useEffect } from 'react';
import { Post } from '../types';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { getUserById, viewProfile, currentUser, deletePost, getUserByUsername } = useAppContext();
  const author = getUserById(post.authorId);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUser?.id === post.authorId;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!author) return null;
  
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
    const shareUrl = `${window.location.origin}/profile/${author.username}`;
    const shareData = {
      title: `Post by ${author.name} on CreatorsOnly`,
      text: post.content,
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
    const confirmDelete = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
    if (confirmDelete) {
        deletePost(post.id);
    }
    setIsMenuOpen(false);
  };
  
  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            const username = part.substring(1);
            const user = getUserByUsername(username);
            if (user) {
                return (
                    <button
                        key={index}
                        className="text-primary hover:underline"
                        onClick={(e) => {
                            e.stopPropagation();
                            viewProfile(user.id);
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            viewProfile(user.id);
                        }}
                    >
                        {part}
                    </button>
                );
            }
        }
        return part;
    });
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
              <span className="text-text-secondary">{timeAgo(post.timestamp)}</span>
            </div>
            {isAuthor && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} onTouchStart={() => {}} className="text-text-secondary hover:text-text-primary p-1 rounded-full">
                  {ICONS.ellipsis}
                </button>
                {isMenuOpen && (
                  <div className="absolute top-8 right-0 bg-surface-light rounded-md shadow-lg z-10 w-40">
                    <button
                      onClick={handleDelete}
                      onTouchStart={() => {}}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-surface"
                    >
                      Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="mt-1 text-text-primary whitespace-pre-wrap">{renderContentWithMentions(post.content)}</p>
          {post.image && (
            <img src={post.image} alt="Post content" className="mt-3 rounded-2xl border border-surface-light w-full h-auto" />
          )}
          <div className="flex justify-between text-text-secondary mt-4 max-w-sm">
            <button onTouchStart={() => {}} className="flex items-center space-x-2 hover:text-accent-blue transition-colors">
              {ICONS.comment}
              <span>{post.comments}</span>
            </button>
            <button onTouchStart={() => {}} className="flex items-center space-x-2 hover:text-accent-red transition-colors">
              {ICONS.like}
              <span>{post.likes}</span>
            </button>
            <button onClick={handleShare} onTouchStart={() => {}} className="flex items-center space-x-2 hover:text-accent-green transition-colors">
              {copied ? ICONS.copy : ICONS.share}
              <span>{copied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;