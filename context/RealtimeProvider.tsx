// src/context/RealtimeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

type ChannelStatus = 'CLOSED' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CONNECTING';

type SubscribeArgs = {
  table: string;
  filter?: { column: string; value: string } | null;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
};

type CtxShape = {
  status: ChannelStatus;
  subscribeToTable: (args: SubscribeArgs) => () => void; // returns an unsubscribe()
};

const Ctx = createContext<CtxShape>({
  status: 'CLOSED',
  subscribeToTable: () => () => {},
});

export const useRealtime = () => useContext(Ctx);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ChannelStatus>('CLOSED');

  // generic table subscription helper
  const subscribeToTable = useCallback((args: SubscribeArgs) => {
    const { table, filter, onInsert, onUpdate, onDelete } = args;

    const channel = supabase.channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`);

    const base = { schema: 'public', table } as any;
    const filt = filter ? { filter: `${filter.column}=eq.${filter.value}` } : {};

    if (onInsert) channel.on('postgres_changes', { ...base, event: 'INSERT', ...filt }, onInsert);
    if (onUpdate) channel.on('postgres_changes', { ...base, event: 'UPDATE', ...filt }, onUpdate);
    if (onDelete) channel.on('postgres_changes', { ...base, event: 'DELETE', ...filt }, onDelete);

    channel.subscribe((s) => {
      // Helpful console breadcrumb only
      console.log('[Realtime] channel status:', s);
      setStatus((s as ChannelStatus) ?? 'CLOSED');
    });

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      setStatus('CLOSED');
    };
  }, []);

  const value = useMemo(() => ({ status, subscribeToTable }), [status, subscribeToTable]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
