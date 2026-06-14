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
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // If none, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
