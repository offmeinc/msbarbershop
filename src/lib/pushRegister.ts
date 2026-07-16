import { doc, setDoc } from "firebase/firestore";
import { db, messaging } from "./firebase";
import { getToken } from "firebase/messaging";

// Resolve backend paths
export function getBackendUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // Checking if running inside Capacitor native app webview
  const isCapacitor = typeof window !== "undefined" && (
    (window as any).Capacitor || 
    navigator.userAgent.includes("Capacitor") || 
    window.location.protocol === "file:" ||
    window.location.protocol.startsWith("capacitor")
  );

  // In native platforms (Capacitor), we must use VITE_BACKEND_URL because same-origin relative paths resolve to local assets
  if (isCapacitor) {
    const extBackend = import.meta.env?.VITE_BACKEND_URL;
    if (extBackend && extBackend.trim() !== "") {
      const baseUrl = extBackend.endsWith("/") ? extBackend.slice(0, -1) : extBackend;
      console.log(`[getBackendUrl] Capacitor environment path=${path}, result=${baseUrl}${cleanPath}`);
      return `${baseUrl}${cleanPath}`;
    }
  }
  
  // In standard web environments, always use relative same-origin paths.
  // This ensures immunity against CORS mismatches or mixed secure content issues.
  console.log(`[getBackendUrl] Web standard relative path=${path}, result=${cleanPath}`);
  return cleanPath;
}

// Check compatibility
export function queryNotificationSupport(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// Check current state of permission
export function getNotificationPermissionState(): NotificationPermission {
  if (!queryNotificationSupport()) return "denied";
  return Notification.permission;
}

// Register Push Service Worker and subscribe to Web Push
export async function setupPushSubscription(userId: string, userRole: string): Promise<boolean> {
  if (!queryNotificationSupport()) {
    console.warn("Notifications or PushManager not supported.");
    return false;
  }

  let envVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!envVapidKey) {
    try {
      const res = await fetch(getBackendUrl("/api/push/vapid-key"));
      if (res.ok) {
        const data = await res.json();
        envVapidKey = data.publicKey;
      }
    } catch (err) {
      console.warn("Could not dynamically fetch VAPID key from server:", err);
    }
  }

  if (!envVapidKey) {
    console.error("VAPID_PUBLIC_KEY is not defined in the environment. Push registration aborted.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    // Register our SW with FCM
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    try {
      await registration.update();
    } catch (e) { /* ignore */ }

    const msg = await messaging();
    if (!msg) {
       console.error("Firebase messaging not supported in this environment");
       return false;
    }

    const currentToken = await getToken(msg, {
      vapidKey: envVapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      // Save FCM Token to Firestore
      await setDoc(doc(db, "fcm_tokens", currentToken), {
        userId,
        userRole,
        token: currentToken,
        createdAt: new Date().toISOString()
      });
      console.log("FCM Token saved successfully.");
      return true;
    } else {
      console.warn("No registration token available. Request permission to generate one.");
      return false;
    }
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("[Push Register - FCM] Failed.", msg);
    return false;
  }
}

