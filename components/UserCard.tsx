
import React from 'react';
import { User } from '../types';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';

interface UserCardProps {
  user: User;
  variant?: 'follow' | 'default';
}

const UserCard: React.FC<UserCardProps> = ({ user, variant = 'default' }) => {
    const { viewProfile } = useAppContext();

    const handleViewProfile = () => {
        viewProfile(user.id);
    };

  return (
    <div className="flex items-center justify-between w-full hover:bg-surface-light p-3 rounded-lg transition-colors">
      <div className="flex items-center space-x-4 cursor-pointer" onClick={handleViewProfile}>
        <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
        <div>
          <div className="flex items-center space-x-1">
            <p className="font-bold">{user.name}</p>
            {user.isVerified && ICONS.verified}
          </div>
          <p className="text-sm text-text-secondary">@{user.username}</p>
        </div>
      </div>
      {variant === 'follow' && (
        <button className="bg-text-primary text-background font-semibold px-4 py-1 rounded-full text-sm hover:opacity-90 transition-opacity">
          Follow
        </button>
      )}
      {variant === 'default' && (
        <button onClick={handleViewProfile} className="border border-text-secondary text-text-primary font-semibold px-4 py-1 rounded-full text-sm hover:bg-surface-light transition-colors">
          View
        </button>
      )}
    </div>
  );
};

export default UserCard;
