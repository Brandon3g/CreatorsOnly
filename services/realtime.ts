// services/realtime.ts
import { supabase } from '../lib/supabaseClient';

export type Unsubscribe = () => void;

/**
 * Subscribe to realtime DB changes.
 * NOTE: Never subscribe with a fake id; only with real UUIDs.
 */
export function subscribeToAppRealtime(opts: {
  dbUserId?: string; // may be undefined until session resolves
  onPostsInsert?: (payload: any) => void;
  onProfilesUpdate?: (payload: any) => void;
  onNotificationsInsert?: (payload: any) => void;
}): Unsubscribe {
  const channel = supabase.channel('creatorsonly:realtime');

  // Posts (global timeline)
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => opts.onPostsInsert?.(payload)
  );

  // Profile changes (any user)
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'profiles' },
    (payload) => opts.onProfilesUpdate?.(payload)
  );

  // Notifications only for the signed-in user
  if (opts.dbUserId) {
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${opts.dbUserId}`,
      },
      (payload) => opts.onNotificationsInsert?.(payload)
    );
  }

  channel.subscribe();

  return () => {
    try {
      channel.unsubscribe();
    } catch {
      /* no-op */
    }
  };
}
