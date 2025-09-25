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

/**
 * Types from @supabase/supabase-js v2 for Postgres Changes payload.
 * We inline a lightweight shape to avoid tight coupling to internal types.
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

/**
 * Listener registration
 */
type Listener = {
  id: number;
  table?: string;              // optional table filter
  event?: PgEvent;             // optional event filter
  handler: (payload: RealtimePayload) => void;
  filter?: (payload: RealtimePayload) => boolean; // optional custom predicate
};

type RealtimeAPI = {
  /**
   * Subscribe to realtime changes.
   * Example:
   *  on({ table: 'posts', event: 'INSERT' }, (p) => { ... })
   */
  on: (
    opts: { table?: string; event?: PgEvent; filter?: (p: RealtimePayload) => boolean },
    handler: (payload: RealtimePayload) => void
  ) => () => void;

  /**
   * A simple refetch signal. Returns a number that bumps when that table changes.
   * Usage: const tick = useTableTick('posts'); useEffect(() => refetch(), [tick]);
   */
  useTableTick: (table: string) => number;

  /**
   * Whether the single global channel is currently subscribed.
   */
  connected: boolean;
};

const RealtimeContext = createContext<RealtimeAPI | null>(null);

/**
 * RealtimeProvider
 * Subscribes once to all public schema changes and fan-outs payloads to listeners.
 */
export function RealtimeProvider({ children }: PropsWithChildren<{}>) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const nextId = useRef(1);
  const listenersRef = useRef<Map<number, Listener>>(new Map());
  const [connected, setConnected] = useState(false);

  // Per-table tick counters so views can "refetch on change" without bespoke handlers.
  const [tableTicks, setTableTicks] = useState<Record<string, number>>({});

  const bumpTick = useCallback((table: string) => {
    setTableTicks((prev) => ({ ...prev, [table]: (prev[table] ?? 0) + 1 }));
  }, []);

  const dispatch = useCallback(
    (payload: RealtimePayload) => {
      // Fan out to registered listeners (copy to array to be safe during iteration).
      const all = Array.from(listenersRef.current.values());
      for (const l of all) {
        if (l.table && l.table !== payload.table) continue;
        if (l.event && l.event !== '*' && l.event !== payload.eventType) continue;
        if (l.filter && !l.filter(payload)) continue;
        try {
          l.handler(payload);
        } catch (err) {
          // Avoid breaking the bus if a listener throws
          console.error('[RealtimeProvider] listener error:', err);
        }
      }
      // Always bump the table tick so components can refetch easily.
      bumpTick(payload.table);
    },
    [bumpTick]
  );

  // Establish single global channel
  useEffect(() => {
    const ch = supabase
      .channel('co-global-realtime', {
        config: {
          broadcast: { ack: false },
          presence: { key: undefined as any },
        },
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' }, // <-- all public tables, all events
        (payload: any) => {
          // Normalize to our payload shape
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
        // status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'
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
    const l: Listener = { id, handler, table: opts.table, event: opts.event, filter: opts.filter };
    listenersRef.current.set(id, l);
    // Return unsubscribe
    return () => {
      listenersRef.current.delete(id);
    };
  }, []);

  const useTableTick = useCallback<RealtimeAPI['useTableTick']>(
    (table: string) => {
      // We want components to re-render when a single table's tick changes.
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

/**
 * Hook to consume the realtime API
 */
export function useRealtime(): RealtimeAPI {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return ctx;
}

/**
 * Back-compat alias for existing code that imports `useRealtimeContext`.
 * (Maps to the new `useRealtime`.)
 */
export function useRealtimeContext(): RealtimeAPI {
  return useRealtime();
}

/**
 * Convenience hook: subscribe within a component lifecycle.
 * Example:
 *   useRealtimeOn({ table: 'posts', event: 'INSERT' }, (p) => { ... })
 */
export function useRealtimeOn(
  opts: { table?: string; event?: PgEvent; filter?: (p: RealtimePayload) => boolean },
  handler: (payload: RealtimePayload) => void
) {
  const { on } = useRealtime();
  useEffect(() => on(opts, handler), [on, opts.table, opts.event, handler, opts.filter]);
}
