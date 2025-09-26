// services/realtime.ts
import { supabase } from '../lib/supabaseClient';

type EventType = 'INSERT' | 'UPDATE' | 'DELETE';

export type RealtimePayload<T = any> = {
  eventType: EventType;
  schema: string;
  table: string;
  new: T | null;
  old: T | null;
};

export type RealtimeCallback<T = any> = (payload: RealtimePayload<T>) => void;

/**
 * Subscribe to all Postgres changes for a given public table.
 * Returns an unsubscribe function you MUST call on unmount.
 */
export function subscribeToTable<T = any>(
  table: string,
  cb: RealtimeCallback<T>
): () => void {
  const channel = supabase
    .channel(`realtime:${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload: any) => {
        cb({
          eventType: payload.eventType as EventType,
          schema: payload.schema ?? 'public',
          table: payload.table ?? table,
          new: (payload as any).new ?? null,
          old: (payload as any).old ?? null,
        });
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {}
  };
}

/** Convenience helper to subscribe to multiple tables at once. */
export function subscribeToTables<T = any>(
  tables: string[],
  cb: RealtimeCallback<T>
): () => void {
  const unsubs = tables.map((t) => subscribeToTable<T>(t, cb));
  return () => unsubs.forEach((u) => u());
}
