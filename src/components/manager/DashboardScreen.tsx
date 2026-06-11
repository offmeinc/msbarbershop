import React, { useState, useEffect, useMemo } from "react";
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
  XCircle,
  Download, 
  Loader2,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Star,
  Wifi,
  WifiOff
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
  deleteDoc,
  serverTimestamp,
  getFirestore,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { triggerLightHaptic } from "../../lib/haptics";
import { addToOfflineQueue, getOfflineQueue, syncOfflineQueue, OfflineAction } from "../../lib/offlineQueue";
import { AnalyticsScreen } from "./AnalyticsScreen";
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

import { setupPushSubscription, getNotificationPermissionState, queryNotificationSupport } from "../../lib/pushRegister";

export function DashboardScreen({ user, role, services, dashboardView, onBack, onNewBooking, onEditBooking }: { user: any, role: string, services: any[], dashboardView?: "agenda" | "list" | "calendar" | "services" | "hours" | "collaborators" | "earnings", onBack: () => void, onNewBooking?: () => void, onEditBooking?: (app: any) => void }) {
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getNotificationPermissionState());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const [currentView, setCurrentView] = useState<"agenda" | "list" | "services" | "hours" | "collaborators" | "earnings">(dashboardView || (role === 'client' ? 'list' : 'agenda'));
  const [agendaMode, setAgendaMode] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [reviewAppointment, setReviewAppointment] = useState<any>(null);
  const [listScope, setListScope] = useState<"day" | "all">("day");
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [managerAppToCancel, setManagerAppToCancel] = useState<any | null>(null);
  const [managerCancelReason, setManagerCancelReason] = useState("");
  const [isManagerCancelling, setIsManagerCancelling] = useState(false);

  // Real-time synchronization & feature states for header icons
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isDatepickerModalOpen, setIsDatepickerModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [lockDate, setLockDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [blockingBarberId, setBlockingBarberId] = useState<string>(role === 'manager' ? "all" : (user?.uid || "all"));
  const [searchQuery, setSearchQuery] = useState("");

  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setOfflineQueue(getOfflineQueue());

    const handleQueueChange = () => {
      setOfflineQueue(getOfflineQueue());
    };

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("ms-offline-queue-changed", handleQueueChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("ms-offline-queue-changed", handleQueueChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (role === 'barber' && user?.uid) {
      setSelectedBarberId(user.uid);
    }
  }, [role, user?.uid]);

  const handleRefreshSync = async () => {
    setIsSyncing(true);
    setStatusMsg("Sincronizando dados em tempo real com o Firebase...");
    setTimeout(() => {
      setIsSyncing(false);
      setStatusMsg("Dados 100% atualizados em tempo real!");
      setTimeout(() => setStatusMsg(null), 3000);
    }, 1000);
  };

  const handleAddLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockDate) {
      alert("Selecione uma data para o bloqueio!");
      return;
    }
    if (!startTime || !endTime) {
      alert("Selecione os horários inicial e final!");
      return;
    }
    const firestore = db || getFirestore();
    try {
      const lockObj = {
        date: Timestamp.fromDate(new Date(`${lockDate}T${startTime}:00`)),
        startTime,
        endTime,
        reason: lockReason || "Bloqueio administrativo",
        barberId: blockingBarberId,
        barberName: blockingBarberId === "all" ? "Todos" : (barbers.find(b => b.id === blockingBarberId)?.name || "Profissional"),
        createdAt: serverTimestamp()
      };
      await addDoc(collection(firestore, "blocked_times"), lockObj);
      setLockDate("");
      setStartTime("");
      setEndTime("");
      setLockReason("");
      setBlockingBarberId("all");
      setStatusMsg("Horário bloqueado com sucesso real-time!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Error creating block limit:", err);
      alert("Erro ao criar bloqueio.");
    }
  };

  const handleDeleteLock = async (lockId: string) => {
    const firestore = db || getFirestore();
    try {
      await deleteDoc(doc(firestore, "blocked_times", lockId));
      setStatusMsg("Bloqueio removido com sucesso!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Error deleting block limit:", err);
      alert("Erro ao deletar bloqueio.");
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryLower = searchQuery.toLowerCase();
    return appointments.filter(app => {
      return (
        (app.clientName || "").toLowerCase().includes(queryLower) ||
        (app.clientPhone || "").toLowerCase().includes(queryLower) ||
        (app.serviceName || "").toLowerCase().includes(queryLower) ||
        (app.barberName || "").toLowerCase().includes(queryLower) ||
        (app.status || "").toLowerCase().includes(queryLower) ||
        (app.notes || "").toLowerCase().includes(queryLower)
      );
    });
  }, [appointments, searchQuery]);

  const handleStatusUpdate = async (app: any, newStatus: string, extraData: any = {}) => {
    const firestore = db || getFirestore();
    
    // Intercept cancellation to request reason via custom modal
    if (newStatus === 'cancelled' && !extraData.cancellationReason) {
      setManagerAppToCancel(app);
      setManagerCancelReason("");
      return;
    }

    const description = `Atualizar status de ${app.clientName} (${app.serviceName}) para "${newStatus === 'completed' ? 'Finalizado' : newStatus === 'cancelled' ? 'Cancelado' : newStatus}"`;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      // Offline mode!
      const updatePayload: any = { status: newStatus, ...extraData };
      if (newStatus === 'completed') {
        updatePayload.paymentStatus = 'paid';
        updatePayload.paidAt = new Date().toISOString(); 
      }

      let clientMsg = `Seu agendamento para ${app.serviceName} foi atualizado para: ${newStatus}`;
      let staffType = 'update';
      let staffMsg = `Atualização: ${app.clientName} teve o status alterado para ${newStatus} (${app.serviceName})`;

      if (newStatus === 'completed') {
        clientMsg = `Seu agendamento de ${app.serviceName} foi concluído e o pagamento de R$ ${app.totalPrice?.toFixed(2) || '0,00'} foi registrado. Obrigado!`;
        staffType = 'payment';
        staffMsg = `Pagamento: ${app.clientName} pagou o serviço ${app.serviceName}`;
      } else if (newStatus === 'cancelled') {
        const reasonStr = extraData.cancellationReason || "Não informado";
        clientMsg = `Seu agendamento de ${app.serviceName} foi cancelado pela barbearia. Motivo: ${reasonStr}`;
        staffType = 'cancellation';
        staffMsg = `Cancelamento: ${app.clientName} teve o atendimento (${app.serviceName}) cancelado pela barbearia. Motivo: ${reasonStr}`;
      }

      const notifications = [
        {
          collectionName: "notifications",
          clientId: app.clientId || "",
          clientEmail: app.clientEmail || "",
          loginCode: app.loginCode || "",
          type: newStatus === 'cancelled' ? 'cancellation' : 'status_update',
          message: clientMsg,
          read: false,
          appointmentId: app.id
        },
        {
          collectionName: "staff_notifications",
          type: staffType,
          message: staffMsg,
          read: false,
          clientId: app.clientId || "",
          appointmentId: app.id,
          barberId: app.barberId || ""
        }
      ];

      // Add task to our persistent queue
      addToOfflineQueue('update_status', {
        appointmentId: app.id,
        newStatus,
        extraData: updatePayload,
        notifications
      }, description);

      // Attempt immediate cache side-write triggers
      try {
        await updateDoc(doc(firestore, "appointments", app.id), updatePayload);
      } catch (e) {
        console.warn("Postponed writing to firestore server - local cache updated:", e);
      }

      if (newStatus === 'cancelled') {
        setStatusMsg('Agendamento cancelado offline (sincronização pendente)!');
        setTimeout(() => setStatusMsg(null), 3000);
      } else if (newStatus === 'completed') {
        setStatusMsg('Atendimento concluído offline (sincronização pendente)!');
        setSelectedAppointment(null);
        setTimeout(() => setStatusMsg(null), 3000);
      }
      return;
    }

    try {
      const updatePayload: any = { status: newStatus, ...extraData };
      if (newStatus === 'completed') {
        updatePayload.paymentStatus = 'paid';
        updatePayload.paidAt = serverTimestamp();
      }
      
      await updateDoc(doc(firestore, "appointments", app.id), updatePayload);

      // Process offline/manual referral bonus when appointment completed
      if (newStatus === 'completed' && app.clientId && app.clientId !== "guest") {
        try {
          const clientDocRef = doc(firestore, "users", app.clientId);
          const clientSnap = await getDoc(clientDocRef);
          if (clientSnap.exists()) {
            const userData = clientSnap.data();
            if (userData.referredBy && !userData.referralRewardTriggered) {
              const rQuery = query(collection(firestore, "users"), where("referralCode", "==", userData.referredBy));
              const rSnap = await getDocs(rQuery);
              if (!rSnap.empty) {
                const referrerDoc = rSnap.docs[0];
                const rRef = doc(firestore, "users", rSnap.docs[0].id);
                const currentBal = Number(referrerDoc.data().walletBalance || 0);

                await updateDoc(rRef, {
                  walletBalance: currentBal + 5,
                  updatedAt: serverTimestamp()
                });

                await updateDoc(clientDocRef, {
                  referralRewardTriggered: true,
                  updatedAt: serverTimestamp()
                });

                await addDoc(collection(firestore, "notifications"), {
                  clientId: referrerDoc.id,
                  type: "bonus",
                  message: `Bônus de Indicação! Você ganhou R$ 5,00 de crédito em sua carteira pois seu amigo ${app.clientName || "indicado"} concluiu o primeiro corte! 💇‍♂️`,
                  timestamp: serverTimestamp(),
                  read: false
                });

                console.log(`[Referral] Manually completed: Referrer ${referrerDoc.id} rewarded R$ 5.00 for client ${app.clientId}`);
              }
            }
          }
        } catch (refErr) {
          console.error("Error processing manual referral bonus:", refErr);
        }
      }
      
      let clientMsg = `Seu agendamento para ${app.serviceName} foi atualizado para: ${newStatus}`;
      let staffType = 'update';
      let staffMsg = `Atualização: ${app.clientName} teve o status alterado para ${newStatus} (${app.serviceName})`;

      if (newStatus === 'completed') {
        clientMsg = `Seu agendamento de ${app.serviceName} foi concluído e o pagamento de R$ ${app.totalPrice?.toFixed(2) || '0,00'} foi registrado. Obrigado!`;
        staffType = 'payment';
        staffMsg = `Pagamento: ${app.clientName} pagou o serviço ${app.serviceName}`;
      } else if (newStatus === 'cancelled') {
        const reasonStr = extraData.cancellationReason || "Não informado";
        clientMsg = `Seu agendamento de ${app.serviceName} foi cancelado pela barbearia. Motivo: ${reasonStr}`;
        staffType = 'cancellation';
        staffMsg = `Cancelamento: ${app.clientName} teve o atendimento (${app.serviceName}) cancelado pela barbearia. Motivo: ${reasonStr}`;
      }

      await addDoc(collection(firestore, "notifications"), {
        clientId: app.clientId || "",
        clientEmail: app.clientEmail || "",
        loginCode: app.loginCode || "",
        type: newStatus === 'cancelled' ? 'cancellation' : 'status_update',
        message: clientMsg,
        timestamp: serverTimestamp(),
        read: false,
        appointmentId: app.id
      });

      // Staff notification
      await addDoc(collection(firestore, "staff_notifications"), {
        type: staffType,
        message: staffMsg,
        timestamp: serverTimestamp(),
        read: false,
        clientId: app.clientId || "",
        appointmentId: app.id,
        barberId: app.barberId || ""
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
    const description = `Excluir agendamento de ${app.clientName}`;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      addToOfflineQueue('delete_appointment', { appointmentId: app.id }, description);
      try {
        const { deleteDoc, doc } = await import("firebase/firestore");
        await deleteDoc(doc(firestore, "appointments", app.id));
      } catch (err) {
        console.warn("Postponed deleting from firestore server - local cache deleted:", err);
      }
      setSelectedAppointment(null);
      setStatusMsg('Agendamento excluído offline (sincronização pendente)!');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

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

  const baseFilteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      // Barber Filter
      if (selectedBarberId !== 'all' && app.barberId !== selectedBarberId) {
        return false;
      }

      // Date Filter (if scope is 'day')
      if (listScope === 'day') {
        if (!app.date) return false;
        const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        if (!(appDate instanceof Date) || isNaN(appDate.getTime())) return false;
        return isSameDay(appDate, currentDate);
      }

      return true;
    });
  }, [appointments, selectedBarberId, listScope, currentDate]);

  const filteredAppointmentsList = useMemo(() => {
    return baseFilteredAppointments.filter(app => {
      // Status Filter
      if (filterStatus !== 'all') {
        const isPending = !app.status || app.status === 'pending';
        if (filterStatus === 'pending') {
          if (!isPending) return false;
        } else {
          if (app.status !== filterStatus) return false;
        }
      }
      return true;
    });
  }, [baseFilteredAppointments, filterStatus]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: baseFilteredAppointments.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };
    baseFilteredAppointments.forEach(app => {
      const isPending = !app.status || app.status === 'pending';
      if (isPending) {
        counts.pending++;
      } else if (app.status === 'confirmed') {
        counts.confirmed++;
      } else if (app.status === 'completed') {
        counts.completed++;
      } else if (app.status === 'cancelled') {
        counts.cancelled++;
      }
    });
    return counts;
  }, [baseFilteredAppointments]);

  const statsForListMode = useMemo(() => {
    const completed = baseFilteredAppointments.filter(app => app.status === 'completed' && app.status !== 'cancelled');
    const scheduled = baseFilteredAppointments.filter(app => (app.status === 'confirmed' || app.status === 'pending') && app.status !== 'cancelled');
    
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
  }, [appointments, selectedBarberId, listScope, currentDate]);

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

    const qBlocked = query(collection(firestore, "blocked_times"), orderBy("date", "asc"));
    const unsubscribeBlocked = onSnapshot(qBlocked, (sn) => {
        setBlockedTimes(sn.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Failed to fetch blocked times:", error);
    });

    return () => {
        unsubscribe();
        unsubscribeBarbers();
        unsubscribeBlocked();
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
    <div className="min-h-screen bg-black px-6 pt-6 relative pb-28">
      {statusMsg && (
        <div className="fixed top-6 left-4 right-4 bg-emerald-500 text-white p-4 rounded-3xl font-black text-xs uppercase tracking-widest text-center z-50 shadow-2xl">
          {statusMsg}
        </div>
      )}

      {/* 📶 Persistent Offline Synchronization alerts */}
      {!isOnline && (
        <div className="max-w-xl mx-auto mb-4 bg-rose-500/10 border border-rose-500/20 p-4 rounded-3xl flex items-center gap-3 relative overflow-hidden shadow-2xl animate-pulse">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 text-rose-500 shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-rose-500 font-sans uppercase font-black tracking-widest block">Sem Internet • Operando Offline 📶</span>
            <p className="text-[10px] text-neutral-400 leading-normal font-semibold">
              Suas alterações na agenda estão salvas de forma segura localmente e serão sincronizadas com o servidor assim que a conexão for restabelecida.
            </p>
          </div>
        </div>
      )}

      {offlineQueue.length > 0 && (
        <div className="max-w-xl mx-auto mb-4 bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex flex-col gap-3 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span className="text-[10px] text-amber-500 font-sans uppercase font-black tracking-widest block">Sincronização offline pendente ({offlineQueue.length})</span>
            </div>
            <button 
              onClick={() => syncOfflineQueue()}
              disabled={!isOnline}
              className="text-[9px] bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black px-3 py-1.5 rounded-full font-black uppercase italic tracking-widest transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title={isOnline ? "Enviar alterações imediatamente" : "Conecte-se para sincronizar"}
            >
              Sincronizar Agora
            </button>
          </div>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {offlineQueue.map((action) => (
              <div key={action.id} className="text-[10px] text-neutral-400 flex justify-between items-center liquid-glass px-3 py-1.5 rounded-xl ">
                <span className="font-semibold">{action.description}</span>
                <span className="text-[8px] font-mono text-neutral-500 uppercase">{new Date(action.timestamp).toLocaleTimeString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Modern View Segmented Selector at the header */}
      {(role === 'manager' || role === 'barber') && (currentView === 'agenda' || currentView === 'list') && (
        <div className="max-w-xl mx-auto mb-4 mt-2">
          <div className=" liquid-glass  p-1.5 rounded-3xl flex items-center justify-between shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setCurrentView('agenda')}
              className={`flex-1 py-4 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all relative z-10 ${currentView === 'agenda' ? 'text-black font-black' : 'text-neutral-500 hover:text-white'}`}
            >
              {currentView === 'agenda' && (
                <motion.div 
                  layoutId="activeSubView" 
                  className="absolute inset-0 bg-amber-500 rounded-2xl z-[-1]" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Calendar className="w-4 h-4" />
              Agenda
            </button>
            <button 
              onClick={() => setCurrentView('list')}
              className={`flex-1 py-4 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all relative z-10 ${currentView === 'list' ? 'text-black font-black' : 'text-neutral-500 hover:text-white'}`}
            >
              {currentView === 'list' && (
                <motion.div 
                  layoutId="activeSubView" 
                  className="absolute inset-0 bg-amber-500 rounded-2xl z-[-1]" 
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Scissors className="w-4 h-4" />
              Atendimentos
            </button>
          </div>
        </div>
      )}
      
      {currentView === 'list' && (
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
             <h1 className="text-2xl font-light tracking-tight text-white capitalize">{format(currentDate, "dd 'de' MMMM", { locale: ptBR })}</h1>
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
             <Lock 
               onClick={() => setIsLockModalOpen(true)}
               className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" 
               title="Gerenciar Bloqueios"
             />
             <Search 
               onClick={() => setIsSearchModalOpen(true)}
               className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" 
               title="Buscar Agendamento"
             />
             <RefreshCw 
               onClick={handleRefreshSync}
               className={`w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors ${isSyncing ? "animate-spin text-amber-500" : ""}`} 
               title="Sincronizar Firestore"
             />
             <Calendar 
               onClick={() => setIsDatepickerModalOpen(true)}
               className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" 
               title="Seletor de Data"
             />
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

      {role === 'manager' && (currentView === 'list' || currentView === 'agenda') && (
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
            <div className=" liquid-glass px-3 py-1.5 rounded-full flex items-center gap-2 ">
               <Clock className="w-3.5 h-3.5 text-neutral-500" />
               <span className="text-white font-bold text-xs">30min</span>
            </div>
            <div className=" liquid-glass px-4 py-1.5 rounded-full ">
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

      {currentView === 'earnings' && <AnalyticsScreen appointments={appointments} services={services} />}
      
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 text-left">
                          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                             Fluxo de <span className="text-amber-500">Atendimentos</span>
                          </h2>
                          <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Controles e histórico total</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* List Scope Control */}
                          <div className=" liquid-glass  p-1 rounded-2xl flex items-center gap-1 shadow-inner">
                            <button
                              onClick={() => setListScope("day")}
                              className={`py-2 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${listScope === 'day' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
                            >
                              Dia Filtrado
                            </button>
                            <button
                              onClick={() => setListScope("all")}
                              className={`py-2 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${listScope === 'all' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
                            >
                              Histórico Total
                            </button>
                          </div>

                          <button 
                            onClick={exportToCSV} 
                            className="liquid-glass px-4 py-2.5 rounded-xl text-neutral-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:text-white  active:scale-95 transition-all duration-300"
                          > 
                            <Download className="w-3.5 h-3.5 text-amber-500"/> Exportar CSV
                          </button>
                        </div>
                      </div>

                      {/* Gorgeous Key Metrics Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* Faturamento Card */}
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          whileHover={{ y: -4, borderColor: "rgba(245, 158, 11, 0.25)" }}
                          className=" liquid-glass  rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
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
                          className=" liquid-glass  rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
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
                          className=" liquid-glass  rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
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
                          className=" liquid-glass  rounded-2xl p-3.5 space-y-2 relative overflow-hidden group shadow-xl"
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
                      <div className="flex gap-2 pb-2.5 overflow-x-auto no-scrollbar border-b border-white/5 mb-5 select-none scroll-smooth">
                        {[
                          { id: 'all', label: 'Todos', icon: Calendar, color: 'amber' },
                          { id: 'pending', label: 'Pendentes', icon: Clock, color: 'orange' },
                          { id: 'confirmed', label: 'Confirmados', icon: CheckCircle2, color: 'amber' },
                          { id: 'completed', label: 'Atendidos', icon: Sparkles, color: 'emerald' },
                          { id: 'cancelled', label: 'Cancelados', icon: XCircle, color: 'rose' }
                        ].map((tab) => {
                          const id = tab.id;
                          const isActive = filterStatus === id;
                          const count = statusCounts[id as keyof typeof statusCounts] ?? 0;
                          const IconComponent = tab.icon;
                          
                          // Active and Hover border/bg colors mapping
                          let activeClass = "";
                          let inactiveHoverClass = "";
                          
                          if (tab.color === 'orange') {
                            activeClass = "bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-md shadow-orange-500/5";
                            inactiveHoverClass = "hover:border-orange-500/20 hover:text-orange-300";
                          } else if (tab.color === 'emerald') {
                            activeClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/5";
                            inactiveHoverClass = "hover:border-emerald-500/20 hover:text-emerald-300";
                          } else if (tab.color === 'rose') {
                            activeClass = "bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-md shadow-rose-500/5";
                            inactiveHoverClass = "hover:border-rose-500/20 hover:text-rose-300";
                          } else { // 'amber'
                            activeClass = "bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/5";
                            inactiveHoverClass = "hover:border-amber-500/20 hover:text-amber-400";
                          }

                          return (
                            <button
                              key={id}
                              onClick={() => {
                                triggerLightHaptic();
                                setFilterStatus(id as any);
                              }}
                              className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-[0.96] border ${
                                isActive 
                                  ? `${activeClass} font-extrabold` 
                                  : `bg-neutral-950 border-white/5 text-neutral-500 ${inactiveHoverClass} hover:bg-neutral-900`
                              }`}
                            >
                              <IconComponent className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 duration-200 ${
                                isActive 
                                  ? "opacity-100" 
                                  : "opacity-40 group-hover:opacity-80"
                              }`} />
                              <span>{tab.label}</span>
                              
                              <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold leading-none transition-all ${
                                isActive
                                  ? tab.color === 'orange' ? 'bg-orange-500/20 text-orange-400'
                                    : tab.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400'
                                    : tab.color === 'rose' ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-amber-500/20 text-amber-500'
                                  : 'bg-white/5 text-neutral-600 group-hover:bg-white/10 group-hover:text-neutral-400'
                              }`}>
                                {count}
                              </span>
                              
                              {isActive && (
                                <motion.span 
                                  layoutId="activeFilterTabIndicator" 
                                  className={`absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full ${
                                    tab.color === 'orange' ? 'bg-orange-500/70'
                                      : tab.color === 'emerald' ? 'bg-emerald-500/70'
                                      : tab.color === 'rose' ? 'bg-rose-500/70'
                                      : 'bg-amber-500/70'
                                  }`} 
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
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
                        <div className="p-16 text-center liquid-glass/40 rounded-3xl ">
                          <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest mb-1">Nenhum atendimento</p>
                          <p className="text-[10px] text-neutral-700 uppercase font-black tracking-widest">Nesta categoria para o filtro atual</p>
                        </div>
                      ) : (
                        <motion.div 
                          layout
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
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

                                  const timeUntilApp = dateVal.getTime() - currentTime.getTime();
                                  const isUpcomingSoon = 
                                    app.status !== 'completed' && 
                                    app.status !== 'cancelled' && 
                                    timeUntilApp > 0 && 
                                    timeUntilApp <= 2 * 60 * 60 * 1000;

                                  let remainingText = "";
                                  if (isUpcomingSoon) {
                                    const mins = Math.max(0, Math.round(timeUntilApp / 60000));
                                    if (mins >= 60) {
                                      const hrs = Math.floor(mins / 60);
                                      const remMins = mins % 60;
                                      remainingText = remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
                                    } else {
                                      remainingText = `${mins} min`;
                                    }
                                  }

                                  const upcomingBorderClass = isUpcomingSoon 
                                    ? "border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20" 
                                    : "border-white/5";

                                  const borderHighlightClass = isExpanded 
                                    ? "border-amber-500/60 shadow-[0_12px_40px_-5px_rgba(245,158,11,0.2)] z-10" 
                                    : upcomingBorderClass;

                                  return (
                                      <motion.div 
                                           layout
                                           initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                           animate={{ opacity: 1, y: 0, scale: isExpanded ? 1.03 : 1 }}
                                           exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                           whileHover={isExpanded ? {} : { y: -4, scale: 1.01, borderColor: "rgba(245, 158, 11, 0.25)" }}
                                           whileTap={{ scale: 0.99 }}
                                           transition={{ 
                                             type: "spring",
                                             stiffness: 260,
                                             damping: 24,
                                             delay: isExpanded ? 0 : Math.min(index * 0.02, 0.15)
                                           }}
                                           key={`${app.id}_${filterStatus}_${currentDate.toDateString()}`} 
                                           className={`bg-neutral-900 rounded-[2rem] border ${borderHighlightClass} border-l-4 ${borderAccent} p-5 shadow-xl group cursor-pointer hover:bg-neutral-800 transition-all relative overflow-hidden`}
                                           onClick={() => setExpandedAppointmentId(isExpanded ? null : app.id)}
                                      >
                                          <div className="flex justify-between items-start mb-3">
                                              <div>
                                                  <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-1 flex items-center gap-1.5 leading-none">
                                                    <Clock className={`w-3.5 h-3.5 ${isUpcomingSoon ? "text-amber-500 animate-pulse scale-110" : "text-neutral-500"}`} />
                                                    <span>{format(dateVal, "PPP 'às' HH:mm", { locale: ptBR })}</span>
                                                    {isUpcomingSoon && (
                                                      <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] text-amber-500 font-extrabold flex items-center gap-1 animate-pulse uppercase">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                                        Em Breve • {remainingText}
                                                      </span>
                                                    )}
                                                  </p>
                                                  <h4 className="font-medium text-lg text-white tracking-tight mt-1 leading-none">{app.serviceName}</h4>
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
                                                    <div className="mb-4 liquid-glass p-3 rounded-2xl  space-y-2">
                                                      <p className="text-neutral-500 uppercase text-[8px] tracking-wider font-bold">Feedback Visual do Cliente:</p>
                                                      <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/10 group-hover:border-amber-500/30 transition-colors">
                                                          <img src={app.reviewPhotoUrl} className="w-full h-full object-cover" alt="Review" />
                                                      </div>
                                                    </div>
                                                  )}

                                                  <div className="flex justify-between items-center liquid-glass px-4 py-2 rounded-xl ">
                                                    <span className="text-neutral-500">Preço Total</span>
                                                    <span className="text-emerald-400 text-xs font-black">R$ {app.price || app.totalPrice || '0,00'}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center liquid-glass px-4 py-2 rounded-xl ">
                                                    <span className="text-neutral-500">Status Financeiro</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] ${app.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                      {app.paymentStatus === 'paid' ? 'Pago ✅' : 'Pendente 💳'}
                                                    </span>
                                                  </div>
                                                  {app.payerName && (
                                                    <div className="flex justify-between items-center liquid-glass px-4 py-2 rounded-xl ">
                                                      <span className="text-neutral-500">Responsável Pagamento</span>
                                                      <span className="text-amber-500 font-bold">{app.payerName}</span>
                                                    </div>
                                                  )}
                                                  {app.notes && (
                                                    <div className=" liquid-glass p-3 rounded-xl  text-[9px] text-neutral-400 normal-case font-medium tracking-normal mt-2">
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
                          </motion.div>
                      )}
                  </div>
              )}
              {currentView === 'services' && <ServicesManagement services={services} />}
              {currentView === 'collaborators' && <CollaboratorsManager />}
              {currentView === 'hours' && <WorkingHoursManager />}
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
      <AnimatePresence>
        {isLockModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className=" liquid-glass  rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setIsLockModalOpen(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Gerenciamento de Bloqueios</h3>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Reserve períodos de indisponibilidade em tempo real</p>
              </div>

              {/* Form of locks */}
              <form onSubmit={handleAddLock} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5 pl-1">Data</label>
                    <input 
                      type="date" 
                      value={lockDate} 
                      onChange={e => setLockDate(e.target.value)} 
                      className="w-full bg-black border border-white/10 rounded-2xl p-3 text-xs text-white uppercase tracking-wider font-extrabold outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5 pl-1">Profissional</label>
                    <select
                      value={blockingBarberId}
                      onChange={e => setBlockingBarberId(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-2xl p-3 text-xs text-white font-black uppercase tracking-widest outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="all">SALA INTEIRA (TODOS)</option>
                      {barbers.map(b => (
                        <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5 pl-1">Hora Inicial</label>
                    <input 
                      type="time" 
                      value={startTime} 
                      onChange={e => setStartTime(e.target.value)} 
                      className="w-full bg-black border border-white/10 rounded-2xl p-3 text-xs text-white uppercase tracking-wider font-extrabold outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5 pl-1">Hora Final</label>
                    <input 
                      type="time" 
                      value={endTime} 
                      onChange={e => setEndTime(e.target.value)} 
                      className="w-full bg-black border border-white/10 rounded-2xl p-3 text-xs text-white uppercase tracking-wider font-extrabold outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5 pl-1">Motivo do Bloqueio</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Almoço, Intervalo de Descanso, Reunião"
                    value={lockReason} 
                    onChange={e => setLockReason(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-2xl p-3 text-xs placeholder-neutral-700 font-extrabold outline-none focus:border-amber-500 transition-colors text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black uppercase text-[10px] tracking-widest transition-all duration-300"
                >
                  Bloquear Período 🔒
                </button>
              </form>

              {/* List of current blocks */}
              <div className="space-y-3">
                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">Bloqueios Ativos Recentes</h4>
                </div>
                <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2 no-scrollbar">
                  {blockedTimes.length === 0 ? (
                    <p className="text-center py-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">Nenhum bloqueio cadastrado</p>
                  ) : (
                    blockedTimes.map(b => {
                      const dateVal = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
                      return (
                        <div key={b.id} className=" liquid-glass  p-3 rounded-2xl flex justify-between items-center group hover:border-amber-500/20 transition-all">
                          <div className="text-left space-y-1">
                            <p className="text-[10px] text-white font-black uppercase tracking-wide leading-none">{b.reason || "Bloqueio de Horário"}</p>
                            <p className="text-[8px] text-neutral-500 font-medium tracking-tight">
                              {format(dateVal, "PPPP 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <p className="text-[8px] text-amber-500 font-black uppercase tracking-widest">
                              Profissional: {b.barberName || "Todos"}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleDeleteLock(b.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl border border-red-500/10 hover:border-red-500/30 transition-colors cursor-pointer"
                            title="Desfazer Bloqueio"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔍 SEARCH MODAL */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className=" liquid-glass  rounded-[2.5rem] p-6 max-w-lg w-full shadow-2xl relative space-y-4"
            >
              <button 
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchQuery("");
                }}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Search className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Painel de Pesquisa</h3>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Encontre clientes, agendamentos ou status instantaneamente</p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text" 
                  placeholder="DIGITE NOME DO CLIENTE, TELEFONE, PROFISSIONAL OU SERVIÇO..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white uppercase font-black tracking-widest outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-700"
                  autoFocus
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 no-scrollbar">
                {!searchQuery.trim() ? (
                  <p className="text-center py-10 text-[9px] font-black text-neutral-600 uppercase tracking-widest">Digite uma palavra-chave para buscar</p>
                ) : searchResults.length === 0 ? (
                  <p className="text-center py-10 text-[9px] font-black text-neutral-600 uppercase tracking-widest">Nenhum agendamento encontrado</p>
                ) : (
                  searchResults.map(app => {
                    const dateVal = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                    return (
                      <div 
                        key={app.id} 
                        onClick={() => {
                          setSelectedAppointment(app);
                          setIsSearchModalOpen(false);
                          setSearchQuery("");
                        }}
                        className=" liquid-glass  p-4 rounded-2xl text-left hover:border-amber-500 hover:bg-neutral-950 transition-all duration-300 cursor-pointer flex justify-between items-center group"
                      >
                        <div className="space-y-1">
                          <p className="text-[10px] text-white font-black uppercase tracking-widest group-hover:text-amber-500 transition-colors">{app.clientName}</p>
                          <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest leading-none">
                            {app.serviceName} com <span className="text-white capitalize">{app.barberName}</span>
                          </p>
                          <p className="text-[8px] text-neutral-600 font-medium uppercase tracking-widest">
                            {format(dateVal, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-amber-500 text-[10px] font-black leading-none">R$ {app.price || app.totalPrice || "0,00"}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${
                            app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                            app.status === 'confirmed' ? 'bg-amber-500/10 text-amber-400' :
                            app.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {app.status || "AGUARDANDO"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📅 DATEPICKER MODAL */}
      <AnimatePresence>
        {isDatepickerModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className=" liquid-glass  rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setIsDatepickerModalOpen(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Calendar className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Selecionar Data</h3>
                <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Navegue rapidamente para o dia desejado</p>
              </div>

              <div className="space-y-4">
                <input 
                  type="date" 
                  value={format(currentDate, "yyyy-MM-dd")}
                  onChange={e => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      setCurrentDate(new Date(year, month - 1, day));
                      setIsDatepickerModalOpen(false);
                      setStatusMsg(`Agenda atualizada para ${format(new Date(year, month-1, day), "dd/MM/yyyy")}!`);
                      setTimeout(() => setStatusMsg(null), 3000);
                    }
                  }}
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm tracking-wider font-extrabold outline-none focus:border-amber-500 transition-colors text-white text-center"
                />

                <div className="grid grid-cols-2 gap-2 pb-2">
                  <button
                    onClick={() => {
                      setCurrentDate(new Date());
                      setIsDatepickerModalOpen(false);
                      setStatusMsg("Mostrando o dia de Hoje!");
                      setTimeout(() => setStatusMsg(null), 3000);
                    }}
                    className="py-3 rounded-2xl bg-neutral-950  liquid-glass  text-neutral-300 font-black text-[9px] uppercase tracking-widest transition-all duration-300"
                  >
                    Dia de Hoje
                  </button>
                  <button
                    onClick={() => {
                      setCurrentDate(addDays(new Date(), 1));
                      setIsDatepickerModalOpen(false);
                      setStatusMsg("Mostrando o dia de Amanhã!");
                      setTimeout(() => setStatusMsg(null), 3000);
                    }}
                    className="py-3 rounded-2xl bg-neutral-950  liquid-glass  text-neutral-300 font-black text-[9px] uppercase tracking-widest transition-all duration-300"
                  >
                    Amanhã
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFESSIONAL CANCEL AGENDAMENTO CONFIRM DIALOG */}
      <AnimatePresence>
        {managerAppToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isManagerCancelling) {
                  setManagerAppToCancel(null);
                  setManagerCancelReason("");
                }
              }}
              className="liquid-glass absolute inset-0 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className=" liquid-glass  rounded-[2.5rem] p-8 max-w-sm w-full text-center relative z-10 shadow-2xl space-y-6 text-left"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/25 rounded-3xl mx-auto flex items-center justify-center text-red-500">
                <XCircle className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Cancelar Atendimento?</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                  Deseja realmente cancelar o agendamento de <span className="text-white font-black">{managerAppToCancel.clientName}</span> para:
                </p>
              </div>

              <div className=" liquid-glass rounded-2xl p-4  space-y-2 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                  <Calendar className="w-3 h-3" />
                  {format(managerAppToCancel.date instanceof Timestamp ? managerAppToCancel.date.toDate() : (typeof managerAppToCancel.date === 'string' ? parseISO(managerAppToCancel.date) : managerAppToCancel.date), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                  <Clock className="w-3 h-3" />
                  às {managerAppToCancel.time} ({managerAppToCancel.serviceName})
                </p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">
                  Motivo do Cancelamento
                </label>
                <textarea
                  value={managerCancelReason}
                  onChange={(e) => setManagerCancelReason(e.target.value)}
                  placeholder="Por que você está cancelando? (ex: Falta de energia / Imprevisto na agenda)"
                  maxLength={150}
                  className="w-full liquid-glass  rounded-2xl p-4 text-xs text-white placeholder-neutral-700 focus:border-red-500/50 outline-none resize-none h-20 transition-all font-medium"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={async () => {
                    setIsManagerCancelling(true);
                    try {
                      await handleStatusUpdate(managerAppToCancel, 'cancelled', { cancellationReason: managerCancelReason });
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsManagerCancelling(false);
                      setManagerAppToCancel(null);
                      setManagerCancelReason("");
                    }
                  }}
                  disabled={isManagerCancelling}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-red-500/5 disabled:cursor-not-allowed"
                >
                  {isManagerCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      CANCELANDO...
                    </>
                  ) : (
                    "SIM, CANCELAR AGENDAMENTO"
                  )}
                </button>
                <button 
                  onClick={() => { setManagerAppToCancel(null); setManagerCancelReason(""); }}
                  disabled={isManagerCancelling}
                  className="w-full bg-neutral-900  liquid-glass text-neutral-300 py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all cursor-pointer  disabled:cursor-not-allowed"
                >
                  MANTER AGENDAMENTO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
