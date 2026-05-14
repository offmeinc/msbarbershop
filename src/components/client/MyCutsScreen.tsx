import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { updateDoc, doc, Timestamp } from "firebase/firestore";
import { Scissors, Calendar, Clock, CheckCircle, XCircle, Star, ArrowLeft } from "lucide-react";

interface MyCutsScreenProps {
  appointments: any[];
  onBack: () => void;
}

export function MyCutsScreen({ appointments, onBack }: MyCutsScreenProps) {
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const now = new Date();
  
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "appointments");
    } finally {
      setRatingLoading(null);
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
                    <div key={app.id} className="p-6 bg-neutral-900 rounded-[2rem] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="bg-amber-500/10 p-4 rounded-3xl text-amber-500"><Calendar className="w-6 h-6"/></div>
                            <div>
                                <h4 className="text-sm font-bold uppercase italic">{app.serviceName}</h4>
                                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mt-1">
                                    {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-5 px-2">Histórico & Avaliações</h3>
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
                                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">
                                          {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy", { locale: ptBR })}
                                      </p>
                                  </div>
                              </div>
                              <p className="text-sm font-black text-white italic">R${(Number(app.totalPrice) || 0).toFixed(2)}</p>
                          </div>

                          {isCompleted && (
                              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
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
                          )}
                      </div>
                  );
              })}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
