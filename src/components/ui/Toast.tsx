import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toast: ToastMessage | { action: 'REMOVE'; id: string }) => void;
const listeners = new Set<Listener>();

export const toast = {
  success: (message: string) => emitToast(message, 'success'),
  error: (message: string) => emitToast(message, 'error'),
  info: (message: string) => emitToast(message, 'info'),
};

function emitToast(message: string, type: ToastType) {
  const id = Math.random().toString(36).substr(2, 9);
  const toastMsg = { id, message, type };
  listeners.forEach((l) => l(toastMsg));
  
  setTimeout(() => {
    listeners.forEach((l) => l({ action: 'REMOVE', id }));
  }, 4000);
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (event: ToastMessage | { action: 'REMOVE'; id: string }) => {
      if ('action' in event && event.action === 'REMOVE') {
        setToasts((prev) => prev.filter((t) => t.id !== event.id));
      } else {
        setToasts((prev) => [...prev, event as ToastMessage]);
      }
    };
    
    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  return (
    <div className="fixed top-[calc(6rem+env(safe-area-inset-top))] right-0 md:right-4 z-[99999] flex flex-col gap-2 pointer-events-none w-full md:max-w-sm px-4 md:px-0 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg shadow-black/40 border backdrop-blur-xl ${
              t.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
              t.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
              'bg-blue-500/20 border-blue-500/30 text-blue-400'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
            
            <p className="text-sm font-medium flex-1 text-white">{t.message}</p>
            
            <button 
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
