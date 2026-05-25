const CACHE_NAME = "ST-Insight-v0.30";

const urlsToCache = [
  "/ST-Insight/",
  "/ST-Insight/index.html",
  "/ST-Insight/style.css",

  "/ST-Insight/js/app.js",
  "/ST-Insight/js/history.js",
  "/ST-Insight/js/serve.js",
  "/ST-Insight/js/state.js",
  "/ST-Insight/js/ui.js",

  "/ST-Insight/manifest.json"
];

// インストール時にキャッシュ
self.addEventListener("install",(event)=>{
	self.skipWaiting();
	
	event.waitUntil(
		caches.open(CACHE_NAME).then(cache=>{
			return cache.addAll(urlsToCache);
    })
  );
});

// 古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => cachedResponse);
    })
  );
});