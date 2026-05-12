import React, { useState, useEffect } from "react";
import { 
  query, 
  collection, 
  where, 
  onSnapshot 
} from "firebase/firestore";
import { Loader2, ChevronLeft } from "lucide-react";
import { db, handleFirestoreError, OperationType, auth } from "../../lib/firebase";

export function ReconScreen({ onBack }: { onBack: () => void }) {
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "completed")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.price) total += parseFloat(data.price);
      });
      setEarnings(total);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           <ChevronLeft className="w-5 h-5" /> Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
            <h2 className="text-xl font-bold text-white">Reconciliação</h2>
            {loading ? <Loader2 className="animate-spin w-8 h-8 text-amber-500 mx-auto" /> : (
                <div className="p-6 bg-black/20 rounded-2xl border border-white/5">
                    <p className="text-neutral-500 text-xs font-bold uppercase">Total Arrecadado (Concluídos)</p>
                    <h3 className="text-4xl font-black text-amber-500 mt-2">R$ {earnings.toFixed(2)}</h3>
                </div>
            )}
        </div>
    </div>
  );
}

export function LinkScreen({ onBack }: { onBack: () => void }) {
    const publicLink = `${window.location.origin}/profile/${auth.currentUser?.uid || 'seu-perfil'}`;
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-md mx-auto py-8 px-6">
            <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
               <ChevronLeft className="w-5 h-5" /> Voltar
            </button>
            <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
                <h2 className="text-xl font-bold text-white">Link Público</h2>
                <p className="text-neutral-500 text-sm">Compartilhe seu perfil profissional:</p>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 break-all font-mono text-amber-500 text-sm">
                    {publicLink}
                </div>
                <button onClick={copyToClipboard} className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                    {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
            </div>
        </div>
    );
}
