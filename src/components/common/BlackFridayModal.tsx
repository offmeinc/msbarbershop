import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Scissors } from "lucide-react";

export function BlackFridayModal({ isOpen, onClose, onBook }: { isOpen: boolean; onClose: () => void; onBook: () => void }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="liquid-glass rounded-[2.5rem] max-w-md w-full p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-amber-500/30 text-center space-y-6 my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 p-2 rounded-full bg-black/60 text-neutral-400 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Ambient glow */}
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Flyer Image */}
          <div className="relative rounded-[2rem] overflow-hidden border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.3)] max-h-[380px] bg-black flex items-center justify-center">
            <img
              src="/assets/aistudio/56d47d7b-c658-460e-8bbd-201c85bcdec6_13dc8c91.jpeg"
              alt="Black Friday MS Barber Shop"
              className="w-full h-full object-cover max-h-[380px]"
            />
          </div>

          {/* Title & Badge */}
          <div className="space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/30">
              <Sparkles className="w-3 h-3 animate-pulse" /> PROMOÇÃO EXCLUSIVA • BLACK FRIDAY
            </span>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">
              MS <span className="text-amber-500">BARBER SHOP</span>
            </h3>
            <p className="text-xs text-neutral-300 font-bold leading-relaxed">
              Platinado <span className="text-amber-400 font-black">R$ 90,00</span> | Luzes <span className="text-amber-400 font-black">R$ 80,00</span>
              <span className="block text-[10px] text-neutral-400 font-medium mt-1">Com o corte incluso! De 23 à 30 de Novembro.</span>
            </p>
          </div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              onClose();
              onBook();
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black uppercase italic tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer relative overflow-hidden"
          >
            <Scissors className="w-4 h-4 shrink-0 text-black" />
            <span>Garanta Já o seu Horário! (Agende Já)</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
