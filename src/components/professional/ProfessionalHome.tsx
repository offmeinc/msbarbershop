import React, { useState, useEffect, useMemo } from "react";
import { 
  query, 
  collection, 
  orderBy, 
  where, 
  onSnapshot, 
  Timestamp,
  getFirestore
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
  CheckCircle2,
  Image as ImageIcon,
  MessageSquare,
  Sliders,
  LayoutDashboard
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
  const [schedulingClient, setSchedulingClient] = useState<any | null>(null);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    const firestore = db || getFirestore();
    const q = query(collection(firestore, "chats"), where("unreadByStaff", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadChats(snapshot.size);
    }, (error) => {
      console.warn("Unread chats snapshot error", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const firestore = db || getFirestore();
    const q = role === 'manager' 
      ? query(collection(firestore, "appointments"), orderBy("date", "asc"))
      : query(collection(firestore, "appointments"), where("barberId", "==", user.uid), orderBy("date", "asc"));

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
    
    const earnings = completedToday.reduce((acc, a) => {
      const p = a.totalPrice || a.price || 0;
      const parsed = typeof p === 'string' ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
      return acc + (Number(parsed) || 0);
    }, 0);
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
    <div className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-500 text-left">
      
      {/* 1. Header with glass styling */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.75rem] overflow-hidden bg-neutral-900 border border-amber-500/20 shadow-lg shadow-amber-500/10 shrink-0 relative group">
            <img 
              src={user?.photoURL || user?.photoUrl || `https://ui-avatars.com/api/?name=${user?.displayName || user?.name || 'Profissional'}&background=1a1a1a&color=fff`} 
              alt="Avatar" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 rounded-[1.75rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.15)] pointer-events-none" />
          </div>
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest leading-none">
                {getTimeGreeting()}
              </span>
              <Sparkles className="w-3 h-3 text-amber-500/80 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight leading-none truncate max-w-[180px] sm:max-w-[280px]">
              {user?.displayName || user?.name || "Profissional"}
            </h1>
            <span className="text-[8.5px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded leading-none inline-block">
              {role === 'manager' ? 'Gestor' : 'Profissional / Barbeiro'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Primary KPI Highlights (Asymmetric bento blocks) */}
      <div className="space-y-4">
        <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest ml-1">
          • Visão de Desempenho (Hoje)
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Earnings card */}
          <button 
            onClick={() => setCurrentScreen("earnings")}
            className="bg-neutral-900/40 hover:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 hover:border-emerald-500/20 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between min-h-[140px] cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Ganhos Hoje</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 mt-4">
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                R$ {stats.earnings.toFixed(2)}
              </h3>
              <p className="text-[8.5px] text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Faturamento consolidado
              </p>
            </div>
          </button>

          {/* Appointments Count Card */}
          <button 
            onClick={() => setCurrentScreen("agenda")}
            className="bg-neutral-900/40 hover:bg-neutral-900/80 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 hover:border-blue-500/20 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between min-h-[140px] cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Atendimentos</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-all">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 mt-4">
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                {stats.appointmentsCount}
              </h3>
              <p className="text-[8.5px] text-blue-400 font-bold">
                Agendados para hoje
              </p>
            </div>
          </button>

          {/* Attendance performance */}
          <div className="bg-neutral-900/40 p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between min-h-[140px] relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.01] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Comparecimento</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 mt-4">
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                {stats.attendanceRate}%
              </h3>
              <p className="text-[8.5px] text-amber-500 font-bold flex items-center gap-1">
                Controle de faltas hoje
              </p>
            </div>
          </div>

          {/* Unique clients key stats */}
          <div className="bg-neutral-900/40 p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between min-h-[140px] relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/[0.01] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Clientes Únicos</span>
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                <User className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 mt-4">
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
                {stats.uniqueClients}
              </h3>
              <p className="text-[8.5px] text-pink-400 font-bold">
                Atendidos hoje
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Action Bento Modules with premium layout alignment (side by side in columns) */}
      <div className="space-y-4">
        <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest ml-1">
          • Painel Operacional de Gestão
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          
          {/* Main management configuration (Admin / Barbershop Management) */}
          <button 
            onClick={() => setCurrentScreen("barber-management")}
            className="bg-neutral-900/30 hover:bg-neutral-900/80 border border-white/5 hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/[0.02] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 group-hover:border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 mt-4">
              <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                Gestão Geral
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block line-clamp-2">
                Gerenciar equipe, serviços, preços e horários
              </span>
            </div>
          </button>

          {/* Agenda view option */}
          <button 
            id="agenda-box-link"
            onClick={() => setCurrentScreen("agenda")}
            className="bg-neutral-900/30 hover:bg-neutral-900/80 border border-white/5 hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/[0.02] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 group-hover:border-amber-500/20 flex items-center justify-center text-blue-400 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 mt-4">
              <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                Agenda Oficial
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block line-clamp-2">
                Visualizar compromissos, agendamentos e horários em tempo real
              </span>
            </div>
          </button>

          {/* Message Inbox */}
          <button 
            onClick={() => setCurrentScreen("professional-chat")}
            className="bg-neutral-900/30 hover:bg-neutral-900/80 border border-white/5 hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/[0.02] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 group-hover:border-amber-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
              <MessageSquare className="w-5 h-5" />
              {unreadChats > 0 && (
                <span className="absolute -top-1.5 right-[calc(-0.25rem-1px)] bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-neutral-900 leading-none animate-pulse">
                  {unreadChats}
                </span>
              )}
            </div>
            <div className="space-y-0.5 mt-4">
              <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                Chat com Clientes
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block line-clamp-2">
                Suporte e mensagens em tempo real com clientes
              </span>
            </div>
          </button>

          {/* Client directory */}
          <button 
            onClick={() => setCurrentScreen("clients")}
            className="bg-neutral-900/30 hover:bg-neutral-900/80 border border-white/5 hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-500/[0.02] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 group-hover:border-amber-500/20 flex items-center justify-center text-pink-500 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
              <User className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 mt-4">
              <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                Lista de Clientes
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block line-clamp-2">
                Banco de contatos de clientes cadastrados no app
              </span>
            </div>
          </button>

          {/* Image Portfolio lookbook */}
          <button 
            onClick={() => setCurrentScreen("portfolio")}
            className="bg-neutral-900/30 hover:bg-neutral-900/80 border border-white/5 hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-500/[0.02] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 group-hover:border-amber-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 mt-4">
              <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                Galeria de Fotos
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block line-clamp-2">
                Ver e upar cortes ou trabalhos para o Lookbook
              </span>
            </div>
          </button>

          {/* Marketing Promotions panel */}
          <button 
            onClick={() => setCurrentScreen("promotions")}
            className="bg-neutral-900/30 hover:bg-neutral-900/80 border border-white/5 hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/[0.02] pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-black border border-white/5 group-hover:border-amber-500/20 flex items-center justify-center text-purple-400 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 mt-4">
              <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                Gerenciar Cupons
              </span>
              <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block block line-clamp-2">
                Criar descontos inovadores e códigos promocionais
              </span>
            </div>
          </button>

        </div>
      </div>

      {/* 4. Upcoming Schedules Section */}
      <div className="p-6 bg-neutral-900/40 rounded-[2.5rem] border border-white/5 shadow-inner">
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="text-left">
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-none text-left">Próximos da Agenda</h3>
            <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1 block">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <button 
            onClick={() => setCurrentScreen("agenda")} 
            className="text-amber-500 text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.upcoming.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-2 col-span-full">
              <Clock className="w-8 h-8 text-neutral-600 block animate-pulse" />
              <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest leading-none text-center">
                Sem compromissos futuros hoje
              </div>
              <p className="text-[9px] text-neutral-600">Novos agendamentos aparecerão em tempo real aqui.</p>
            </div>
          ) : (
            stats.upcoming.map((app) => (
              <div 
                key={app.id} 
                className="bg-neutral-950/40 hover:bg-neutral-950/85 p-5 rounded-[1.75rem] border border-white/5 flex items-center justify-between hover:border-amber-500/20 transition-all group relative overflow-hidden text-left"
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/[0.005] pointer-events-none" />
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-[1.25rem] bg-black border border-white/5 group-hover:border-amber-500/15 flex items-center justify-center text-neutral-400 group-hover:text-amber-500 transition-colors shrink-0">
                    <Clock className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="text-left space-y-0.5">
                    <h4 className="font-extrabold text-white text-xs sm:text-sm leading-tight uppercase tracking-wide group-hover:text-amber-400 transition-colors">
                      {app.clientName}
                    </h4>
                    <p className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-wide">{app.serviceName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3.5 shrink-0">
                  <span className="text-sm font-black text-amber-500 italic">
                    {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "HH:mm")}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600 group-hover:border-amber-500/20 group-hover:text-amber-500 transition-all">
                    <CheckCircle2 className="w-4 h-4 cursor-pointer" />
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
