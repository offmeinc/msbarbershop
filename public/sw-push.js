// Companion Service Worker for Browser Web Push notifications
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
    icon: data.icon || "/logo.png",
    badge: data.badge || "/logo.png",
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

  // Find if there is an existing window of our application open
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
