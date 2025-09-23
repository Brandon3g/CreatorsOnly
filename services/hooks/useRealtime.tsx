// src/services/hooks/useRealtime.tsx
import { useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';          // ✅ up two levels to /lib
import type { MyProfile } from '../profile';                  // ✅ ../profile
import type { Post } from '../posts';                         // ✅ ../posts
import type { FriendRequest } from '../friendRequests';       // ✅ ../friendRequests
import { subscribeToTable } from '../realtime';               // ✅ ../realtime

type UseRealtimeOptions = {
  refreshProfiles: (rows: MyProfile[]) => void;
  refreshPosts: (rows: Post[]) => void;
  refreshFriendRequests: (rows: FriendRequest[]) => void;
  onAuthChange?: (event: string, session: any | null) => void;
};

// ---- Fetch helpers ----
async function fetchProfiles(): Promise<MyProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as MyProfile[];
}

async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Post[];
}

async function fetchFriendRequests(): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FriendRequest[];
}

/**
 * useRealtime
 * Wires Supabase Realtime + initial fetches and invokes your callbacks whenever
 * the backing tables change.
 */
export function useRealtime(opts: UseRealtimeOptions) {
  const { refreshProfiles, refreshPosts, refreshFriendRequests, onAuthChange } = opts;

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    (async () => {
      try {
        const [p, po, r] = await Promise.all([
          fetchProfiles(),
          fetchPosts(),
          fetchFriendRequests(),
        ]);
        if (!mounted) return;
        refreshProfiles(p);
        refreshPosts(po);
        refreshFriendRequests(r);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[useRealtime] initial fetch failed', e);
      }
    })();

    // Auth state (optional)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      onAuthChange?.(event, session);
    });

    // Table subscriptions (refetch only that table on change)
    const unsubProfiles = subscribeToTable('profiles', async () => {
      try {
        if (!mounted) return;
        refreshProfiles(await fetchProfiles());
      } catch (e) {
        console.error('[useRealtime] profiles refresh failed', e);
      }
    });

    const unsubPosts = subscribeToTable('posts', async () => {
      try {
        if (!mounted) return;
        refreshPosts(await fetchPosts());
      } catch (e) {
        console.error('[useRealtime] posts refresh failed', e);
      }
    });

    const unsubRequests = subscribeToTable('requests', async () => {
      try {
        if (!mounted) return;
        refreshFriendRequests(await fetchFriendRequests());
      } catch (e) {
        console.error('[useRealtime] requests refresh failed', e);
      }
    });

    return () => {
      mounted = false;
      try {
        unsubProfiles?.();
        unsubPosts?.();
        unsubRequests?.();
        authListener?.subscription?.unsubscribe();
      } catch {
        // no-op
      }
    };
  }, [refreshProfiles, refreshPosts, refreshFriendRequests, onAuthChange]);
}
