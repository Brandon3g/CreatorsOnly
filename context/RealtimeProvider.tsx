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

/** Postgres change event types we care about */
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
  /**
   * Subscribe to realtime changes.
   * Omit `table` to receive all tables, or set `event` to filter by verb.
   */
  on: (
    opts: {
      table?: string;
      event?: PgEvent;
      filter?: (p: RealtimePayload) => boolean;
    },
    handler: (payload: RealtimePayload) => void
  ) => () => void;

  /** A per-table “tick” that increments whenever we see a change for that table */
  useTableTick: (table: string) => number;

  /** True once the channel is SUBSCRIBED */
  connected: boolean;
};

const RealtimeContext = createContext<RealtimeAPI | null>(null);

export function RealtimeProvider({ children }: PropsWithChildren<{}>) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  const nextId = useRef(1);
  const listenersRef = useRef<Map<number, Listener>>(new Map());
  const [connected, setConnected] = useState(false);
  const [tableTicks, setTableTicks] = useState<Record<string, number>>({});

  const bumpTick = useCallback((table: string) => {
    setTableTicks(prev => ({ ...prev, [table]: (prev[table] ?? 0) + 1 }));
  }, []);

  const dispatch = useCallback(
    (payload: RealtimePayload) => {
      // fan-out to listeners
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

  // Socket-level diagnostics (open/close/error)
  useEffect(() => {
    const offOpen = supabase.realtime.onOpen(() => {
      console.log('[Realtime] socket OPEN');
    });
    const offClose = supabase.realtime.onClose(() => {
      console.warn('[Realtime] socket CLOSED');
    });
    const offError = supabase.realtime.onError((e: any) => {
      console.error('[Realtime] socket ERROR:', e);
    });
    return () => {
      offOpen();
      offClose();
      offError();
    };
  }, []);

  // Subscribe with auto-reconnect
  const establishChannel = useCallback(() => {
    // Clean up any existing channel
    try {
      channelRef.current?.unsubscribe();
    } catch {}
    channelRef.current = null;

    const ch = supabase
      .channel('co-global-realtime') // keep a single global channel
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        const p: RealtimePayload = {
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
          eventType: payload.eventType,
          new: payload.new ?? null,
          old: payload.old ?? null,
        };
        // Debug: first few payloads
        // console.log('[Realtime] change:', p.table, p.eventType, p);
        dispatch(p);
      })
      .subscribe((status) => {
        console.log('[RealtimeProvider] channel status:', status);
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
          // Gentle auto-retry
          if (reconnectTimer.current == null) {
            reconnectTimer.current = window.setTimeout(() => {
              reconnectTimer.current = null;
              establishChannel();
            }, 2000);
          }
        }
      });

    channelRef.current = ch;
  }, [dispatch]);

  useEffect(() => {
    establishChannel();
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      try {
        channelRef.current?.unsubscribe();
      } catch {}
      channelRef.current = null;
      setConnected(false);
    };
  }, [establishChannel]);

  const on = useCallback<RealtimeAPI['on']>((opts, handler) => {
    const id = nextId.current++;
    listenersRef.current.set(id, { id, handler, table: opts.table, event: opts.event, filter: opts.filter });
    return () => listenersRef.current.delete(id);
  }, []);

  const useTableTick = useCallback<RealtimeAPI['useTableTick']>(
    (table: string) => {
      const [tick, setTick] = useState(0);
      useEffect(() => {
        setTick(prev => (prev !== (tableTicks[table] ?? 0) ? tableTicks[table] ?? 0 : prev));
      }, [table, tableTicks[table]]);
      return tick;
    },
    [tableTicks]
  );

  const value = useMemo<RealtimeAPI>(
    () => ({ on, useTableTick, connected }),
    [on, useTableTick, connected]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** Primary hook */
export function useRealtime(): RealtimeAPI {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeProvider');
  return ctx;
}

/**
 * Back-compat bridge for existing screens (Feed, Notifications, etc.).
 * Exposes legacy keys while providing the new realtime API.
 */
export function useRealtimeContext(): RealtimeAPI & {
  posts: ReturnType<typeof useAppContext>['posts'];
  profiles: ReturnType<typeof useAppContext>['users'];
  isLoadingPosts: boolean;
  isLoadingProfiles: boolean;
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
    requests: friendRequests,
    isLoadingRequests: false,
  };
}

/** Convenience hook to register a handler */
export function useRealtimeOn(
  opts: { table?: string; event?: PgEvent; filter?: (p: RealtimePayload) => boolean },
  handler: (payload: RealtimePayload) => void
) {
  const { on } = useRealtime();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => on(opts, handler), [on, opts.table, opts.event, opts.filter, handler]);
}
