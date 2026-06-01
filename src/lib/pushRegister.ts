import { collection, addDoc, getDocs, query, where, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { safeFetch } from "./api";

// Helper to convert base64 VAPID key to Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String || typeof base64String !== 'string') {
    console.error("[Push Register] VAPID key is missing or not a string", base64String);
    throw new Error("VAPID public key is missing or invalid");
  }

  // Sanitize: trim extra spaces, remove surrounding quotes often present in env vars
  let sanitized = base64String.trim().replace(/^["']|["']$/g, "");
  
  // Standard Base64 vs Base64URL conversion
  const padding = "=".repeat((4 - (sanitized.length % 4)) % 4);
  const base64 = (sanitized + padding).replace(/-/g, "+").replace(/_/g, "/");

  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error("[Push Register] Failed to decode base64 VAPID key. Input was:", base64String, "Sanitized base64 was:", base64);
    throw new Error("The string did not match the expected pattern. (Invalid VAPID format)");
  }
}

// Dynamically resolve backend URLs to direct API requests to the active Cloud Run container
// whenever the application is loaded on custom domains (e.g., msbarbershop.com.br)
export function getBackendUrl(path: string): string {
  if (typeof window === "undefined") return path;
  
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  
  // 1. Try environment variable
  const envBackendUrl = (import.meta as any).env.VITE_BACKEND_URL;
  if (envBackendUrl && envBackendUrl.trim() !== "") {
    const cleanBase = envBackendUrl.endsWith("/") ? envBackendUrl.slice(0, -1) : envBackendUrl;
    return `${cleanBase}${cleanPath}`;
  }

  // 2. Check for Capacitor/Mobile environment
  const isCapacitor = (window as any).Capacitor !== undefined || 
                      window.location.protocol === 'capacitor:' || 
                      window.location.protocol === 'http-extension:';
  
  if (isCapacitor) {
    // If on mobile without VITE_BACKEND_URL, relative paths will 404
    console.warn(`[getBackendUrl] Capacitor detected. Backend calls to ${cleanPath} will likely fail without VITE_BACKEND_URL absolute URL.`);
  }

  // 3. Check for custom domain
  const isCustomDomain = window.location.hostname !== 'localhost' && 
                         !window.location.hostname.endsWith('.run.app') &&
                         !window.location.hostname.includes('aistudio.google.com');

  if (isCustomDomain) {
    console.warn(`[getBackendUrl] Custom domain ${window.location.hostname} detected. If not proxying /api, set VITE_BACKEND_URL.`);
  }

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
    console.log("[Push Register] Service Worker registered:", registration);

    // 3. Fetch VAPID public key from Server
    console.log("[Push Register] Fetching VAPID from server...");
    const data = await safeFetch("/api/push-config");
    const { publicKey } = data;
    if (!publicKey) {
      throw new Error("No VAPID Public Key found in server response.");
    }

    // 4. Register or retrieve push subscription
    console.log("[Push Register] Subscribing via pushManager...");
    if (!publicKey || typeof publicKey !== 'string') {
      throw new Error("Chave VAPID inválida ou faltando.");
    }
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log("[Push Register] Subscribed successfully!", subscription);

    // 5. Save/Sync this subscription payload in Firestore
    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys) {
      throw new Error("Invalid subscription object retrieved.");
    }

    // Use a safer way to generate a unique ID for the subscription that doesn't involve unsafe btoa
    // We can use a simple hash or just a sanitized version of the endpoint
    const endpointHash = subJson.endpoint.split("/").pop() || "sub-" + Date.now();

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
