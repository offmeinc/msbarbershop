import { useState, useEffect } from 'react';

export function useDebugMode() {
  const [isDebug, setIsDebug] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ais_debug_mode') === 'true';
  });

  useEffect(() => {
    const handleStorage = () => {
      setIsDebug(localStorage.getItem('ais_debug_mode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return isDebug;
}
