import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { updateDoc, doc, Timestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { Scissors, Calendar, Clock, CheckCircle, XCircle, Star, ArrowLeft, Image as ImageIcon, X, Loader2, User, CalendarCheck, Camera } from "lucide-react";
import { GOOGLE_REVIEW_URL } from "../../constants";
import { toast } from "../ui/Toast";
import { uploadImage } from "../../lib/uploadService";

interface MyCutsScreenProps {
  user: any;
  appointments: any[];
  onBack: () => void;
  onBookAgain?: (serviceId: string, barberId: string) => void;
  onReschedule?: (app: any) => void;
  onCancel?: (app: any) => void;
}

export function MyCutsScreen({ user, appointments, onBack, onBookAgain, onReschedule, onCancel }: MyCutsScreenProps) {
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState<string | null>(null);
  const [portfolioCuts, setPortfolioCuts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [appToCancel, setAppToCancel] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const now = new Date();

  useEffect(() => {
    if (user?.favorites) {
      setFavorites(user.favorites);
    }
  }, [user]);

  const toggleFavorite = async (itemId: string) => {
    const userId = user?.uid || user?.id;
    if (!userId) return;

    const isFav = favorites.includes(itemId);
    const newFavs = isFav ? favorites.filter(id => id !== itemId) : [...favorites, itemId];
    
    setFavorites(newFavs);
    try {
      await updateDoc(doc(db, "users", userId), { favorites: newFavs });
    } catch (e) {
      console.error("Error updating favorites:", e);
    }
  };

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) return;

    const q = query(
      collection(db, "portfolio"),
      where("clientId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to make index creation optional
      const sorted = fetched.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setPortfolioCuts(sorted);
    }, (err) => {
      console.error("[MyCutsScreen] Error fetching client portfolio cuts:", err);
    });

    return () => unsubscribe();
  }, [user]);
  
  const futureAppointments = appointments
    .filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate > now && app.status !== 'cancelled' && app.status !== 'completed';
    })
    .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateA.getTime() - dateB.getTime();
    });

  const pastAppointments = appointments
    .filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate <= now || app.status === 'cancelled' || app.status === 'completed';
    })
    .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateB.getTime() - dateA.getTime();
    });

  const handleRate = async (appointmentId: string, rating: number) => {
    setRatingLoading(appointmentId);
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { rating });
      toast.success("Avaliação enviada!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "appointments");
    } finally {
      setRatingLoading(null);
    }
  };

  const handleReviewPhotoUpload = async (appointmentId: string, file: File) => {
    setIsPhotoUploading(appointmentId);
    try {
      const result = await uploadImage(file);
      if (result.success && result.data.url) {
        await updateDoc(doc(db, "appointments", appointmentId), {
          reviewPhotoUrl: result.data.url
        });
        toast.success("Foto do corte adicionada! ✨");
      }
    } catch (error: any) {
      console.error("Review photo upload error:", error);
      toast.error("Erro ao subir foto do corte.");
    } finally {
      setIsPhotoUploading(null);
    }
  };

  const removeReviewPhoto = async (appointmentId: string) => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { 
        reviewPhotoUrl: null 
      });
      toast.success("Foto removida.");
    } catch (error) {
      toast.error("Erro ao remover foto.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black text-white p-6 pt-12 pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-3 bg-neutral-900 rounded-2xl text-neutral-400 hover:text-white border border-white/5 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Meus Cortes</h2>
      </div>
      
      <div className="space-y-10">
        {futureAppointments.length > 0 && (
          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-5 px-2">Próximos Agendamentos</h3>
            <div className="space-y-4">
                {futureAppointments.map(app => (
                    <div 
                      key={app.id} 
                      className={`p-6 bg-gradient-to-br rounded-[2.5rem] border relative overflow-hidden group shadow-2xl transition-all ${
                        app.status === 'confirmed' 
                          ? 'from-amber-500/10 to-neutral-900/40 border-amber-500/20 text-white' 
                          : 'from-neutral-800 to-neutral-900 border-white/10 text-white'
                      }`}
                    >
                      <div className="absolute -right-8 -top-8 text-amber-500/5 group-hover:scale-110 transition-transform duration-1000 rotate-12">
                         <CalendarCheck size={160} />
                      </div>

                      <div className="relative z-10 space-y-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <CalendarCheck className={`w-4 h-4 ${app.status === 'confirmed' ? 'text-amber-500' : 'text-neutral-500'}`} />
                               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Status</span>
                            </div>
                            <div className="flex items-center gap-2">
                               {app.status === 'confirmed' ? (
                                 <span className="bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight">CONFIRMADO</span>
                               ) : (
                                 <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black px-2.5 py-1 rounded-lg animate-pulse uppercase tracking-tight">Pendente</span>
                               )}
                            </div>
                         </div>

                         <div className="text-left">
                            <h4 className="text-xl font-black uppercase italic tracking-tighter mb-1 leading-none">{app.serviceName}</h4>
                            {app.barberName && (
                              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1.5">
                                Barbeiro: {app.barberName}
                              </p>
                            )}
                         </div>

                         <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-400">
                            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
                               <Calendar className="w-3.5 h-3.5 text-amber-500" />
                               <span>
                                 {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd 'de' MMMM", { locale: ptBR })}
                               </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5">
                               <Clock className="w-3.5 h-3.5 text-amber-500" />
                               <span>{app.time}</span>
                            </div>
                            {app.totalPrice && (
                              <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 font-mono text-white">
                                 <span>R$ {Number(app.totalPrice).toFixed(2).replace('.', ',')}</span>
                              </div>
                            )}
                         </div>

                         {/* Action Buttons */}
                         <div className="flex gap-2.5 pt-2">
                            <button 
                              onClick={() => {
                                if (onReschedule) {
                                  onReschedule(app);
                                } else if (onBookAgain && app.serviceId && app.barberId) {
                                  onBookAgain(app.serviceId, app.barberId);
                                }
                              }} 
                              className="flex-1 bg-white hover:bg-amber-500 hover:text-black text-black py-3.5 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all duration-300"
                            >
                              REAGENDAR
                            </button>
                            {onCancel && (
                              <button 
                                onClick={() => setAppToCancel(app)} 
                                className="px-5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 font-black uppercase italic py-3.5 rounded-2xl text-[10px] tracking-widest transition-all duration-300"
                              >
                                CANCELAR
                              </button>
                            )}
                         </div>
                      </div>
                    </div>
                ))}
            </div>
          </section>
        )}

        {portfolioCuts.length > 0 && (
          <section className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-5 px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">Minha Galeria de Cortes</h3>
              <span className="text-[10px] font-bold text-amber-500 uppercase">{portfolioCuts.length} fotos</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {portfolioCuts.map((item, idx) => {
                const isFavorite = favorites.includes(item.id);
                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/5 bg-neutral-900"
                  >
                    <img 
                      src={item.imageUrl} 
                      alt={item.caption} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-4 flex flex-col justify-end">
                      <div className="flex items-center justify-between gap-2">
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-black uppercase text-white truncate">{item.caption || "Top Corte"}</p>
                          {item.createdAt && (
                            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                              {format(item.createdAt instanceof Timestamp ? item.createdAt.toDate() : parseISO(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => toggleFavorite(item.id)}
                          className={`p-2 rounded-xl border border-white/10 backdrop-blur-md transition-all ${isFavorite ? 'bg-amber-500 text-black border-amber-500' : 'bg-black/60 text-white hover:text-amber-500'}`}
                        >
                          <Star className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                      
                      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300">
                        <button 
                          onClick={() => onBookAgain?.(item.serviceId || '', item.barberId || '')}
                          className="w-full bg-amber-500 text-black py-2.5 rounded-xl font-black uppercase italic text-[8px] tracking-widest"
                        >
                          Repetir Corte
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-5 px-2">Histórico & Avaliações</h3>
          
          {/* Google Review Prompt Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-neutral-900/40 border border-amber-500/20 rounded-[2.5rem] p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-500 italic">Curtiu seu Corte?</h4>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Avalie-nos com 5 estrelas no Google para nos ajudar!</p>
            </div>
            <a 
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[9px] tracking-widest rounded-2xl transition-colors shrink-0 text-center"
            >
              Avaliar no Google
            </a>
          </div>

          <div className="space-y-4">
              {pastAppointments.map(app => {
                  const isCompleted = app.status === 'completed';
                  return (
                      <div key={app.id} className={`p-6 bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 space-y-4 transition-all ${!isCompleted ? 'opacity-60' : ''}`}>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-3xl ${app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white'}`}>
                                        {app.status === 'cancelled' ? <XCircle className="w-6 h-6"/> : <CheckCircle className="w-6 h-6"/>}
                                    </div>
                                  <div>
                                      <h4 className="text-sm font-bold uppercase italic">{app.serviceName}</h4>
                                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">
                                          {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy", { locale: ptBR })}
                                      </p>
                                      {app.barberName && (
                                        <p className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mt-0.5">
                                            {app.barberName}
                                        </p>
                                      )}
                                  </div>
                              </div>
                              <p className="text-sm font-black text-white italic">R${(Number(app.totalPrice) || 0).toFixed(2)}</p>
                          </div>

                          {isCompleted && (
                              <div className="pt-4 border-t border-white/5 space-y-4">
                                  <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-black uppercase text-neutral-600 tracking-widest">Sua Avaliação</span>
                                      <div className="flex items-center gap-1.5">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                              <button 
                                                  key={star}
                                                  disabled={ratingLoading === app.id}
                                                  onClick={() => handleRate(app.id, star)}
                                                  className="p-1 transition-transform active:scale-125"
                                              >
                                                  <Star 
                                                      className={`w-4 h-4 transition-colors ${star <= (app.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-neutral-800 hover:text-amber-500/50'}`} 
                                                  />
                                              </button>
                                          ))}
                                      </div>
                                  </div>

                                  {/* Photo upload functionality removed */}
                                  <div className="space-y-4">
                                      {app.reviewPhotoUrl ? (
                                        <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden group border border-white/10">
                                            <img src={app.reviewPhotoUrl} className="w-full h-full object-cover" alt="Sua avaliação" />
                                            <button 
                                                onClick={() => removeReviewPhoto(app.id)}
                                                className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-white/5"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                      ) : (
                                        <label className={`w-full aspect-video border-2 border-dashed border-white/5 bg-black/40 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group ${isPhotoUploading === app.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="w-12 h-12 bg-neutral-900 border border-white/5 rounded-2xl flex items-center justify-center text-neutral-500 group-hover:text-amber-500 group-hover:scale-110 transition-all">
                                                {isPhotoUploading === app.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">
                                                    {isPhotoUploading === app.id ? 'Subindo Foto...' : 'Adicionar Foto do Corte'}
                                                </p>
                                                <p className="text-[8px] font-bold uppercase text-neutral-600 tracking-tighter">Mostre seu visual na galeria</p>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleReviewPhotoUpload(app.id, file);
                                                }}
                                            />
                                        </label>
                                      )}
                                  </div>

                                  {onBookAgain && (
                                      <button
                                          onClick={() => onBookAgain(app.serviceId, app.barberId)}
                                          className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 font-black uppercase text-[10px] tracking-widest py-3 rounded-2xl transition-colors border border-white/5"
                                      >
                                          Agendar Novamente
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {appToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCancelling && setAppToCancel(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="bg-[#0D0D0D] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative z-10 shadow-2xl space-y-6"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/25 rounded-3xl mx-auto flex items-center justify-center text-red-500">
                <XCircle className="w-6 h-6 animate-pulse" />
               </div>

               <div className="space-y-2">
                 <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Cancelar Agendamento?</h3>
                 <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                   Deseja realmente cancelar seu agendamento de <span className="text-white font-black">{appToCancel.serviceName}</span> marcado para:
                 </p>
               </div>

               <div className="bg-black/35 rounded-2xl p-4 border border-white/5 space-y-2 text-left">
                 <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                   <Calendar className="w-3 h-3" />
                   {format(appToCancel.date instanceof Timestamp ? appToCancel.date.toDate() : parseISO(appToCancel.date), "dd 'de' MMMM", { locale: ptBR })}
                 </p>
                 <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                   <Clock className="w-3 h-3" />
                   às {appToCancel.time}
                 </p>
               </div>

               <div className="flex flex-col gap-2 pt-2">
                 <button 
                   onClick={async () => {
                     setIsCancelling(true);
                     try {
                       await onCancel?.(appToCancel);
                     } catch (err) {
                       console.error(err);
                     } finally {
                       setIsCancelling(false);
                       setAppToCancel(null);
                     }
                   }}
                   disabled={isCancelling}
                   className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2"
                 >
                   {isCancelling ? (
                     <>
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                       CANCELANDO...
                     </>
                   ) : (
                     "SIM, CANCELAR AGENDAMENTO"
                   )}
                 </button>
                 <button 
                   onClick={() => setAppToCancel(null)}
                   disabled={isCancelling}
                   className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all"
                 >
                   MANTER AGENDAMENTO
                 </button>
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
     </motion.div>
  );
}
