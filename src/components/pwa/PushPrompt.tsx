import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShieldCheck, X, Zap, Share, Plus, Settings, AlertTriangle, Check, RefreshCw, Smartphone, ArrowUp } from 'lucide-react';
import { setupPushSubscription, getNotificationPermissionState } from '../../lib/pushRegister';
import { toast } from 'react-hot-toast';

interface PushPromptProps {
  userId?: string;
  userRole?: string;
}

export function PushPrompt({ userId, userRole }: PushPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [platformInfo, setPlatformInfo] = useState({ isIOS: false, isStandalone: false });

  useEffect(() => {
    // Detect platform and standalone state
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(navigator.userAgent);
    
    setPlatformInfo({ isIOS, isStandalone });

    if (!userId) return;

    const permission = getNotificationPermissionState();
    const dismissedAt = localStorage.getItem('ais_push_dismissed_at');
    const isRecentlyDismissed = dismissedAt && (Date.now() - parseInt(dismissedAt) < 7 * 24 * 60 * 60 * 1000); // 7 days dismissal

    if (isRecentlyDismissed) {
      return;
    }

    // iOS check: If not standalone, they need PWA installation.
    // If standalone, they need push permission.
    if (isIOS) {
      // Prompt either to install (if in Safari browser) or to activate notifications (if in Home Screen app)
      setShowPrompt(true);
    } else {
      // Android / Desktop standard prompt
      if (permission === 'default' || permission === 'denied') {
        setShowPrompt(true);
      }
    }
  }, [userId]);

  const handleEnable = async () => {
    let toastId = "";
    try {
      console.log("[PushPrompt] handleEnable clicked. userId:", userId, "userRole:", userRole);
      
      if (platformInfo.isIOS && !platformInfo.isStandalone) {
        // Not in PWA mode, show iOS guide instead of attempting standard registration (which fails in browser on iOS)
        setShowIOSGuide(true);
        return;
      }

      toastId = toast.loading("Iniciando ativação das notificações...");

      if (!userId || !userRole) {
        toast.error("Usuário não identificado. Por favor, faça login novamente.", { id: toastId });
        return;
      }
      
      const permissionState = getNotificationPermissionState();
      console.log("[PushPrompt] Current permission state:", permissionState);

      if (permissionState === 'denied') {
        toast.error("As notificações estão bloqueadas nas configurações do celular. Vá em Ajustes > Notificações > App MS Barber para permitir.", { id: toastId, duration: 8000 });
        return;
      }

      const success = await setupPushSubscription(userId, userRole, (stepMsg) => {
        toast.loading(stepMsg, { id: toastId });
      });

      if (success) {
        toast.success("Notificações push ativadas com sucesso! 🎉", { id: toastId });
        setShowPrompt(false);
      } else {
        toast.error("Não foi possível ativar as notificações.", { id: toastId, duration: 5000 });
      }
    } catch (err: any) {
      console.error("[PushPrompt] handleEnable error:", err);
      const errMsg = err.message || String(err);
      if (toastId) {
        toast.error(`Falha ao ativar: ${errMsg}`, { id: toastId, duration: 6000 });
      } else {
        toast.error(`Falha ao ativar: ${errMsg}`);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ais_push_dismissed_at', Date.now().toString());
  };

  if (!showPrompt || !isVisible) return null;

  const isIOSBrowser = platformInfo.isIOS && !platformInfo.isStandalone;
  const permissionState = getNotificationPermissionState();

  return (
    <>
      <AnimatePresence>
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[9999] md:bottom-8 md:right-8 md:left-auto md:max-w-sm"
        >
          <div className="bg-neutral-900/95 backdrop-blur-xl border border-amber-500/30 p-5 rounded-2xl shadow-2xl overflow-hidden relative group">
            {/* Animated Glow Background */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px] rounded-full group-hover:bg-amber-500/20 transition-all duration-500" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full group-hover:bg-red-500/20 transition-all duration-500" />

            <div className="relative flex flex-col gap-4">
              <div className="flex justify-between items-start">
                 <div className="p-2.5 bg-amber-500/10 rounded-xl">
                    <Bell className="w-5 h-5 text-amber-500 animate-pulse" />
                 </div>
                 <button
                   onClick={handleDismiss}
                   className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 transition-colors cursor-pointer"
                 >
                   <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="space-y-1">
                 <h3 className="text-sm font-black text-white flex items-center gap-2">
                   {isIOSBrowser ? 'Instalar App no iPhone 📱' : permissionState === 'denied' ? 'Ativar Notificações' : 'Não perca seus horários!'} <Zap className="w-3 h-3 text-amber-500" />
                 </h3>
                 <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
                   {isIOSBrowser
                      ? 'Para receber notificações com o app fechado no iPhone, você precisa instalá-lo em sua Tela de Início primeiro.'
                      : permissionState === 'denied'
                      ? 'As notificações estão bloqueadas nas configurações do seu celular. Ative para receber alertas em segundo plano.'
                      : 'Habilite as notificações push para receber alertas de novos agendamentos e atualizações importantes em tempo real.'
                   }
                 </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                 <button
                   onClick={handleEnable}
                   className="w-full bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.3)] cursor-pointer"
                 >
                   {isIOSBrowser ? <Share className="w-4 h-4" /> : permissionState === 'denied' ? <Settings className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                   {isIOSBrowser ? 'VER COMO INSTALAR NO IPHONE' : permissionState === 'denied' ? 'COMO PERMITIR NOS AJUSTES' : 'ATIVAR NOTIFICAÇÕES AGORA'}
                 </button>
                 <button 
                   onClick={handleDismiss}
                   className="w-full bg-transparent hover:bg-white/5 text-neutral-400 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                 >
                   Talvez mais tarde
                 </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Installation Guide Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-950 border border-white/10 max-w-md w-full rounded-[2.5rem] p-6 sm:p-8 space-y-6 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Smartphone className="w-6 h-6 text-amber-500" />
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Instalar no iPhone</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  A Apple exige que aplicativos Web (PWAs) sejam adicionados à tela inicial para que possam exibir notificações em segundo plano quando o aplicativo estiver fechado.
                </p>
              </div>

              {/* Step list */}
              <div className="space-y-4 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">1</div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-white uppercase">Abra no Safari</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">Verifique se você abriu o site diretamente no navegador <strong>Safari</strong> do iPhone. Não funcionará dentro do navegador do Instagram, Facebook ou Chrome.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">2</div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                      Toque em Compartilhar <ArrowUp className="w-3.5 h-3.5 text-neutral-400 bg-neutral-800 p-0.5 rounded" />
                    </h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">Na parte inferior da tela do Safari, toque no botão de <strong>Compartilhar</strong> (ícone de um quadrado com uma seta apontando para cima).</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">3</div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                      Adicionar à Tela de Início <Plus className="w-3.5 h-3.5 text-neutral-400 bg-neutral-800 p-0.5 rounded" />
                    </h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">Role a folha de compartilhamento para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>. Confirme tocando em Adicionar no topo direito.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">4</div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-white uppercase">Abra o App & Ative</h4>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">Toque no novo ícone criado na tela inicial do seu celular. Ao abrir, clique no botão de <strong>Ativar Notificações</strong> para concluir a configuração.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Entendi, vou fazer isso
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
