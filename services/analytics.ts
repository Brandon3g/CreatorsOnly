// src/services/analytics.ts
// Minimal, safe analytics that never touches the database.
// You keep console breadcrumbs without risking build/runtime errors.

type AnalyticsPayload = Record<string, any>;

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  try {
    // Keep logging consistent and easy to filter in DevTools.
    console.log('[ANALYTICS]', { event, ...payload });
  } catch {
    // no-op
  }
}

// Optional stub: if something calls this, it won't throw.
export function initAnalyticsLogging() {
  /* no-op */
}
