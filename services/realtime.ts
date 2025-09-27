// src/services/realtime.ts
// Centralized, safe helpers for Supabase Realtime.
// Every subscribe* function RETURNS A FUNCTION for React effect cleanup
// and also exposes a `.cleanup` alias for backward compatibility.

import { supabase } from '../lib/supabaseClient';

type RowEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export type ChangeHandler<T = any> = (payload: {
  schema: string;
  table: string;
  eventType: RowEvent;
  new?: T;
  old?: T;
}) => void;

export interface Handlers<T = any> {
  onInsert?: ChangeHandler<T>;
  onUpdate?: ChangeHandler<T>;
  onDelete?: ChangeHandler<T>;
  onAny?: ChangeHandler<T>;
  onError?: (e: unknown) => void;
}

export interface TableSubscriptionOptions {
  table: string;
  event?: RowEvent;      // defaults to '*'
  filter?: string;       // e.g. 'user_id=eq.123'
  schema?: string;       // defaults to 'public'
  channelName?: string;  // optional explicit channel name
}

/**
 * Subscribe to a single Postgres table changes feed.
 * Returns a FUNCTION to unsubscribe. Also sets `fn.cleanup = fn` for old callers.
 */
export function subscribeToTable<T = any>(
  opts: TableSubscriptionOptions,
  handlers: Handlers<T> = {}
): () => void {
  const schema = opts.schema ?? 'public';
  const event: RowEvent = opts.event ?? '*';
  const channelName =
    opts.channelName ?? `rt_${schema}_${opts.table}_${Math.random().toString(36).slice(2)}`;

  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes',
    {
      event,
      schema,
      table: opts.table,
      // Supabase expects e.g. 'user_id=eq.123' or undefined
      filter: opts.filter || undefined,
    },
    (payload: any) => {
      try {
        const wrapped = {
          schema,
          table: opts.table,
          eventType: payload.eventType as RowEvent,
          new: payload.new,
          old: payload.old,
        };
        handlers.onAny?.(wrapped);
        if (wrapped.eventType === 'INSERT') handlers.onInsert?.(wrapped);
        if (wrapped.eventType === 'UPDATE') handlers.onUpdate?.(wrapped);
        if (wrapped.eventType === 'DELETE') handlers.onDelete?.(wrapped);
      } catch (e) {
        handlers.onError?.(e);
      }
    }
  );

  channel.subscribe((status) => {
    // Light console breadcrumb; non-blocking
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] channel status: SUBSCRIBED');
    } else if (status === 'CLOSED') {
      console.warn('[Realtime] channel status: CLOSED');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[Realtime] channel status: CHANNEL_ERROR');
    }
  });

  const off = () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      handlers.onError?.(e);
    }
  };

  // Back-compat for callers that used `.cleanup`
  (off as any).cleanup = off;
  return off;
}

/**
 * Convenience helpers for common tables.
 * These simply call subscribeToTable with the right table name.
 */
export function subscribeToPosts<T = any>(
  handlers: Handlers<T>,
  filter?: string
) {
  return subscribeToTable<T>({ table: 'posts', event: '*', filter }, handlers);
}

export function subscribeToProfiles<T = any>(
  handlers: Handlers<T>,
  filter?: string
) {
  return subscribeToTable<T>({ table: 'profiles', event: '*', filter }, handlers);
}

export function subscribeToNotifications<T = any>(
  handlers: Handlers<T>,
  filter?: string
) {
  return subscribeToTable<T>({ table: 'notifications', event: '*', filter }, handlers);
}

export function buildMessageParticipantFilter(userId: string | null | undefined) {
  if (!userId) return undefined;
  const normalizedId = encodeRealtimeValue(userId);
  return `or(sender_id=eq.${normalizedId},receiver_id=eq.${normalizedId})`;
}

function encodeRealtimeValue(value: string) {
  // Supabase realtime channel filters expect PostgREST-style query segments.
  // Values should be URI encoded so characters like commas or parentheses do not
  // break the composed filter. Use encodeURIComponent but keep `*` unescaped to
  // align with PostgREST wildcard semantics if they are ever passed through.
  return encodeURIComponent(value).replace(/%2A/gi, '*');
}

export function subscribeToMessages<T = any>(
  handlers: Handlers<T>,
  filter?: string
) {
  return subscribeToTable<T>({ table: 'messages', event: '*', filter }, handlers);
}

export function subscribeToConversations<T = any>(
  handlers: Handlers<T>,
  filter?: string
) {
  return subscribeToTable<T>({ table: 'conversations', event: '*', filter }, handlers);
}

/**
 * Composite subscription used by pages that want "the whole app realtime".
 * Pass the current user's UUID so we can scope some streams if desired.
 *
 * Returns ONE cleanup function that tears down all channels.
 */
export function subscribeToAppRealtime(
  userId: string | null | undefined,
  opts?: {
    posts?: Handlers;
    profiles?: Handlers;
    notifications?: Handlers;
    messages?: Handlers;
    conversations?: Handlers;
  }
): () => void {
  const offs: Array<() => void> = [];

  // Posts: everyone’s public posts (keep simple; small project scale)
  if (opts?.posts) {
    offs.push(subscribeToPosts(opts.posts));
  }

  // Profiles: reflect public profile changes across devices
  if (opts?.profiles) {
    offs.push(subscribeToProfiles(opts.profiles));
  }

  // Notifications scoped to the logged-in user (if provided)
  if (opts?.notifications) {
    const filter = userId ? `user_id=eq.${userId}` : undefined;
    offs.push(subscribeToNotifications(opts.notifications, filter));
  }

  // Messages + conversations scoped to the participant (if provided)
  if (opts?.messages) {
    const filter = buildMessageParticipantFilter(userId ?? undefined);
    if (filter) {
      console.debug('[Realtime] subscribing to messages with filter:', filter);
    } else {
      console.debug('[Realtime] subscribing to messages without participant filter');
    }
    offs.push(
      subscribeToMessages(
        {
          ...opts.messages,
          onAny: (payload) => {
            console.debug('[Realtime] message event received', {
              eventType: payload.eventType,
              messageId: payload.new?.id ?? payload.old?.id,
            });
            opts.messages?.onAny?.(payload);
          },
          onError: (error) => {
            console.error('[Realtime] message subscription error', error);
            opts.messages?.onError?.(error);
          },
        },
        filter,
      ),
    );
  }
  if (opts?.conversations) {
    offs.push(subscribeToConversations(opts.conversations));
  }

  const offAll = () => {
    for (const off of offs) {
      try {
        off();
      } catch {
        /* noop */
      }
    }
  };
  (offAll as any).cleanup = offAll;
  return offAll;
}
