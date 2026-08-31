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

// Register Push Service Worker and subscribe to OneSignal with robust timeout and fallback
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

  onStepChange?.("Solicitando permissão de notificações...");

  return await new Promise<boolean>((resolve) => {
    let resolved = false;

    // Timeout fallback after 5 seconds so it never hangs indefinitely
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn("[Push] OneSignal setup timed out, attempting native notification permission fallback...");
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            onStepChange?.("Notificações ativadas com sucesso! ✨");
            resolve(true);
          } else {
            onStepChange?.("Permissão de notificação negada.");
            resolve(false);
          }
        }).catch(() => {
          onStepChange?.("Não foi possível ativar as notificações.");
          resolve(false);
        });
      }
    }, 5000);

    const tryOneSignal = async () => {
      try {
        const OneSignal = (window as any).OneSignal || (window as any).OneSignalDeferred;
        
        if (typeof window !== "undefined" && (window as any).OneSignal && typeof (window as any).OneSignal.Notifications?.requestPermission === "function") {
          const os = (window as any).OneSignal;
          await os.Notifications.requestPermission();
          if (userId && typeof os.login === "function") {
            try {
              await os.login(userId);
            } catch (err) {
              console.warn("OneSignal login warning:", err);
            }
          }
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            onStepChange?.("Notificações ativadas com sucesso via OneSignal! ✨");
            resolve(true);
          }
          return;
        }

        // Fallback to standard Notification API
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            onStepChange?.("Notificações ativadas com sucesso! ✨");
            resolve(true);
          }
        } else {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            onStepChange?.("Permissão de notificação não concedida.");
            resolve(false);
          }
        }
      } catch (e: any) {
        console.error("Push setup error:", e);
        // Try native notification permission as final fallback
        Notification.requestPermission().then((perm) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(perm === 'granted');
          }
        }).catch(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(false);
          }
        });
      }
    };

    if (typeof window !== "undefined" && (window as any).OneSignal) {
      tryOneSignal();
    } else if (typeof window !== "undefined" && (window as any).OneSignalDeferred) {
      (window as any).OneSignalDeferred.push(async () => {
        await tryOneSignal();
      });
    } else {
      tryOneSignal();
    }
  });
}
