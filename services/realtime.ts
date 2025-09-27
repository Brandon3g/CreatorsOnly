// services/realtime.ts
import { supabase } from '../lib/supabaseClient';

// ---------- Types ----------
export type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';
export type Unsubscribe = () => void;
export type Direction = 'inbound' | 'outbound';

// ---------- Generic channel helper ----------
function subscribeToChannel(
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

// ---------- Back-compat: subscribeToTable (used by analytics.ts & hooks) ----------
export function subscribeToTable(
  table: string,
  handler: (payload: any) => void,
  options?: {
    schema?: string;
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
    filter?: string;              // e.g. "or(sender_id.eq.X,conversation_id.in.(a,b))"
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

// ---------- Messages-specific helpers (for your schema) ----------

/**
 * Fetch all conversation_ids the user belongs to.
 */
async function fetchUserConversationIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[Realtime] failed to fetch conversation_ids:', error);
    return [];
  }
  return (data || []).map((r: any) => r.conversation_id).filter(Boolean);
}

/**
 * Build filter: user’s outbound messages OR messages in any conversation the user belongs to.
 * Result looks like:
 *   or(sender_id.eq.<uid>,conversation_id.in.(<id1>,<id2>,...))
 * If the user has no conversations yet, falls back to sender-only so at least outbound events appear.
 */
function buildMessageFilter(userId: string, convoIds: string[]): string {
  const uid = String(userId).trim();
  const list = (convoIds || []).map(id => String(id).trim()).filter(Boolean);
  if (list.length === 0) {
    return `sender_id.eq.${uid}`;
  }
  const csv = list.join(',');
  return `or(sender_id.eq.${uid},conversation_id.in.(${csv}))`;
}

/**
 * Subscribe to messages for a given user.
 * - Fetches the user's conversation_ids.
 * - Subscribes to messages using OR(sender_id, conversation_id IN (...)).
 * - Subscribes to conversation_members for that user; on change, rebuilds the messages subscription.
 * - Calls onEvent(payload, direction) where direction is 'inbound' | 'outbound'.
 */
export function subscribeToAppRealtime(
  userId: string,
  onEvent: (payload: any, direction: Direction) => void,
  onError?: (err: any) => void
): Unsubscribe {
  let unsubscribeMessages: Unsubscribe | null = null;

  const startMessagesSubscription = async () => {
    try {
      // Get current membership
      const convIds = await fetchUserConversationIds(userId);
      const filter = buildMessageFilter(userId, convIds);
      const channelName = `messages:${userId}:${Date.now()}`;
      console.log('[Realtime] Subscribing to messages with filter:', filter);

      // Clean any previous messages subscription before replacing
      unsubscribeMessages?.();

      unsubscribeMessages = subscribeToChannel(
        channelName,
        (ch) => {
          ch.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter, // sender_id.eq.<uid> OR conversation_id.in.(...)
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
                  conversation_id: row?.conversation_id,
                  sender_id: row?.sender_id,
                });

                onEvent(payload, direction);
              } catch (err) {
                console.error('[Realtime] messages handler error:', err);
                onError?.(err);
              }
            }
          );
        }
      );
    } catch (err) {
      console.error('[Realtime] failed to start messages subscription:', err);
      onError?.(err as any);
    }
  };

  // Kick off initial messages subscription
  void startMessagesSubscription();

  // Watch conversation_members for this user; if membership changes, rebuild messages subscription
  const unsubscribeMembership = subscribeToTable(
    'conversation_members',
    async (payload) => {
      const row = (payload as any)?.new ?? (payload as any)?.old ?? {};
      if (row?.user_id !== userId) return; // ignore other users’ membership changes
      console.log('[Realtime] membership change detected → refreshing messages subscription');
      await startMessagesSubscription();
    },
    {
      event: '*',
      filter: `user_id.eq.${userId}`,
      onError,
      onStatusChange: () => {},
    }
  );

  // Unified cleanup for both channels
  return () => {
    try {
      unsubscribeMessages?.();
      unsubscribeMembership?.();
    } catch (err) {
      console.warn('[Realtime] unsubscribe warning:', err);
    }
  };
}

// ---------- Also export a simple helper if other code wants to build a filter ----------
export function buildMessageParticipantFilter(userId: string): string {
  // Kept for API compatibility, but we now prefer buildMessageFilter(userId, convoIds)
  // This version fetches convos synchronously impossible; so return sender-only.
  // Callers that need inbound should use subscribeToAppRealtime instead.
  const uid = String(userId).trim();
  return `sender_id.eq.${uid}`;
}
