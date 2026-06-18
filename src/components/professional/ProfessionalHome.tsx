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
  LayoutDashboard,
  AlertTriangle,
  ChevronLeft,
  CalendarDays,
  Check,
  Users
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

interface ProfessionalHomeProps {
  user: any;
  role: string;
  setCurrentScreen: (screen: string) => void;
  services?: any[];
}

export function ProfessionalHome({ user, role, setCurrentScreen, services = [] }: ProfessionalHomeProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingClient, setSchedulingClient] = useState<any | null>(null);
  const [unreadChats, setUnreadChats] = useState(0);

  const [gridDate, setGridDate] = useState<Date>(new Date());
  const [gridBarberId, setGridBarberId] = useState<string>("all");

  const barbersInApps = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    appointments.forEach(app => {
      if (app.barberId && app.barberName && !seen.has(app.barberId)) {
        seen.add(app.barberId);
        list.push({ id: app.barberId, name: app.barberName });
      }
    });
    return list;
  }, [appointments]);

  const gridConflicts = useMemo(() => {
    // 1. Get active appointments for the gridDate
    const activeApps = appointments.filter(app => {
      const d = app.date instanceof Timestamp 
        ? app.date.toDate() 
        : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return isSameDay(d, gridDate) && app.status !== 'cancelled';
    });

    // 2. Parse appointments with duration
    const parsedApps = activeApps.map(app => {
      const appDate = app.date instanceof Timestamp 
        ? app.date.toDate() 
        : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      const serviceInfo = services?.find(s => s.id === app.serviceId || s.name === app.serviceName);
      const appDuration = app.serviceDuration || serviceInfo?.duration || 30;
      const appEnd = new Date(appDate.getTime() + appDuration * 60000);
      return {
        ...app,
        parsedDate: appDate,
        parsedEndDate: appEnd,
        duration: appDuration,
      };
    });

    // 3. Detect overlaps per professional/barber
    return parsedApps.map(app => {
      const overlapping = parsedApps.filter(other => {
        if (other.id === app.id) return false;
        // MUST be the same barber to be a conflict
        if (app.barberId !== other.barberId) return false;
        return app.parsedDate < other.parsedEndDate && app.parsedEndDate > other.parsedDate;
      });

      return {
        ...app,
        hasConflict: overlapping.length > 0,
        conflictingApps: overlapping
      };
    });
  }, [appointments, gridDate, services]);

  const activeConflictedCount = useMemo(() => {
    // Filter out duplicates. Each appointment can record itself as conflicting.
    // If two apps conflict, counting both is fine (shows count of conflicted slots or bookings).
    return gridConflicts.filter(app => {
      if (gridBarberId !== "all" && app.barberId !== gridBarberId) return false;
      return app.hasConflict;
    }).length;
  }, [gridConflicts, gridBarberId]);

  const gridSlots = useMemo(() => {
    const slots = [];
    const startHour = 8;
    const endHour = 20;

    for (let h = startHour; h <= endHour; h++) {
      for (const m of [0, 30]) {
        if (h === endHour && m === 30) break; // limit to 20:00
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        
        // For this slot, check which parsed appointments intersect this time slot
        const slotStart = new Date(gridDate);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

        // Find intersecting apps
        const intersecting = gridConflicts.filter(app => {
          // If a specific barber is selected, filter by that barber
          if (gridBarberId !== "all" && app.barberId !== gridBarberId) return false;
          return slotStart < app.parsedEndDate && slotEnd > app.parsedDate;
        });

        // Group intersecting apps by barberId to see if any barber has > 1 app in this slot
        const barberMap: Record<string, typeof intersecting> = {};
        intersecting.forEach(app => {
          if (!barberMap[app.barberId]) {
            barberMap[app.barberId] = [];
          }
          barberMap[app.barberId].push(app);
        });

        const hasConflictInSlot = Object.values(barberMap).some(list => list.length > 1);

        slots.push({
          time: timeStr,
          appointments: intersecting,
          hasConflict: hasConflictInSlot,
          slotStart,
          slotEnd
        });
      }
    }
    return slots;
  }, [gridConflicts, gridDate, gridBarberId]);

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
    const q = (role === 'manager') 
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
      <div className="flex justify-center -mb-4">
        {role === 'barber' && (
          <div className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full font-black uppercase tracking-widest inline-flex items-center gap-2">
            Modo Profissional: Filtrado
          </div>
        )}
      </div>
      
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="liquid-glass w-16 h-16 rounded-[1.75rem] overflow-hidden -amber-500/20 shadow-lg shadow-amber-500/10 shrink-0 relative group">
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
            {role === 'developer' ? (
              <span className="text-[8.5px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded leading-none inline-flex items-center gap-1 animate-pulse">
                🛠️ Desenvolvedor / Admin
              </span>
            ) : (
              <span className="text-[8.5px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded leading-none inline-block">
                {role === 'manager' ? 'Gestor / Administrador' : 'Barbeiro Profissional'}
              </span>
            )}
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
            className="bg-neutral-900/40  liquid-glass/80 backdrop-blur-md p-6 rounded-[2rem]  hover:border-emerald-500/20 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between min-h-[140px] cursor-pointer"
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
            className="bg-neutral-900/40  liquid-glass/80 backdrop-blur-md p-6 rounded-[2rem]  hover:border-blue-500/20 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between min-h-[140px] cursor-pointer"
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
          <div className=" liquid-glass/40 p-6 rounded-[2rem]  flex flex-col justify-between min-h-[140px] relative overflow-hidden text-left">
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
          <div className=" liquid-glass/40 p-6 rounded-[2rem]  flex flex-col justify-between min-h-[140px] relative overflow-hidden text-left">
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
          
          {/* Main management configuration (Admin / Barbershop Management) - ONLY FOR MANAGER */}
          {(role === 'manager' || role === 'developer') && (
            <button 
              onClick={() => setCurrentScreen("barber-management")}
              className="bg-neutral-900/30  liquid-glass/80  hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
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
          )}

          {/* Agenda view option */}
          <button 
            id="agenda-box-link"
            onClick={() => setCurrentScreen("agenda")}
            className="bg-neutral-900/30  liquid-glass/80  hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
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
            className="bg-neutral-900/30  liquid-glass/80  hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
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
            className="bg-neutral-900/30  liquid-glass/80  hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
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
            className="bg-neutral-900/30  liquid-glass/80  hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
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

          {/* Marketing Promotions panel - ONLY FOR MANAGER */}
          {(role === 'manager' || role === 'developer') && (
            <button 
              onClick={() => setCurrentScreen("promotions")}
              className="bg-neutral-900/30  liquid-glass/80  hover:border-amber-500/20 p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[145px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
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
          )}

        </div>
      </div>

      {/* 4. Real-time Schedule Conflict Grid */}
      <div className="p-6 liquid-glass/40 rounded-[2.5rem] shadow-inner space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-[14px] sm:text-lg font-black text-white uppercase italic tracking-tight leading-none text-left">
              Grade de Ajuste & Conflitos
            </h3>
            <span className="text-[8px] sm:text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1.5 block">
              Monitor de Colisões e Sobreposições em Tempo Real
            </span>
          </div>
          
          {/* Day Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/5 self-start sm:self-auto">
            <button
              onClick={() => {
                const prev = new Date(gridDate);
                prev.setDate(prev.getDate() - 1);
                setGridDate(prev);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all active:scale-90"
              title="Dia Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 flex flex-col items-center min-w-[100px]">
              <span className="text-[9.5px] font-black text-amber-500 uppercase tracking-wider">
                {isSameDay(gridDate, new Date()) ? "Hoje" : format(gridDate, "eeee", { locale: ptBR })}
              </span>
              <span className="text-[10px] text-neutral-300 font-bold whitespace-nowrap">
                {format(gridDate, "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
            <button
              onClick={() => {
                const next = new Date(gridDate);
                next.setDate(next.getDate() + 1);
                setGridDate(next);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all active:scale-90"
              title="Próximo Dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isSameDay(gridDate, new Date()) && (
              <button
                onClick={() => setGridDate(new Date())}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black text-[8px] font-black uppercase tracking-wider transition-all"
              >
                Hoje
              </button>
            )}
          </div>
        </div>

        {/* Manager Barber Selector Tab Row */}
        {(role === 'manager' || role === 'developer') && barbersInApps.length > 0 && (
          <div className="space-y-2 text-left">
            <label className="text-[8.5px] text-neutral-500 font-extrabold uppercase tracking-widest pl-1 block">
              Filtrar por Profissional:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setGridBarberId("all")}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${gridBarberId === "all" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-neutral-900/40 text-neutral-400 hover:text-white border border-white/5"}`}
              >
                Todos ({barbersInApps.length})
              </button>
              {barbersInApps.map(b => (
                <button
                  key={b.id}
                  onClick={() => setGridBarberId(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${gridBarberId === b.id ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-neutral-900/40 text-neutral-400 hover:text-white border border-white/5"}`}
                >
                  {b.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Health Status Indicator Banner */}
        {activeConflictedCount > 0 ? (
          <div className="flex items-center gap-3.5 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl animate-pulse text-left">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">
                Conflito de Horário Encontrado!
              </h4>
              <p className="text-[10px] text-neutral-400 font-medium">
                Há <span className="text-rose-400 font-bold">{activeConflictedCount}</span> agendamentos com horários sobrepostos nesta data. Verifique os blocos piscantes em vermelho na grade para corrigir.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-left">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Check className="w-5 h-5 font-black" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                Agenda 100% Organizada
              </h4>
              <p className="text-[10px] text-neutral-400 font-medium font-sans">
                Tudo sob controle! Nenhum conflito ou colisão de horário detectado para {gridBarberId === "all" ? "os profissionais" : "este profissional"} na data selecionada.
              </p>
            </div>
          </div>
        )}

        {/* Time Grid Block Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5">
          {gridSlots.map((slot) => {
            const hasApps = slot.appointments.length > 0;
            const hasOverlaps = slot.hasConflict;

            let cardStyles = "border-neutral-800 bg-neutral-900/10 text-neutral-500";
            if (hasOverlaps) {
              cardStyles = "border-rose-500/40 bg-rose-950/20 text-rose-300 animate-pulse shadow-xs shadow-rose-500/5";
            } else if (hasApps) {
              cardStyles = "border-emerald-500/30 bg-emerald-950/10 text-emerald-400 shadow-xs shadow-emerald-500/5";
            }

            return (
              <div
                key={slot.time}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col justify-between hover:scale-[1.02] duration-200 min-h-[90px] relative overflow-hidden group ${cardStyles}`}
              >
                {/* Visual Glow background on hover */}
                <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Clock / Time label */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${hasOverlaps ? "text-rose-400" : hasApps ? "text-emerald-400" : "text-neutral-500"}`}>
                    {slot.time}
                  </span>
                  
                  {hasOverlaps ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : hasApps ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-neutral-700" />
                  )}
                </div>

                {/* Content Area */}
                <div className="text-left w-full h-full flex flex-col justify-end space-y-1 mt-auto">
                  {hasOverlaps ? (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-wide uppercase italic leading-none block">
                        Colisão!
                      </span>
                      <p className="text-[9px] text-neutral-200 font-extrabold truncate leading-tight uppercase tracking-tight">
                        {slot.appointments.map(app => app.clientName.split(" ")[0]).join(" + ")}
                      </p>
                      <span className="text-[7.5px] text-rose-400 font-medium block leading-none">
                        Mesmo profissional
                      </span>
                    </div>
                  ) : hasApps ? (
                    <div className="space-y-0.5">
                      <span className="text-[10.5px] font-black text-white truncate block uppercase leading-tight italic">
                        {slot.appointments[0].clientName.split(" ")[0]}
                      </span>
                      <p className="text-[8px] text-emerald-500 font-black tracking-wide truncate uppercase leading-none">
                        {slot.appointments[0].serviceName || "Agendado"}
                      </p>
                      
                      {gridBarberId === "all" && (
                        <p className="text-[7px] text-neutral-500 font-semibold truncate uppercase leading-tight">
                          • {slot.appointments[0].barberName?.split(" ")[0]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 text-left">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-neutral-600 block">
                        Livre
                      </span>
                    </div>
                  )}
                </div>

                {/* Invisible/hover overlay tooltip block for exact durations */}
                {(hasApps || hasOverlaps) && (
                  <div className="absolute inset-x-0 bottom-0 py-1 px-1 bg-black/90 text-white text-[7.5px] border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-full group-hover:translate-y-0 flex items-center justify-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                    <span className="text-slate-200 font-semibold truncate">
                      {slot.appointments.map(app => `${app.clientName.split(" ")[0]} (${app.duration} min)`).join(" / ")}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Upcoming Schedules Section */}
      <div className="p-6 liquid-glass/40 rounded-[2.5rem]  shadow-inner">
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
                className="bg-neutral-950/40  liquid-glass/85 p-5 rounded-[1.75rem]  flex items-center justify-between hover:border-amber-500/20 transition-all group relative overflow-hidden text-left"
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
                  <div className="liquid-glass w-8 h-8 rounded-full flex items-center justify-center text-neutral-600 group-hover:-amber-500/20 group-hover:text-amber-500 transition-all">
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
