import React, { memo, useRef } from "react";
import { Home, CalendarDays, Users, Scissors, GripHorizontal, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { triggerLightHaptic } from "../../lib/haptics";

export const BottomNav = memo(function BottomNav({ userRole, currentScreen, setCurrentScreen, user, unreadCount, isVisible = true }: { userRole: string, currentScreen: string, setCurrentScreen: (s: any) => void, user: any, unreadCount: number, isVisible?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const items = [];
  items.push({ id: "home", label: "Início", icon: <Home className="w-5 h-5" />, screen: "home" });
    
  if (userRole === "manager" || userRole === "barber") {
    items.push({ id: "agenda", label: "Agenda", icon: <CalendarDays className="w-5 h-5" />, screen: "agenda" });
    if (userRole === "manager") {
      items.push({ id: "management", label: "Gestão", icon: <Sliders className="w-5 h-5" />, screen: "barber-management" });
    }
    items.push({ id: "clients", label: "Clientes", icon: <Users className="w-5 h-5" />, screen: "clients" });
  } else {
    items.push({ id: "booking", label: "Agendar", icon: <Scissors className="w-5 h-5" />, screen: "booking" });
    items.push({ id: "agenda", label: "Histórico", icon: <CalendarDays className="w-5 h-5" />, screen: "agenda" });
  }
    
  items.push({ 
    id: "more", 
    label: "Mais", 
    icon: (
      <div className="relative">
        <motion.div animate={{ rotate: currentScreen === 'more' ? 90 : 0 }}>
          <GripHorizontal className="w-5 h-5" />
        </motion.div>
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-black" />
        )}
      </div>
    ), 
    screen: "more"
  });

  const handleTouchTracking = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    // Identify which button is under the user's touch coordinate
    const buttons = containerRef.current.querySelectorAll("button[data-screen]");
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i] as HTMLButtonElement;
      const rect = btn.getBoundingClientRect();
      
      // Check if touch point falls within the button's coordinates (with generous vertical padding of 40px)
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top - 40 &&
        touch.clientY <= rect.bottom + 40
      ) {
        const targetScreen = btn.getAttribute("data-screen");
        if (targetScreen && currentScreen !== targetScreen) {
          triggerLightHaptic();
          setCurrentScreen(targetScreen);
        }
        break;
      }
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "100%", opacity: 0 },
      }}
      initial="visible"
      animate={isVisible ? "visible" : "hidden"}
      transition={{ 
        duration: 0.4, 
        ease: [0.33, 1, 0.68, 1],
        opacity: { duration: 0.25 }
      }}
      onTouchStart={handleTouchTracking}
      onTouchMove={handleTouchTracking}
      className="md:hidden fixed left-1/2 -translate-x-1/2 liquid-glass backdrop-blur-2xl p-1.5 flex items-center gap-1 z-40 rounded-[2.5rem] shadow-2xl shadow-amber-500/5 ring-1 ring-white/5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] max-w-[95vw] select-none touch-pan-y"
    >
      {items.map(item => {
        const isActive = currentScreen === item.screen;
        return (
          <motion.button 
            key={item.id} 
            layout
            data-screen={item.screen}
            onMouseEnter={() => {
              if (typeof window !== "undefined" && (window as any).__pwaPreloaders?.[item.screen]) {
                (window as any).__pwaPreloaders[item.screen]();
              }
            }}
            onTouchStart={() => {
              if (typeof window !== "undefined" && (window as any).__pwaPreloaders?.[item.screen]) {
                (window as any).__pwaPreloaders[item.screen]();
              }
            }}
            onClick={() => {
              triggerLightHaptic();
              if (currentScreen !== item.screen) {
                setCurrentScreen(item.screen);
              }
            }} 
            whileTap={{ scale: 0.9 }}
            className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-full transition-colors duration-300 relative group select-none outline-none ${isActive ? "text-black font-black" : "text-neutral-500 hover:text-white"}`}
          >
            {isActive && (
              <motion.div
                layoutId="active-nav-pill"
                className="absolute -inset-y-1.5 -inset-x-1.5 z-0 rounded-full shadow-[0_8px_24px_rgba(245,158,11,0.45),_inset_0_4px_12px_rgba(255,255,255,0.7)] bg-gradient-to-b from-amber-300 to-amber-500 flex items-center justify-center overflow-hidden"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 14,
                  mass: 0.55
                }}
              >
                {/* 3D Glass Glare / Gloss Highlight Streak */}
                <div className="absolute top-1 left-3 right-3 h-1.5 bg-white/50 rounded-full filter blur-[0.4px]" />
                
                {/* Chromatic Aberration Outer Ring Glow */}
                <div className="absolute inset-0 rounded-full border border-white/40 mix-blend-overlay" />
                <div className="absolute -inset-[1px] rounded-full border border-amber-400/25 pointer-events-none animate-pulse duration-[3000ms]" />
              </motion.div>
            )}
            <div className="flex items-center justify-center gap-2 relative z-10">
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0, x: -5 }} 
                    animate={{ opacity: 1, width: 'auto', x: 0 }} 
                    exit={{ opacity: 0, width: 0, x: -5 }}
                    className="text-[10px] font-black uppercase tracking-widest italic whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
});
