const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldOnMessage = `      onMessage(msg, (payload) => {
        console.log("Foreground message received:", payload);
        const title = payload.notification?.title || payload.data?.title || "Nova Notificação";
        const body = payload.notification?.body || payload.data?.body || "";
        toast.success(\`\${title}: \${body}\`);
      });`;

const newOnMessage = `      let toastTimeout: any;
      onMessage(msg, (payload) => {
        console.log("Foreground message received:", payload);
        const title = payload.notification?.title || payload.data?.title || "Nova Notificação";
        const body = payload.notification?.body || payload.data?.body || "";
        
        // Debounce to prevent 300 popups if a massive queue is delivered
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
           toast.success(\`\${title}: \${body}\`);
           
           // Optionally force a system notification if they want it even while app is open
           if (Notification.permission === 'granted') {
             try {
                new Notification(title, { body, icon: '/icon-192x192.png' });
             } catch (e) {
                // If standard Notification constructor fails, try Service Worker (e.g., mobile Safari)
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, { body, icon: '/icon-192x192.png' });
                });
             }
           }
        }, 300);
      });`;

code = code.replace(oldOnMessage, newOnMessage);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed onMessage spam in App.tsx');
