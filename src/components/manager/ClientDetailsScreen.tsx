import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Calendar, Scissors, Clock, Star, MessageSquare, Repeat } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

export function ClientDetailsScreen({ client, onBack, onScheduleClient, onMessageClient }: { client: any, onBack: () => void, onScheduleClient?: (client: any) => void, onMessageClient?: (client: any) => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client?.email) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "appointments"),
      where("clientEmail", "==", client.email),
      orderBy("date", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [client.email]);

  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const yearsCustomer = client.createdAt ? Math.floor((new Date().getTime() - client.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-2xl mx-auto py-8 px-4"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>

      <div className="bg-neutral-900 p-6 rounded-3xl border border-white/10 mb-8">
         <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-neutral-500 font-bold overflow-hidden border border-white/10 text-2xl">
              {client.photoURL ? <img src={client.photoURL} alt={client.name} className="w-full h-full object-cover" /> : client.name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{client.name}</h2>
              <p className="text-neutral-500">{client.whatsapp || client.email}</p>
              <p className="text-amber-500 text-sm font-bold mt-1">Cliente há {yearsCustomer} anos</p>
            </div>
         </div>
         <div className="flex gap-3 mt-4">
              <button 
                onClick={() => {
                   onMessageClient?.(client);
                }}
                className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
              >
                  <MessageSquare className="w-4 h-4" /> Mensagem
              </button>
              <button 
                onClick={() => {
                   // Using the existing onScheduleClient prop from the parent
                   onScheduleClient?.(client);
                }}
                className="flex items-center gap-2 bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-700 transition-all"
              >
                  <Repeat className="w-4 h-4" /> Reagendar
              </button>
        </div>
      </div>

      <h3 className="text-lg font-black text-white mb-4">Histórico de Cortes</h3>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {completedAppointments.map(app => (
            <div key={app.id} className="bg-neutral-900 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-amber-500/20 transition-all">
               <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="bg-white/5 p-4 rounded-2xl text-neutral-400 group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
                      <Scissors className="w-5 h-5" />
                    </div>
                    {app.reviewPhotoUrl && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-amber-500 border-2 border-neutral-900 flex items-center justify-center">
                        <Star className="w-3 h-3 text-black fill-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm uppercase italic tracking-tight">{app.serviceName}</p>
                        {app.rating && (
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-500">{app.rating}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{new Date(app.date.toDate()).toLocaleDateString('pt-BR')}</p>
                  </div>
               </div>
               
               {app.reviewPhotoUrl && (
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 hover:scale-110 transition-transform">
                    <img src={app.reviewPhotoUrl} className="w-full h-full object-cover" alt="Review Photo" />
                </div>
               )}
            </div>
          ))}
          {completedAppointments.length === 0 && (
            <p className="text-neutral-500 text-center py-10">Nenhum corte realizado ainda.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
