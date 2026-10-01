import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Scissors, 
  CalendarCheck, 
  MessageCircle, 
  Clock, 
  Sparkles, 
  X, 
  AlertCircle,
  Calendar,
  Flame,
  ArrowRight
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BARBERSHOP_NAME, BARBERSHOP_PHONE } from "../../constants";
import { triggerLightHaptic } from "../../lib/haptics";

interface HaircutRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNow: () => void;
  clientName?: string;
  lastAppointment?: any;
  daysSinceLastCut: number;
}

export function HaircutRenewalModal({
  isOpen,
  onClose,
  onBookNow,
  clientName,
  lastAppointment,
  daysSinceLastCut
}: HaircutRenewalModalProps) {
  const [snoozeDays, setSnoozeDays] = useState(3);

  if (!isOpen) return null;

  const barberName = lastAppointment?.barberName || "seu barbeiro favorito";
  const serviceName = lastAppointment?.serviceName || "Corte";
  const firstName = clientName ? clientName.split(" ")[0] : "Amigo";

  const handleSnooze = () => {
    triggerLightHaptic();
    // Snooze for 3 days
    const snoozeUntil = Date.now() + snoozeDays * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem("haircut_reminder_snooze_until", snoozeUntil.toString());
    } catch (e) {}
    onClose();
  };

  const handleBook = () => {
    triggerLightHaptic();
    // Mark as seen/acknowledged
    try {
      localStorage.setItem("haircut_reminder_snooze_until", (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    } catch (e) {}
    onBookNow();
  };

  const whatsappMessage = `Olá! Me chamo ${firstName} e gostaria de agendar meu horário para renovar o corte na ${BARBERSHOP_NAME}!`;
  const whatsappUrl = `https://wa.me/${BARBERSHOP_PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="liquid-glass border border-amber-500/30 bg-neutral-950/95 w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden"
        >
          {/* Ambient Gold Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-2xl liquid-glass hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer z-10"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2 relative z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                <Scissors className="w-8 h-8 animate-bounce" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center shadow-md">
                !
              </span>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em]">Lembrete de Manutenção</span>
              </div>
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">
                Hora de Renovar seu <span className="text-amber-500">Corte!</span>
              </h3>
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-4 relative z-10 text-center">
            <p className="text-xs text-neutral-300 leading-relaxed font-medium">
              Fala, <strong className="text-white font-black">{firstName}</strong>! Já se passaram{" "}
              <span className="text-amber-400 font-black px-1.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 inline-block">
                {daysSinceLastCut} dias
              </span>{" "}
              desde o seu último atendimento com <strong className="text-white font-bold">{barberName}</strong>.
            </p>

            {/* Visual Timeline bar */}
            <div className="liquid-glass p-3.5 rounded-2xl border border-white/5 space-y-2 text-left">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-neutral-400">
                <span>Último Corte</span>
                <span className="text-amber-400 font-extrabold">Janela Ideal de Retorno</span>
              </div>
              
              <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-amber-500 to-amber-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(30, (daysSinceLastCut / 30) * 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[8px] font-bold text-neutral-500 uppercase">
                <span>0 dias</span>
                <span>21 dias</span>
                <span className="text-amber-400 font-black">Hoje ({daysSinceLastCut}d)</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 font-medium">
              Manter o degradê e a barba alinhados faz toda a diferença na sua presença. Garanta seu horário antes que a agenda esgote!
            </p>
          </div>

          {/* CTA Actions */}
          <div className="space-y-2.5 pt-2 relative z-10">
            {/* Primary Action */}
            <button
              onClick={handleBook}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              Agendar Meu Horário Agora
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* WhatsApp Alternative */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerLightHaptic()}
              className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Combinar no WhatsApp
            </a>

            {/* Snooze / Later */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={handleSnooze}
                className="text-[10px] font-black text-neutral-500 hover:text-neutral-300 uppercase tracking-wider transition-colors cursor-pointer"
              >
                Lembrar em 3 dias
              </button>
              <span className="text-neutral-700">•</span>
              <button
                onClick={onClose}
                className="text-[10px] font-black text-neutral-500 hover:text-neutral-300 uppercase tracking-wider transition-colors cursor-pointer"
              >
                Agora não
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
