const CACHE = 'meridian-co-v5';
const BASE = self.location.pathname.replace('/sw.js', '');

// On install - cache assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll([BASE + '/', BASE + '/index.html']).catch(function(){});
    })
  );
  // Take over immediately - don't wait for old SW to die
  self.skipWaiting();
});

// On activate - delete ALL old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Take control of all open clients immediately
      return clients.claim();
    })
  );
});

// Fetch strategy:
// HTML pages  → Network first, fall back to cache
// Everything else → Cache first, fall back to network
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Only handle same-origin
  if (url.indexOf(self.location.origin) !== 0) return;

  // For HTML (navigation requests) - ALWAYS try network first
  if (e.request.mode === 'navigate' || 
      e.request.headers.get('accept').indexOf('text/html') >= 0) {
    e.respondWith(
      fetch(e.request).then(function(networkRes) {
        // Got fresh HTML from network - update cache
        if (networkRes && networkRes.ok) {
          var clone = networkRes.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return networkRes;
      }).catch(function() {
        // Offline - serve from cache
        return caches.match(e.request)
          .then(function(r) { return r || caches.match(BASE + '/'); });
      })
    );
    return;
  }

  // For other assets (CSS, JS, images) - cache first
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
        return caches.match(BASE + '/');
      });
    })
  );
});

// Listen for message from app to skip waiting
self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
