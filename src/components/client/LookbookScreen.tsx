import React from "react";
import { motion } from "framer-motion";
import { X, Heart, Share2, Info } from "lucide-react";

interface LookbookScreenProps {
  onBack: () => void;
  onBook: (style: string) => void;
}

const TRENDS = [
  { id: "1", title: "Textured Crop", category: "Moderno", imageUrl: "https://images.unsplash.com/photo-1599351431247-f577f5d48c17?q=80&w=800&auto=format&fit=crop" },
  { id: "2", title: "Mid Fade Pompadour", category: "Clássico", imageUrl: "https://images.unsplash.com/photo-1621605815841-28d9446e3a43?q=80&w=800&auto=format&fit=crop" },
  { id: "3", title: "Buzz Cut Fade", category: "Minimal", imageUrl: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=800&auto=format&fit=crop" },
  { id: "4", title: "Mullet Moderno", category: "Ousado", imageUrl: "https://images.unsplash.com/photo-1622286332305-27464016669c?q=80&w=800&auto=format&fit=crop" },
  { id: "5", title: "Side Part Quiff", category: "Social", imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop" },
  { id: "6", title: "Nappy High Top", category: "Afro", imageUrl: "https://images.unsplash.com/photo-1567894340346-76833d73a708?q=80&w=800&auto=format&fit=crop" },
];

export function LookbookScreen({ onBack, onBook }: LookbookScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="min-h-screen bg-black text-white p-6 pt-12 pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Lookbook</h2>
          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Inpirações e Tendências</p>
        </div>
        <button onClick={onBack} className="p-3 bg-neutral-900 rounded-2xl text-neutral-500 border border-white/5">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TRENDS.map((item) => (
          <motion.div 
            key={item.id}
            whileTap={{ scale: 0.98 }}
            className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden group border border-white/5"
          >
            <img 
              src={item.imageUrl} 
              alt={item.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest mb-1">{item.category}</span>
              <h3 className="text-xs font-black uppercase text-white truncate mb-3">{item.title}</h3>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => onBook(item.title)}
                  className="flex-1 bg-white text-black py-2 rounded-xl text-[8px] font-black uppercase italic tracking-tighter hover:bg-amber-500 transition-colors"
                >
                  Agendar Este
                </button>
                <button className="p-2 bg-black/40 backdrop-blur-md rounded-xl text-white border border-white/10">
                  <Heart className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-neutral-900/50 rounded-[2.5rem] border border-white/5 flex items-start gap-4">
        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-[9px] text-neutral-500 font-bold uppercase leading-relaxed tracking-tight">
          Mostre a foto ao seu barbeiro para um resultado impecável. Tendências atualizadas semanalmente.
        </p>
      </div>
    </motion.div>
  );
}
