import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Helper to convert base64 VAPID key to Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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

  const envVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!envVapidKey) {
    console.error("VAPID_PUBLIC_KEY is not defined in the environment. Push registration aborted.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });

    const applicationServerKey = urlBase64ToUint8Array(envVapidKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    const subJson = subscription.toJSON();
    const endpointHash = btoa(subJson.endpoint || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 50);

    await setDoc(doc(db, "push_subscriptions", endpointHash || userId), {
      userId,
      userRole,
      endpoint: subJson.endpoint,
      subscription: subJson,
      createdAt: new Date().toISOString()
    });

    return true;
  } catch (error: any) {
    console.warn("[Push Register] Failed.", error);
    return false;
  }
}
