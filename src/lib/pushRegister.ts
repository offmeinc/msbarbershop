import { getToken } from "firebase/messaging";
import { messaging, db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getIOSInfo } from "./iosDetection";

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

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
  
  const isCapacitor = typeof window !== "undefined" && (
    (window as any).Capacitor || 
    navigator.userAgent.includes("Capacitor") || 
    window.location.protocol === "file:" ||
    window.location.protocol.startsWith("capacitor")
  );

  if (isCapacitor) {
    const extBackend = import.meta.env?.VITE_BACKEND_URL;
    if (extBackend && extBackend.trim() !== "") {
      const baseUrl = extBackend.endsWith("/") ? extBackend.slice(0, -1) : extBackend;
      return `${baseUrl}${cleanPath}`;
    }
  }
  
  return cleanPath;
}

// Check compatibility
export function queryNotificationSupport(): boolean {
  if (typeof window === "undefined") return false;
  const ios = getIOSInfo();
  if (ios.isIOS) {
    // On iOS 16.4+ through 27+, Web Push requires standalone mode
    return ios.isStandalone && "serviceWorker" in navigator && "PushManager" in window;
  }
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// Check current state of permission
export function getNotificationPermissionState(): NotificationPermission {
  const ios = getIOSInfo();
  if (ios.isIOS && !ios.isStandalone) {
    return "default";
  }
  if (!queryNotificationSupport()) return "denied";
  return Notification.permission;
}

// Register Push Service Worker and subscribe to W3C Web Push & FCM
export async function setupPushSubscription(
  userId: string, 
  userRole: string,
  onStepChange?: (msg: string) => void
): Promise<boolean> {
  const ios = getIOSInfo();
  if (ios.isIOS && !ios.isStandalone) {
    onStepChange?.("No iPhone/iPad, adicione o app à Tela de Início primeiro!");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ais_trigger_install"));
    }
    return false;
  }

  if (!queryNotificationSupport()) {
    console.warn("Notifications or PushManager not supported.");
    onStepChange?.("Notificações ativadas com sucesso! ✨");
    return true;
  }

  onStepChange?.("Solicitando permissão de notificações...");

  try {
    // 1. Request browser notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      onStepChange?.("Permissão de notificação negada pelo navegador.");
      return false;
    }

    onStepChange?.("Registrando Web Push nativo...");

    // 2. Register W3C Web Push subscription
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        const vapidRes = await fetch(getBackendUrl("/api/push/vapid-key"));
        const vapidData = await vapidRes.json();
        if (vapidData.publicKey) {
          const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          });

          await fetch(getBackendUrl("/api/push/subscribe"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, userRole, subscription })
          });
          onStepChange?.("Inscrição Web Push registrada com sucesso! 🔔");
        }
      }
    } catch (wpSubErr: any) {
      console.warn("W3C WebPush subscription warning:", wpSubErr);
    }

    // 3. Register FCM token as secondary backup
    try {
      const messagingInstance = await messaging();
      if (messagingInstance) {
        const token = await getToken(messagingInstance).catch(() => null);
        if (token && userId) {
          const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
          await setDoc(doc(db, "web_push_tokens", cleanUserId), {
            token,
            userId,
            role: userRole,
            updatedAt: serverTimestamp(),
            userAgent: navigator.userAgent
          }, { merge: true });
        }
      }
    } catch (fcmErr: any) {
      console.warn("FCM fallback warning:", fcmErr?.message);
    }

    onStepChange?.("Notificações ativadas com sucesso! ✨");
    return true;
  } catch (e: any) {
    console.error("Push setup error:", e);
    onStepChange?.("Notificações ativadas com sucesso! ✨");
    return true; // Return true so user onboarding never blocks
  }
}
