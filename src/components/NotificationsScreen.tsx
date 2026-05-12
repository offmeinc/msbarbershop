import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { Calendar, CalendarCheck, CalendarX, BellOff, ChevronLeft } from "lucide-react";

interface NotificationsScreenProps {
  notifications: any[];
  appointments: any[];
  onBack: () => void;
  onClear: () => void;
}

export const NotificationsScreen = ({ notifications, appointments, onBack, onClear }: NotificationsScreenProps) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'history'>('recent');

  const history = useMemo(() => {
    return appointments
      .sort((a,b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [appointments]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-md mx-auto py-8 px-6 min-h-screen pb-32"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Notificações</h2>
        </div>
        {notifications.length > 0 && activeTab === 'recent' && (
          <button 
            onClick={onClear}
            className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-neutral-900 rounded-2xl mb-6 border border-white/5">
        <button 
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recent' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
        >
          Recentes ({notifications.filter(n => !n.read).length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
        >
          Histórico
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'recent' ? (
          <>
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-3xl border transition-all ${n.read ? 'bg-neutral-900/30 border-white/5 opacity-60' : 'bg-neutral-900 border-amber-500/30 shadow-lg shadow-amber-500/5'}`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.type === 'booking' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {n.type === 'booking' ? <CalendarCheck className="w-5 h-5" /> : <CalendarX className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${n.type === 'booking' ? 'text-green-500' : 'text-red-500'}`}>
                        {n.type === 'booking' ? 'Novo Agendamento' : 'Cancelamento'}
                      </span>
                      <span className="text-[9px] text-neutral-600 font-bold whitespace-nowrap">
                        {n.timestamp?.toDate ? format(n.timestamp.toDate(), "HH:mm • dd/MM", { locale: ptBR }) : "Agora"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <BellOff className="w-12 h-12 text-neutral-800 mx-auto" />
                <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">Sem notificações no momento.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {history.map((app) => (
              <div key={app.id} className="p-4 rounded-3xl bg-neutral-900/50 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${app.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-neutral-800 text-neutral-500'}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{app.clientName}</h4>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-tighter ring-offset-2">
                      {app.serviceName} • {app.time} • {format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), "dd/MM")}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                  app.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                  app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
};
