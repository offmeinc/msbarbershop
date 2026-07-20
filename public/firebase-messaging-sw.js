self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const firebaseConfig = {
  projectId: "gen-lang-client-0419449301",
  appId: "1:122028701634:web:30bbacb9f7755d969ec85b",
  apiKey: "AIzaSyD4ZPKEi3EQbsI9uesSIxNzEd8BzWwBst8",
  authDomain: "gen-lang-client-0419449301.firebaseapp.com",
  storageBucket: "gen-lang-client-0419449301.firebasestorage.app",
  messagingSenderId: "122028701634",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1).catch(() => {});
  }
  
  // Custom display to ensure it shows up reliably when app is fully closed in PWA
  const title = payload.notification?.title || payload.data?.title || "MS BARBER SHOP";
  const body = payload.notification?.body || payload.data?.body || "Nova mensagem";
  const url = payload.data?.url || payload.fcmOptions?.link || "/";
  const icon = payload.notification?.icon || payload.data?.icon || "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg";
  
  return self.registration.showNotification(title, {
    body: body,
    icon: icon,
    badge: icon,
    data: { url },
    tag: payload.data?.tag || "fcm-bg-msg" + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200]
  });
});

// Fallback for native push events not caught by FCM SDK
self.addEventListener("push", (event) => {
  console.log("[SW] Push Event received", event);
  if (event.data) {
    try {
      const data = event.data.json();
      // Only handle if it doesn't look like a standard FCM notification payload that FCM handles itself
      if (!data.notification && data.data) {
        const title = data.data.title || "MS BARBER SHOP";
        const options = {
          body: data.data.body || "Nova notificação",
          icon: data.data.icon || "/favicon.ico",
          data: { url: data.data.url || "/" }
        };
        event.waitUntil(self.registration.showNotification(title, options));
      }
    } catch (e) {
      console.error("Error parsing push data", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  let url = event.notification.data?.url || "/";
  // Attempt to extract FCM fcmOptions link if present in native FCM push wrapper
  if (event.notification.data?.FCM_MSG?.fcmOptions?.link) {
    url = event.notification.data.FCM_MSG.fcmOptions.link;
  }
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
