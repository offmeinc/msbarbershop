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

// Register Push Service Worker and subscribe to OneSignal
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

  onStepChange?.("Solicitando permissão ao OneSignal...");
  
  try {
    if (typeof window !== "undefined" && (window as any).OneSignalDeferred) {
      return await new Promise<boolean>((resolve) => {
        (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === "function") {
              await OneSignal.Notifications.requestPermission();
              if (userId) {
                await OneSignal.login(userId);
              }
              onStepChange?.("Notificações ativadas com sucesso via OneSignal! ✨");
              resolve(true);
            } else {
              onStepChange?.("OneSignal restrito ao domínio oficial (msbarbershop.com.br) neste ambiente de preview.");
              resolve(false);
            }
          } catch (e: any) {
            console.error("OneSignal requestPermission error:", e);
            if (e?.message?.includes("Can only be used on") || String(e).includes("msbarbershop.com.br")) {
              onStepChange?.("Notificações push via OneSignal ativas para o domínio msbarbershop.com.br.");
            } else {
              onStepChange?.(`Erro ao ativar OneSignal: ${e?.message || e}`);
            }
            resolve(false);
          }
        });
      });
    } else {
      // If OneSignal script not loaded yet
      onStepChange?.("Inicializando OneSignal...");
      await new Promise(r => setTimeout(r, 1500));
      if (typeof window !== "undefined" && (window as any).OneSignalDeferred) {
        return await new Promise<boolean>((resolve) => {
          (window as any).OneSignalDeferred.push(async function(OneSignal: any) {
            try {
              if (OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === "function") {
                await OneSignal.Notifications.requestPermission();
                if (userId) {
                  await OneSignal.login(userId);
                }
                onStepChange?.("Notificações ativadas com sucesso via OneSignal! ✨");
                resolve(true);
              } else {
                resolve(false);
              }
            } catch (e: any) {
              resolve(false);
            }
          });
        });
      }
      onStepChange?.("SDK OneSignal indisponível neste navegador.");
      return false;
    }
  } catch (err: any) {
    console.error("Error setting up OneSignal push:", err);
    onStepChange?.(`Erro ao configurar notificações: ${err.message || String(err)}`);
    return false;
  }
}
