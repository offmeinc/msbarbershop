import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X, Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "../ui/Toast";

export function ReviewModal({ appointment, onClose }: { appointment: any, onClose: () => void }) {
  const [rating, setRating] = useState(appointment.rating || 5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(appointment.reviewPhotoUrl || "");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { uploadImage } = await import('../../lib/uploadService');
      const data = await uploadImage(file);
      if (data.success) {
        setPhotoUrl(data.data.url);
        toast.success("Foto adicionada!");
      } else {
        toast.error("Erro no upload.");
      }
    } catch (e) {
      toast.error("Erro de conexão.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "appointments", appointment.id), {
        rating,
        review: { rating, comment, createdAt: serverTimestamp() },
        reviewPhotoUrl: photoUrl
      });
      toast.success("Avaliação enviada!");
      onClose();
    } catch (e) { 
      toast.error("Erro ao enviar avaliação.");
      console.error(e); 
    }
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
            className="w-full h-24 bg-black border border-white/5 rounded-2xl p-4 text-white text-sm outline-none focus:border-amber-500 mb-4"
         />

         <div className="mb-8">
            {photoUrl ? (
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden group border border-white/10">
                    <img src={photoUrl} className="w-full h-full object-cover" alt="Sua avaliação" />
                    <button 
                        onClick={() => setPhotoUrl("")}
                        className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-white/5"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center p-6 bg-black/40 border border-dashed border-white/10 rounded-2xl gap-2 cursor-pointer hover:border-amber-500/30 hover:bg-white/5 transition-all group">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 group-hover:text-amber-500 transition-colors">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </div>
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest group-hover:text-neutral-300">
                        {uploading ? "Enviando..." : "Foto do Resultado"}
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
            )}
         </div>
         
         <button 
           onClick={handleSubmit}
           disabled={submitting}
           className="w-full bg-amber-500 py-5 rounded-2xl text-black font-black uppercase italic tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
         >
           {submitting ? 'ENVIANDO...' : 'ENVIAR AVALIAÇÃO'}
         </button>
       </div>
    </motion.div>
  );
}
