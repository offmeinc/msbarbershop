/**
 * Utility to trigger secure and robust mobile haptic feedback using the HTML5 Vibration API.
 * Gracefully downgrades if the API is unsupported or if permission/user-gesture rules block it.
 */

/**
 * Light vibration pattern for normal buttons, selectors, taps/navigation
 */
export const triggerLightHaptic = () => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(15);
    } catch {
      // Ignore vibration errors browser security/sandboxing blocks
    }
  }
};

/**
 * Medium success vibration pattern for confirmation of booking, positive actions
 */
export const triggerSuccessHaptic = () => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(45);
    } catch {
      // Ignore
    }
  }
};

/**
 * Distinct double-vibration pattern for warns, cancellations or deletions
 */
export const triggerWarningHaptic = () => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([60, 50, 40]);
    } catch {
      // Ignore
    }
  }
};
