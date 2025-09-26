// context/RealtimeProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppContext } from './AppContext';

type RealtimeContextValue = {
  /** True when the multiplexed channel is SUBSCRIBED */
  isConnected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const useRealtimeContext = (): RealtimeContextValue => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  return ctx;
};

const log = (...args: any[]) => console.log('[RealtimeProvider]', ...args);

/**
 * RealtimeProvider
 * - Opens a single multiplexed channel ("co-bus") for all tables we care about
 * - Logs channel status transitions (OPENING/SUBSCRIBED/CLOSED/ERRORED)
 * - Cleans up on unmount or user change
 */
const RealtimeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { user } = useAppContext();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleChange = useCallback((payload: any, label: string) => {
    log(`${label}:`, payload?.eventType, payload?.table, payload);
    // NOTE: components can still fetch or react to changes on their own;
    // we keep the provider thin and reliable.
  }, []);

  const subscribeAll = useCallback(() => {
    // Tear down any previous channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel('co-bus'); // multiplexed channel

    // Tables to listen to
    const tables: Array<{ table: string; label: string }> = [
      { table: 'profiles', label: 'profiles' },
      { table: 'posts', label: 'posts' },
      { table: 'requests', label: 'requests' },
      { table: 'conversations', label: 'conversations' },
      { table: 'conversation_members', label: 'conversation_members' },
      { table: 'messages', label: 'messages' },
      { table: 'collaborations', label: 'collaborations' },
      { table: 'feedback', label: 'feedback' },
      { table: 'notifications', label: 'notifications' },
    ];

    tables.forEach(({ table, label }) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => handleChange(payload, label),
      );
    });

    // Channel lifecycle
    channel.on('status_changed', (status: string) => {
      log(`channel status: ${status}`);
      setIsConnected(status === 'SUBSCRIBED');
    });

    channel.subscribe((status) => {
      log('subscribe callback status:', status);
    });

    channelRef.current = channel;
  }, [handleChange]);

  useEffect(() => {
    if (!user) {
      // Logged out: ensure channel is removed
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Logged in: open channel
    subscribeAll();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user, subscribeAll]);

  const value = useMemo<RealtimeContextValue>(() => ({ isConnected }), [isConnected]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export default RealtimeProvider;
export { RealtimeContext };
