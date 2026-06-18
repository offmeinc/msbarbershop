import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Info, Sparkles, Scissors, Image as ImageIcon, Calendar, Check } from "lucide-react";
import { db, handleFirestoreError, OperationType, safeStringify } from "../../lib/firebase";
import { collection, query, orderBy, onSnapshot, getFirestore, limit } from "firebase/firestore";
import { toast } from "../ui/Toast";
import { Skeleton } from "../common/Skeleton";
import { EmptyState } from "../common/EmptyState";

interface LookbookScreenProps {
  onBack: () => void;
  onBook: (style: { title: string; imageUrl: string }) => void;
}

const TREND_INSPIRATIONS = [
  { id: "trend_1", title: "Textured Crop Style", category: "Moderno", imageUrl: "https://images.unsplash.com/photo-1599351431247-f577f5d48c17?q=80&w=800&auto=format&fit=crop" },
  { id: "trend_2", title: "Mid Fade Pompadour", category: "Clássico", imageUrl: "https://images.unsplash.com/photo-1621605815841-28d9446e3a43?q=80&w=800&auto=format&fit=crop" },
  { id: "trend_3", title: "Buzz Cut Fade", category: "Minimalista", imageUrl: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=800&auto=format&fit=crop" },
  { id: "trend_4", title: "Mullet Modernizado", category: "Ousado", imageUrl: "https://images.unsplash.com/photo-1622286332305-27464016669c?q=80&w=800&auto=format&fit=crop" },
  { id: "trend_5", title: "Side Part Quiff", category: "Social / Clássico", imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop" },
  { id: "trend_6", title: "Nappy High Top", category: "Afro / Fade", imageUrl: "https://images.unsplash.com/photo-1567894340346-76833d73a708?q=80&w=800&auto=format&fit=crop" },
];

export function LookbookScreen({ onBack, onBook }: LookbookScreenProps) {
  const [activeTab, setActiveTab] = useState<"team" | "inspirations">("team");
  const [teamPortfolio, setTeamPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("loved_style_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load Team Portfolio from Firestore
  useEffect(() => {
    const firestore = db || getFirestore();
    const q = query(collection(firestore, "portfolio"), orderBy("createdAt", "desc"), limit(24));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().caption || "Estilo Premium",
          category: doc.data().clientName ? `Corte em ${doc.data().clientName}` : "Corte da Barbearia",
          imageUrl: doc.data().imageUrl,
          barberName: doc.data().barberName || "",
          createdAt: doc.data().createdAt,
          ...doc.data(),
        }));
        setTeamPortfolio(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading lookbook portfolio:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter((fid) => fid !== id)
      : [...favorites, id];

    setFavorites(updated);
    localStorage.setItem("loved_style_ids", safeStringify(updated));
  };

  const currentItems = activeTab === "team" ? teamPortfolio : TREND_INSPIRATIONS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.3 }}
      className="min-h-[100dvh] bg-black text-white p-6 pt-12 pb-32 text-left"
    >
      {/* Premium Elegant Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-1.5 leading-none">
            Lookbook <span className="text-amber-500">&</span> Portfólio
          </h2>
          <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">Inspirando o seu próximo estilo</p>
        </div>
        <button 
          onClick={onBack} 
          className="p-3 bg-neutral-900  liquid-glass rounded-2xl text-neutral-400 hover:text-white  active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Menu in Bento grid style */}
      <div className=" liquid-glass/60  p-1 rounded-2xl flex items-center gap-1 mb-8 shadow-inner">
        <button
          onClick={() => setActiveTab("team")}
          className={`flex-1 py-3 rounded-xl font-black uppercase text-[9.5px] tracking-widest transition-all ${
            activeTab === "team" 
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10" 
              : "text-neutral-500 hover:text-white"
          }`}
        >
          📸 Cortes da Equipe
        </button>
        <button
          onClick={() => setActiveTab("inspirations")}
          className={`flex-1 py-3 rounded-xl font-black uppercase text-[9.5px] tracking-widest transition-all ${
            activeTab === "inspirations" 
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10" 
              : "text-neutral-500 hover:text-white"
          }`}
        >
          ✨ Tendências Globais
        </button>
      </div>

      {/* Main Grid View */}
      {loading && activeTab === "team" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-[2rem] overflow-hidden border border-white/5">
              <Skeleton className="w-full h-full" />
            </div>
          ))}
        </div>
      ) : currentItems.length === 0 ? (
        <EmptyState 
          icon={ImageIcon} 
          title="Galeria em Construção" 
          description="Ainda não adicionamos fotos a esta categoria. Volte em breve para se inspirar!"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {currentItems.map((item) => {
            const isFav = favorites.includes(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedItem(item)}
                className="liquid-glass relative aspect-[3/4] rounded-[2rem] overflow-hidden group cursor-pointer shadow hover:-amber-500/20 transition-all duration-300"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                
                {/* Heart shortcut button */}
                <button
                  onClick={(e) => toggleFavorite(item.id, e)}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-xl liquid-glass backdrop-blur-md flex items-center justify-center text-white  hover:border-amber-500/30 active:scale-90 transition-all"
                >
                  <Heart className={`w-4 h-4 ${isFav ? "text-amber-500 fill-amber-500" : "text-white/75"}`} />
                </button>

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent p-4 flex flex-col justify-end text-left">
                  <span className="text-[8px] font-black uppercase text-amber-500/90 tracking-widest mb-1.5">
                    {item.category}
                  </span>
                  <h3 className="text-[11px] font-black uppercase text-white truncate mb-2 group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBook({ title: item.title, imageUrl: item.imageUrl });
                    }}
                    className="w-full bg-white text-black py-2 rounded-xl text-[8.5px] font-black uppercase italic tracking-tighter hover:bg-amber-500 active:scale-95 transition-all text-center flex items-center justify-center gap-1 leading-none shadow-[0_4px_12px_rgba(255,255,255,0.05)] border-b border-neutral-300"
                  >
                    <Calendar className="w-3 h-3" />
                    AGENDAR ESTE
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Guide Card */}
      <div className="mt-8 p-6 liquid-glass/40 rounded-[2.5rem]  flex items-start gap-4">
        <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500 shrink-0 shadow-inner">
          <Info className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <p className="text-[9.5px] text-neutral-400 font-extrabold uppercase leading-snug tracking-wide">
            Estilo de Referência Inteligente
          </p>
          <p className="text-[8px] text-neutral-600 uppercase font-black tracking-widest mt-1 block leading-relaxed">
            Ao agendar um corte a partir do Lookbook, o profissional será sinalizado em tempo real sobre a referência que você escolheu.
          </p>
        </div>
      </div>

      {/* LIGHTBOX DETAIL MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className=" liquid-glass  p-6 rounded-[2.5rem] w-full max-w-sm relative overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setSelectedItem(null)} 
                className="absolute top-6 right-6 w-9 h-9 rounded-full liquid-glass  flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Lightbox aspect box */}
              <div className="aspect-[3/3.5] rounded-2xl overflow-hidden border border-white/5 bg-black mb-5 shadow-inner">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover" alt={selectedItem.title} referrerPolicy="no-referrer" />
              </div>

              {/* Meta information */}
              <div className="space-y-3 mb-6 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {selectedItem.category}
                  </span>
                  
                  {/* Share reference */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItem.imageUrl);
                      toast.success("Link da imagem copiado com sucesso! 🔗");
                    }}
                    className="text-[8px] font-extrabold uppercase text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    COPIAR LINK
                  </button>
                </div>

                <h3 className="text-lg font-black uppercase text-white italic tracking-tight leading-none">
                  {selectedItem.title}
                </h3>

                {selectedItem.barberName && (
                  <p className="text-[10px] text-neutral-500 uppercase font-black flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-500" />
                    Feito por: <span className="text-white">{selectedItem.barberName}</span>
                  </p>
                )}
              </div>

              {/* Direct Booking action button */}
              <button
                onClick={() => {
                  const item = selectedItem;
                  setSelectedItem(null);
                  onBook({ title: item.title, imageUrl: item.imageUrl });
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-[1.5rem] font-sans font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                RESERVAR ESTE ESTILO DE CORTE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
