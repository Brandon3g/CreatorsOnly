// src/services/realtime.ts
import { supabase } from '../supabaseClient';

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
) {
  const channel = supabase
    .channel(`realtime:${tableName}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: tableName,
      },
      (payload) => {
        console.log(`[Realtime] ${tableName} change:`, payload);
        onChange(payload);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Subscription to ${tableName}:`, status);
    });

  return () => {
    supabase.removeChannel(channel);
    console.log(`[Realtime] Unsubscribed from ${tableName}`);
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
 *   });
 *   return () => unsubscribe();
 * }, []);
 */
