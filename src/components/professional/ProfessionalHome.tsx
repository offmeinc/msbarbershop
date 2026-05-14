import React, { useState, useEffect, useMemo } from "react";
import { 
  query, 
  collection, 
  orderBy, 
  where, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import { 
  format, 
  isSameDay, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  User, 
  Clock, 
  ChevronRight, 
  CheckCircle2 
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

interface ProfessionalHomeProps {
  user: any;
  role: string;
  setCurrentScreen: (screen: string) => void;
}

export function ProfessionalHome({ user, role, setCurrentScreen }: ProfessionalHomeProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = role === 'manager' 
      ? query(collection(db, "appointments"), orderBy("date", "asc"))
      : query(collection(db, "appointments"), where("barberId", "==", user.uid), orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });
    return () => unsubscribe();
  }, [user?.uid, role]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayApps = appointments.filter(app => {
      const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return isSameDay(d, today);
    });

    const completedToday = todayApps.filter(a => a.status === 'completed');
    
    const earnings = completedToday.reduce((acc, a) => acc + (a.totalPrice || 0), 0);
    const uniqueClients = new Set(todayApps.map(a => a.clientId)).size;
    
    const totalConsidered = completedToday.length + todayApps.filter(a => a.status === 'cancelled').length;
    const attendanceRate = totalConsidered > 0 ? Math.round((completedToday.length / totalConsidered) * 100) : 100;

    const upcoming = appointments.filter(a => {
      const d = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
      return d >= today && a.status !== 'cancelled' && a.status !== 'completed';
    }).slice(0, 5);

    return {
      earnings,
      appointmentsCount: todayApps.length,
      attendanceRate,
      uniqueClients,
      upcoming,
      todayApps
    };
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
      </div>
    );
  }

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{getTimeGreeting()}, {user?.displayName?.split(' ')[0] || "Profissional"}! 👋</h1>
          <p className="text-neutral-500 text-sm flex items-center gap-1 font-medium mt-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Seu desempenho de hoje
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">
            {role === 'manager' ? 'Gestor' : 'Profissional'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setCurrentScreen("earnings")}
          className="bg-neutral-900 p-5 rounded-[2rem] border border-neutral-800 space-y-3 text-left relative overflow-hidden group hover:border-amber-500/30 active:scale-95 transition-all"
        >
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Ganhos Hoje</p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl font-black text-white tracking-tighter">R$ {stats.earnings.toFixed(2)}</h3>
          </div>
        </button>

        <button 
          onClick={() => setCurrentScreen("agenda")}
          className="bg-neutral-900 p-5 rounded-[2rem] border border-neutral-800 space-y-3 text-left relative overflow-hidden group hover:border-blue-500/30 active:scale-95 transition-all"
        >
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Atendimentos</p>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/20 transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl font-black text-white tracking-tighter">{stats.appointmentsCount}</h3>
          </div>
        </button>

        <div className="bg-neutral-900 p-5 rounded-[2rem] border border-white/5 space-y-3">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Comparecimento</p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">{stats.attendanceRate}%</h3>
            <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> hoje
            </p>
          </div>
        </div>

        <div className="bg-neutral-900 p-5 rounded-[2rem] border border-white/5 space-y-3">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Clientes Únicos</p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">{stats.uniqueClients}</h3>
            <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> hoje
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-neutral-900/50 rounded-[2.5rem] border border-white/5 border-dashed">
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h3 className="text-xl font-black text-white">Próximos Agendamentos</h3>
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest mt-1">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button onClick={() => setCurrentScreen("agenda")} className="text-neutral-500 text-xs font-bold flex items-center gap-1 hover:text-white transition-colors">
            Ver todos <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {stats.upcoming.length === 0 ? (
            <div className="p-8 text-center text-neutral-600 font-bold uppercase text-xs border border-dashed border-white/5 rounded-3xl">
              Nenhum agendamento futuro
            </div>
          ) : (
            stats.upcoming.map((app) => (
              <div key={app.id} className="bg-neutral-900/50 p-4 rounded-3xl border border-white/5 flex items-center justify-between hover:border-amber-500/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{app.clientName}</h4>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">{app.serviceName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-white">
                    {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "HH:mm")}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-700 group-hover:border-amber-500 group-hover:text-amber-500 transition-all">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
