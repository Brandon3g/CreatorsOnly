const CACHE_NAME = 'creators-only-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/icons/icon-180x180.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-152x152.png',
    '/icons/icon-167x167.png'
];
const ICON_URL = '/icons/icon-192x192.png';


self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(STATIC_ASSETS);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/offline.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

// --- Web Push Event Listeners ---

self.addEventListener('push', event => {
    console.log('[Service Worker] Push Received.');
    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        // If the server sends a simple string
        data = { title: 'New Notification', body: event.data.text() };
    }

    const { title, body, icon, data: notificationData } = data;
    
    const options = {
        body: body,
        icon: icon || ICON_URL,
        badge: ICON_URL,
        data: notificationData || { url: '/' }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Listener for client-side push simulation
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'show-notification') {
        const { title, options } = event.data.payload;
        const finalOptions = {
            ...options,
            icon: options.icon || ICON_URL,
            badge: options.badge || ICON_URL,
        };
        self.registration.showNotification(title, finalOptions);
    }
});