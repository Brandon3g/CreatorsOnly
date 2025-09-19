import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ICONS } from '../constants';
// FIX: Import NavigationEntry type to correctly type the history entry.
import { User, Feedback, NavigationEntry } from '../types';

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-surface p-4 rounded-lg flex items-center space-x-4">
        <div className="bg-surface-light p-3 rounded-full text-primary">
            {React.cloneElement(icon as React.ReactElement<{ className: string }>, { className: 'h-6 w-6' })}
        </div>
        <div>
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const UserRow: React.FC<{ user: User; onViewProfile: (userId: string) => void }> = ({ user, onViewProfile }) => {
    return (
        <tr className="border-b border-surface-light hover:bg-surface-light/50">
            <td className="p-3">
                <div className="flex items-center space-x-3">
                    <img src={user.avatar || 'https://i.pravatar.cc/150?u=' + user.id} alt={user.name} className="w-10 h-10 rounded-full" />
                    <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-sm text-text-secondary">@{user.username}</p>
                    </div>
                </div>
            </td>
            <td className="p-3 text-text-secondary hidden sm:table-cell">{user.email}</td>
            <td className="p-3 text-text-secondary hidden md:table-cell">{user.friendIds.length}</td>
            <td className="p-3 text-right">
                <button
                    onClick={() => onViewProfile(user.id)}
                    className="text-sm font-semibold text-primary hover:underline"
                >
                    View
                </button>
            </td>
        </tr>
    );
};

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min ago";
    return Math.floor(seconds) + "s ago";
};

const FeedbackCard: React.FC<{ feedbackItem: Feedback; onViewProfile: (userId: string) => void; }> = ({ feedbackItem, onViewProfile }) => {
    const { getUserById } = useAppContext();
    const user = getUserById(feedbackItem.userId);

    if (!user) return null;

    return (
        <div className="bg-surface p-4 rounded-lg">
            <div className="flex items-start space-x-3">
                <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full cursor-pointer"
                    onClick={() => onViewProfile(user.id)}
                />
                <div className="flex-1">
                    <div className="flex items-center space-x-2 text-sm">
                        <span 
                            className="font-bold cursor-pointer hover:underline"
                            onClick={() => onViewProfile(user.id)}
                        >
                            {user.name}
                        </span>
                        <span className="text-text-secondary">@{user.username}</span>
                        <span className="text-text-secondary">·</span>
                        <span className="text-text-secondary">{timeAgo(feedbackItem.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-text-primary whitespace-pre-wrap">{feedbackItem.content}</p>
                </div>
            </div>
        </div>
    );
}

const Admin: React.FC = () => {
    const { users, posts, collaborations, feedback, isMasterUser, navigate, history, goBack, updateCurrentContext } = useAppContext();
    
    // FIX: Explicitly type `currentEntry` as `NavigationEntry` to prevent type inference issues with `context`.
    const currentEntry: NavigationEntry = history.length > 0 ? history[history.length - 1] : { page: 'admin', context: {} };
    const initialTab = (currentEntry.page === 'admin' && currentEntry.context.adminTab) ? currentEntry.context.adminTab : 'dashboard';

    const [activeTab, setActiveTab] = useState<'dashboard' | 'feedback'>(initialTab);
    
    if (!isMasterUser) {
        navigate('feed');
        return null;
    }

    const handleViewProfile = (userId: string) => {
        updateCurrentContext({ adminTab: activeTab });
        navigate('profile', { viewingProfileId: userId });
    };

    const bugs = feedback.filter(f => f.type === 'Bug Report');
    const suggestions = feedback.filter(f => f.type === 'Suggestion');

    const handleTabClick = (tabName: 'dashboard' | 'feedback') => {
        setActiveTab(tabName);
        updateCurrentContext({ adminTab: tabName });
    };

    const TabButton: React.FC<{label: string, tabName: 'dashboard' | 'feedback'}> = ({ label, tabName }) => (
        <button
            onClick={() => handleTabClick(tabName)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === tabName
                ? 'bg-surface text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:bg-surface-light'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <header className="app-header flex items-center space-x-4">
                {history.length > 1 && (
                    <button onClick={goBack} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                        {ICONS.arrowLeft}
                    </button>
                )}
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </header>

            <div className="border-b border-surface-light px-4">
                <nav className="flex space-x-2 -mb-px">
                    <TabButton label="Dashboard" tabName="dashboard" />
                    <TabButton label="Feedback" tabName="feedback" />
                </nav>
            </div>
            
            {activeTab === 'dashboard' && (
                <>
                    <div className="p-4">
                        <h2 className="text-lg font-bold mb-4">Platform Stats</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatCard title="Total Users" value={users.length} icon={ICONS.home} />
                            <StatCard title="Total Posts" value={posts.length} icon={ICONS.collaborations} />
                            <StatCard title="Total Collaborations" value={collaborations.length} icon={ICONS.explore} />
                        </div>
                    </div>

                    <div className="p-4">
                        <h2 className="text-lg font-bold mb-4">User Management</h2>
                        <div className="bg-surface rounded-lg overflow-x-auto">
                            <table className="w-full text-left min-w-full">
                                <thead className="bg-surface-light text-sm text-text-secondary uppercase">
                                    <tr>
                                        <th className="p-3 font-semibold">User</th>
                                        <th className="p-3 font-semibold hidden sm:table-cell">Email</th>
                                        <th className="p-3 font-semibold hidden md:table-cell">Friends</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => <UserRow key={user.id} user={user} onViewProfile={handleViewProfile} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'feedback' && (
                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-lg font-bold mb-4 text-accent-red">Bugs ({bugs.length})</h2>
                        <div className="space-y-4">
                            {bugs.length > 0 ? (
                                bugs.map(bug => <FeedbackCard key={bug.id} feedbackItem={bug} onViewProfile={handleViewProfile} />)
                            ) : (
                                <p className="text-text-secondary">No bug reports submitted.</p>
                            )}
                        </div>
                    </div>
                     <div>
                        <h2 className="text-lg font-bold mb-4 text-accent-green">Suggestions ({suggestions.length})</h2>
                        <div className="space-y-4">
                             {suggestions.length > 0 ? (
                                suggestions.map(suggestion => <FeedbackCard key={suggestion.id} feedbackItem={suggestion} onViewProfile={handleViewProfile} />)
                            ) : (
                                <p className="text-text-secondary">No suggestions submitted.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;