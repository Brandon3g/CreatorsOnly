import { supabase } from '../lib/supabaseClient';

// --- Messages realtime helpers ---------------------------------------------

/**
 * Build a Supabase realtime filter that includes BOTH directions:
 * messages where the current user is either the sender or receiver.
 *
 * Example returned filter:
 *   or(sender_id.eq.<uid>,receiver_id.eq.<uid>)
 */
export function buildMessageParticipantFilter(userId: string) {
  const trimmed = String(userId).trim();
  return `or(sender_id.eq.${trimmed},receiver_id.eq.${trimmed})`;
}

export type Direction = 'inbound' | 'outbound';

export type AppRealtimeUnsubscribe = () => void;

/**
 * Subscribe to messages table for a given user (both inbound and outbound).
 * Logs lifecycle and errors; returns an unsubscribe function.
 */
export function subscribeToAppRealtime(
  userId: string,
  onEvent: (payload: any, direction: Direction) => void,
  onError?: (err: any) => void
): AppRealtimeUnsubscribe {
  const filter = buildMessageParticipantFilter(userId);
  console.log('[Realtime] Subscribing to messages with filter:', filter);

  try {
    const channel = supabase
      .channel(`messages:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter, // includes both sender and receiver
        },
        (payload) => {
          try {
            const row = (payload as any)?.new ?? (payload as any)?.old ?? {};
            const direction: Direction =
              row?.sender_id === userId ? 'outbound' : 'inbound';

            console.log('[Realtime] message event:', {
              type: payload.eventType,
              direction,
              id: row?.id,
              sender_id: row?.sender_id,
              receiver_id: row?.receiver_id,
            });

            onEvent(payload, direction);
          } catch (err) {
            console.error('[Realtime] Handler error:', err);
            onError?.(err);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] messages channel status:', status);
      });

    return () => {
      try {
        supabase.removeChannel(channel);
        console.log('[Realtime] Unsubscribed from messages channel');
      } catch (err) {
        console.warn('[Realtime] Unsubscribe error:', err);
      }
    };
  } catch (err) {
    console.error('[Realtime] Subscription error:', err);
    onError?.(err);
    return () => {};
  }
}
