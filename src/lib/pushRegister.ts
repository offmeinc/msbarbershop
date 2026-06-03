import { collection, addDoc, getDocs, query, where, doc, updateDoc, setDoc } from "firebase/firestore";
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
  
  // Support custom backend domain via ENV when accessing directly
  const extBackend = import.meta.env?.VITE_BACKEND_URL;
  if (extBackend && extBackend.trim() !== "") {
    const baseUrl = extBackend.endsWith("/") ? extBackend.slice(0, -1) : extBackend;
    console.log(`[getBackendUrl] external origin path=${path}, result=${baseUrl}${cleanPath}`);
    return `${baseUrl}${cleanPath}`;
  }
  
  console.log(`[getBackendUrl] relative origin path=${path}, result=${cleanPath}`);
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
    console.warn("Notifications or PushManager not supported in this browser.");
    return false;
  }

  try {
    // 1. Request browser Notification access
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission was denied.");
      return false;
    }

    // 2. Register standard companion Service Worker
    console.log("[Push Register] Registering sw-push.js...");
    const registration = await navigator.serviceWorker.register("/sw-push.js", {
      scope: "/"
    });
    console.log("[Push Register] Service Worker registered. Scope:", registration.scope);

    // 3. Fetch VAPID public key from Server
    console.log("[Push Register] Fetching VAPID from server...");
    const res = await fetch(getBackendUrl("/api/push-config"));
    if (!res.ok) {
      throw new Error(`Failed to fetch VAPID config: ${res.statusText}`);
    }
    const { publicKey } = await res.json();
    if (!publicKey) {
      throw new Error("No VAPID Public Key found in server response.");
    }

    // 4. Register or retrieve push subscription
    console.log("[Push Register] Subscribing via pushManager...");
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log("[Push Register] Subscribed successfully. Endpoint:", subscription.endpoint);

    // 5. Save/Sync this subscription payload in Firestore
    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys) {
      throw new Error("Invalid subscription object retrieved.");
    }

    const endpointHash = btoa(subJson.endpoint).replace(/[^a-zA-Z0-9]/g, "").substring(0, 50);

    const subscriptionData = {
      userId,
      userRole,
      endpoint: subJson.endpoint,
      subscription: subJson,
      createdAt: new Date().toISOString()
    };

    // Store in firestore collection using endpoint hash as document ID
    await setDoc(doc(db, "push_subscriptions", endpointHash), subscriptionData);
    console.log("[Push Register] Subscription saved to Firestore under ID:", endpointHash);

    return true;
  } catch (error: any) {
    console.warn("[Push Register] Setup Push subscription skipped/failed.", error.message || error);
    return false;
  }
}
