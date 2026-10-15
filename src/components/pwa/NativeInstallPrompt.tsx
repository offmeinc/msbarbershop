import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share, PlusSquare, ArrowRight, Check } from 'lucide-react';

export function NativeInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isStandalone) return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissedAt = localStorage.getItem('ais_install_dismissed_at');
      const isRecentlyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000);
      
      if (!isRecentlyDismissed) {
        setShowPrompt(true);
      }
    };

    // If on iOS and not dismissed recently, show the prompt
    if (isIOSDevice) {
      const dismissedAt = localStorage.getItem('ais_install_dismissed_at');
      const isRecentlyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000);
      if (!isRecentlyDismissed) {
        setShowPrompt(true);
      }
    }

    // Listen for manual trigger from settings or header
    const handleManualTrigger = () => {
      if (isIOSDevice) {
        setShowIOSModal(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('ais_trigger_install', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('ais_trigger_install', handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) return;
    setShowPrompt(false);
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ais_install_dismissed_at', Date.now().toString());
  };

  return (
    <>
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-neutral-950/95 backdrop-blur-xl border border-amber-500/20 rounded-[2rem] p-5 shadow-2xl z-[9999]"
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
              Instalar Aplicativo PWA
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-5">
              Instale o app oficial da MS Barber Shop para acesso instantâneo na tela inicial, funcionamento ultra-rápido e lembretes de corte.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleInstallClick}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                {isIOS ? "COMO INSTALAR NO IPHONE" : "INSTALAR AGORA NO CELULAR"}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full bg-transparent hover:bg-white/5 text-neutral-400 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Agora Não
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Step-by-Step Installation Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div 
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-950 border border-amber-500/30 rounded-[2.5rem] max-w-sm w-full p-6 shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                      Instalar no iPhone / iPad
                    </h3>
                    <p className="text-[10px] text-neutral-400">Em 3 passos rápidos pelo Safari</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start gap-3 bg-neutral-900/80 p-3 rounded-2xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      Toque em Compartilhar <Share className="w-3.5 h-3.5 text-blue-400 inline" />
                    </p>
                    <p className="text-neutral-400 text-[11px] leading-tight mt-0.5">
                      No menu inferior do Safari, clique no ícone quadrado com a seta para cima.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-neutral-900/80 p-3 rounded-2xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      Adicionar à Tela de Início <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" />
                    </p>
                    <p className="text-neutral-400 text-[11px] leading-tight mt-0.5">
                      Role a lista de ações para baixo e toque em &quot;Adicionar à Tela de Início&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-neutral-900/80 p-3 rounded-2xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      Confirmar Adição <Check className="w-3.5 h-3.5 text-emerald-400 inline" />
                    </p>
                    <p className="text-neutral-400 text-[11px] leading-tight mt-0.5">
                      Toque em &quot;Adicionar&quot; no canto superior direito para fixar o ícone da barbearia.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs tracking-wider transition-all cursor-pointer mt-2"
              >
                Entendi, Vou Adicionar!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
