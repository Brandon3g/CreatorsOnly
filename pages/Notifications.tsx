// src/pages/Notifications.tsx
import React, { useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  Notification,
  NotificationType,
  FriendRequestStatus,
} from '../types';
import { ICONS } from '../constants';
import {
  usePullToRefresh,
  PullToRefreshIndicator,
} from '../components/PullToRefresh';
import { useRealtimeContext } from '../context/RealtimeProvider';
import {
  acceptFriendRequest,
  declineFriendRequest,
} from '../services/friendRequests';

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'm';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'min';
  return Math.floor(seconds) + 's';
};

const NotificationItem: React.FC<{ notification: Notification }> = ({
  notification,
}) => {
  const {
    getUserById,
    viewProfile,
    getFriendRequestById,
  } = useAppContext();
  const actor = getUserById(notification.actorId);

  if (!actor) return null;

  const handleActorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    viewProfile(actor.id);
  };

  const handleNotificationClick = () => {
    switch (notification.type) {
      case NotificationType.FRIEND_REQUEST:
      case NotificationType.FRIEND_REQUEST_ACCEPTED:
        viewProfile(notification.actorId);
        break;
      default:
        break;
    }
  };

  const renderContent = () => {
    const actorName = (
      <strong
        onClick={handleActorClick}
        className="cursor-pointer hover:underline"
      >
        {actor.name}
      </strong>
    );

    switch (notification.type) {
      case NotificationType.FRIEND_REQUEST: {
        const request = notification.entityId
          ? getFriendRequestById(notification.entityId)
          : undefined;

        if (request?.status === FriendRequestStatus.ACCEPTED) {
          return <p>You and {actorName} are now friends.</p>;
        }

        if (request?.status === FriendRequestStatus.DECLINED) {
          return <p>You declined {actorName}'s friend request.</p>;
        }

        return (
          <div className="flex-grow">
            <p>{actorName} sent you a friend request.</p>
            <div className="mt-2 space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  acceptFriendRequest(notification.entityId!);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  acceptFriendRequest(notification.entityId!);
                }}
                className="bg-primary hover:bg-primary-hover px-4 py-1 text-sm font-semibold text-white rounded-full"
              >
                Accept
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  declineFriendRequest(notification.entityId!);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  declineFriendRequest(notification.entityId!);
                }}
                className="bg-surface-light hover:bg-surface px-4 py-1 text-sm font-semibold text-text-primary rounded-full"
              >
                Decline
              </button>
            </div>
          </div>
        );
      }
      case NotificationType.FRIEND_REQUEST_ACCEPTED:
        return <p>{notification.message}</p>;
      case NotificationType.COLLAB_REQUEST:
        return <p>{actorName} is interested in your opportunity.</p>;
      case NotificationType.POST_LIKE:
        return <p>{actorName} liked your post.</p>;
      default:
        return <p>{notification.message}</p>;
    }
  };

  return (
    <div
      className="flex items-start space-x-4 p-4 border-b border-surface-light hover:bg-surface-light/50 cursor-pointer"
      onClick={handleNotificationClick}
    >
      <div className="text-primary mt-1">
        {notification.type === NotificationType.FRIEND_REQUEST ||
        notification.type === NotificationType.FRIEND_REQUEST_ACCEPTED
          ? ICONS.plus
          : ICONS.like}
      </div>
      <div className="flex-1">
        <img
          src={actor.avatar}
          alt={actor.name}
          className="w-8 h-8 rounded-full mb-2 cursor-pointer"
          onClick={handleActorClick}
        />
        {renderContent()}
        <p className="text-xs text-text-secondary mt-1">
          {timeAgo(notification.timestamp)}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2.5 h-2.5 bg-primary rounded-full mt-2"></div>
      )}
    </div>
  );
};

