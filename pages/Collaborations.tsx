import React from 'react';
import { useAppContext } from '../context/AppContext';
import CollabCard from '../components/CollabCard';
import { ICONS } from '../constants';
import { NotificationType } from '../types';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';

interface CollaborationsProps {
  openCreateModal?: (tab?: 'post' | 'project') => void;
}

const Collaborations: React.FC<CollaborationsProps> = ({ openCreateModal }) => {
  const { collaborations, currentUser, navigate, history, goBack, notifications, refreshData } = useAppContext();
  const { isRefreshing, pullDistance, isPulling, handlers } = usePullToRefresh({ onRefresh: refreshData });

  const hasOtherNotifications = notifications.some(n => n.userId === currentUser?.id && n.type !== NotificationType.NEW_MESSAGE && !n.isRead);

  const handlePostProjectClick = () => {
    if (openCreateModal) {
      openCreateModal('project');
    }
  };

  return (
    <div className="w-full">
       <header className="app-header flex items-center space-x-4">
        {history.length > 1 && (
            <button onClick={goBack} onTouchEnd={(e) => { e.preventDefault(); goBack(); }} aria-label="Go back" className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2">
                {ICONS.arrowLeft}
            </button>
        )}
        <div className="flex-grow flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold text-primary lg:hidden">Opportunities</h1>
                <h1 className="hidden lg:block text-xl font-bold">Opportunity Board</h1>
            </div>
             <div className="flex items-center space-x-4">
                <button 
                    onClick={handlePostProjectClick}
                    onTouchEnd={(e) => { e.preventDefault(); handlePostProjectClick(); }}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-full text-sm flex items-center justify-center"
                    style={{ minWidth: '40px', minHeight: '40px' }} // Ensure tap target size
                >
                    <span className="hidden sm:inline">Post an Opportunity</span>
                    <div className="sm:hidden">{ICONS.plus}</div>
                </button>
                 <div className="flex md:hidden items-center space-x-4">
                    <button onClick={() => navigate('search')} onTouchEnd={(e) => { e.preventDefault(); navigate('search'); }} aria-label="Search">{ICONS.search}</button>
                    <button onClick={() => navigate('notifications')} onTouchEnd={(e) => { e.preventDefault(); navigate('notifications'); }} aria-label="Notifications" className="relative">
                        {ICONS.notifications}
                        {hasOtherNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-accent-red ring-2 ring-background" />}
                    </button>
                </div>
            </div>
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
          <div>
            {collaborations.map(collab => (
              <CollabCard key={collab.id} collab={collab} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Collaborations;