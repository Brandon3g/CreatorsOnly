import { supabase } from '../lib/supabaseClient';

export type RealtimeUnsubscribe = () => void;

/**
 * Subscribe to realtime changes on a given table.
 *
 * @param tableName - The Supabase table to watch
 * @param onChange - Callback that receives the payload when a row is inserted/updated/deleted
 * @returns cleanup function to unsubscribe
 */
export function subscribeToTable(
  tableName: string,
  onChange: (payload: any) => void
): RealtimeUnsubscribe {
  const channel = supabase
    .channel(`realtime:${tableName}`)
    .on(
@@ -23,25 +25,33 @@ export function subscribeToTable(
      },
      (payload) => {
        console.log(`[Realtime] ${tableName} change:`, payload);
        try {
          onChange(payload);
        } catch (err) {
          console.error(`[Realtime] Error in ${tableName} handler:`, err);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Subscription to ${tableName}:`, status);
    });

  return () => {
    try {
      supabase.removeChannel(channel);
      console.log(`[Realtime] Unsubscribed from ${tableName}`);
    } catch {
      // no-op
    }
  };
}

/**
 * Example usage:
 *
 * import { useEffect } from 'react';
 * import { subscribeToTable } from '../services/realtime';
 *
 * useEffect(() => {
 *   const unsubscribe = subscribeToTable('profiles', (payload) => {
 *     // Update local state or refetch query
