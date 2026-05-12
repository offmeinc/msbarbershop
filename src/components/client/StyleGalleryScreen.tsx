import React from "react";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";

export function StyleGalleryScreen({ onBack }: { onBack: () => void }) {
  const styles = [
    { name: "Buzz Cut", image: "https://images.unsplash.com/photo-1593702275677-f916c8c76045?auto=format&fit=crop&q=80&w=400", tags: ["Prático", "Moderno"] },
    { name: "Pompadour", image: "https://images.unsplash.com/photo-1621605815841-28d94471354f?auto=format&fit=crop&q=80&w=400", tags: ["Clássico", "Elegante"] },
    { name: "Fade Degradê", image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400", tags: ["Tendência", "Estiloso"] },
    { name: "Barba Lenhador", image: "https://images.unsplash.com/photo-1590540179832-2c3d8a58f257?auto=format&fit=crop&q=80&w=400", tags: ["Robusto", "Barba"] },
    { name: "Mullet Moderno", image: "https://images.unsplash.com/photo-1622286332303-0738643e8dbb?auto=format&fit=crop&q=80&w=400", tags: ["Ousado", "Retro"] },
    { name: "Corte Social", image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&q=80&w=400", tags: ["Executivo", "Limpo"] },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="w-10 h-10 bg-neutral-900 rounded-full flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-neutral-400" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest italic">Inspirações</h2>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {styles.map((style, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative h-80 rounded-3xl overflow-hidden shadow-2xl border border-white/5"
          >
            <img src={style.image} alt={style.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex gap-2 mb-2">
                {style.tags.map(tag => (
                  <span key={tag} className="text-[8px] font-bold uppercase tracking-tighter bg-white/10 backdrop-blur-md px-2 py-1 rounded-md text-white/70">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tight">{style.name}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