const FriendRequestItem: React.FC<{
  requestId: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  me: string;
}> = ({ requestId, senderId, receiverId, status, me }) => {
  const { getUserById, viewProfile } = useAppContext();
  const actor = getUserById(senderId);

  if (!actor) return null;

  const isIncoming = receiverId === me;
  const actorName = (
    <strong
      onClick={() => viewProfile(actor.id)}
      className="cursor-pointer hover:underline"
    >
      {actor.name}
    </strong>
  );

  return (
    <div className="flex items-start space-x-4 p-4 border-b border-surface-light">
      <div className="text-primary mt-1">{ICONS.plus}</div>
      <div className="flex-1">
        {status === FriendRequestStatus.PENDING && isIncoming && (
          <>
            <p>{actorName} sent you a friend request.</p>
            <div className="mt-2 space-x-2">
              <button
                onPointerUp={() => acceptFriendRequest(requestId)}
                className="bg-primary hover:bg-primary-hover px-4 py-1 text-sm font-semibold text-white rounded-full"
              >
                Accept
              </button>
              <button
                onPointerUp={() => declineFriendRequest(requestId)}
                className="bg-surface-light hover:bg-surface px-4 py-1 text-sm font-semibold text-text-primary rounded-full"
              >
                Decline
              </button>
            </div>
          </>
        )}
        {status === FriendRequestStatus.PENDING && !isIncoming && (
          <p>You sent {actorName} a friend request.</p>
        )}
        {status === FriendRequestStatus.ACCEPTED && (
          <p>You and {actorName} are now friends.</p>
        )}
        {status === FriendRequestStatus.DECLINED && (
          <p>You declined {actorName}'s friend request.</p>
        )}
      </div>
    </div>
  );
};

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    currentUser,
    history,
    goBack,
    markNotificationsAsRead,
    refreshData,
  } = useAppContext();
  const { requests, isLoadingRequests } = useRealtimeContext();
  const {
    isRefreshing,
    pullDistance,
    isPulling,
    handlers,
  } = usePullToRefresh({ onRefresh: refreshData });

  const me = currentUser?.id ?? '';

  const userNotifications = useMemo(() => {
    return notifications
      .filter(
        (n) => n.userId === currentUser?.id && n.type !== NotificationType.NEW_MESSAGE
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [notifications, currentUser]);

  useEffect(() => {
    const unreadIds = userNotifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      markNotificationsAsRead(unreadIds);
    }
  }, [userNotifications, markNotificationsAsRead]);

  return (
    <div className="w-full">
      <header className="app-header flex items-center space-x-4">
        {history.length > 1 && (
          <button
            onClick={goBack}
            onTouchEnd={(e) => {
              e.preventDefault();
              goBack();
            }}
            aria-label="Go back"
            className="text-text-secondary hover:text-primary p-2 rounded-full -ml-2"
          >
            {ICONS.arrowLeft}
          </button>
        )}
        <div className="flex-grow">
          <h1 className="text-xl font-bold text-primary lg:hidden">
            CreatorsOnly
          </h1>
          <h1 className="hidden lg:block text-xl font-bold">Notifications</h1>
        </div>
      </header>
      <div className="relative">
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
        />
        <div
          {...handlers}
          style={{
            transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {/* Live friend requests */}
          {isLoadingRequests ? (
            <div className="p-6 text-text-secondary">Loading requests…</div>
          ) : requests.length > 0 ? (
            <div>
              {requests.map((r) => (
                <FriendRequestItem
                  key={r.id}
                  requestId={r.id}
                  senderId={r.sender_id}
                  receiverId={r.receiver_id}
                  status={r.status as FriendRequestStatus}
                  me={me}
                />
              ))}
            </div>
          ) : null}

          {/* Regular app notifications */}
          {userNotifications.length > 0 ? (
            <div>
              {userNotifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-text-secondary">
              <h2 className="text-xl font-bold mb-2">No New Notifications</h2>
              <p>
                When you get likes, friend requests, or other notifications,
                they’ll show up here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
