import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from "recharts";
import { 
  query, 
  collection, 
  orderBy, 
  where, 
  onSnapshot, 
  Timestamp,
  getFirestore,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { 
  format, 
  isSameDay, 
  parseISO,
  startOfDay,
  endOfDay,
  startOfTomorrow,
  isAfter
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
  Users,
  CalendarClock,
  Scissors,
  Play,
  UserX,
  AlertCircle,
  Receipt,
  Phone,
  Filter
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { FutureEarningsModal } from "./FutureEarningsModal";
import { CheckoutModal } from "./CheckoutModal";
import { NoShowModal } from "./NoShowModal";
import { PendingCheckoutsModal } from "./PendingCheckoutsModal";
import { GoalsWidget } from "./GoalsWidget";

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
  const [showFutureEarningsModal, setShowFutureEarningsModal] = useState(false);
  const [showPendingCheckoutsModal, setShowPendingCheckoutsModal] = useState(false);
  const [selectedAppointmentForCheckout, setSelectedAppointmentForCheckout] = useState<any | null>(null);
  const [selectedAppointmentForNoShow, setSelectedAppointmentForNoShow] = useState<any | null>(null);
  const [todayFilter, setTodayFilter] = useState<"all" | "in_progress" | "pending_checkout" | "scheduled" | "completed" | "no_show">("all");
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const [gridDate, setGridDate] = useState<Date>(new Date());
  const [gridBarberId, setGridBarberId] = useState<string>("all");

  const handleStartService = async (app: any) => {
    if (!app?.id) return;
    setActionInProgressId(app.id);
    try {
      const appRef = doc(db, "appointments", app.id);
      await updateDoc(appRef, {
        status: "in_progress",
        serviceStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send quick notification to client if applicable
      if (app.clientId && app.clientId !== "guest") {
        try {
          await addDoc(collection(db, "notifications"), {
            clientId: app.clientId,
            type: "service_started",
            message: `Seu atendimento com ${app.barberName || "o profissional"} começou! Sente-se confortavelmente e aproveite. 💈`,
            timestamp: serverTimestamp(),
            read: false,
            appointmentId: app.id
          });
        } catch {}
      }
    } catch (err) {
      console.error("Error starting service:", err);
      handleFirestoreError(err, OperationType.UPDATE, "appointments");
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCancelAppointment = async (app: any) => {
    if (!app?.id) return;
    try {
      const appRef = doc(db, "appointments", app.id);
      await updateDoc(appRef, {
        status: "cancelled",
        updatedAt: serverTimestamp()
      });
      setShowPendingCheckoutsModal(false);
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      handleFirestoreError(err, OperationType.UPDATE, "appointments");
    }
  };

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

  const parseAppDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    if (dateVal instanceof Timestamp) return dateVal.toDate();
    if (dateVal && typeof dateVal.toDate === "function") return dateVal.toDate();
    if (typeof dateVal === "string") {
      try {
        const d = parseISO(dateVal);
        if (d instanceof Date && !isNaN(d.getTime())) return d;
        const fallback = new Date(dateVal);
        return isNaN(fallback.getTime()) ? null : fallback;
      } catch {
        const fallback = new Date(dateVal);
        return isNaN(fallback.getTime()) ? null : fallback;
      }
    }
    if (typeof dateVal === "number") {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const getAppointmentPrice = (app: any): number => {
    if (!app) return 0;
    const rawPrice = app.totalPrice ?? app.price ?? 0;
    if (typeof rawPrice === "number") return isNaN(rawPrice) ? 0 : rawPrice;
    if (typeof rawPrice === "string") {
      const cleaned = rawPrice.replace(/[^0-9.-]+/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    // Fallback to service price if available
    const serviceInfo = services?.find(s => s.id === app.serviceId || s.name === app.serviceName);
    if (serviceInfo && serviceInfo.price) {
      const sp = typeof serviceInfo.price === "number" ? serviceInfo.price : parseFloat(String(serviceInfo.price).replace(/[^0-9.-]+/g, ""));
      if (!isNaN(sp) && sp > 0) return sp;
    }
    return 0;
  };

  const stats = useMemo(() => {
    const today = new Date();
    const startOfTodayVal = startOfDay(today);
    const endOfTodayVal = endOfDay(today);

    const todayApps = appointments.filter(app => {
      const d = parseAppDate(app.date);
      return d ? isSameDay(d, today) : false;
    });

    const completedToday = todayApps.filter(a => a.status === 'completed');
    const inProgressApps = todayApps.filter(a => a.status === 'in_progress');
    const noShowApps = todayApps.filter(a => a.status === 'no_show');
    const scheduledApps = todayApps.filter(a => a.status === 'confirmed' || a.status === 'scheduled' || a.status === 'pending');
    
    // Pending checkout: appointments that are in_progress, or whose scheduled time has passed and are not marked completed/cancelled/no_show
    const nowTimeStr = format(today, "HH:mm");
    const pendingCheckoutApps = todayApps.filter(a => {
      if (a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show') return false;
      if (a.status === 'in_progress') return true;
      if (a.time && a.time <= nowTimeStr) return true;
      return false;
    });
    
    // Future appointments: strictly from the next day onward (tomorrow and future dates), not completed and not cancelled
    const futureAppointments = appointments.filter(app => {
      if (app.status === 'completed' || app.status === 'cancelled' || app.status === 'no_show') return false;
      const d = parseAppDate(app.date);
      if (!d) return false;
      return isAfter(d, endOfTodayVal) || startOfDay(d) > startOfTodayVal;
    });
    
    const earnings = completedToday.reduce((acc, a) => {
      return acc + getAppointmentPrice(a);
    }, 0);

    const futureEarnings = futureAppointments.reduce((acc, a) => {
      return acc + getAppointmentPrice(a);
    }, 0);

    const futureCount = futureAppointments.length;

    const uniqueClients = new Set(todayApps.map(a => a.clientId || a.clientPhone || a.clientName).filter(Boolean)).size;
    
    const totalConsidered = completedToday.length + todayApps.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
    const attendanceRate = totalConsidered > 0 ? Math.round((completedToday.length / totalConsidered) * 100) : 100;

    const upcoming = appointments.filter(a => {
      const d = parseAppDate(a.date);
      return d && d >= today && a.status !== 'cancelled' && a.status !== 'completed' && a.status !== 'no_show';
    }).slice(0, 8);

    return {
      earnings,
      futureEarnings,
      completedCount: completedToday.length,
      futureCount,
      appointmentsCount: todayApps.length,
      attendanceRate,
      uniqueClients,
      upcoming,
      todayApps,
      inProgressApps,
      scheduledApps,
      pendingCheckoutApps,
      noShowApps,
      completedToday
    };
  }, [appointments, services]);

  const weeklyActivityData = useMemo(() => {
    const reorderedDays = [
      { name: "Seg", index: 1 },
      { name: "Ter", index: 2 },
      { name: "Qua", index: 3 },
      { name: "Qui", index: 4 },
      { name: "Sex", index: 5 },
      { name: "Sáb", index: 6 },
      { name: "Dom", index: 0 }
    ];

    return reorderedDays.map(day => {
      const dayApps = appointments.filter(app => {
        if (app.status !== 'completed') return false;
        const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        return d instanceof Date && !isNaN(d.getTime()) && d.getDay() === day.index;
      });

      const atendimentos = dayApps.length;
      const totalValue = dayApps.reduce((acc, curr) => {
        const price = parseFloat((curr.totalPrice || curr.price || 0).toString().replace(/[^0-9.-]+/g, ""));
        return acc + (Number(price) || 0);
      }, 0);
      const ticketMedio = atendimentos > 0 ? parseFloat((totalValue / atendimentos).toFixed(2)) : 0;

      return {
        dayName: day.name,
        atendimentos,
        ticketMedio
      };
    });
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
              src={user?.photoURL || user?.photoUrl || user?.photo || user?.avatar || user?.avatarUrl || user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || user?.name || 'Profissional')}&background=1a1a1a&color=fff`} 
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
              {role === 'manager' ? 'Gestor / Administrador' : 'Barbeiro Profissional'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Primary KPI Highlights (Asymmetric bento blocks with square cards side by side) */}
      <div className="space-y-4">
        <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest ml-1">
          • Visão de Desempenho (Hoje)
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* 1. Ganhos Hoje (Realizado) */}
          <button 
            onClick={() => setCurrentScreen("earnings")}
            className="bg-neutral-900/40 liquid-glass/80 backdrop-blur-md p-4 sm:p-5 rounded-[1.75rem] sm:rounded-[2rem] hover:border-emerald-500/20 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between aspect-square cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.03] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[8px] sm:text-[9px] font-black text-neutral-500 uppercase tracking-wider">Ganhos Hoje</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-none">
                R$ {stats.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[8px] sm:text-[8.5px] text-emerald-400 font-bold flex items-center gap-1 truncate">
                <TrendingUp className="w-3 h-3 flex-shrink-0" /> Realizado ({stats.completedCount})
              </p>
            </div>
          </button>

          {/* 2. Ganhos Futuros (Previsto Agendado) */}
          <button 
            id="kpi-future-earnings-btn"
            onClick={() => setShowFutureEarningsModal(true)}
            className="bg-neutral-900/40 liquid-glass/80 backdrop-blur-md p-4 sm:p-5 rounded-[1.75rem] sm:rounded-[2rem] hover:border-blue-500/30 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between aspect-square cursor-pointer"
            title="Clique para ver o relatório detalhado de ganhos futuros e possíveis entradas"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/[0.05] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[8px] sm:text-[9px] font-black text-neutral-400 uppercase tracking-wider">Ganhos Futuros</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-black transition-all shadow-sm">
                <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-none">
                R$ {stats.futureEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[8px] sm:text-[8.5px] text-blue-400 font-bold flex items-center gap-1 truncate">
                <Calendar className="w-3 h-3 flex-shrink-0" /> Próximos dias ({stats.futureCount}) • Ver detalhes
              </p>
            </div>
          </button>

          {/* 3. Atendimentos Count Card */}
          <button 
            onClick={() => setCurrentScreen("agenda")}
            className="bg-neutral-900/40 liquid-glass/80 backdrop-blur-md p-4 sm:p-5 rounded-[1.75rem] sm:rounded-[2rem] hover:border-amber-500/20 text-left relative overflow-hidden group active:scale-95 transition-all flex flex-col justify-between aspect-square cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/[0.03] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[8px] sm:text-[9px] font-black text-neutral-500 uppercase tracking-wider">Atendimentos</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-all">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-none">
                {stats.appointmentsCount}
              </h3>
              <p className="text-[8px] sm:text-[8.5px] text-amber-400 font-bold truncate">
                Total para hoje
              </p>
            </div>
          </button>

          {/* 4. Dar Baixa (Checkout) */}
          <button 
            onClick={() => setShowPendingCheckoutsModal(true)}
            className="bg-emerald-600/20 liquid-glass/80 backdrop-blur-md p-4 sm:p-5 rounded-[1.75rem] sm:rounded-[2rem] hover:bg-emerald-600/30 border border-emerald-500/20 hover:border-emerald-500/50 flex flex-col justify-between aspect-square relative overflow-hidden group active:scale-95 transition-all text-left cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.1] rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-start w-full">
              <span className="text-[8px] sm:text-[9px] font-black text-emerald-400 uppercase tracking-wider">Dar Baixa</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tighter leading-none">
                {stats.pendingCheckoutApps.length + stats.inProgressApps.length}
              </h3>
              <p className="text-[8px] sm:text-[8.5px] text-emerald-400 font-bold truncate">
                Pendentes hoje
              </p>
            </div>
          </button>

        </div>

        {/* 2.5 Goals Widget with dual-layer progress and closing projection */}
        <GoalsWidget
          appointments={appointments}
          currentUserId={user?.uid}
          role={role}
          userMonthlyGoal={user?.monthlyGoal || 5000}
          onNavigateToAgenda={() => setCurrentScreen("agenda")}
          onNavigateToGoals={() => setCurrentScreen("goals")}
        />
      </div>

      {/* 3. Action Bento Modules with premium layout alignment (side by side in columns) */}
      <div className="space-y-4">
        <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest ml-1">
          • Painel Operacional de Gestão
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
          
          {/* Main management configuration (Admin / Barbershop Management) - ONLY FOR MANAGER */}
          {role === 'manager' && (
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
          {role === 'manager' && (
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
        {role === 'manager' && barbersInApps.length > 0 && (
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

      {/* 4. Manager Analytics Chart Section - ONLY FOR MANAGER */}
      {role === 'manager' && (
        <div className="p-6 liquid-glass/40 rounded-[2.5rem] shadow-inner space-y-6">
          <div className="text-left">
            <h3 className="text-[14px] sm:text-lg font-black text-white uppercase italic tracking-tight leading-none text-left">
              Fluxo Semanal & Ticket Médio
            </h3>
            <span className="text-[8px] sm:text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1.5 block">
              Volume de Atendimentos Concluídos e Ticket Médio por Dia da Semana
            </span>
          </div>

          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="dayName" stroke="#888" fontSize={10} tickLine={false} />
                <YAxis 
                  yAxisId="left" 
                  stroke="#f59e0b" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Atendimentos', angle: -90, position: 'insideLeft', offset: 0, fill: '#f59e0b', fontSize: 9, fontWeight: 'bold' }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#a855f7" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Ticket Médio (R$)', angle: 90, position: 'insideRight', offset: 0, fill: '#a855f7', fontSize: 9, fontWeight: 'bold' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                  labelStyle={{ fontWeight: 'bold', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="atendimentos" fill="#f59e0b" name="Atendimentos" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="ticketMedio" fill="#a855f7" name="Ticket Médio (R$)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. Today's Appointments & Quick Checkout Flow (Ações Rápidas & Ciclo de Vida) */}
      <div className="p-6 liquid-glass/40 rounded-[2.5rem] shadow-inner space-y-5 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight leading-none">
                Atendimentos de Hoje & Ações Rápidas
              </h3>
              {stats.inProgressApps.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase tracking-wider animate-pulse">
                  <Scissors className="w-3 h-3" />
                  {stats.inProgressApps.length} na cadeira
                </span>
              )}
            </div>
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest mt-1 block">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })} • {stats.completedCount} de {stats.appointmentsCount} concluídos
            </span>
          </div>

          <button 
            onClick={() => setCurrentScreen("agenda")} 
            className="text-amber-400 text-[10px] uppercase tracking-wider font-black flex items-center gap-1 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
          >
            Abrir Agenda Completa <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Warning Banner: Pendentes de Baixa (Contas a Receber) */}
        {stats.pendingCheckoutApps.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-300 uppercase tracking-tight">
                  {stats.pendingCheckoutApps.length} Atendimento{stats.pendingCheckoutApps.length > 1 ? 's' : ''} Pendente{stats.pendingCheckoutApps.length > 1 ? 's' : ''} de Baixa
                </h4>
                <p className="text-[10px] text-neutral-300">
                  Clientes que já foram ou estão sendo atendidos. Dê a baixa para atualizar o faturamento de hoje.
                </p>
              </div>
            </div>
            <button
              onClick={() => setTodayFilter("pending_checkout")}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-md shadow-amber-500/20"
            >
              Ver Pendentes
            </button>
          </div>
        )}

        {/* Filter Tab Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-left">
          {[
            { id: "all", label: `Todos (${stats.todayApps.length})` },
            { id: "in_progress", label: `Na Cadeira (${stats.inProgressApps.length})` },
            { id: "pending_checkout", label: `Pendentes Baixa (${stats.pendingCheckoutApps.length})` },
            { id: "scheduled", label: `Agendados (${stats.scheduledApps.length})` },
            { id: "completed", label: `Concluídos (${stats.completedToday.length})` },
            { id: "no_show", label: `Faltas (${stats.noShowApps.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTodayFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                todayFilter === tab.id
                  ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black"
                  : "bg-neutral-900/60 text-neutral-400 hover:text-white border border-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List of today's filtered appointments */}
        {(() => {
          const filteredList = stats.todayApps.filter(app => {
            if (todayFilter === "in_progress") return app.status === "in_progress";
            if (todayFilter === "pending_checkout") {
              if (app.status === 'completed' || app.status === 'cancelled' || app.status === 'no_show') return false;
              return app.status === 'in_progress' || (app.time && app.time <= format(new Date(), "HH:mm"));
            }
            if (todayFilter === "scheduled") return app.status === "confirmed" || app.status === "scheduled" || app.status === "pending";
            if (todayFilter === "completed") return app.status === "completed";
            if (todayFilter === "no_show") return app.status === "no_show";
            return true;
          });

          if (filteredList.length === 0) {
            return (
              <div className="py-12 px-4 text-center border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center space-y-2">
                <Clock className="w-8 h-8 text-neutral-600 block animate-pulse" />
                <div className="text-[11px] text-neutral-400 font-black uppercase tracking-widest leading-none text-center">
                  Nenhum atendimento nesta categoria hoje
                </div>
                <p className="text-[9px] text-neutral-600">Alterne os filtros acima ou aguarde novos agendamentos.</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredList.map((app) => {
                const isCompleted = app.status === "completed";
                const isInProgress = app.status === "in_progress";
                const isNoShow = app.status === "no_show";
                const isCancelled = app.status === "cancelled";
                const isScheduled = !isCompleted && !isInProgress && !isNoShow && !isCancelled;
                const price = getAppointmentPrice(app);

                return (
                  <div
                    key={app.id}
                    className={`p-4 sm:p-5 rounded-[1.75rem] border transition-all text-left flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                      isInProgress
                        ? "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                        : isCompleted
                        ? "bg-neutral-950/40 border-white/5 opacity-80"
                        : isNoShow
                        ? "bg-rose-950/20 border-rose-500/30"
                        : "bg-neutral-950/50 border-white/10 hover:border-amber-500/30"
                    }`}
                  >
                    {/* Top Row: Time, Status Badge & Price */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-amber-400 italic font-mono bg-black/50 px-2 py-0.5 rounded-lg border border-white/5">
                          {app.time || (app.date ? format(parseAppDate(app.date) || new Date(), "HH:mm") : "--:--")}
                        </span>
                        
                        {/* Status Badges */}
                        {isInProgress && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Na Cadeira 💈
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Concluído & Pago
                          </span>
                        )}
                        {isNoShow && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-500/30">
                            <UserX className="w-3 h-3" />
                            Faltou
                          </span>
                        )}
                        {isCancelled && (
                          <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-400 text-[9px] font-black uppercase tracking-wider">
                            Cancelado
                          </span>
                        )}
                        {isScheduled && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-wider border border-blue-500/20">
                            {app.status === "confirmed" ? "Confirmado" : "Agendado"}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-white">
                          R$ {price.toFixed(2)}
                        </span>
                        {app.paymentMethod && isCompleted && (
                          <span className="text-[8px] text-neutral-400 block font-bold uppercase">
                            {app.paymentMethod === "pix" ? "PIX" : app.paymentMethod === "credit" ? "Crédito" : app.paymentMethod === "debit" ? "Débito" : "Dinheiro"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Client info & Service */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-white text-xs sm:text-sm leading-tight uppercase tracking-wide">
                          {app.clientName || "Cliente"}
                        </h4>
                        {app.barberName && role === "manager" && (
                          <span className="text-[8px] text-neutral-400 font-bold bg-neutral-900 px-2 py-0.5 rounded-md border border-white/5">
                            Prof: {app.barberName.split(" ")[0]}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-300 font-bold flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-amber-400" />
                        <span>{app.serviceName || "Corte Tradicional"}</span>
                        {app.items && app.items.length > 1 && (
                          <span className="text-[9px] text-amber-400 font-black">
                            (+{app.items.length - 1} {app.items.length - 1 === 1 ? 'item' : 'itens'})
                          </span>
                        )}
                      </p>

                      {app.addon && (
                        <p className={`text-[8px] font-black uppercase tracking-wider ${app.addon.accepted ? "text-amber-400" : "text-neutral-500"}`}>
                          {app.addon.accepted ? "+ " : "- "}{app.addon.name}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                      {/* 1-Click Quick Checkout Button */}
                      {!isCompleted && !isCancelled && (
                        <button
                          onClick={() => setSelectedAppointmentForCheckout(app)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Concluir & Receber</span>
                        </button>
                      )}

                      {/* Start Service Button (if scheduled/confirmed) */}
                      {isScheduled && (
                        <button
                          onClick={() => handleStartService(app)}
                          disabled={actionInProgressId === app.id}
                          className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {actionInProgressId === app.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Na Cadeira</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* No-Show Button (if scheduled/confirmed) */}
                      {isScheduled && (
                        <button
                          onClick={() => setSelectedAppointmentForNoShow(app)}
                          className="py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                          title="Registrar Falta do Cliente"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Falta</span>
                        </button>
                      )}

                      {/* Client WhatsApp direct link */}
                      {app.clientPhone && (
                        <a
                          href={`https://wa.me/55${app.clientPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-neutral-900 hover:bg-emerald-600 text-neutral-400 hover:text-white border border-white/5 transition-colors"
                          title="WhatsApp do Cliente"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Completed / Reopen details */}
                      {isCompleted && (
                        <button
                          onClick={() => setSelectedAppointmentForCheckout(app)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/5"
                        >
                          <Receipt className="w-3 h-3 text-emerald-400" />
                          <span>Ver / Editar Recibo</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 6. Detailed Future Earnings & Projections Modal */}
      <FutureEarningsModal
        isOpen={showFutureEarningsModal}
        onClose={() => setShowFutureEarningsModal(false)}
        appointments={appointments}
        services={services}
        barbers={barbersInApps}
        currentUserId={user?.uid}
        role={role}
        onNavigateToAgenda={() => setCurrentScreen("agenda")}
      />

      {/* 7. Quick Checkout & Adjustment Modal */}
      {selectedAppointmentForCheckout && (
        <CheckoutModal
          isOpen={!!selectedAppointmentForCheckout}
          onClose={() => setSelectedAppointmentForCheckout(null)}
          appointment={selectedAppointmentForCheckout}
          services={services}
          onSuccess={() => setSelectedAppointmentForCheckout(null)}
        />
      )}

      {/* 8. No-Show Modal */}
      {selectedAppointmentForNoShow && (
        <NoShowModal
          isOpen={!!selectedAppointmentForNoShow}
          onClose={() => setSelectedAppointmentForNoShow(null)}
          appointment={selectedAppointmentForNoShow}
          onSuccess={() => setSelectedAppointmentForNoShow(null)}
        />
      )}

      {/* 9. Pending Checkouts Modal */}
      <PendingCheckoutsModal
        isOpen={showPendingCheckoutsModal}
        onClose={() => setShowPendingCheckoutsModal(false)}
        pendingApps={stats.pendingCheckoutApps}
        onSelectStart={(app) => {
          setShowPendingCheckoutsModal(false);
          handleStartService(app);
        }}
        onSelectCheckout={(app) => {
          setShowPendingCheckoutsModal(false);
          setSelectedAppointmentForCheckout(app);
        }}
        onSelectNoShow={(app) => {
          setShowPendingCheckoutsModal(false);
          setSelectedAppointmentForNoShow(app);
        }}
        onSelectCancel={(app) => {
          handleCancelAppointment(app);
        }}
      />
    </div>
  );
}
