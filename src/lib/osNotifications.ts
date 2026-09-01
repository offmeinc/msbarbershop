// Robust OS Push and Audio Notification utility

export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Play a gentle two-tone chime
    const now = ctx.currentTime;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.3);
    
    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn("Audio chime error:", e);
  }
}

export async function triggerOsPushNotification(title: string, body: string, url: string = "/") {
  // 1. Play audio chime
  playNotificationChime();

  // 2. Check browser permission
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    } catch (e) {
      return;
    }
  }

  // 3. Fire OS Native Notification
  try {
    const options: any = {
      body,
      icon: "/logo.jpg",
      badge: "/logo.jpg",
      vibrate: [200, 100, 200],
      tag: "ms-barber-notification",
      data: { url }
    };

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === "function") {
        await registration.showNotification(title, options);
        return;
      }
    }

    // Fallback to standard Notification constructor
    const notification = new Notification(title, options);
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (url && typeof window !== "undefined") {
        window.location.href = url;
      }
      notification.close();
    };
  } catch (err) {
    console.warn("OS Push notification fallback error:", err);
  }
}
