import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Force unregister buggy service workers during development
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('Unregistered old Service Worker');
    }
  });
}

// Automatically register service worker on load to qualify for PWA installation
/*
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw-push.js", { scope: "/" })
      .then((reg) => {
        console.log("[PWA] Service Worker registered on load successfully:", reg.scope);
        reg.update().catch(() => {}); // Force update to prevent old SW bugs
      })
      .catch((err) => {
        if (err.message?.includes("Failed to fetch") || String(err).includes("Failed to fetch")) {
           console.warn("[PWA] Service Worker fetch aborted (expected in dev preview)");
        } else {
           console.error("[PWA] Service Worker registration on load failed:", err);
        }
      });
  });
}
*/

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
