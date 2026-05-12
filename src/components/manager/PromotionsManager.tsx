import React, { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  query, 
  collection, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  addDoc, 
  deleteDoc 
} from "firebase/firestore";
import { 
  ChevronLeft, 
  Plus, 
  Tag, 
  Calendar, 
  Pencil, 
  BellOff, 
  CheckCircle2, 
  Trash2 
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

interface PromotionsManagerProps {
  onBack: () => void;
}

export const PromotionsManager = ({ onBack }: PromotionsManagerProps) => {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    discountPercentage: "",
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    active: true
  });

  useEffect(() => {
    const q = query(collection(db, "promotions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "promotions");
    });
    return unsubscribe;
  }, []);

  const resetForm = () => {
    setFormData({
      code: "",
      discountPercentage: "",
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      active: true
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discountPercentage) return;
    
    setLoading(true);
    try {
      const data = {
        code: formData.code.toUpperCase().trim(),
        discountPercentage: Number(formData.discountPercentage),
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        active: formData.active,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "promotions", editingId), data);
      } else {
        await addDoc(collection(db, "promotions"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.WRITE : OperationType.WRITE, "promotions");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo: any) => {
    setEditingId(promo.id);
    setFormData({
      code: promo.code,
      discountPercentage: promo.discountPercentage.toString(),
      validFrom: promo.validFrom || format(new Date(), 'yyyy-MM-dd'),
      validUntil: promo.validUntil || format(new Date(), 'yyyy-MM-dd'),
      active: promo.active ?? true
    });
    setIsAdding(true);
  };

  const toggleActive = async (promo: any) => {
    try {
      await updateDoc(doc(db, "promotions", promo.id), {
        active: !promo.active,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "promotions");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta promoção?")) return;
    try {
      await deleteDoc(doc(db, "promotions", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "promotions");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-md mx-auto py-8 px-6 min-h-screen pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Promoções</h2>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-10 h-10 bg-amber-500 text-black rounded-2xl flex items-center justify-center hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-neutral-900 rounded-[2.5rem] p-6 border border-white/5 space-y-6 shadow-2xl"
          >
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-[0.2em] italic mb-2">
              {editingId ? "Editar Promoção" : "Nova Promoção"}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Código Promocional</label>
                <input 
                  value={formData.code} 
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ex: BLACKFRIDAY50" 
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all outline-none uppercase font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Desconto (%)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={formData.discountPercentage} 
                    onChange={e => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    placeholder="20" 
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all outline-none"
                    required
                    min="1"
                    max="100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 font-black">%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Início</label>
                  <input 
                    type="date"
                    value={formData.validFrom} 
                    onChange={e => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-amber-500 transition-all outline-none [color-scheme:dark]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">Fim</label>
                  <input 
                    type="date"
                    value={formData.validUntil} 
                    onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-amber-500 transition-all outline-none [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Status da Promoção</span>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${formData.active ? 'bg-amber-500' : 'bg-neutral-800'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-500 text-black py-4 rounded-2xl font-black uppercase italic text-[10px] tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : (editingId ? "Atualizar" : "Salvar")}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {promotions.map((promo) => (
              <div 
                key={promo.id} 
                className={`bg-neutral-900 border transition-all p-5 rounded-[2.5rem] relative overflow-hidden group ${promo.active ? 'border-white/5' : 'border-red-500/20 opacity-60'}`}
              >
                {!promo.active && (
                  <div className="absolute top-4 right-4 bg-red-500/10 text-red-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest">
                    Inativo
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Tag className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black italic uppercase tracking-tight text-white mb-0.5">{promo.code}</h4>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{promo.discountPercentage}% DE DESCONTO</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        De: {promo.validFrom ? format(parseISO(promo.validFrom), "dd MMM yy", { locale: ptBR }) : "--"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Até: {promo.validUntil ? format(parseISO(promo.validUntil), "dd MMM yy", { locale: ptBR }) : "--"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleEdit(promo)}
                      className="p-3 bg-white/5 rounded-2xl text-neutral-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleActive(promo)}
                      className={`p-3 rounded-2xl transition-all border ${promo.active ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white'}`}
                      title={promo.active ? "Desativar" : "Ativar"}
                    >
                      {promo.active ? <BellOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(promo.id)}
                      className="p-3 bg-neutral-900 rounded-2xl text-neutral-600 hover:text-red-500 transition-all border border-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {promotions.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-neutral-900 rounded-[3rem] border border-white/5">
                <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-neutral-700">
                  <Tag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Nenhuma Promoção</h3>
                  <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-tight max-w-[200px] mx-auto mt-2 leading-relaxed">
                    Clique no botão "+" acima para criar seu primeiro código de desconto.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
