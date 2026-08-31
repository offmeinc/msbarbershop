importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

const firebaseConfig = {
  projectId: "gen-lang-client-0419449301",
  appId: "1:122028701634:web:30bbacb9f7755d969ec85b",
  apiKey: "AIzaSyD4ZPKEi3EQbsI9uesSIxNzEd8BzWwBst8",
  authDomain: "gen-lang-client-0419449301.firebaseapp.com",
  storageBucket: "gen-lang-client-0419449301.firebasestorage.app",
  messagingSenderId: "122028701634"
};

firebase.initializeApp(firebaseConfig);

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    if (navigator.setAppBadge) {
      navigator.setAppBadge(1).catch(() => {});
    }
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'MS BARBER SHOP';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Nova notificação',
      icon: payload.notification?.icon || payload.data?.icon || 'https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg',
      badge: 'https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg',
      data: { url: payload.data?.url || payload.fcmOptions?.link || '/' },
      vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.error("Error initializing firebase messaging in SW:", e);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(() => {});
  }
  
  let rawUrl = event.notification.data?.url || "/";
  if (event.notification.data?.FCM_MSG?.fcmOptions?.link) {
    rawUrl = event.notification.data.FCM_MSG.fcmOptions.link;
  }
  
  const baseUrl = "https://msbarbershop.com.br";
  let url = rawUrl;
  
  if (rawUrl.startsWith("/")) {
    url = (self.location && self.location.origin && !self.location.origin.includes("localhost") && !self.location.origin.includes("run.app")) 
      ? self.location.origin + rawUrl 
      : baseUrl + rawUrl;
  } else if (!rawUrl.startsWith("http")) {
    url = baseUrl + "/" + rawUrl;
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
