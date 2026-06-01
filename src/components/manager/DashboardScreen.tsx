import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Scissors, 
  ChevronRight, 
  Bell, 
  ChevronLeft, 
  RefreshCw, 
  Search, 
  Lock, 
  Clock, 
  X, 
  Download, 
  Loader2,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Star
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { 
  format, 
  isToday, 
  parseISO, 
  isSameDay, 
  addDays, 
  subDays, 
  startOfWeek 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Timestamp, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  getFirestore
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { CalendarWidget, AppointmentModal } from "../CalendarWidget";
import { ServicesManagement, CollaboratorsManager, WorkingHoursManager } from "./ManagementScreens";
import { PortfolioManager } from "../professional/PortfolioManager";
import { ReviewModal } from "../common/ReviewModal";
import { setupPushSubscription, getNotificationPermissionState, queryNotificationSupport } from "../../lib/pushRegister";

export function EarningsDashboard({ appointments, services }: { appointments: any[], services: any[] }) {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'dd/MM');
    });

    const data = last7Days.map(day => {
      const dayApps = appointments.filter(app => {
        const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        return format(d, 'dd/MM') === day && app.status === 'completed';
      });
      return {
        name: day,
        ganhos: dayApps.reduce((acc, curr) => {
          const p = curr.totalPrice || curr.price || 0;
          const parsed = typeof p === 'string' ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
          return acc + (Number(parsed) || 0);
        }, 0)
      };
    });
    return data;
  }, [appointments]);

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
            itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
          />
          <Area type="monotone" dataKey="ganhos" stroke="#f59e0b" fillOpacity={1} fill="url(#colorGanhos)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardScreen({ user, role, services, dashboardView, onBack, onNewBooking, onEditBooking }: { user: any, role: string, services: any[], dashboardView?: "agenda" | "list" | "calendar" | "services" | "hours" | "collaborators" | "earnings" | "portfolio", onBack: () => void, onNewBooking?: () => void, onEditBooking?: (app: any) => void }) {
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getNotificationPermissionState());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"agenda" | "list" | "services" | "hours" | "collaborators" | "earnings" | "portfolio">(dashboardView || (role === 'client' ? 'list' : 'agenda'));
  const [agendaMode, setAgendaMode] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [reviewAppointment, setReviewAppointment] = useState<any>(null);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleStatusUpdate = async (app: any, newStatus: string, extraData: any = {}) => {
    const firestore = db || getFirestore();
    try {
      const updatePayload: any = { status: newStatus, ...extraData };
      if (newStatus === 'completed') {
        updatePayload.paymentStatus = 'paid';
        updatePayload.paidAt = serverTimestamp();
      }
      
      await updateDoc(doc(firestore, "appointments", app.id), updatePayload);
      await addDoc(collection(firestore, "notifications"), {
        clientId: app.clientId || "",
        clientEmail: app.clientEmail || "",
        loginCode: app.loginCode || "",
        type: 'status_update',
        message: `Seu agendamento foi atualizado para: ${newStatus}${newStatus === 'completed' ? ' e o pagamento foi registrado.' : ''}`,
        timestamp: serverTimestamp(),
        read: false,
        appointmentId: app.id
      });

      // Staff notification
      await addDoc(collection(firestore, "staff_notifications"), {
        type: newStatus === 'cancelled' ? 'cancellation' : (newStatus === 'completed' ? 'payment' : 'update'),
        message: `${newStatus === 'cancelled' ? 'Cancelamento' : (newStatus === 'completed' ? 'Pagamento' : 'Atualização')}: ${app.clientName} ${newStatus === 'cancelled' ? 'desmarcou' : (newStatus === 'completed' ? 'pagou o serviço' : 'teve o status alterado para ' + newStatus)} (${app.serviceName})`,
        timestamp: serverTimestamp(),
        read: false,
        clientId: app.clientId,
        appointmentId: app.id
      });

      if (newStatus === 'cancelled') {
        setStatusMsg('Agendamento cancelado com sucesso!');
        setTimeout(() => setStatusMsg(null), 3000);
      } else if (newStatus === 'completed') {
        setStatusMsg('Pagamento registrado com sucesso!');
        setSelectedAppointment(null);
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "appointments");
    }
  };

  const handleDelete = async (app: any) => {
    const firestore = db || getFirestore();
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(firestore, "appointments", app.id));
      setSelectedAppointment(null);
      setStatusMsg('Agendamento excluído com sucesso!');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "appointments");
    }
  };

  const exportToCSV = () => {
    const headers = ["Cliente", "Serviço", "Data", "Hora", "Barbeiro", "Status"];
    const rows = filteredAppointmentsList.map(app => {
        const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        return [
            app.clientName,
            app.serviceName,
            format(d, "dd/MM/yyyy"),
            format(d, "HH:mm"),
            app.barberName || "",
            app.status
        ].map(val => `"${val}"`).join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "agendamentos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAppointmentsList = useMemo(() => {
	  return appointments.filter(app => {
		  if (filterStatus === 'all') return true;
		  if (filterStatus === 'pending') return !app.status || app.status === 'pending';
		  return app.status === filterStatus;
	  });
  }, [appointments, filterStatus]);

  const statsForListMode = useMemo(() => {
    const listApps = appointments.filter(app => {
      return selectedBarberId === 'all' || app.barberId === selectedBarberId;
    });
    
    const completed = listApps.filter(app => app.status === 'completed' && app.status !== 'cancelled');
    const scheduled = listApps.filter(app => (app.status === 'confirmed' || app.status === 'pending') && app.status !== 'cancelled');
    
    const totalValue = completed.reduce((sum, app) => {
      const rawPrice = app.totalPrice || app.price || 0;
      const price = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^0-9.-]+/g, "")) : rawPrice;
      return sum + (Number(price) || 0);
    }, 0);

    const projectedValue = scheduled.reduce((sum, app) => {
      const rawPrice = app.totalPrice || app.price || 0;
      const price = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^0-9.-]+/g, "")) : rawPrice;
      return sum + (Number(price) || 0);
    }, 0);
    
    const totalCuts = completed.length;
    const avgValue = totalCuts > 0 ? (totalValue / totalCuts) : 0;
    
    return {
      totalValue,
      totalCuts,
      avgValue,
      projectedValue
    };
  }, [appointments, selectedBarberId]);

  useEffect(() => {
    if (dashboardView === 'calendar') setCurrentView('agenda');
    else if (dashboardView === 'list') setCurrentView('list');
    else if (dashboardView === 'services') setCurrentView('services');
    else if (dashboardView === 'hours') setCurrentView('hours');
    else if (dashboardView === 'collaborators') setCurrentView('collaborators');
    else if (dashboardView === 'earnings') setCurrentView('earnings');
    else if (dashboardView === 'portfolio') setCurrentView('portfolio');
  }, [dashboardView]);

  useEffect(() => {
    if (!user) return;
    const firestore = db || getFirestore();
    let q;
    if (role === 'manager') {
      q = query(collection(firestore, "appointments"), orderBy("date", "asc"));
    } else if (role === 'barber') {
      q = query(collection(firestore, "appointments"), where("barberId", "==", user.uid), orderBy("date", "asc"));
    } else {
      q = query(collection(firestore, "appointments"), where("clientId", "==", user.uid), orderBy("date", "asc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });

    const qBarbers = query(collection(firestore, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribeBarbers = onSnapshot(qBarbers, (sn) => {
        setBarbers(sn.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => {
        unsubscribe();
        unsubscribeBarbers();
    };
  }, [user?.uid, role]);

  const filteredAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(app => {
        if (!app.date) return false;
        const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        if (!(appDate instanceof Date) || isNaN(appDate.getTime())) return false;
        const sameDay = isSameDay(appDate, currentDate);
        const sameBarber = selectedBarberId === 'all' || app.barberId === selectedBarberId;
        return sameDay && sameBarber;
    });
  }, [appointments, currentDate, selectedBarberId]);

  return (
    <div className="min-h-screen bg-black px-4 pt-16 relative pb-28">
      {statusMsg && (
        <div className="fixed top-5 left-4 right-4 bg-green-500 text-white p-4 rounded-full font-bold text-center z-50 shadow-xl shadow-green-500/20">
          {statusMsg}
        </div>
      )}
      
      {/* Modern View Segmented Selector at the header */}
      {(role === 'manager' || role === 'barber') && (currentView === 'agenda' || currentView === 'list') && (
        <div className="max-w-xl mx-auto mb-8 mt-2">
          <div className="bg-neutral-900 border border-white/5 p-1 rounded-2xl flex items-center justify-between shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setCurrentView('agenda')}
              className={`flex-1 py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all relative z-10 ${currentView === 'agenda' ? 'text-black font-black' : 'text-neutral-500 hover:text-white'}`}
            >
              {currentView === 'agenda' && (
                <motion.div 
                  layoutId="activeSubView" 
                  className="absolute inset-0 bg-amber-500 rounded-xl z-[-1]" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Calendar className="w-3.5 h-3.5 animate-pulse" />
              Ver Agenda
            </button>
            <button 
              onClick={() => setCurrentView('list')}
              className={`flex-1 py-3 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all relative z-10 ${currentView === 'list' ? 'text-black font-black' : 'text-neutral-500 hover:text-white'}`}
            >
              {currentView === 'list' && (
                <motion.div 
                  layoutId="activeSubView" 
                  className="absolute inset-0 bg-amber-500 rounded-xl z-[-1]" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Scissors className="w-3.5 h-3.5" />
              Atendimentos
            </button>
          </div>
        </div>
      )}
      
      {currentView === 'list' && (
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
             <h1 className="text-2xl font-black text-white capitalize">{format(currentDate, "dd 'de' MMMM", { locale: ptBR })}</h1>
             <div className="flex gap-2">
              <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="text-neutral-500 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
              <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-amber-500 hover:text-amber-400">Hoje</button>
              <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="text-neutral-500 hover:text-white"><ChevronRight className="w-5 h-5"/></button>
             </div>
           </div>
          <div className="flex items-center gap-3 text-neutral-500">
             <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:border-amber-500 transition-all">
               <img 
                 src="/logo.png" 
                 alt="Logo"
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
             </div>
             <Lock className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
             <Search className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
             <RefreshCw className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
             <Calendar className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
          </div>
        </div>
      )}

      {currentView === 'list' && (
        <div className="flex items-center gap-2 mb-8">
          <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="text-neutral-700 hover:text-amber-500 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
          <div className="flex-1 overflow-x-auto no-scrollbar flex gap-1 justify-between">
              {Array.from({ length: 7 }).map((_, i) => {
                  const day = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i);
                  const active = isSameDay(day, currentDate);
                  
                  const hasAppointments = appointments.some(app => {
                    if (!app.date) return false;
                    const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                    return appDate instanceof Date && !isNaN(appDate.getTime()) && isSameDay(appDate, day);
                  });

                  return (
                      <button 
                          key={i} 
                          onClick={() => setCurrentDate(day)}
                          className={`flex flex-col items-center flex-1 min-w-[45px] py-3 rounded-2xl transition-all relative ${active ? "bg-amber-500 text-black shadow-[0_10px_20px_rgba(245,158,11,0.2)]" : "text-neutral-500 hover:text-neutral-300"}`}
                      >
                          <span className="text-[10px] font-black uppercase mb-1 tracking-tighter opacity-60">{format(day, "EEE", { locale: ptBR })}</span>
                          <span className={`text-base font-black leading-none ${active ? "text-black" : "text-neutral-300"}`}>{format(day, "d")}</span>
                          {hasAppointments && (
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${active ? "bg-black" : "bg-amber-500"}`} />
                          )}
                      </button>
                  );
              })}
          </div>
          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="text-neutral-700 hover:text-amber-500 transition-colors"><ChevronRight className="w-6 h-6" /></button>
        </div>
      )}

      {(role === 'manager' || role === 'barber') && (currentView === 'list' || currentView === 'agenda') && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 pb-2">
              <button 
                onClick={() => setSelectedBarberId("all")}
                className="flex flex-col items-center gap-2 min-w-[64px]"
              >
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${selectedBarberId === 'all' ? 'border-amber-500' : 'border-white/10 bg-white/5 opacity-50'}`}>
                      <Users className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedBarberId === 'all' ? 'text-white' : 'text-neutral-600'}`}>Todos</span>
              </button>
              {barbers.map(barber => {
                  const barberAppsCount = appointments.filter(a => a.barberId === barber.id && isSameDay(a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date), currentDate)).length;
                  return (
                    <button 
                      key={barber.id}
                      onClick={() => setSelectedBarberId(barber.id)}
                      className="flex flex-col items-center gap-2 min-w-[64px]"
                    >
                        <div className={`w-14 h-14 rounded-full border-2 overflow-hidden transition-all relative ${selectedBarberId === barber.id ? 'border-amber-500' : 'border-white/10 opacity-50'}`}>
                            <img src={barber.photoURL || `https://ui-avatars.com/api/?name=${barber.name}`} alt={barber.name} className="w-full h-full object-cover" />
                            {barberAppsCount > 0 && (
                              <div className="absolute -top-0.5 -right-0.5 bg-amber-500 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
                                {barberAppsCount}
                              </div>
                            )}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest truncate w-14 text-center ${selectedBarberId === barber.id ? 'text-white' : 'text-neutral-600'}`}>{barber.name.split(' ')[0]}</span>
                    </button>
                  );
              })}
          </div>
      )}

      {currentView === 'list' && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-lg">Hoje</span>
            <span className="text-neutral-500 font-bold text-sm">{format(currentDate, "dd/MM")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900 px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5">
               <Clock className="w-3.5 h-3.5 text-neutral-500" />
               <span className="text-white font-bold text-xs">30min</span>
            </div>
            <div className="bg-neutral-900 px-4 py-1.5 rounded-full border border-white/5">
               <span className="text-white font-bold text-xs">{filteredAppointments.length} agendamentos</span>
            </div>
          </div>
        </div>
      )}

      {currentView === 'list' && (
        <div className="bg-amber-500/5 border border-amber-500/10 px-4 py-2 rounded-full inline-flex items-center gap-2 mb-8 group cursor-pointer hover:bg-amber-500/10 transition-all">
          <Lock className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Bloqueios visíveis</span>
          <X className="w-3.5 h-3.5 text-amber-500/40 group-hover:text-amber-500 transition-colors" />
        </div>
      )}

      {currentView === 'earnings' && <EarningsDashboard appointments={appointments} services={services} />}
      
      {selectedAppointment && (
        <AppointmentModal 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onUpdate={handleStatusUpdate}
          onDelete={handleDelete}
          onEdit={(app) => {
              setSelectedAppointment(null);
              if (onEditBooking) onEditBooking(app);
          }}
        />
      )}
      
      {currentView === 'agenda' ? (
        <CalendarWidget 
          appointments={appointments.filter(app => selectedBarberId === 'all' || app.barberId === selectedBarberId)}
          services={services}
          mode={agendaMode}
          onModeChange={setAgendaMode}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          role={role}
          updateStatus={handleStatusUpdate}
          onNewBooking={onNewBooking}
          onSelectAppointment={setSelectedAppointment}
        />
      ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              {currentView === 'list' && (
                  <div className="space-y-6 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto">
                      {/* Redesigned Premium Header */}
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                             Fluxo de <span className="text-amber-500">Atendimentos</span>
                          </h2>
                          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Controles e histórico total</p>
                        </div>
                        <button 
                          onClick={exportToCSV} 
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-neutral-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-300"
                        > 
                          <Download className="w-3.5 h-3.5 text-amber-500"/> Exportar CSV
                        </button>
                      </div>

                      {/* Gorgeous Key Metrics Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* Faturamento Card */}
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.25)" }}
                          className="bg-neutral-900 border border-white/5 rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Faturamento</p>
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                              <DollarSign className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-emerald-400 tracking-tight leading-none">
                              R$ {statsForListMode.totalValue.toFixed(2)}
                            </h3>
                            <p className="text-[8px] text-neutral-500 font-bold uppercase mt-1">Concluído</p>
                          </div>
                        </motion.div>

                        {/* Receita Futura Card */}
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 }}
                          whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.25)" }}
                          className="bg-neutral-900 border border-white/5 rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Previsão</p>
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                              <DollarSign className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-blue-400 tracking-tight leading-none">
                              R$ {statsForListMode.projectedValue.toFixed(2)}
                            </h3>
                            <p className="text-[8px] text-neutral-500 font-bold uppercase mt-1">Agendado</p>
                          </div>
                        </motion.div>

                        {/* Clientes Atendidos Card */}
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.25)" }}
                          className="bg-neutral-900 border border-white/5 rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Atendidos</p>
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                              <Scissors className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
                              {statsForListMode.totalCuts} {statsForListMode.totalCuts === 1 ? 'cliente' : 'clientes'}
                            </h3>
                            <p className="text-[8px] text-neutral-500 font-bold uppercase mt-1">Cortes</p>
                          </div>
                        </motion.div>

                        {/* Ticket Médio Card */}
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.25)" }}
                          className="bg-neutral-900 border border-white/5 rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Preço Médio</p>
                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-black text-purple-400 tracking-tight leading-none">
                              R$ {statsForListMode.avgValue.toFixed(2)}
                            </h3>
                            <p className="text-[8px] text-neutral-500 font-bold uppercase mt-1">Média / Corte</p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Styled Filter Controls */}
                      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar border-b border-white/5 mb-4">
                        {[
                          { id: 'all', label: 'Todos' },
                          { id: 'pending', label: 'Pendentes' },
                          { id: 'confirmed', label: 'Confirmados' },
                          { id: 'completed', label: 'Atendidos' },
                          { id: 'cancelled', label: 'Cancelados' }
                        ].map((tab) => {
                          const isActive = filterStatus === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setFilterStatus(tab.id as any)}
                              className={`relative px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 border ${isActive ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10' : 'bg-neutral-950 border-white/5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Appointments List rendering */}
                      {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
                          <p className="text-neutral-500 text-[10px] uppercase tracking-widest font-black">Buscando Atendimentos...</p>
                        </div>
                      ) : filteredAppointmentsList.length === 0 ? (
                        <div className="p-16 text-center bg-neutral-900/40 rounded-3xl border border-white/5">
                          <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest mb-1">Nenhum atendimento</p>
                          <p className="text-[10px] text-neutral-700 uppercase font-black tracking-widest">Nesta categoria para o filtro atual</p>
                        </div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {filteredAppointmentsList.map((app, index) => {
                                  const dateVal = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                                  const isExpanded = expandedAppointmentId === app.id;
                                  
                                  // Determine status pills & color schemes
                                  let statusColor = "bg-white/5 text-neutral-400 border border-neutral-800";
                                  let statusText = "Pendente";
                                  let borderAccent = "border-l-neutral-600";
                                  let badgeDot = "bg-neutral-500";
                                  
                                  if (app.status === 'completed') {
                                    statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                                    statusText = "Atendido";
                                    borderAccent = "border-l-emerald-500 shadow-[inset_1px_0_10px_rgba(16,185,129,0.05)]";
                                    badgeDot = "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
                                  } else if (app.status === 'confirmed') {
                                    statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                                    statusText = "Confirmado";
                                    borderAccent = "border-l-amber-500";
                                    badgeDot = "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                                  } else if (app.status === 'pending' || !app.status) {
                                    statusColor = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                                    statusText = "Aguardando";
                                    borderAccent = "border-l-blue-400";
                                    badgeDot = "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]";
                                  } else if (app.status === 'cancelled') {
                                    statusColor = "bg-red-500/10 text-red-400 border border-red-500/20";
                                    statusText = "Cancelado";
                                    borderAccent = "border-l-red-500";
                                    badgeDot = "bg-red-400";
                                  }

                                  return (
                                      <motion.div 
                                           initial={{ opacity: 0, y: 15 }}
                                           animate={{ opacity: 1, y: 0 }}
                                           transition={{ duration: 0.3, delay: index * 0.05 }}
                                           key={app.id} 
                                           className={`bg-neutral-900 rounded-[2rem] border border-white/5 border-l-4 ${borderAccent} p-5 shadow-xl group cursor-pointer hover:bg-neutral-800 transition-all relative overflow-hidden`}
                                           onClick={() => setExpandedAppointmentId(isExpanded ? null : app.id)}
                                      >
                                          <div className="flex justify-between items-start mb-3">
                                              <div>
                                                  <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1 flex items-center gap-1.5 leading-none">
                                                    <Clock className="w-3 h-3 text-amber-500" />
                                                    {format(dateVal, "PPP", { locale: ptBR })}
                                                  </p>
                                                  <h4 className="font-black text-lg text-white tracking-tight italic uppercase mt-1 leading-none">{app.serviceName}</h4>
                                              </div>
                                              <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${statusColor}`}>
                                                  <div className={`w-1.5 h-1.5 rounded-full ${badgeDot}`} />
                                                  {statusText}
                                              </div>
                                          </div>

                                          <div className="flex items-center gap-3">
                                            {app.clientPhoto ? (
                                               <img src={app.clientPhoto} alt={app.clientName} className="w-8 h-8 rounded-xl object-cover border border-white/5 group-hover:rotate-3 transition-transform" />
                                            ) : (
                                               <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/10 flex items-center justify-center text-xs font-black text-amber-500 group-hover:scale-105 transition-transform uppercase italic">
                                                 {app.clientName?.charAt(0) || '?'}
                                               </div>
                                            )}
                                            <div className="text-left">
                                               <div className="flex items-center gap-2">
                                                  <p className="text-sm text-white font-black uppercase tracking-wide leading-none">{app.clientName}</p>
                                                  {app.rating && (
                                                      <div className="px-1.5 py-0.5 bg-amber-500/10 rounded flex items-center gap-1 border border-amber-500/20">
                                                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                                          <span className="text-[9px] font-black text-amber-500">{app.rating}</span>
                                                      </div>
                                                  )}
                                               </div>
                                               <p className="text-[10px] text-neutral-500 font-bold mt-1 text-left">Profissional: <span className="text-neutral-400 capitalize">{app.barberName}</span></p>
                                            </div>
                                          </div>
                                          
                                          {/* Dropdown Expanded Panel */}
                                          <AnimatePresence>
                                            {isExpanded && (
                                              <motion.div 
                                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                                animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                                className="overflow-hidden border-t border-white/5 pt-4 text-white text-[10px] space-y-2.5 uppercase tracking-widest font-black"
                                              >
                                                  {app.reviewPhotoUrl && (
                                                    <div className="mb-4 bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2">
                                                      <p className="text-neutral-500 uppercase text-[8px] tracking-wider font-bold">Feedback Visual do Cliente:</p>
                                                      <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/10 group-hover:border-amber-500/30 transition-colors">
                                                          <img src={app.reviewPhotoUrl} className="w-full h-full object-cover" alt="Review" />
                                                      </div>
                                                    </div>
                                                  )}

                                                  <div className="flex justify-between items-center bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                                    <span className="text-neutral-500">Preço Total</span>
                                                    <span className="text-emerald-400 text-xs font-black">R$ {app.price || app.totalPrice || '0,00'}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                                    <span className="text-neutral-500">Status Financeiro</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] ${app.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                      {app.paymentStatus === 'paid' ? 'Pago ✅' : 'Pendente 💳'}
                                                    </span>
                                                  </div>
                                                  {app.payerName && (
                                                    <div className="flex justify-between items-center bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                                      <span className="text-neutral-500">Responsável Pagamento</span>
                                                      <span className="text-amber-500 font-bold">{app.payerName}</span>
                                                    </div>
                                                  )}
                                                  {app.notes && (
                                                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-[9px] text-neutral-400 normal-case font-medium tracking-normal mt-2">
                                                      <p className="font-bold text-neutral-500 uppercase text-[8px] tracking-wider mb-1">Notas do Agendamento:</p>
                                                      {app.notes}
                                                    </div>
                                                  )}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>

                                          {/* Direct Role Action Control panel */}
                                          {(role === 'manager' || role === 'barber') && (
                                            <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                                                {(app.status === 'pending' || !app.status) && (
                                                  <button 
                                                    onClick={() => handleStatusUpdate(app, 'confirmed')} 
                                                    className="bg-green-500/15 hover:bg-green-500 hover:text-black border border-green-500/20 text-green-400 text-[11px] font-black uppercase tracking-widest py-2 rounded-xl flex-1 transition-all active:scale-95 duration-200 cursor-pointer"
                                                  >
                                                    Confirmar
                                                  </button>
                                                )}
                                                {app.status === 'confirmed' && (
                                                  <>
                                                    <button 
                                                      onClick={() => handleStatusUpdate(app, 'completed', { payerName: app.clientName })} 
                                                      className="bg-green-500 hover:bg-green-600 text-black text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl flex-1 transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-green-500/10"
                                                      title="Marcar como comparecido e atualizar ganhos automaticamente"
                                                    >
                                                      Compareceu ✅
                                                    </button>
                                                    <button 
                                                      onClick={() => {
                                                        const payer = prompt("Quem pagou?", app.clientName);
                                                        handleStatusUpdate(app, 'completed', { payerName: payer || app.clientName });
                                                      }} 
                                                      className="bg-amber-500 hover:bg-amber-600 text-black text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl flex-1 transition-all active:scale-95 duration-200 cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-amber-500/10"
                                                    >
                                                      Pagar 💳
                                                    </button>
                                                  </>
                                                )}
                                                {app.status !== 'cancelled' && app.status !== 'completed' && (
                                                  <button 
                                                    onClick={() => handleStatusUpdate(app, 'cancelled')} 
                                                    className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl flex-1 border border-red-500/20 transition-all active:scale-95 duration-200 cursor-pointer"
                                                  >
                                                    Cancelar
                                                  </button>
                                                )}
                                                {app.clientPhone && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const dateFormatted = format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                                            const text = `Olá ${app.clientName}, passando para confirmar seu agendamento de ${app.serviceName} no dia ${dateFormatted}. Aguardamos você!`;
                                                            window.open(`https://wa.me/${app.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                                        }} 
                                                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500 flex-1 transition-all duration-300"
                                                    >
                                                        WhatsApp
                                                    </button>
                                                )}
                                            </div>
                                          )}

                                           {role === 'client' && app.status === 'completed' && (
                                                <button 
                                                  onClick={(e) => { e.stopPropagation(); setReviewAppointment(app); }} 
                                                  className="w-full bg-amber-500 hover:bg-amber-600 hover:text-black hover:border-amber-500 border border-neutral-800 text-white font-black py-3 rounded-2xl mt-4 text-[10px] uppercase tracking-widest transition-all animate-bounce"
                                                >
                                                  Avaliar Atendimento ⭐
                                                </button>
                                           )}
                                      </motion.div>
                                  );
                              })}
                          </div>
                      )}
                  </div>
              )}
              {currentView === 'services' && <ServicesManagement services={services} />}
              {currentView === 'collaborators' && <CollaboratorsManager />}
              {currentView === 'hours' && <WorkingHoursManager />}
              {currentView === 'portfolio' && <PortfolioManager onBack={() => setCurrentView('list')} />}
              {reviewAppointment && <ReviewModal appointment={reviewAppointment} onClose={() => setReviewAppointment(null)} />}
          </div>
      )}

      {/* Floating Action Button for Push Notification Opt-in */}
      {pushPermission !== "granted" && queryNotificationSupport() && (
        <button
          onClick={async () => {
            const cleanUid = user?.uid || user?.id || "anonymous";
            const success = await setupPushSubscription(cleanUid, role || "collaborator");
            if (success) {
              setPushPermission("granted");
              alert("Excelente! Notificações push ativadas com sucesso neste dispositivo.");
            } else {
              alert("Não foi possível ativar as notificações push. Ative as permissões nas configurações do navegador.");
            }
          }}
          className="fixed bottom-24 right-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-black p-4 rounded-full shadow-[0_10px_30px_rgba(245,158,11,0.3)] border border-amber-400/20 transition-all flex items-center gap-2 group cursor-pointer"
          style={{ cursor: "pointer" }}
          title="Ativar Notificações no Celular"
          id="dashboard-push-fab"
        >
          <Bell className="w-5 h-5 animate-pulse text-black" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out text-[10px] font-black uppercase whitespace-nowrap tracking-wider text-black animate-in fade-in">
            Notificar Celular 🔔
          </span>
        </button>
      )}
    </div>
  );
}
