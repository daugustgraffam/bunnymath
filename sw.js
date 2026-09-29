// Keeps every page load consistent: always ask the server for the newest files
// (a quick "has it changed?" check), and only fall back to the saved copies when
// offline. Without this, a browser could mix a cached old page with new code
// right after an update, and the game would fail to start.

const CACHE = 'bunnymath';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // 'no-cache' revalidates with the server instead of trusting the browser's copy.
      const fresh = await fetch(new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' }));
      if (fresh.ok) await cache.put(request.url, fresh.clone());
      return fresh;
    } catch {
      // Offline: play with the last version that loaded.
      return (await cache.match(request.url)) ?? Response.error();
    }
  })());
});
