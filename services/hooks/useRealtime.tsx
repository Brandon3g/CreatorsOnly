// src/hooks/useRealtime.tsx
import { useEffect } from 'react';
import { getAllProfiles, subscribeToProfiles } from '../services/profile';
import { getAllPosts, subscribeToPosts } from '../services/posts';
import { getMyFriendRequests, subscribeToFriendRequests } from '../services/friendRequests';
import { subscribeToAuth } from '../services/auth';
import { trackEvent } from '../services/analytics';

type UseRealtimeProps = {
  refreshProfiles?: (data: any[]) => void;
  refreshPosts?: (data: any[]) => void;
  refreshFriendRequests?: (data: any[]) => void;
  onAuthChange?: (event: string, session: any) => void;
};

/**
 * Central hook to manage realtime subscriptions across the app.
 * 
 * Example usage:
 * 
 * useRealtime({
 *   refreshProfiles: setProfiles,
 *   refreshPosts: setPosts,
 *   refreshFriendRequests: setRequests,
 *   onAuthChange: (event, session) => setUser(session?.user ?? null),
 * });
 */
export function useRealtime({
  refreshProfiles,
  refreshPosts,
  refreshFriendRequests,
  onAuthChange,
}: UseRealtimeProps) {
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Profiles
    if (refreshProfiles) {
      getAllProfiles().then(refreshProfiles);
      const unsub = subscribeToProfiles(async () => {
        const updated = await getAllProfiles();
        refreshProfiles(updated);
        trackEvent('profile_change', { source: 'realtime' });
      });
      unsubscribers.push(unsub);
    }

    // Posts
    if (refreshPosts) {
      getAllPosts().then(refreshPosts);
      const unsub = subscribeToPosts(async () => {
        const updated = await getAllPosts();
        refreshPosts(updated);
        trackEvent('post_change', { source: 'realtime' });
      });
      unsubscribers.push(unsub);
    }

    // Friend Requests
    if (refreshFriendRequests) {
      getMyFriendRequests().then(refreshFriendRequests);
      const unsub = subscribeToFriendRequests(async () => {
        const updated = await getMyFriendRequests();
        refreshFriendRequests(updated);
        trackEvent('friend_request_change', { source: 'realtime' });
      });
      unsubscribers.push(unsub);
    }

    // Auth
    if (onAuthChange) {
      const unsub = subscribeToAuth((event, session) => {
        onAuthChange(event, session);
        trackEvent('auth_change', { event });
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [refreshProfiles, refreshPosts, refreshFriendRequests, onAuthChange]);
}
