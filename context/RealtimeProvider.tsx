import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { useAppContext } from './AppContext'; // <- we wait for user/session here
import { subscribeToAppRealtime } from '../services/realtime';

type ChannelStatus = 'INIT' | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'DISCONNECTED';

type LastEvent =
  | {
      table:
        | 'posts'
        | 'profiles'
        | 'notifications'
        | 'messages'
        | 'requests'
        | 'conversations'
        | 'conversation_members'
        | 'feedback'
        | 'collaborations'
        | string;
      type: 'INSERT' | 'UPDATE' | 'DELETE' | string;
      payload?: unknown;
    }
  | null;

export type RealtimeContextValue = {
  status: ChannelStatus;
  lastEvent: LastEvent;
};

const RealtimeCtx = createContext<RealtimeContextValue>({
  status: 'INIT',
  lastEvent: null,
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAppContext(); // <- becomes truthy after login/session loads
  const [status, setStatus] = useState<ChannelStatus>('INIT');
  const [lastEvent, setLastEvent] = useState<LastEvent>(null);

  useEffect(() => {
    // No user/session yet → don’t open a channel.
    if (!user?.id) {
      setStatus('INIT');
      return;
    }

    const { cleanup } = subscribeToAppRealtime({
      onOpen: () => setStatus('SUBSCRIBED'),
      onClose: (s) => setStatus((s as ChannelStatus) ?? 'CLOSED'),

      onPostInsert: (payload) => setLastEvent({ table: 'posts', type: 'INSERT', payload }),
      onPostUpdate: (payload) => setLastEvent({ table: 'posts', type: 'UPDATE', payload }),
      onPostDelete: (payload) => setLastEvent({ table: 'posts', type: 'DELETE', payload }),

      onProfileUpdate: (payload) => setLastEvent({ table: 'profiles', type: 'UPDATE', payload }),

      onNotificationInsert: (payload) =>
        setLastEvent({ table: 'notifications', type: 'INSERT', payload }),
      onNotificationUpdate: (payload) =>
        setLastEvent({ table: 'notifications', type: 'UPDATE', payload }),
      onNotificationDelete: (payload) =>
        setLastEvent({ table: 'notifications', type: 'DELETE', payload }),

      onMessageInsert: (payload) => setLastEvent({ table: 'messages', type: 'INSERT', payload }),
      onRequestInsert: (payload) => setLastEvent({ table: 'requests', type: 'INSERT', payload }),
      onConversationInsert: (payload) =>
        setLastEvent({ table: 'conversations', type: 'INSERT', payload }),
      onConversationMemberInsert: (payload) =>
        setLastEvent({ table: 'conversation_members', type: 'INSERT', payload }),
      onFeedbackInsert: (payload) => setLastEvent({ table: 'feedback', type: 'INSERT', payload }),
      onCollaborationInsert: (payload) =>
        setLastEvent({ table: 'collaborations', type: 'INSERT', payload }),
    });

    return () => cleanup();
  }, [user?.id]);

  const value = useMemo(() => ({ status, lastEvent }), [status, lastEvent]);

  return <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>;
}

export function useRealtimeContext() {
  return useContext(RealtimeCtx);
}
