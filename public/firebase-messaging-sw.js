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

// Fallback and direct handler for push events to guarantee delivery in iOS Safari background
self.addEventListener("push", (event) => {
  console.log("[SW] Push Event received", event);
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log("[SW] Parsed push payload:", payload);
      
      const notification = payload.notification || {};
      const dataPayload = payload.data || {};
      
      const title = notification.title || dataPayload.title || "MS BARBER SHOP";
      const body = notification.body || dataPayload.body || "Nova notificação";
      const url = dataPayload.url || notification.click_action || "/";
      const icon = dataPayload.icon || notification.icon || "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg";
      
      // Use a consistent tag to prevent duplicate alerts on platforms that trigger twice
      const tag = dataPayload.tag || notification.tag || "fcm-push-msg";
      
      const options = {
        body: body,
        icon: icon,
        badge: icon,
        data: { url: url },
        tag: tag,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      };
      
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error("[SW] Push Event parsing error, falling back to raw text:", e);
      const text = event.data.text();
      if (text) {
        event.waitUntil(
          self.registration.showNotification("MS BARBER SHOP", {
            body: text,
            icon: "https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg",
            tag: "fcm-push-msg-raw",
            requireInteraction: true
          })
        );
      }
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
