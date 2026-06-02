import { Home, CalendarDays, Users, Scissors, GripHorizontal, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function BottomNav({ userRole, currentScreen, setCurrentScreen, user, unreadCount, isVisible = true }: { userRole: string, currentScreen: string, setCurrentScreen: (s: any) => void, user: any, unreadCount: number, isVisible?: boolean }) {
  if (!user) return null;

  const items = [];
  items.push({ id: "home", label: "Início", icon: <Home className="w-5 h-5" />, screen: "home" });
    
  if (userRole === "manager" || userRole === "barber") {
    items.push({ id: "agenda", label: "Agenda", icon: <CalendarDays className="w-5 h-5" />, screen: "agenda" });
    items.push({ id: "management", label: "Gestão", icon: <Sliders className="w-5 h-5" />, screen: "barber-management" });
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

  return (
    <motion.div 
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
      className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-2xl border border-white/10 p-1.5 flex items-center gap-1 z-40 rounded-[2.5rem] shadow-2xl shadow-amber-500/5 ring-1 ring-white/5 pb-[max(0.375rem,env(safe-area-inset-bottom)/2)] mb-[env(safe-area-inset-bottom)]"
    >
      {items.map(item => {
        const isActive = currentScreen === item.screen;
        return (
          <motion.button 
            key={item.id} 
            layout
            onClick={() => setCurrentScreen(currentScreen === item.screen ? "home" : item.screen as any)} 
            className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-full transition-all duration-300 relative group ${isActive ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-neutral-500 hover:text-white"}`}
          >
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
          </motion.button>
        );
      })}
    </motion.div>
  );
}
