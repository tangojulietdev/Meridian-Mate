const CACHE = 'meridian-co-v4';

// Works on both root domain AND GitHub Pages subpath
const BASE = self.location.pathname.replace('/sw.js', '');
const ASSETS = [BASE + '/', BASE + '/index.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // Try to cache, don't fail if offline
      return c.addAll(ASSETS).catch(function(){});
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
    })
  );
  return clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only handle same-origin requests
  if (e.request.url.indexOf(self.location.origin) !== 0) return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(res) {
        if (res && res.ok && res.type === 'basic') {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function() {
        // Offline fallback - return cached index
        return caches.match(BASE + '/') || caches.match(BASE + '/index.html');
      });
    })
  );
});
