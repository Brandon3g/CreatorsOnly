// src/context/RealtimeProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabaseClient';

type ChannelStatus = 'CLOSED' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CONNECTING';

type SubscribeArgs = {
  table: string;
  filter?: { column: string; value: string } | null;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
};

type RealtimeCtx = {
  status: ChannelStatus;
  /**
   * Subscribe to a public table. Returns an unsubscribe() you MUST call on unmount.
   * Example:
   *   const off = subscribeToTable({
   *     table: 'posts',
   *     onInsert: (p) => setPosts((prev) => [p.new, ...prev]),
   *   });
   *   return () => off();
   */
  subscribeToTable: (args: SubscribeArgs) => () => void;
};

const Ctx = createContext<RealtimeCtx>({
  status: 'CLOSED',
  subscribeToTable: () => () => {},
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ChannelStatus>('CLOSED');

  const subscribeToTable = useCallback((args: SubscribeArgs) => {
    const { table, filter, onInsert, onUpdate, onDelete } = args;

    const channel = supabase.channel(
      `realtime:${table}:${Math.random().toString(36).slice(2)}`
    );

    const base = { schema: 'public', table } as const;
    const filt = filter ? { filter: `${filter.column}=eq.${filter.value}` } : {};

    if (onInsert) channel.on('postgres_changes', { ...base, event: 'INSERT', ...filt }, onInsert);
    if (onUpdate) channel.on('postgres_changes', { ...base, event: 'UPDATE', ...filt }, onUpdate);
    if (onDelete) channel.on('postgres_changes', { ...base, event: 'DELETE', ...filt }, onDelete);

    channel.subscribe((s) => {
      // Breadcrumb only; helpful during testing
      console.log('[Realtime] channel status:', s);
      setStatus((s as ChannelStatus) ?? 'CLOSED');
    });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* no-op */
      }
      setStatus('CLOSED');
    };
  }, []);

  const value = useMemo<RealtimeCtx>(() => ({ status, subscribeToTable }), [status, subscribeToTable]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/** New hook name */
export function useRealtime() {
  return useContext(Ctx);
}

/** Back-compat alias for older imports: pages expecting `useRealtimeContext` will keep working */
export function useRealtimeContext() {
  return useContext(Ctx);
}
