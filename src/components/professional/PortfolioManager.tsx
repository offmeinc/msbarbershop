import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Plus, Trash2, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";

export function PortfolioManager({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "portfolio"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "portfolio"));
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!imageUrl) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "portfolio"), {
        imageUrl,
        caption,
        createdAt: serverTimestamp()
      });
      setImageUrl("");
      setCaption("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta foto?")) return;
    try {
      await deleteDoc(doc(db, "portfolio", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "portfolio");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black text-white p-6 pb-32">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Galeria</h2>
      </header>

      <div className="bg-neutral-900/50 p-6 rounded-[2.5rem] border border-white/5 mb-10">
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Novo Corte
        </h3>
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-neutral-600 tracking-widest px-2">Link da Imagem</label>
                <input 
                    type="text" 
                    placeholder="https://exemplo.com/foto.jpg" 
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xs font-bold uppercase tracking-widest focus:border-amber-500 transition-colors"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-neutral-600 tracking-widest px-2">Legenda</label>
                <input 
                    type="text" 
                    placeholder="ex: Degradê com Risco" 
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xs font-bold uppercase tracking-widest focus:border-amber-500 transition-colors"
                />
            </div>
            <button 
                onClick={handleAdd}
                disabled={loading || !imageUrl}
                className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase italic tracking-widest text-xs disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-amber-500/10"
            >
                {loading ? "ADICIONANDO..." : "ADICIONAR À GALERIA"}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map(item => (
            <div key={item.id} className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/5">
                <img src={item.imageUrl} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end">
                    <p className="text-[10px] font-black uppercase text-white truncate">{item.caption || "Sem legenda"}</p>
                </div>
                <button 
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 p-2 bg-red-600/90 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ))}
        {items.length === 0 && (
            <div className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-neutral-800" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-700">Nenhum corte na galeria</p>
            </div>
        )}
      </div>
    </motion.div>
  );
}
