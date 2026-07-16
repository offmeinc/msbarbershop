import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ShieldCheck, X, Zap } from 'lucide-react';
import { setupPushSubscription, getNotificationPermissionState } from '../../lib/pushRegister';
import { toast } from 'react-hot-toast';

interface PushPromptProps {
  userId?: string;
  userRole?: string;
}

export function PushPrompt({ userId, userRole }: PushPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Check if running in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // 2. Check if we have a user
    if (!userId) return;

    // 3. Check notification permission state
    const permission = getNotificationPermissionState();

    // On iOS, we ONLY want to push this if they are in standalone mode
    // because that's the only way background push works there.
    if (isStandalone) {
       if (permission === 'default' || (permission === 'denied' && !localStorage.getItem('ais_push_dismissed'))) {
          setShowPrompt(true);
       }
    }
  }, [userId]);

  const handleEnable = async () => {
    let toastId = "";
    try {
      console.log("[PushPrompt] handleEnable clicked. userId:", userId, "userRole:", userRole);
      
      toastId = toast.loading("Iniciando ativação das notificações...");

      if (!userId || !userRole) {
        toast.error("Usuário não identificado. Por favor, faça login novamente.", { id: toastId });
        return;
      }
      
      const permissionState = getNotificationPermissionState();
      console.log("[PushPrompt] Current permission state:", permissionState);

      // If permission is already denied, we can't request it. Just guide them.
      if (permissionState === 'denied') {
        toast.error("As notificações estão bloqueadas. Vá em Ajustes > Notificações > App MS Barber para permitir.", { id: toastId, duration: 6000 });
        return;
      }

      const success = await setupPushSubscription(userId, userRole, (stepMsg) => {
        toast.loading(stepMsg, { id: toastId });
      });

      if (success) {
        toast.success("Notificações push ativadas com sucesso! 🎉", { id: toastId });
        setShowPrompt(false);
      } else {
        toast.error("Não foi possível ativar as notificações. Verifique se o app está instalado na tela inicial.", { id: toastId, duration: 5000 });
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

  if (!showPrompt || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-[9999] md:bottom-8 md:right-8 md:left-auto md:max-w-sm"
      >
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl overflow-hidden relative group">
          {/* Animated Glow Background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px] rounded-full group-hover:bg-amber-500/20 transition-all duration-500" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500/10 blur-[100px] rounded-full group-hover:bg-red-500/20 transition-all duration-500" />

          <div className="relative flex flex-col gap-4">
            <div className="flex justify-between items-start">
               <div className="p-2.5 bg-amber-500/10 rounded-xl">
                  <Bell className="w-5 h-5 text-amber-500 animate-pulse" />
               </div>
               <button 
                 onClick={() => {
                   setIsVisible(false);
                   localStorage.setItem('ais_push_dismissed', 'true');
                 }}
                 className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 transition-colors"
                >
                 <X className="w-4 h-4" />
               </button>
            </div>

            <div className="space-y-1">
               <h3 className="text-sm font-black text-white flex items-center gap-2">
                 {getNotificationPermissionState() === 'denied' ? 'Ativar nas Configurações' : 'Ativar Alertas Push'} <Zap className="w-3 h-3 text-amber-500" />
               </h3>
               <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
                 {getNotificationPermissionState() === 'denied' 
                    ? 'As notificações estão bloqueadas nas configurações do seu celular. Para receber avisos, você precisa permitir manualmente.'
                    : 'Receba lembretes de agendamentos e atualizações importantes diretamente no seu celular.'
                 }
               </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
               <button 
                 onClick={handleEnable}
                 className="w-full bg-amber-500 hover:bg-amber-600 text-black py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
               >
                 {getNotificationPermissionState() === 'denied' ? <ShieldCheck className="w-4 h-4" /> : <Bell className="w-4 h-4" />} 
                 {getNotificationPermissionState() === 'denied' ? 'VER COMO ATIVAR' : 'ATIVAR AGORA'}
               </button>
               <p className="text-[9px] text-neutral-600 text-center font-bold uppercase tracking-tight">
                 Exclusivo para app instalado na tela inicial
               </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
