import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Patch console to prevent AI Studio interceptor from crashing on cyclic objects
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function sanitizeArgs(args: any[]) {
  return args.map(arg => {
    if (arg instanceof Error) {
      return `[Error: ${arg.message}]\n${arg.stack}`;
    }
    if (typeof arg === 'object' && arg !== null) {
      try {
        JSON.stringify(arg);
        return arg;
      } catch (e) {
        return `[Unserializable/Cyclic Object: ${arg.constructor?.name || 'Object'}]`;
      }
    }
    return arg;
  });
}

console.log = (...args) => originalConsoleLog(...sanitizeArgs(args));
console.error = (...args) => originalConsoleError(...sanitizeArgs(args));
console.warn = (...args) => originalConsoleWarn(...sanitizeArgs(args));

// Automatically register service worker on load to qualify for PWA installation
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
