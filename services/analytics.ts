// services/analytics.ts
import { subscribeToTable } from './realtime';

export interface AnalyticsPayload {
  [key: string]: unknown;
}

/** Simple console-based tracker so callers don't break. */
export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  try {
    console.debug('[analytics]', event, payload);
  } catch {}
}

/**
 * Optional helper that logs DB changes to the console.
 * Safe no-op for production; call it only if you want to observe traffic.
 */
export function initAnalyticsLogging() {
  const offPosts = subscribeToTable('posts', (e) => {
    console.debug('[analytics] posts change', e.eventType, { new: e.new, old: e.old });
  });
  const offProfiles = subscribeToTable('profiles', (e) => {
    console.debug('[analytics] profiles change', e.eventType, { new: e.new, old: e.old });
  });

  return () => {
    offPosts();
    offProfiles();
  };
}
