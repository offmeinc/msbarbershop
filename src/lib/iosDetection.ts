/**
 * iOS & iPadOS PWA Detection & Compatibility Utility
 * Supports iOS 16, 17, 18 through iOS 26, 27+ and iPadOS desktop-class WebKit.
 */

export interface IOSInfo {
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  version: number | null;
  versionString: string;
  isStandalone: boolean;
  isInAppBrowser: boolean;
  isSafari: boolean;
  supportsWebPush: boolean;
  supportsBadging: boolean;
}

export function getIOSInfo(): IOSInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isIOS: false,
      isIPad: false,
      isIPhone: false,
      version: null,
      versionString: "",
      isStandalone: false,
      isInAppBrowser: false,
      isSafari: false,
      supportsWebPush: false,
      supportsBadging: false,
    };
  }

  const ua = navigator.userAgent || "";
  const uaLower = ua.toLowerCase();

  // Modern iPad detection: Apple reports "MacIntel" with multiple touch points for iPads
  const isIPad =
    /ipad/.test(uaLower) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
  const isIPhone = /iphone|ipod/.test(uaLower);
  const isIOS = isIPhone || isIPad;

  // Extract iOS version (handles iOS 16, 17, 18, 26, 27, etc.)
  let version: number | null = null;
  let versionString = "";
  const match = ua.match(/OS (\d+)[_.](\d+)/i);
  if (match) {
    version = parseInt(match[1], 10);
    versionString = `${match[1]}.${match[2]}`;
  } else if (isIPad) {
    // If iPad in Safari desktop mode, check Version/xx.x
    const verMatch = ua.match(/Version\/(\d+)[_.](\d+)/i);
    if (verMatch) {
      version = parseInt(verMatch[1], 10);
      versionString = `${verMatch[1]}.${verMatch[2]}`;
    }
  }

  // Check standalone mode (PWA installed on Home Screen)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    Boolean(document.referrer && document.referrer.includes("apple-app://"));

  // Check In-App Browsers (Instagram, Facebook, WhatsApp, Messenger, etc.)
  const isInAppBrowser =
    isIOS &&
    /(instagram|fbav|fban|line|micromessenger|bytedance|tiktok|snapchat|gsa\/)/i.test(
      uaLower
    );

  // Check if real Safari (not Chrome or Firefox on iOS, which cannot add to home screen directly)
  const isSafari =
    isIOS &&
    /safari/i.test(uaLower) &&
    !/crios|fxios|edgios|opios/i.test(uaLower) &&
    !isInAppBrowser;

  // Web Push on iOS: supported from iOS 16.4+ (including iOS 26 and 27) ONLY in standalone mode
  const supportsWebPush = isIOS
    ? Boolean(isStandalone && "serviceWorker" in navigator && "PushManager" in window)
    : Boolean("serviceWorker" in navigator && "PushManager" in window);

  // Badging on iOS: supported in standalone mode
  const supportsBadging = isIOS
    ? Boolean(isStandalone && "setAppBadge" in navigator)
    : Boolean("setAppBadge" in navigator);

  return {
    isIOS,
    isIPad,
    isIPhone,
    version,
    versionString,
    isStandalone,
    isInAppBrowser,
    isSafari,
    supportsWebPush,
    supportsBadging,
  };
}

/**
 * Returns user-friendly install guidance for iOS users
 */
export function getIOSInstallInstructions(iosInfo = getIOSInfo()) {
  if (!iosInfo.isIOS) return null;

  if (iosInfo.isInAppBrowser) {
    return {
      type: "in_app_browser" as const,
      title: "Abrir no Safari",
      description:
        "Você está visualizando dentro de outro aplicativo. Para instalar na Tela de Início do iPhone, toque nos três pontinhos (...) e selecione 'Abrir no Safari'.",
    };
  }

  if (!iosInfo.isSafari) {
    return {
      type: "alternative_browser" as const,
      title: "Usar o Safari para Instalar",
      description:
        "No iOS, a Apple permite adicionar à Tela de Início apenas através do navegador Safari. Abra este link diretamente no Safari.",
    };
  }

  return {
    type: "safari_standard" as const,
    title: "Instalar na Tela de Início",
    description:
      "Toque no botão Compartilhar (ícone com seta para cima) na barra inferior do Safari e selecione 'Adicionar à Tela de Início'.",
  };
}
