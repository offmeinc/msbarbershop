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
export async function setupPushSubscription(
  userId: string, 
  userRole: string,
  onStepChange?: (msg: string) => void
): Promise<boolean> {
  if (!queryNotificationSupport()) {
    console.warn("Notifications or PushManager not supported.");
    onStepChange?.("Notificações não são suportadas neste navegador.");
    return false;
  }

  onStepChange?.("Buscando chaves de segurança...");
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
    onStepChange?.("Chave de segurança VAPID não encontrada no servidor.");
    return false;
  }

  // Request notification permission with fallback
  onStepChange?.("Aguardando permissão de notificação no navegador...");
  let permission: NotificationPermission;
  try {
    if (typeof Notification.requestPermission === "function") {
      // Modern promise structure with callback fallback for older/webview implementations
      permission = await new Promise<NotificationPermission>((resolve, reject) => {
        try {
          const p = Notification.requestPermission((res) => {
            resolve(res);
          });
          if (p && typeof p.then === "function") {
            p.then(resolve).catch(reject);
          }
        } catch (e) {
          Notification.requestPermission().then(resolve).catch(reject);
        }
      });
    } else {
      permission = Notification.permission;
    }
  } catch (err: any) {
    console.error("Error requesting notification permission:", err);
    onStepChange?.(`Permissão negada ou com erro: ${err.message || String(err)}`);
    return false;
  }

  if (permission !== "granted") {
    console.warn("Notification permission was not granted:", permission);
    onStepChange?.("Permissão de notificações negada pelo usuário.");
    return false;
  }

  // Register service worker with progress
  onStepChange?.("Registrando serviço em segundo plano (Service Worker)...");
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    try {
      await registration.update();
    } catch (e) { /* ignore */ }
  } catch (err: any) {
    console.error("Service worker registration failed:", err);
    onStepChange?.(`Falha no Service Worker: ${err.message || String(err)}`);
    return false;
  }

  // Get Firebase messaging client
  onStepChange?.("Conectando ao Firebase Cloud Messaging...");
  let msg;
  try {
    msg = await messaging();
    if (!msg) {
       console.error("Firebase messaging not supported in this environment");
       onStepChange?.("Mensagens Firebase não são suportadas neste dispositivo.");
       return false;
    }
  } catch (err: any) {
    console.error("Firebase messaging initialization failed:", err);
    onStepChange?.(`Erro de Conexão Firebase: ${err.message || String(err)}`);
    return false;
  }

  // Retrieve FCM token
  onStepChange?.("Gerando token de identificação push...");
  let currentToken = "";
  try {
    currentToken = await getToken(msg, {
      vapidKey: envVapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (err: any) {
    console.error("Error getting token:", err);
    onStepChange?.(`Erro ao gerar token push: ${err.message || String(err)}`);
    return false;
  }

  if (!currentToken) {
    console.warn("No registration token available. Request permission to generate one.");
    onStepChange?.("O navegador não retornou um token push válido.");
    return false;
  }

  // Save token to Firestore
  onStepChange?.("Salvando identificador no banco de dados...");
  try {
    await setDoc(doc(db, "fcm_tokens", currentToken), {
      userId,
      userRole,
      token: currentToken,
      createdAt: new Date().toISOString()
    });
    console.log("FCM Token saved successfully.");
    return true;
  } catch (err: any) {
    console.error("Error saving FCM token:", err);
    onStepChange?.(`Erro ao registrar no banco de dados: ${err.message || String(err)}`);
    return false;
  }
}

