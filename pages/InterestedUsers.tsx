import React from 'react';
import { useAppContext } from '../context/AppContext';
import UserCard from '../components/UserCard';
import { ICONS } from '../constants';
import { User } from '../types';

const InterestedUsers: React.FC = () => {
    const { collaborations, history, goBack, getUserById, viewingCollaborationId } = useAppContext();

    const collab = collaborations.find(c => c.id === viewingCollaborationId);

    if (!collab) {
        return <div className="p-4 text-center">Opportunity not found.</div>;
    }

    const interestedUsers = collab.interestedUserIds
      .map(id => getUserById(id))
      .filter((user): user is User => !!user);


    return (
        <div>
            <header className="app-header flex items-center space-x-4">
                <button onClick={goBack} onTouchStart={() => {}} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                    {ICONS.arrowLeft}
                </button>
                <div className="flex-grow overflow-hidden">
                    <h1 className="text-xl font-bold">Interested Users</h1>
                    <p className="text-sm text-text-secondary truncate">{collab.title}</p>
                </div>
            </header>
            <div>
                {interestedUsers.length > 0 ? (
                    interestedUsers.map(user => user && <UserCard key={user.id} user={user} />)
                ) : (
                    <p className="p-4 text-text-secondary text-center">No one has expressed interest yet.</p>
                )}
            </div>
        </div>
    );
};

export default InterestedUsers;
