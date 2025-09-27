// services/realtime.ts
import { supabase } from '../lib/supabaseClient';

// ---------- Types ----------
export type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';
export type Unsubscribe = () => void;
export type Direction = 'inbound' | 'outbound';

// ---------- Generic channel helper (optional utility) ----------
/**
 * Subscribe to a named channel and return an unsubscribe function.
 * You can pass multiple `.on()` configs by calling this function
 * with a factory callback.
 */
export function subscribeToChannel(
  channelName: string,
  configure: (ch: ReturnType<typeof supabase.channel>) => void,
  onStatusChange?: (status: RealtimeStatus) => void
): Unsubscribe {
  const channel = supabase.channel(channelName);
  configure(channel);

  channel.subscribe((status) => {
    onStatusChange?.(status as RealtimeStatus);
    console.log(`[Realtime] ${channelName} status:`, status);
  });

  return () => {
    try {
      supabase.removeChannel(channel);
      console.log(`[Realtime] unsubscribed: ${channelName}`);
    } catch (err) {
      console.warn('[Realtime] unsubscribe error:', err);
    }
  };
}

// ---------- Back-compat: subscribeToTable (used by analytics.ts & others) ----------
/**
 * Subscribe to Postgres changes for a given table.
 * Stays compatible with existing imports: `import { subscribeToTable } from './realtime'`
 */
export function subscribeToTable(
  table: string,
  handler: (payload: any) => void,
  options?: {
    schema?: string;
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    filter?: string; // e.g. "or(sender_id.eq.X,receiver_id.eq.X)"
    channelName?: string;
    onStatusChange?: (status: RealtimeStatus) => void;
    onError?: (err: any) => void;
  }
): Unsubscribe {
  const {
    schema = 'public',
    event = '*',
    filter,
    channelName = `${table}:${Date.now()}`,
    onStatusChange,
    onError,
  } = options || {};

  return subscribeToChannel(
    channelName,
    (ch) => {
      ch.on(
        'postgres_changes',
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload) => {
          try {
            handler(payload);
          } catch (err) {
            console.error('[Realtime] subscribeToTable handler error:', err);
            onError?.(err);
          }
        }
      );
    },
    onStatusChange
  );
}

// ---------- Messages-specific helpers ----------
/**
 * Build a filter that matches BOTH directions for a user:
 * rows where the user is either the sender or the receiver.
 * Example:  or(sender_id.eq.<uid>,receiver_id.eq.<uid>)
 */
export function buildMessageParticipantFilter(userId: string) {
  const trimmed = String(userId).trim();
  // NOTE: Supabase Realtime expects raw filter string without quotes here.
  return `or(sender_id.eq.${trimmed},receiver_id.eq.${trimmed})`;
}

/**
 * Subscribe to messages for a given user with the OR(sender|receiver) filter.
 * Emits direction ('inbound' | 'outbound') with each payload.
 */
export function subscribeToAppRealtime(
  userId: string,
  onEvent: (payload: any, direction: Direction) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const filter = buildMessageParticipantFilter(userId);
  const channelName = `messages:${userId}:${Date.now()}`;
  console.log('[Realtime] Subscribing to messages with filter:', filter);

  return subscribeToChannel(
    channelName,
    (ch) => {
      ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter, // includes both sender and receiver for this user
        },
        (payload) => {
          try {
            const row = (payload as any)?.new ?? (payload as any)?.old ?? {};
            const direction: Direction =
              row?.sender_id === userId ? 'outbound' : 'inbound';

            console.log('[Realtime] message event:', {
              type: (payload as any).eventType,
              direction,
              id: row?.id,
              sender_id: row?.sender_id,
              receiver_id: row?.receiver_id,
            });

            onEvent(payload, direction);
          } catch (err) {
            console.error('[Realtime] messages handler error:', err);
            onError?.(err);
          }
        }
      );
    },
    (status) => {
      // optional external status observer already handled in subscribeToChannel logs
      if (status !== 'SUBSCRIBED') {
        // You could surface non-subscribed states to UI if needed
      }
    }
  );
}
