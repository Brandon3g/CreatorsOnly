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

/**
 * Lightweight payload type for Supabase realtime
 */
type PgEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimePayload<T = any> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: Exclude<PgEvent, '*'>;
  new: T | null;
  old: T | null;
  errors?: any;
};

type Listener = {
  id: number;
  table?: string;
  event?: PgEvent;
  handler: (payload: RealtimePayload) => void;
  filter?: (payload: RealtimePayload) => boolean;
};

type RealtimeAPI = {
  on: (
    opts: { table?: string; event?: PgEvent; filter?: (p: RealtimePayload) => boolean },
    handler: (payload: RealtimePayload) => void
  ) => () => void;
  useTableTick: (table: string) => number;
  connected: boolean;
};

const RealtimeContext = createContext<RealtimeAPI | null>(null);

export function RealtimeProvider({ children }: PropsWithChildren<{}>) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const nextId = useRef(1);
  const listenersRef = useRef<Map<number, Listener>>(new Map());
  const [connected, setConnected] = useState(false);

  const [tableTicks, setTableTicks] = useState<Record<string, number>>({});

  const bumpTick = useCallback((table: string) => {
    setTableTicks((prev) => ({ ...prev, [table]: (prev[table] ?? 0) + 1 }));
  }, []);

  const dispatch = useCallback(
    (payload: RealtimePayload) => {
      const all = Array.from(listenersRef.current.values());
      for (const l of all) {
        if (l.table && l.table !== payload.table) continue;
        if (l.event && l.event !== '*' && l.event !== payload.eventType) continue;
        if (l.filter && !l.filter(payload)) continue;
        try {
          l.handler(payload);
        } catch (err) {
          console.error('[RealtimeProvider] listener error:', err);
        }
      }
      bumpTick(payload.table);
    },
    [bumpTick]
  );

  useEffect(() => {
    const ch = supabase
      .channel('co-global-realtime', {
        config: { broadcast: { ack: false }, presence: { key: undefined as any } },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload: any) => {
          const p: RealtimePayload = {
            schema: payload.schema,
            table: payload.table,
            commit_timestamp: payload.commit_timestamp,
            eventType: payload.eventType,
            new: payload.new ?? null,
            old: payload.old ?? null,
          };
          dispatch(p);
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status !== 'SUBSCRIBED') {
          console.warn('[RealtimeProvider] channel status:', status);
        }
      });

    channelRef.current = ch;
    return () => {
      try {
        setConnected(false);
        channelRef.current?.unsubscribe();
      } catch {}
      channelRef.current = null;
    };
  }, [dispatch]);

  const on = useCallback<RealtimeAPI['on']>((opts, handler) => {
    const id = nextId.current++;
    listenersRef.current.set(id, {
      id,
      handler,
      table: opts.table,
      event: opts.event,
      filter: opts.filter,
    });
    return () => listenersRef.current.delete(id);
  }, []);

  const useTableTick = useCallback<RealtimeAPI['useTableTick']>(
    (table: string) => {
      const [tick, setTick] = useState(0);
      useEffect(() => {
        setTick((prev) => (prev !== (tableTicks[table] ?? 0) ? tableTicks[table] ?? 0 : prev));
      }, [table, tableTicks[table]]);
      return tick;
    },
    [tableTicks]
  );

  const value = useMemo<RealtimeAPI>(
    () => ({
      on,
      useTableTick,
      connected,
    }),
    [on, useTableTick, connected]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeAPI {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeProvider');
  return ctx;
}

/**
 * Back-compat + data bridge for existing screens (Feed, Notifications, etc.)
 * We provide the old keys expected by pages while enabling the new realtime API.
 */
export function useRealtimeContext(): RealtimeAPI & {
  posts: ReturnType<typeof useAppContext>['posts'];
  profiles: ReturnType<typeof useAppContext>['users'];
  isLoadingPosts: boolean;
  isLoadingProfiles: boolean;

  // ✅ Added for Notifications page compatibility:
  requests: ReturnType<typeof useAppContext>['friendRequests'];
  isLoadingRequests: boolean;
} {
  const api = useRealtime();
  const { posts, users, friendRequests } = useAppContext();

  return {
    ...api,
    posts,
    profiles: users,
    isLoadingPosts: false,
    isLoadingProfiles: false,

    // ✅ New (keeps existing Notifications.tsx working):
    requests: friendRequests,
    isLoadingRequests: false,
  };
}

/**
 * Convenience hook
 */
export function useRealtimeOn(
  opts: { table?: string; event?: PgEvent; filter?: (p: RealtimePayload) => boolean },
  handler: (payload: RealtimePayload) => void
) {
  const { on } = useRealtime();
  useEffect(() => on(opts, handler), [on, opts.table, opts.event, handler, opts.filter]);
}
