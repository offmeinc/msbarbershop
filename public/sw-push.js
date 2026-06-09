// Companion Service Worker with Caching Capabilities of PWA & Push Notifications
const CACHE_NAME = "ms-barber-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg"
];

// 1. Install Event (Precache essential offline materials)
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async function (cache) {
      console.log("[PWA] Installing Service Worker and caching assets individually...");
      for (const asset of ASSETS_TO_CACHE) {
        try {
          const fetchOptions = asset.startsWith("http") ? { mode: "no-cors" } : {};
          const response = await fetch(asset, fetchOptions);
          // cache.put handles response.type === 'opaque' for no-cors responses perfectly
          await cache.put(asset, response);
          console.log(`[PWA] Cached asset successfully: ${asset}`);
        } catch (err) {
          console.warn(`[PWA] Optional asset cache skipped: ${asset}`, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event (Clear old caches and take immediate control)
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.filter(function (cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event (Cache assets offline while ignoring API/Firebase queries to keep operations dynamic)
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const url = event.request.url;

  // Only intercept same-origin static assets to prevent interfering with third-party APIs (like Google Calendar, Cloud Storage, webhooks, etc.)
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Ignore firestore, API endpoints, external auth systems or raw Vite live development assets/hot reloads
  if (
    url.includes("/api/") || 
    url.includes("firestore.googleapis") || 
    url.includes("identitytoolkit") ||
    url.includes("securetoken.googleapis") ||
    url.includes("/node_modules/") ||
    url.includes("/@vite/") ||
    url.includes("/@react-refresh") ||
    url.includes("/src/") ||
    url.includes("vite") ||
    url.includes("hot-reload")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        // If response is pristine, clone and keep in cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(function (error) {
        return caches.match(event.request).then(function (cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Redirect navigation fallbacks to root index
          if (event.request.mode === "navigate") {
            return caches.match("/index.html").then(function (indexResponse) {
              if (indexResponse) {
                return indexResponse;
              }
              throw error;
            });
          }
          // Rethrow the fetch error so we don't return undefined (which browser converts to 'Failed to fetch' error)
          throw error;
        });
      })
  );
});

// 4. Companion Web Push Notifications
self.addEventListener("push", function (event) {
  console.log("[Service Worker] Push Notification Received.");
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { 
        title: "Agendador MS BARBER SHOP", 
        body: event.data.text() 
      };
    }
  }

  const title = data.title || "MS BARBER SHOP 💈";
  const options = {
    body: data.body || "Você tem um novo aviso sobre seu agendamento!",
    icon: data.icon || "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg",
    badge: data.badge || "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg",
    data: {
      url: data.url || "/"
    },
    vibrate: [150, 60, 150],
    actions: [
      { action: "open", title: "Ver Detalhes ⚡" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification clicked.");
  event.notification.close();

  let urlToOpen = "/";
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
