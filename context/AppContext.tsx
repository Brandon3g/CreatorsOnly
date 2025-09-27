import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Platform,
  ConversationFolder,
  NotificationType,
  Feedback,
  Page,
  PageContext,
  NavigationEntry,
  FriendRequest,
  FriendRequestStatus,
  PushSubscriptionObject,
} from '../types';
import {
  MOCK_USERS,
  MOCK_POSTS,
  MOCK_NOTIFICATIONS,
  MOCK_CONVERSATIONS,
  MOCK_COLLABORATIONS,
  MASTER_USER_ID,
  MOCK_FEEDBACK,
  MOCK_FRIEND_REQUESTS,
} from '../constants';
import { trackEvent } from '../services/analytics';
import { supabase } from '../lib/supabaseClient';
import {
  buildMessageParticipantFilter,
  subscribeToMessages,
} from '../services/realtime';

type AppContextType = {
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
  conversations: any[];
  notifications: any[];
  sendMessage: (toUserId: string, content: string) => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>(MOCK_CONVERSATIONS);
  const [notifications, setNotifications] = useState<any[]>(MOCK_NOTIFICATIONS);

  const subscriptionRef = useRef<ReturnType<typeof subscribeToMessages> | null>(
    null
  );

  // Handle realtime incoming/outgoing messages
  useEffect(() => {
    if (!currentUserId) return;

    const participantFilter = buildMessageParticipantFilter(currentUserId);

    subscriptionRef.current = subscribeToMessages(
      participantFilter,
      (payload, direction) => {
        console.log(
          `[Realtime] ${direction} message event for ${currentUserId}:`,
          payload
        );
        if (direction === 'inbound') {
          setConversations((prev) => {
            // simple normalization
            return [...prev, payload.new];
          });
        }
      },
      (err) => {
        console.error('[Realtime] Error in message subscription', err);
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        console.log('[Realtime] Message subscription cleaned up');
      }
    };
  }, [currentUserId]);

  const sendMessage = useCallback(
    async (toUserId: string, content: string) => {
      if (!currentUserId) return;
      const { error } = await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: toUserId,
        content,
      });
      if (error) {
        console.error('[Realtime] Failed to send message', error);
      }
    },
    [currentUserId]
  );

  return (
    <AppContext.Provider
      value={{
        currentUserId,
        setCurrentUserId,
        conversations,
        notifications,
        sendMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return ctx;
};
