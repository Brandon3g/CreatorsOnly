// src/services/realtime.ts
import { supabase } from '../lib/supabaseClient';

export type TableHandler = {
  table: string;
  filter?: { column: string; value: string } | null;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
};

// Drop-in helper many parts of the codebase expect.
export function subscribeToTable(opts: TableHandler): () => void {
  const { table, filter, onInsert, onUpdate, onDelete } = opts;

  const channel = supabase.channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`);
  const base = { schema: 'public', table } as any;
  const filt = filter ? { filter: `${filter.column}=eq.${filter.value}` } : {};

  if (onInsert) channel.on('postgres_changes', { ...base, event: 'INSERT', ...filt }, onInsert);
  if (onUpdate) channel.on('postgres_changes', { ...base, event: 'UPDATE', ...filt }, onUpdate);
  if (onDelete) channel.on('postgres_changes', { ...base, event: 'DELETE', ...filt }, onDelete);

  channel.subscribe((s) => console.log('[Realtime] channel status:', s));

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

// Optional app-wide helper (kept for compatibility).
export function subscribeToAppRealtime(
  table: string,
  cb: (e: { type: 'INSERT' | 'UPDATE' | 'DELETE'; payload: any }) => void
): () => void {
  return subscribeToTable({
    table,
    onInsert: (payload) => cb({ type: 'INSERT', payload }),
    onUpdate: (payload) => cb({ type: 'UPDATE', payload }),
    onDelete: (payload) => cb({ type: 'DELETE', payload }),
  });
}
