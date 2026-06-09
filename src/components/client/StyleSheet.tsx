import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Save, 
  Scissors, 
  Coffee, 
  Sparkles, 
  ChevronRight, 
  Hash, 
  Droplet,
  Info,
  Loader2
} from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "../ui/Toast";

interface StyleSheetProps {
  user: any;
  onBack: () => void;
}

export function StyleSheet({ user, onBack }: StyleSheetProps) {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    sideMachine: "",
    topMachine: "",
    fadeType: "",
    drink: "",
    product: "",
    obs: ""
  });

  useEffect(() => {
    const fetchPrefs = async () => {
      const docRef = doc(db, "users", user.uid || user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().stylePreferences) {
        setPreferences(docSnap.data().stylePreferences);
      }
    };
    fetchPrefs();
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "users", user.uid || user.id);
      await updateDoc(docRef, { stylePreferences: preferences });
      toast.success("Sua ficha de estilo foi atualizada!");
      onBack();
    } catch (e) {
      toast.error("Erro ao salvar preferências.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-black text-white p-6 pt-12 pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Ficha de Estilo</h2>
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Suas preferências salvas</p>
          </div>
        </div>
        <button onClick={onBack} className="p-3 liquid-glass rounded-2xl text-neutral-500 hover:text-white ">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        <section className=" liquid-glass/50  rounded-[2.5rem] p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Scissors className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Preferências de Corte</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Lados (Bucha)
              </label>
              <input 
                type="text" 
                value={preferences.sideMachine}
                onChange={e => setPreferences({...preferences, sideMachine: e.target.value})}
                placeholder="Ex: 2 ou 1.5"
                className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Topo (Bucha/Tesoura)
              </label>
              <input 
                type="text" 
                value={preferences.topMachine}
                onChange={e => setPreferences({...preferences, topMachine: e.target.value})}
                placeholder="Ex: Tesoura"
                className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Tipo de Degradê
            </label>
            <select 
              value={preferences.fadeType}
              onChange={e => setPreferences({...preferences, fadeType: e.target.value})}
              className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 transition-colors appearance-none"
            >
              <option value="">Não informado</option>
              <option value="Low Fade">Low Fade</option>
              <option value="Mid Fade">Mid Fade</option>
              <option value="High Fade">High Fade</option>
              <option value="Taper Fade">Taper Fade</option>
              <option value="Scurt">Scurt / Curtinho</option>
            </select>
          </div>
        </section>

        <section className=" liquid-glass/50  rounded-[2.5rem] p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Gostos Pessoais</h3>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <Coffee className="w-3 h-3" /> Bebida Favorita
            </label>
            <input 
              type="text" 
              value={preferences.drink}
              onChange={e => setPreferences({...preferences, drink: e.target.value})}
              placeholder="Ex: Café com açúcar, Cerveja IPA..."
              className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
              <Droplet className="w-3 h-3" /> Finalizador / Pomada
            </label>
            <input 
              type="text" 
              value={preferences.product}
              onChange={e => setPreferences({...preferences, product: e.target.value})}
              placeholder="Ex: Efeito Matte, Brilho..."
              className="w-full bg-black border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </section>

        <section className=" liquid-glass/50  rounded-[2.5rem] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Observações Extras</h3>
          </div>
          <textarea 
            value={preferences.obs}
            onChange={e => setPreferences({...preferences, obs: e.target.value})}
            placeholder="Tenho redemoinho no topo, prefiro navalhado..."
            className="w-full h-32 bg-black border border-white/5 rounded-2xl p-4 text-sm outline-none focus:border-amber-500 transition-colors resize-none"
          />
        </section>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black italic uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          SALVAR FICHA
        </button>

        <p className="text-[10px] text-neutral-500 font-bold uppercase text-center tracking-tight px-4 leading-relaxed">
          Sua ficha de estilo ajuda os profissionais a entregarem o resultado perfeito em cada visita.
        </p>
      </div>
    </motion.div>
  );
}
