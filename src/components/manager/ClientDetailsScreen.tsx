import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Calendar, Scissors, Clock } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

export function ClientDetailsScreen({ client, onBack }: { client: any, onBack: () => void }) {
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
      </div>

      <h3 className="text-lg font-black text-white mb-4">Histórico de Cortes</h3>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {completedAppointments.map(app => (
            <div key={app.id} className="bg-neutral-900 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="bg-white/5 p-3 rounded-xl text-neutral-400">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{app.serviceName}</p>
                    <p className="text-xs text-neutral-500">{new Date(app.date.toDate()).toLocaleDateString('pt-BR')}</p>
                  </div>
               </div>
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
