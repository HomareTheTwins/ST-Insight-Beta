const CACHE_NAME = "ST-Insight-beta-v0.9.1";
const BASE_PATH = "/ST-Insight-Beta/";

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "style.css",

  BASE_PATH + "js/app.js",
  BASE_PATH + "js/history.js",
  BASE_PATH + "js/serve.js",
  BASE_PATH + "js/state.js",
  BASE_PATH + "js/ui.js",

  BASE_PATH + "manifest.json"
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