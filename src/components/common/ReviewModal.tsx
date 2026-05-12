import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X } from "lucide-react";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function ReviewModal({ appointment, onClose }: { appointment: any, onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "appointments", appointment.id), {
        review: { rating, comment, createdAt: serverTimestamp() }
      });
      onClose();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6">
       <div className="bg-neutral-900 border border-white/5 p-8 rounded-[3rem] w-full max-w-sm relative">
         <button onClick={onClose} className="absolute top-6 right-6 text-neutral-500"><X className="w-6 h-6"/></button>
         <h2 className="text-2xl font-black italic uppercase text-white mb-2">Avaliar Atendimento</h2>
         <p className="text-xs text-neutral-500 mb-8 uppercase font-bold tracking-widest">{appointment.serviceName}</p>
         
         <div className="flex justify-center gap-2 mb-8">
            {[1,2,3,4,5].map(i => (
              <button key={i} onClick={() => setRating(i)} className={`p-2 transition-transform active:scale-125 ${rating >= i ? 'text-amber-500' : 'text-neutral-800'}`}>
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
         </div>
         
         <textarea 
            value={comment} 
            onChange={e => setComment(e.target.value)} 
            placeholder="Conte-nos o que achou..."
            className="w-full h-32 bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 mb-6"
         />
         
         <button 
           onClick={handleSubmit}
           disabled={submitting}
           className="w-full bg-amber-500 py-5 rounded-2xl text-black font-black uppercase italic tracking-widest"
         >
           {submitting ? 'ENVIANDO...' : 'ENVIAR AVALIAÇÃO'}
         </button>
       </div>
    </motion.div>
  );
}
