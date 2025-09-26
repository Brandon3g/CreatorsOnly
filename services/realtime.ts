// services/realtime.ts
import { supabase } from '../lib/supabaseClient';

type Status = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT';

export type RealtimeHandlers = {
  onOpen?: () => void;
  onClose?: (status: Status) => void;

  onPostInsert?: (payload: unknown) => void;
  onPostUpdate?: (payload: unknown) => void;
  onPostDelete?: (payload: unknown) => void;

  onProfileUpdate?: (payload: unknown) => void;

  onNotificationInsert?: (payload: unknown) => void;
  onNotificationUpdate?: (payload: unknown) => void;
  onNotificationDelete?: (payload: unknown) => void;

  onMessageInsert?: (payload: unknown) => void;
  onRequestInsert?: (payload: unknown) => void;
  onConversationInsert?: (payload: unknown) => void;
  onConversationMemberInsert?: (payload: unknown) => void;
  onFeedbackInsert?: (payload: unknown) => void;
  onCollaborationInsert?: (payload: unknown) => void;
};

export function subscribeToAppRealtime(handlers: RealtimeHandlers) {
  // Create a fresh channel each time we subscribe; clean it up on unmount/user change.
  const channelName = `public-changes-${Math.random().toString(36).slice(2)}`;
  const channel = supabase.channel(channelName);

  const on = (table: string, event: '*' | 'INSERT' | 'UPDATE' | 'DELETE', cb: (p: any) => void) =>
    channel.on(
      'postgres_changes',
      { event, schema: 'public', table },
      (payload) => cb(payload)
    );

  // posts
  on('posts', 'INSERT', (p) => handlers.onPostInsert?.(p));
  on('posts', 'UPDATE', (p) => handlers.onPostUpdate?.(p));
  on('posts', 'DELETE', (p) => handlers.onPostDelete?.(p));

  // profiles
  on('profiles', 'UPDATE', (p) => handlers.onProfileUpdate?.(p));

  // notifications
  on('notifications', 'INSERT', (p) => handlers.onNotificationInsert?.(p));
  on('notifications', 'UPDATE', (p) => handlers.onNotificationUpdate?.(p));
  on('notifications', 'DELETE', (p) => handlers.onNotificationDelete?.(p));

  // messages / conversations
  on('messages', 'INSERT', (p) => handlers.onMessageInsert?.(p));
  on('conversations', 'INSERT', (p) => handlers.onConversationInsert?.(p));
  on('conversation_members', 'INSERT', (p) => handlers.onConversationMemberInsert?.(p));

  // requests / feedback / collaborations
  on('requests', 'INSERT', (p) => handlers.onRequestInsert?.(p));
  on('feedback', 'INSERT', (p) => handlers.onFeedbackInsert?.(p));
  on('collaborations', 'INSERT', (p) => handlers.onCollaborationInsert?.(p));

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] channel status: SUBSCRIBED');
      handlers.onOpen?.();
    } else {
      console.warn('[Realtime] channel status:', status);
      handlers.onClose?.(status as Status);
    }
  });

  return {
    cleanup: () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        /* no-op */
      }
    },
  };
}
