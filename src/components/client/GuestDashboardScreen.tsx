import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Ticket, Scissors, Calendar, Clock, ChevronRight } from "lucide-react";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GuestDashboardScreen({ loginCode, onBack }: { loginCode: string, onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "appointments"), where("loginCode", "==", loginCode));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });
    return unsubscribe;
  }, [loginCode]);

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Seus Agendamentos</h2>
        <button onClick={onBack} className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">Sair do Painel</button>
      </div>

      <div className=" liquid-glass  p-6 rounded-[2rem] flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-black">
          <Ticket className="w-6 h-6 outline-none" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Código de Acesso</p>
          <p className="text-xl font-black text-white italic">{loginCode}</p>
        </div>
      </div>

      {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
      ) : (
          <div className="space-y-4">
              {appointments.map(app => {
                  const d = app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date);
                  return (
                      <div key={app.id} className=" liquid-glass  p-6 rounded-[2.5rem] flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 liquid-glass rounded-2xl overflow-hidden flex items-center justify-center ">
                                <img 
                                  src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
                                  alt="Logo"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div>
                                  <h4 className="font-black text-white uppercase italic text-sm">{app.serviceName}</h4>
                                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                                    {format(d, "dd 'de' MMMM", { locale: ptBR })} às {app.time}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className={`w-2 h-2 rounded-full ${app.status === 'confirmed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                      <span className="text-[9px] font-black uppercase text-neutral-600">{app.status === 'confirmed' ? 'Confirmado' : 'Pendente'}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  );
              })}
              {appointments.length === 0 && <p className="text-center text-neutral-500 py-20 font-bold uppercase text-xs tracking-widest italic animate-pulse">Nenhum agendamento encontrado.</p>}
          </div>
      )}
    </div>
  );
}
