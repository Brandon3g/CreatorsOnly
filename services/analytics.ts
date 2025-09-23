// src/services/analytics.ts
import { subscribeToTable } from './realtime';

interface AnalyticsPayload {
  [key: string]: any;
}

/**
 * Track an analytics event.
 * In production, this could be replaced with Google Analytics, Mixpanel, etc.
 */
export const trackEvent = (
  eventName: string,
  payload: AnalyticsPayload = {}
): void => {
  console.log('[ANALYTICS]', {
    event: eventName,
    ...payload,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Subscribe to realtime analytics for a given table.
 * Useful for tracking activity without waiting for manual log calls.
 *
 * @param tableName - Supabase table to monitor
 * @param eventName - Name to use in analytics logs
 * @returns cleanup function to unsubscribe
 */
export function subscribeToAnalyticsTable(
  tableName: string,
  eventName: string
) {
  return subscribeToTable(tableName, (payload) => {
    trackEvent(eventName, {
      table: tableName,
      type: payload.eventType,
      new: payload.new,
      old: payload.old,
    });
  });
}

/**
 * Example usage:
 *
 * useEffect(() => {
 *   const unsubProfiles = subscribeToAnalyticsTable('profiles', 'profile_change');
 *   const unsubPosts = subscribeToAnalyticsTable('posts', 'post_change');
 *   return () => {
 *     unsubProfiles();
 *     unsubPosts();
 *   };
 * }, []);
 */
