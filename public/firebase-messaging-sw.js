self.addEventListener("push", (event) => {
  let title = "MS Barbearia";
  let body = "Nova notificação";
  let url = "/";

  try {
    if (event.data) {
      const data = event.data.json();
      title = data.notification?.title || data.data?.title || title;
      body = data.notification?.body || data.data?.body || body;
      url = data.data?.url || data.fcmOptions?.link || url;
    }
  } catch (err) {
    console.error("SW push parsing error:", err);
  }

  const options = {
    body,
    icon: "/icon.png",
    data: { url }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        if (navigator.setAppBadge) {
          navigator.setAppBadge(1).catch(() => {});
        }
      })
  );

  // Stop FCM from handling it and causing duplicates
  event.stopImmediatePropagation();
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
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

