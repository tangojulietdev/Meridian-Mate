// Meridian C/O Service Worker v7
// Strategy: Cache everything for offline, but always try network first for HTML

const CACHE = 'meridian-co-v7';
const BASE = self.location.pathname.replace('/sw.js', '');

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // Cache all files needed for offline
      return c.addAll([
        BASE + '/',
        BASE + '/index.html',
        BASE + '/manifest.json',
        BASE + '/icon-192.png',
        BASE + '/icon-512.png',
      ]).catch(function(err) {
        console.log('Cache addAll partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.indexOf(self.location.origin) !== 0) return;

  var isHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').indexOf('text/html') >= 0;

  if (isHTML) {
    // HTML: network first with cache fallback
    // Add cache-busting to ensure fresh fetch
    e.respondWith(
      fetch(e.request, {
        cache: 'no-cache',
        headers: {'Cache-Control': 'no-cache'}
      }).then(function(res) {
        if (res && res.ok) {
          // Update cache with fresh version
          var clone = res.clone();
          caches.open(CACHE).then(function(c) {
            c.put(e.request, clone);
          });
        }
        return res;
      }).catch(function() {
        // Offline - serve from cache
        console.log('[SW] Offline - serving from cache');
        return caches.match(BASE + '/index.html')
          .then(function(r) { return r || caches.match(BASE + '/'); });
      })
    );
    return;
  }

  // Other assets: cache first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        return caches.match(BASE + '/index.html');
      });
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
