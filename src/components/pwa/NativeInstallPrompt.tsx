import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, ArrowDown } from 'lucide-react';

export function NativeInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isStandalone) return;

    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install prompt if they haven't dismissed it recently
      const dismissedAt = localStorage.getItem('ais_install_dismissed_at');
      const isRecentlyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000);
      
      if (!isRecentlyDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowPrompt(false);
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ais_install_dismissed_at', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-neutral-900 border border-white/10 rounded-[2rem] p-5 shadow-2xl z-[9999]"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
            <Download className="w-5 h-5" />
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/5 rounded-xl text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-1">
          Instalar Aplicativo
        </h3>
        <p className="text-xs text-neutral-400 leading-relaxed mb-5">
          Instale o app oficial da MS Barber Shop para acesso mais rápido, modo offline e uma experiência superior no seu celular.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleInstallClick}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.2)] cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            INSTALAR AGORA
          </button>
          <button
            onClick={handleDismiss}
            className="w-full bg-transparent hover:bg-white/5 text-neutral-400 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            Agora Não
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
