import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Sparkles, MapPin, Instagram, Phone, Clock, Scissors } from "lucide-react";
import { BARBERSHOP_NAME, BARBERSHOP_ADDRESS, BARBERSHOP_PHONE, BARBERSHOP_INSTAGRAM } from "../../constants";

export function HomeScreen({ services, onStartBooking }: { services: any[], onStartBooking: () => void, key?: string }) {
  const [locationSelectorOpen, setLocationSelectorOpen] = useState(false);
  return (
    <div className="max-w-xl mx-auto py-8">
      {/* Hero Section */}
      <div className="relative px-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <p className="text-amber-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-3">Bem vindo a</p>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-4 animate-gradient-text">
            {BARBERSHOP_NAME}
          </h1>
          <p className="text-neutral-500 text-sm max-w-[280px] font-medium leading-relaxed">
            Estilo e precisão. Agende seu horário com os melhores profissionais da cidade.
          </p>
        </motion.div>
        
        <div className="mt-8">
          <button 
            onClick={onStartBooking}
            className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-neutral-200 transition-all active:scale-95 shadow-xl shadow-white/5"
          >
            Agendar Agora
          </button>
        </div>
      </div>

      {/* Autoestima Section */}
      <div className="px-6 mb-12">
        <div className="bg-neutral-900 border border-white/5 rounded-[3rem] p-12 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          
          <Sparkles className="w-10 h-10 text-amber-500 mb-8 opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all" />
          <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-[0.85] mb-6 animate-gradient-text">
            Sua autoestima <br/>
            em primeiro lugar
          </h2>
          <div className="w-10 h-1 bg-amber-500/20 rounded-full mb-6" />
          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[200px]">
            O cuidado que você merece
          </p>
        </div>
      </div>

      {/* Services Preview */}
      <div className="px-6 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Nossos Serviços</h2>
          <button onClick={onStartBooking} className="text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:underline">Ver Tabela</button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-6 px-6">
           {services.slice(0, 4).map((service, idx) => (
             <motion.div 
               key={idx} 
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               transition={{ delay: idx * 0.1 }}
               whileHover={{ y: -12, scale: 1.02 }}
               whileTap={{ scale: 0.98, y: -4 }}
               onClick={onStartBooking}
               className="flex-shrink-0 w-40 sm:w-48 h-56 sm:h-64 bg-neutral-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-5 sm:p-6 flex flex-col justify-between group cursor-pointer hover:border-amber-500/40 active:border-amber-500/40 transition-all shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
                
                <div className="relative z-10 w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black group-active:bg-amber-500 group-active:text-black transition-all rotate-0 group-hover:rotate-12 duration-500 shadow-lg">
                  <Scissors className="w-5 sm:w-6 h-5 sm:h-6" />
                </div>

                <div className="relative z-10">
                   <h4 className="text-white font-black uppercase italic tracking-tighter text-sm sm:text-base mb-1 line-clamp-2 transition-all duration-300 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-amber-500 group-active:text-transparent group-active:bg-clip-text group-active:bg-gradient-to-r group-active:from-white group-active:to-amber-500">
                     {service.name}
                   </h4>
                   <div className="flex items-center gap-2">
                     <div className="h-px w-4 bg-amber-500/30 group-hover:w-8 group-active:w-8 transition-all" />
                     <p className="text-amber-500 font-extrabold text-xs sm:text-sm tracking-tight group-hover:scale-110 origin-left transition-transform">
                       R$ {service.price.toFixed(2)}
                     </p>
                   </div>
                </div>
             </motion.div>
           ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-6 grid grid-cols-2 gap-4">
        <div className="bg-neutral-950 border border-white/5 p-5 rounded-[2rem] flex flex-col items-center text-center">
          <Clock className="w-5 h-5 text-neutral-600 mb-3" />
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Horário</p>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white uppercase italic leading-none">Seg-Sex: 09h às 20h</p>
            <p className="text-[10px] font-bold text-white uppercase italic leading-none">Sáb: 09h às 19:30</p>
          </div>
        </div>
        <a 
          href={`https://wa.me/${BARBERSHOP_PHONE}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-neutral-950 border border-white/5 p-5 rounded-[2rem] flex flex-col items-center text-center hover:bg-neutral-900 transition-colors"
        >
          <Phone className="w-5 h-5 text-neutral-600 mb-3" />
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Contato</p>
          <p className="text-[10px] font-bold text-white italic">(51) 99259-0046</p>
        </a>
      </div>

      {/* Info Cards */}
      <div className="px-6 grid grid-cols-1 gap-4 mt-8 pb-12 relative">
        <button 
          onClick={() => {
            const encodedAddr = encodeURIComponent(BARBERSHOP_ADDRESS);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            // On mobile, show options. For now, we can use a simpler approach or a prompt
            // But to be really cool, let's open a custom prompt or just fallback to Google Maps for all
            // The prompt approach is better for UX as requested.
            
            const options = [
              { name: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}` },
              { name: "Waze", url: `https://waze.com/ul?q=${encodedAddr}&navigate=yes` }
            ];
            
            if (isIOS) {
              options.unshift({ name: "Apple Maps", url: `maps://?daddr=${encodedAddr}` });
            }

            // For simplicity and following the request, I'll use a confirm-like flow or just a simple modal
            // Let's create a local state for the selector
            setLocationSelectorOpen(true);
          }}
          className="w-full bg-neutral-950 border border-white/5 p-6 rounded-[2.5rem] flex items-start gap-4 group hover:bg-neutral-900 transition-colors text-left active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0 group-hover:scale-110 transition-transform">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-sm mb-1 uppercase tracking-tight italic">Localização</h3>
              <p className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest group-hover:text-amber-500 transition-colors">Como chegar</p>
            </div>
            <p className="text-neutral-500 text-[11px] font-medium uppercase tracking-wider">{BARBERSHOP_ADDRESS}</p>
          </div>
        </button>

        {/* Location Selector Modal */}
        <AnimatePresence>
          {locationSelectorOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLocationSelectorOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/5 rounded-t-[2.5rem] p-8 z-[70] pb-[calc(2rem+env(safe-area-inset-bottom))]"
              >
                <div className="w-12 h-1.5 bg-neutral-800 rounded-full mx-auto mb-8" />
                <h3 className="text-xl font-black uppercase italic italic text-white mb-6 text-center">Escolha seu Mapa</h3>
                <div className="grid gap-3">
                  {(() => {
                    const encodedAddr = encodeURIComponent(BARBERSHOP_ADDRESS);
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    const apps = [
                      { name: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}`, icon: "🗺️" },
                      { name: "Waze", url: `https://waze.com/ul?q=${encodedAddr}&navigate=yes`, icon: "🚙" }
                    ];
                    if (isIOS) apps.unshift({ name: "Apple Maps", url: `maps://?daddr=${encodedAddr}`, icon: "🍎" });
                    
                    return apps.map(app => (
                      <a 
                        key={app.name}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setLocationSelectorOpen(false)}
                        className="flex items-center justify-between p-5 bg-neutral-900 rounded-2xl border border-white/5 hover:border-amber-500/50 transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{app.icon}</span>
                          <span className="text-white font-bold uppercase italic tracking-widest text-sm">{app.name}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-neutral-700" />
                      </a>
                    ));
                  })()}
                </div>
                <button 
                  onClick={() => setLocationSelectorOpen(false)}
                  className="w-full mt-6 py-4 text-neutral-500 font-bold uppercase tracking-[0.2em] text-[10px]"
                >
                  Cancelar
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <a 
          href={`https://instagram.com/${BARBERSHOP_INSTAGRAM}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-neutral-950 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:bg-neutral-900 transition-colors"
        >
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 flex-shrink-0 group-hover:scale-110 transition-transform">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm mb-1 uppercase tracking-tight italic">Siga-nos</h3>
                <p className="text-neutral-500 text-[11px] font-medium uppercase tracking-wider">@{BARBERSHOP_INSTAGRAM}</p>
              </div>
           </div>
           <ChevronRight className="w-4 h-4 text-neutral-800" />
        </a>
      </div>
    </div>
  );
}
