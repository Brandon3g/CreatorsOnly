import React from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
import UserCard from './UserCard';

const RightSidebar: React.FC = () => {
    const { users, currentUser, navigate, isMasterUser } = useAppContext();

    if (!currentUser) return null;

    // If master user, suggest everyone. Otherwise, suggest users who are not the current user and not already friends.
    const suggestedUsers = (isMasterUser ? 
        users.filter(user => user.id !== currentUser.id) 
        : users.filter(user => user.id !== currentUser.id && !currentUser.friendIds.includes(user.id))
    )
    .filter(user => !currentUser.blockedUserIds?.includes(user.id) && !user.blockedUserIds?.includes(currentUser.id))
    .slice(0, 3);

    return (
        <div className="sticky top-0 h-screen py-4 pr-4">
            <div className="mb-6">
                <button
                    onClick={() => navigate('search')}
                    aria-label="Search"
                    className="p-3 bg-surface-light rounded-full text-text-secondary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {ICONS.search}
                </button>
            </div>

            <div className="bg-surface rounded-2xl p-4">
                <h2 className="text-xl font-bold mb-4">Who to Follow</h2>
                <div className="space-y-4">
                    {suggestedUsers.map(user => (
                        <UserCard key={user.id} user={user} variant="follow" />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;