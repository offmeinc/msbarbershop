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
  
  if (payload.data && !payload.notification) {
    let title = payload.data.title || "MS BARBER SHOP";
    let body = payload.data.body || "Nova notificação";
    let url = payload.data.url || "/";
    let icon = payload.data.icon || "/icon.png";
    
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url }
    });
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
