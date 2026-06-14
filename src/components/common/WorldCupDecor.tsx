import { memo } from "react";
import { AnimatePresence } from "motion/react";

export const WorldCupDecor = memo(function WorldCupDecor({
  isFanMode
}: {
  isFanMode: boolean;
}) {
  return (
    <AnimatePresence>
      {isFanMode && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Subtle stadium laser beam glow sweeps */}
          <div className="absolute top-0 left-1/4 w-[1px] h-[100dvh] bg-green-500/10 shadow-[0_0_80px_35px_rgba(34,197,94,0.15)] rotate-12 origin-top animate-pulse" />
          <div className="absolute top-0 right-1/4 w-[1px] h-[100dvh] bg-yellow-400/10 shadow-[0_0_80px_35px_rgba(234,179,8,0.15)] -rotate-12 origin-top animate-pulse" />
          
          {/* Subtle soccer confetti falls at top corners */}
          <div className="absolute top-10 left-5 text-xl opacity-30 animate-bounce">⚽</div>
          <div className="absolute top-20 right-8 text-2xl opacity-20 animate-bounce delay-1000">🏆</div>
          <div className="absolute top-32 left-12 text-sm opacity-20 animate-pulse">🇧🇷</div>
          <div className="absolute top-48 right-16 text-lg opacity-[0.25] animate-bounce">⚽</div>
        </div>
      )}
    </AnimatePresence>
  );
});
