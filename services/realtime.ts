import { supabase } from '../lib/supabaseClient';

// Helper: build filter for realtime events involving this user
export function buildMessageParticipantFilter(userId: string) {
  return (payload: any) => {
    const msg = payload.new || payload.old;
    return msg.sender_id === userId || msg.receiver_id === userId;
  };
}

// Subscribe to messages table events
export function subscribeToMessages(
  participantFilter: (payload: any) => boolean,
  onEvent: (payload: any, direction: 'inbound' | 'outbound') => void,
  onError?: (err: any) => void
) {
  try {
    const channel = supabase
      .channel(`messages:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (participantFilter(payload)) {
            const msg = payload.new;
            const direction =
              msg && msg.sender_id === supabase.auth.getUser().data?.user?.id
                ? 'outbound'
                : 'inbound';
            onEvent(payload, direction);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to messages channel');
        }
      });

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
        console.log('[Realtime] Unsubscribed from messages channel');
      },
    };
  } catch (err) {
    console.error('[Realtime] Subscription error', err);
    if (onError) onError(err);
    return { unsubscribe: () => {} };
  }
}
