import { useState, useEffect } from "react";

// Shared state for all hook instances to ensure perfect global synchronization
let listeners: Array<(val: boolean) => void> = [];

const getInitialFanMode = (): boolean => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("copa2026_fan_mode");
    if (saved !== null) {
      return saved === "true";
    }
  }
  return false;
};

let globalFanMode = getInitialFanMode();

const setGlobalFanMode = (newValue: boolean) => {
  globalFanMode = newValue;
  if (typeof window !== "undefined") {
    localStorage.setItem("copa2026_fan_mode", newValue ? "true" : "false");
    
    // Apply class to document element immediately
    if (newValue) {
      document.documentElement.classList.add("fan-mode-active");
    } else {
      document.documentElement.classList.remove("fan-mode-active");
    }
  }
  
  // Notify all active listeners
  listeners.forEach((listener) => listener(newValue));
};

export function useFanMode() {
  const [isFanMode, setIsFanModeState] = useState<boolean>(globalFanMode);

  useEffect(() => {
    // Add current component's state setter to subscribers list
    listeners.push(setIsFanModeState);
    
    // Initialize current styles correctly according to local storage value
    if (typeof window !== "undefined") {
      if (globalFanMode) {
        document.documentElement.classList.add("fan-mode-active");
      } else {
        document.documentElement.classList.remove("fan-mode-active");
      }
    }

    // Handle cross-tab or frame storage events to sync state automatically
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "copa2026_fan_mode" && e.newValue !== null) {
        const nextValue = e.newValue === "true";
        if (nextValue !== globalFanMode) {
          setGlobalFanMode(nextValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      listeners = listeners.filter((l) => l !== setIsFanModeState);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const setIsFanMode = (val: boolean) => {
    setGlobalFanMode(val);
  };

  return [isFanMode, setIsFanMode] as const;
}
