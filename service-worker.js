// service-worker.js — CreatorsOnly (no caching of Supabase; safe static pass-through)
const CACHE_NAME = 'co-static-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

// Only handle same-origin GETs (your own static assets). Never intercept Supabase/cross-origin.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  event.respondWith((async () => {
    try {
      // Network-first to avoid stale HTML/JS
      return await fetch(event.request, { cache: 'no-store' });
    } catch {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw new Error('Offline and no cached copy');
    }
  })());
});
