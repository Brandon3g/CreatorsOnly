import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAppContext } from './AppContext';

type RealtimeStatus = 'OPEN' | 'SUBSCRIBED' | 'CLOSED' | 'ERROR';

type RealtimeCtx = {
  // Lightweight subscribe helper:
  //   const off = on('posts', (payload) => { ... })
  //   off() to unsubscribe.
  on: (table: string, handler: (payload: any) => void) => () => void;

  // Pass-through data so consumers never see undefined
  posts: any[];
  profiles: any[];
  requests: any[];
  conversations: any[];
  messages: any[];
  collaborations: any[];
  feedback: any[];
  notifications: any[];

  status: RealtimeStatus;
};

const RealtimeContext = createContext<RealtimeCtx>({
  on: () => () => {},
  posts: [],
  profiles: [],
  requests: [],
  conversations: [],
  messages: [],
  collaborations: [],
  feedback: [],
  notifications: [],
  status: 'CLOSED',
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pull data from AppContext so existing pages keep working
  const {
    posts: appPosts,
    users: appUsers, // a.k.a. profiles
    requests: appRequests,
    conversations: appConversations,
    messages: appMessages,
    collaborations: appCollabs,
    feedback: appFeedback,
    notifications: appNotifications,
  } = useAppContext() as any;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const statusRef = useRef<RealtimeStatus>('CLOSED');

  // Create one shared channel
  useEffect(() => {
    const ch = supabase.channel('co:all');
    channelRef.current = ch;

    const sub = ch.subscribe((status) => {
      statusRef.current = (status as RealtimeStatus) ?? 'CLOSED';
      // Useful trace while we harden things:
      console.log('[RealtimeProvider] channel status:', statusRef.current);
    });

    return () => {
      try {
        ch.unsubscribe();
      } catch (e) {
        console.warn('[RealtimeProvider] unsubscribe error:', e);
      } finally {
        channelRef.current = null;
        statusRef.current = 'CLOSED';
      }
    };
  }, []);

  // Stable subscribe helper
  const on = useMemo(() => {
    return (table: string, handler: (payload: any) => void) => {
      // Ensure we have a channel (in case provider remounts)
      if (!channelRef.current) {
        channelRef.current = supabase.channel('co:all');
        channelRef.current.subscribe((s) => {
          statusRef.current = (s as RealtimeStatus) ?? 'CLOSED';
          console.log('[RealtimeProvider] channel status:', statusRef.current);
        });
      }

      const ch = channelRef.current;

      // Attach listener
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          try {
            handler(payload);
          } catch (err) {
            console.error(`[RealtimeProvider] handler error for ${table}:`, err);
          }
        }
      );

      // Return a narrow "unsubscribe" that just removes this listener group by
      // recreating the channel (Supabase’s JS API doesn’t expose per-listener removal).
      return () => {
        try {
          ch.unsubscribe();
        } catch (e) {
          console.warn('[RealtimeProvider] unsubscribe error:', e);
        } finally {
          // Recreate a fresh channel lazily next time `on(...)` is called.
          channelRef.current = null;
          statusRef.current = 'CLOSED';
        }
      };
    };
  }, []);

  // Always coalesce to arrays so consumers never see undefined
  const value = useMemo<RealtimeCtx>(
    () => ({
      on,
      posts: appPosts ?? [],
      profiles: appUsers ?? [],
      requests: appRequests ?? [],
      conversations: appConversations ?? [],
      messages: appMessages ?? [],
      collaborations: appCollabs ?? [],
      feedback: appFeedback ?? [],
      notifications: appNotifications ?? [],
      status: statusRef.current,
    }),
    [
      on,
      appPosts,
      appUsers,
      appRequests,
      appConversations,
      appMessages,
      appCollabs,
      appFeedback,
      appNotifications,
    ]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
};

export const useRealtimeContext = () => useContext(RealtimeContext);

// Also export default for imports like: import RealtimeProvider from '...'
export default RealtimeProvider;
