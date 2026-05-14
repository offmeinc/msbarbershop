import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Loader2 
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
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { CalendarWidget, AppointmentModal } from "../CalendarWidget";
import { ServicesManagement, CollaboratorsManager, WorkingHoursManager } from "./ManagementScreens";
import { ReviewModal } from "../common/ReviewModal";

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
        ganhos: dayApps.reduce((acc, curr) => acc + (curr.totalPrice || curr.price || 0), 0)
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

export function DashboardScreen({ user, role, services, dashboardView, onBack, onNewBooking, onEditBooking }: { user: any, role: string, services: any[], dashboardView?: "agenda" | "list" | "calendar" | "services" | "hours" | "collaborators" | "earnings", onBack: () => void, onNewBooking?: () => void, onEditBooking?: (app: any) => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"agenda" | "list" | "services" | "hours" | "collaborators" | "earnings">(dashboardView || (role === 'client' ? 'list' : 'agenda'));
  const [agendaMode, setAgendaMode] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [reviewAppointment, setReviewAppointment] = useState<any>(null);
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleStatusUpdate = async (app: any, newStatus: string, extraData: any = {}) => {
    try {
      const updatePayload: any = { status: newStatus, ...extraData };
      if (newStatus === 'completed') {
        updatePayload.paymentStatus = 'paid';
        updatePayload.paidAt = serverTimestamp();
      }
      
      await updateDoc(doc(db, "appointments", app.id), updatePayload);
      await addDoc(collection(db, "notifications"), {
        loginCode: app.loginCode,
        message: `Seu agendamento foi atualizado para: ${newStatus}${newStatus === 'completed' ? ' e o pagamento foi registrado.' : ''}`,
        timestamp: serverTimestamp(),
        read: false
      });

      // Staff notification
      await addDoc(collection(db, "staff_notifications"), {
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
    try {
      import("firebase/firestore").then(async ({ deleteDoc, doc }) => {
        await deleteDoc(doc(db, "appointments", app.id));
        setSelectedAppointment(null);
        setStatusMsg('Agendamento excluído com sucesso!');
        setTimeout(() => setStatusMsg(null), 3000);
      });
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

  useEffect(() => {
    if (dashboardView === 'calendar') setCurrentView('agenda');
    else if (dashboardView === 'list') setCurrentView('list');
    else if (dashboardView === 'services') setCurrentView('services');
    else if (dashboardView === 'hours') setCurrentView('hours');
    else if (dashboardView === 'collaborators') setCurrentView('collaborators');
    else if (dashboardView === 'earnings') setCurrentView('earnings');
  }, [dashboardView]);

  useEffect(() => {
    if (!user) return;
    let q;
    if (role === 'manager') {
      q = query(collection(db, "appointments"), orderBy("date", "asc"));
    } else if (role === 'barber') {
      q = query(collection(db, "appointments"), where("barberId", "==", user.uid), orderBy("date", "asc"));
    } else {
      q = query(collection(db, "appointments"), where("clientId", "==", user.uid), orderBy("date", "asc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });

    const qBarbers = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
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
                 src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
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
                  <div className="space-y-6">
                      <div className="flex justify-between items-center gap-4">
                        <h2 className="text-xl font-black uppercase italic tracking-tight underline decoration-amber-500/30 decoration-4 underline-offset-4 text-white">Meus Atendimentos</h2>
                        <button onClick={exportToCSV} className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1 hover:text-amber-400"> 
                          <Download className="w-3 h-3"/> Exportar
                        </button>
                      </div>
                      
                      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                          <button
                            key={status}
                            onClick={() => setFilterStatus(status as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${filterStatus === status ? 'bg-amber-500 text-black' : 'bg-neutral-900 border border-white/5 text-neutral-500'}`}
                          >
                            {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendente' : status === 'confirmed' ? 'Confirmado' : status === 'completed' ? 'Concluído' : 'Cancelado'}
                          </button>
                        ))}
                      </div>

                      {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div> : filteredAppointmentsList.length === 0 ? (
                          <div className="p-12 text-center text-neutral-600 font-bold uppercase text-xs tracking-widest">Nenhum agendamento encontrado</div>
                      ) : (
                          <div className="space-y-3">
                              {filteredAppointmentsList.map(app => (
                                  <div key={app.id} 
                                       className="bg-neutral-900 p-5 rounded-3xl border border-white/5 shadow-lg group cursor-pointer hover:bg-neutral-800 transition-all"
                                       onClick={() => setExpandedAppointmentId(expandedAppointmentId === app.id ? null : app.id)}
                                  >
                                      <div className="flex justify-between items-start mb-3">
                                          <div>
                                              <p className="text-[10px] text-amber-500 uppercase font-black mb-1">{format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), "PPP", { locale: ptBR })}</p>
                                              <h4 className="font-bold text-lg text-white">{app.serviceName}</h4>
                                          </div>
                                          <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${app.status === 'confirmed' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-neutral-500'}`}>
                                              {app.status || 'Pendente'}
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {app.clientPhoto ? (
                                           <img src={app.clientPhoto} alt={app.clientName} className="w-6 h-6 rounded-md object-cover" />
                                        ) : (
                                           <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black text-white">
                                             {app.clientName?.charAt(0) || '?'}
                                           </div>
                                        )}
                                        <p className="text-sm text-neutral-400 font-medium">{app.clientName} • {app.barberName}</p>
                                      </div>
                                      
                                      {expandedAppointmentId === app.id && (
                                        <div className="mt-4 pt-4 border-t border-white/10 text-white text-xs space-y-2 uppercase tracking-wider font-bold">
                                            <div className="flex justify-between"><span>Preço Total</span><span className="text-amber-500">R$ {app.price || app.totalPrice || '0,00'}</span></div>
                                            <div className="flex justify-between"><span>Pagamento</span><span className="text-neutral-400">{app.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}</span></div>
                                            {app.payerName && <div className="flex justify-between"><span>Pago por</span><span className="text-amber-500">{app.payerName}</span></div>}
                                        </div>
                                      )}

                                      {(role === 'manager' || role === 'barber') && (
                                        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                                            {(app.status === 'pending' || !app.status) && <button onClick={() => handleStatusUpdate(app, 'confirmed')} className="bg-green-500/10 text-green-500 text-[10px] font-black uppercase p-2 rounded-lg flex-1">Confirmar</button>}
                                            {app.status === 'confirmed' && <button onClick={() => {
                                                const payer = prompt("Quem pagou?", app.clientName);
                                                handleStatusUpdate(app, 'completed', { payerName: payer || app.clientName });
                                            }} className="bg-amber-500 text-black text-[10px] font-black uppercase p-2 rounded-lg flex-1">Pagar</button>}
                                            {app.status !== 'cancelled' && app.status !== 'completed' && <button onClick={() => handleStatusUpdate(app, 'cancelled')} className="bg-red-500/10 text-red-500 text-[10px] font-black uppercase p-2 rounded-lg flex-1">Cancelar</button>}
                                            {app.clientPhone && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const dateFormatted = format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                                        const text = `Olá ${app.clientName}, passando para confirmar seu agendamento de ${app.serviceName} no dia ${dateFormatted}. Aguardamos você!`;
                                                        window.open(`https://wa.me/${app.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                                    }} 
                                                    className="bg-green-500/10 text-green-500 text-[10px] font-black uppercase p-2 rounded-lg flex-1"
                                                >
                                                    WhatsApp
                                                </button>
                                            )}
                                        </div>
                                      )}

                                       {role === 'client' && app.status === 'completed' && (
                                            <button onClick={(e) => { e.stopPropagation(); setReviewAppointment(app); }} className="w-full bg-neutral-800 text-white font-bold py-2 rounded-xl mt-4">Avaliar</button>
                                       )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}
              {currentView === 'services' && <ServicesManagement services={services} />}
              {currentView === 'collaborators' && <CollaboratorsManager />}
              {currentView === 'hours' && <WorkingHoursManager />}
              {reviewAppointment && <ReviewModal appointment={reviewAppointment} onClose={() => setReviewAppointment(null)} />}
          </div>
      )}
    </div>
  );
}
