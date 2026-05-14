import React from "react";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { Scissors, Calendar, Clock, CheckCircle, XCircle, Info } from "lucide-react";

interface MyCutsScreenProps {
  appointments: any[];
}

export function MyCutsScreen({ appointments }: MyCutsScreenProps) {
  const now = new Date();
  const futureAppointments = appointments
    .filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate > now && app.status !== 'cancelled';
    })
    .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateA.getTime() - dateB.getTime();
    });

  const pastAppointments = appointments
    .filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate <= now || app.status === 'cancelled';
    })
    .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateB.getTime() - dateA.getTime();
    });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black text-white p-6 pt-20 pb-32">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Meus Cortes</h2>
      
      <div className="space-y-8">
        {futureAppointments.length > 0 && (
          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 px-2">Futuros</h3>
            <div className="space-y-3">
                {futureAppointments.map(app => (
                    <div key={app.id} className="p-5 bg-neutral-900 rounded-[2rem] border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-500"><Calendar className="w-5 h-5"/></div>
                            <div>
                                <h4 className="text-sm font-bold uppercase italic">{app.serviceName}</h4>
                                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">
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
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-4 px-2">Histórico</h3>
          <div className="space-y-3">
              {pastAppointments.map(app => (
                  <div key={app.id} className="p-5 bg-[#0A0A0A] rounded-[2rem] border border-white/5 flex items-center justify-between opacity-80">
                      <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white'}`}>
                                {app.status === 'cancelled' ? <XCircle className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
                            </div>
                          <div>
                              <h4 className="text-sm font-bold uppercase italic">{app.serviceName}</h4>
                              <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">
                                  {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                          </div>
                      </div>
                      <p className="text-xs font-black text-white italic">R${(Number(app.totalPrice) || 0).toFixed(2)}</p>
                  </div>
              ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
