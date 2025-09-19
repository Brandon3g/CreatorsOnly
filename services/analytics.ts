interface AnalyticsPayload {
    [key: string]: any;
}

/**
 * Mocks an analytics tracking service. In a real application, this would
 * send data to a service like Google Analytics, Mixpanel, etc.
 * @param eventName - The name of the event to track.
 * @param payload - An object containing data related to the event.
 */
export const trackEvent = (eventName: string, payload: AnalyticsPayload = {}): void => {
    console.log('[ANALYTICS]', {
        event: eventName,
        ...payload,
        timestamp: new Date().toISOString(),
    });
};
