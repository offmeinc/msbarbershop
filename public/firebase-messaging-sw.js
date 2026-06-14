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

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Set badge to signal icon on Home Screen (iOS 17+)
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1).catch(function(e) { console.error('App badge failed:', e); });
  }

  // FCM will automatically show a notification if the payload has a 'notification' object.
  // We can customize it here if it's a 'data' only message.
  if (payload.data && !payload.notification) {
    const notificationTitle = payload.data.title || 'MS Barbearia';
    const notificationOptions = {
        body: payload.data.body,
        icon: '/icon.png',
        data: { url: payload.data.url }
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});
