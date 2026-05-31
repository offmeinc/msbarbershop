import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  parseISO,
  isToday 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  query, 
  collection, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  getFirestore
} from "firebase/firestore";
import { 
  X, 
  TrendingUp, 
  Scissors, 
  Wallet, 
  CalendarCheck, 
  Loader2, 
  CheckCircle2, 
  Calendar, 
  Trash2, 
  Star, 
  Home, 
  Layout, 
  User, 
  LogOut,
  Share2,
  Gift,
  Copy,
  Menu,
  ChevronRight,
  Sparkles,
  Bell,
  Clock,
  MessageSquare,
  MessageCircle
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { QRCodeCanvas } from "qrcode.react";
import { MoreOptionsScreen } from "../common/MoreOptionsScreen";
import { BookingScreen } from "./BookingScreen";
import { ProfileEditScreen } from "../common/ProfileEditScreen";
import { MyCutsScreen } from "./MyCutsScreen";
import { StyleSheet } from "./StyleSheet";
import { LookbookScreen } from "./LookbookScreen";
import { PreferencesSummary } from "./PreferencesSummary";
import { NotificationsScreen } from "../NotificationsScreen";
import { ChatScreen } from "../ChatScreens";
import { GOOGLE_REVIEW_URL } from "../../constants";
import { toast } from "../ui/Toast";

interface ClientDashboardScreenProps {
  user: any;
  onBack: () => void;
}

export function ClientDashboardScreen({ user, onBack }: ClientDashboardScreenProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadChat, setUnreadChat] = useState(false);
  const [currentView, setCurrentView] = useState<"home" | "profile" | "booking" | "my-cuts" | "more-options" | "style-sheet" | "notifications" | "lookbook" | "wallet" | "chat">("home");
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [initialBookingServiceId, setInitialBookingServiceId] = useState<string | undefined>();
  const [initialBookingBarberId, setInitialBookingBarberId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState<any>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [referralCode, setReferralCode] = useState(user?.referralCode || "");

  // Live tracking of unread chats
  useEffect(() => {
    const clientUid = user?.uid || user?.id;
    if (!clientUid) return;
    const firestore = db || getFirestore();
    const unsubscribe = onSnapshot(doc(firestore, "chats", clientUid), (snapshot) => {
      if (snapshot.exists()) {
        setUnreadChat(snapshot.data()?.unreadByClient || false);
      }
    });
    return unsubscribe;
  }, [user]);

  // Recharge / Digital Wallet states
  const [isRecharging, setIsRecharging] = useState(false);
  const [rechargeStep, setRechargeStep] = useState<"select" | "pix">("select");
  const [rechargeAmount, setRechargeAmount] = useState<number | null>(null);
  const [rechargeBonus, setRechargeBonus] = useState<number>(0);
  const [rechargeCutsReward, setRechargeCutsReward] = useState<number>(0);
  const [copiedRechargePix, setCopiedRechargePix] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeMpData, setRechargeMpData] = useState<any>(null);
  const [rechargeError, setRechargeError] = useState<string | null>(null);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);
  const [isRechargeSimulating, setIsRechargeSimulating] = useState(false);

  const handleGenerateRechargePix = async (amount: number, bonus: number, cutsReward: number) => {
    setRechargeLoading(true);
    setRechargeError(null);
    setRechargeAmount(amount);
    setRechargeBonus(bonus);
    setRechargeCutsReward(cutsReward);
    setRechargeStep("pix");
    
    try {
      const res = await fetch("/api/payments/mercado-pago/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Recarga de Créditos Carteira - MS Barbearia`,
          email: user?.email || "carteira@msbarbaria.com.br",
          name: user?.name || "Cliente VIP",
          appointmentId: "wallet-topup-" + (user?.uid || user?.id || "anon") + "-" + Date.now()
        })
      });
      if (!res.ok) {
        throw new Error("Erro de processamento da API de Recarga");
      }
      const data = await res.json();
      if (data.success) {
        setRechargeMpData(data);
      } else {
        throw new Error(data.error || "Falha desconhecida");
      }
    } catch (err: any) {
      console.error(err);
      setRechargeError("Não foi possível conectar ao Mercado Pago. Mas sinta-se à vontade para simular a conclusão do pagamento abaixo!");
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleCompleteRechargeSimulation = async () => {
    if (!rechargeAmount) return;
    try {
      const totalToAdd = rechargeAmount + rechargeBonus;
      const currentBalance = Number(user?.walletBalance || 0);
      const currentCuts = Number(user?.cutsBalance || 0);

      const finalUserId = user?.uid || user?.id;
      if (!finalUserId) {
         alert("Usuário não autenticado ou inválido.");
         return;
      }

      await updateDoc(doc(db, "users", finalUserId), {
        walletBalance: currentBalance + totalToAdd,
        cutsBalance: currentCuts + rechargeCutsReward,
        updatedAt: serverTimestamp()
      });

      // Add notification
      await addDoc(collection(db, "notifications"), {
         clientEmail: user.email,
         message: `Recarga Concluída! R$ ${totalToAdd.toFixed(2).replace('.', ',')} adicionados à sua Carteira Digital. Por estar em fase inicial, o valor foi simulado com sucesso!`,
         timestamp: serverTimestamp(),
         read: false
      });

      setRechargeSuccess(true);
      toast.success("Recarga efetuada com sucesso!");
    } catch (err: any) {
      console.error("Error saving topup:", err);
      alert("Houve um problema ao salvar seus créditos. Tente novamente.");
    }
  };

  useEffect(() => {
    if (user?.uid && !user.referralCode && !referralCode) {
      const newRef = Math.random().toString(36).substring(2, 8).toUpperCase();
      updateDoc(doc(db, "users", user.uid), { referralCode: newRef })
        .then(() => setReferralCode(newRef));
    }
  }, [user?.uid, user?.referralCode, referralCode]);

  useEffect(() => {
    if (isRecharging && rechargeStep === "pix" && rechargeMpData?.payment_id && !rechargeSuccess) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/mercado-pago/status/${rechargeMpData.payment_id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "approved" || data.status === "completed") {
              setRechargeSuccess(true);
            }
          }
        } catch (e) {
          console.error("Erro ao verificar status da recarga:", e);
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isRecharging, rechargeStep, rechargeMpData?.payment_id, rechargeSuccess]);

  useEffect(() => {
    if (!user || !user.email) return;
    const q = query(collection(db, "appointments"), where("clientEmail", "==", user.email), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((app: any) => app.hiddenByClient !== true)
      );
      setLoading(false);
    }, (error: any) => {
      console.error("Error fetching appointments:", error?.message || error);
      setLoading(false);
    });
    return unsubscribe;
  }, [user?.email]);

  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    if (!appointments) return { totalSpent: 0, completedCount: 0, upcoming: null };
    
    const totalSpent = appointments
      .filter(app => app.status === 'completed' && app.status !== 'cancelled')
      .reduce((sum, app) => sum + (Number(app.totalPrice) || 0), 0);
    
    const completedCount = appointments.filter(app => app.status === 'completed').length;
    
    // Calculate intelligent return reminder
    let daysToReturn = 21; // Default
    const completedApps = appointments.filter(app => app.status === 'completed').sort((a,b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate().getTime() : (typeof a.date === 'string' ? parseISO(a.date).getTime() : a.date.getTime());
        const dateB = b.date instanceof Timestamp ? b.date.toDate().getTime() : (typeof b.date === 'string' ? parseISO(b.date).getTime() : b.date.getTime());
        return dateB - dateA; // Newest first
    });

    if (completedApps.length >= 2) {
        const d1 = completedApps[0].date instanceof Timestamp ? completedApps[0].date.toDate() : parseISO(completedApps[0].date);
        const d2 = completedApps[1].date instanceof Timestamp ? completedApps[1].date.toDate() : parseISO(completedApps[1].date);
        const diffDays = Math.ceil(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 7 && diffDays < 60) daysToReturn = diffDays;
    }

    const lastAppointment = completedApps[0];
    let nextSuggestedDate = null;
    if (lastAppointment) {
        const lastDate = lastAppointment.date instanceof Timestamp ? lastAppointment.date.toDate() : parseISO(lastAppointment.date);
        nextSuggestedDate = new Date(lastDate);
        nextSuggestedDate.setDate(nextSuggestedDate.getDate() + daysToReturn);
    }

    const upcoming = appointments
      .filter(app => {
        if (!app.date) return false;
        const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        return appDate instanceof Date && !isNaN(appDate.getTime()) && appDate > new Date() && app.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateA.getTime() - dateB.getTime();
      })[0];

    return { totalSpent, completedCount, upcoming, daysToReturn, nextSuggestedDate };
  }, [appointments]);

  const handleCancelAppointment = async (app: any) => {
    try {
      await updateDoc(doc(db, "appointments", app.id), {
        status: 'cancelled',
        cancelledBy: 'client',
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "staff_notifications"), {
        type: 'cancellation',
        message: `Agendamento Cancelado: ${app.clientName} cancelou ${app.serviceName} marcado para ${format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM 'às' HH:mm", { locale: ptBR })}`,
        timestamp: serverTimestamp(),
        read: false,
        clientId: app.clientId,
        appointmentId: app.id
      });

      toast.success("Agendamento cancelado com sucesso.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "appointments");
    }
  };

  const handleHideAppointment = async (appId: string) => {
    if (!confirm("Remover do seu histórico?")) return;
    try {
      await updateDoc(doc(db, "appointments", appId), {
        hiddenByClient: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "appointments");
    }
  };

  const handleSubmitReview = async () => {
    if (!showReviewModal) return;
    try {
      await updateDoc(doc(db, "appointments", showReviewModal.id), {
        rating,
        reviewComment: comment,
        reviewedAt: serverTimestamp()
      });

      await addDoc(collection(db, "staff_notifications"), {
        type: 'review',
        message: `Nova Avaliação: ${user.name} deu ${rating} estrelas para ${showReviewModal.serviceName}`,
        timestamp: serverTimestamp(),
        read: false,
        clientId: user.id || user.uid,
        appointmentId: showReviewModal.id
      });

      if (rating >= 4) {
        setReviewSubmitted(true);
      } else {
        setShowReviewModal(null);
        setComment("");
        setRating(5);
        alert("Obrigado pela sua avaliação! Vamos trabalhar para melhorar cada vez mais.");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "appointments");
    }
  };

  useEffect(() => {
    if (!user || !user.email) return;
    const q = query(
      collection(db, "notifications"), 
      where("clientEmail", "==", user.email), 
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      // Check for new notifications to show toast
      if (notifications.length > 0 && newNotifs.length > notifications.length) {
        const latest = newNotifs[0];
        if (!latest.read) {
          toast.success(latest.message);
        }
      }
      
      setNotifications(newNotifs);
    });
    return unsubscribe;
  }, [user?.email, notifications.length]);

  // Reminder logic
  useEffect(() => {
    if (stats.upcoming) {
      const appDate = stats.upcoming.date instanceof Timestamp ? stats.upcoming.date.toDate() : parseISO(stats.upcoming.date);
      const timeParts = stats.upcoming.time.split(':');
      appDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
      
      const now = new Date();
      const diffMs = appDate.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      // Notify if it's in 1 hour
      if (diffMins > 0 && diffMins <= 60 && !stats.upcoming.reminderSent) {
        toast.info(`Lembrete: Seu corte ${stats.upcoming.serviceName} é daqui a pouco (${stats.upcoming.time})!`);
        // We could mark it as sent in firestore to avoid repeats, but client-side session is enough for now
      }
    }
  }, [stats.upcoming]);

  const handleClearNotifications = async () => {
    try {
      const batch: any[] = [];
      notifications.forEach(n => {
        if (!n.read) {
          batch.push(updateDoc(doc(db, "notifications", n.id), { read: true }));
        }
      });
      await Promise.all(batch);
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black text-white pb-32">
      <AnimatePresence mode="wait">
        {currentView === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="pt-12 px-6 pb-8 sticky top-0 bg-black/80 backdrop-blur-xl z-20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-2xl bg-amber-500 overflow-hidden border-2 border-amber-500 shadow-xl">
                      <img src={user?.photoURL || user?.photoUrl || `https://ui-avatars.com/api/?name=${user?.displayName || user?.name || 'Cliente'}&background=f59e0b&color=000`} alt="Avatar" className="w-full h-full object-cover" />
                   </div>
                   <div className="flex items-center gap-2">
                      <div>
                        <p className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Bem-vind{user?.gender === 'female' ? 'a' : 'o'}</p>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter truncate w-40">{(user?.displayName || 'Cliente').split(' ')[0]}</h2>
                      </div>
                      <button onClick={() => setCurrentView('notifications')} className="relative p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all">
                        <Bell className="w-5 h-5" />
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-black" />
                        )}
                      </button>
                      <button onClick={() => setCurrentView('chat')} className="relative p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all" title="Chat com Profissional">
                        <MessageSquare className="w-5 h-5" />
                        {unreadChat && (
                          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-black animate-pulse" />
                        )}
                      </button>
                      <button onClick={() => setCurrentView('more-options')} className="p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all">
                        <Menu className="w-5 h-5" />
                      </button>
                   </div>
                </div>

              </div>
            </div>

            <div className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full space-y-4">
                <button
                  onClick={() => setCurrentView('booking')}
                  className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black italic uppercase tracking-widest text-lg shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <CalendarCheck className="w-6 h-6" />
                  AGENDAR HORÁRIO
                </button>

                {stats.upcoming && (
                  <div className={`p-6 rounded-[2.5rem] shadow-2xl transition-all ${
                    stats.upcoming.status === 'confirmed' 
                      ? 'bg-amber-500 text-black shadow-amber-500/20' 
                      : 'bg-neutral-900 border border-amber-500/30 text-white shadow-black/80'
                  }`}>
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <CalendarCheck className={`w-5 h-5 ${stats.upcoming.status === 'confirmed' ? 'text-black' : 'text-amber-500'}`} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">Próximo Agendamento</span>
                        </div>
                        <div className="flex items-center gap-2">
                           {isToday(stats.upcoming.date instanceof Timestamp ? stats.upcoming.date.toDate() : parseISO(stats.upcoming.date)) && (
                             <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse">É HOJE!</span>
                           )}
                           {stats.upcoming.status === 'confirmed' ? (
                             <span className="bg-black text-amber-500 text-[10px] font-black px-2 py-1 rounded-lg">CONFIRMADO</span>
                           ) : (
                             <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black px-2 py-1 rounded-lg animate-pulse">Aguardando a confirmação do barbeiro.</span>
                           )}
                        </div>
                     </div>
                     <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-1 leading-tight">{stats.upcoming.serviceName}</h4>
                     <div className="flex items-center gap-4 text-xs font-bold opacity-80 mb-6">
                        <p>{(() => {
                           const d = stats.upcoming.date instanceof Timestamp ? stats.upcoming.date.toDate() : parseISO(stats.upcoming.date);
                           return format(d, "dd 'de' MMMM", { locale: ptBR });
                        })()}</p>
                        <div className={`w-1 h-1 rounded-full ${stats.upcoming.status === 'confirmed' ? 'bg-black' : 'bg-white/40'}`} />
                        <p>{stats.upcoming.time}</p>
                     </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedAppointment(stats.upcoming); setCurrentView('booking'); }} 
                          className={`flex-1 font-black uppercase italic py-4 rounded-2xl text-[10px] tracking-widest transition-colors ${
                            stats.upcoming.status === 'confirmed' 
                              ? 'bg-black text-white hover:bg-neutral-900' 
                              : 'bg-amber-500 text-black hover:bg-amber-600'
                          }`}
                        >
                          REAGENDAR
                        </button>
                        <button 
                          onClick={() => handleCancelAppointment(stats.upcoming)} 
                          className="px-6 bg-red-600 text-white font-black uppercase italic py-4 rounded-2xl text-[10px] tracking-widest hover:bg-red-700 transition-colors"
                        >
                          CANCELAR
                        </button>
                      </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2 bg-[#0A0A0A] p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-2 -bottom-2 text-amber-500/10 group-hover:scale-110 transition-transform duration-700">
                      <TrendingUp size={120} strokeWidth={3} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Total Investido</p>
                      <div className="flex items-baseline gap-2">
                         <span className="text-4xl font-black italic tracking-tighter">R${stats.totalSpent.toFixed(2)}</span>
                         <span className="text-[10px] font-bold text-amber-500">CLIENTE VIP</span>
                      </div>
                    </div>
                 </div>
                 
                  <div className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5">
                     <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Visitas</p>
                     <p className="text-2xl font-black italic underline decoration-amber-500 decoration-2 underline-offset-4">{stats.completedCount}</p>
                  </div>
                 
                 <div className="bg-[#0A0A0A] p-5 rounded-[2rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Rank</p>
                    <p className="text-2xl font-black italic text-amber-500 leading-none">
                      {stats.completedCount >= 20 ? 'GOLD' : stats.completedCount >= 10 ? 'SILVER' : 'BRONZE'}
                    </p>
                 </div>
              </div>

              {/* Return Reminder Widget */}
              {!stats.upcoming && stats.nextSuggestedDate && (
                <div className="bg-neutral-900 border border-white/5 p-8 rounded-[3rem] relative overflow-hidden group shadow-xl">
                   <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                       <Calendar className="w-20 h-20 text-amber-500" />
                   </div>
                   <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-4">
                           <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Sugestão de Retorno</span>
                       </div>
                       <h4 className="text-xl font-black italic uppercase tracking-tight text-white mb-2">Hora de renovar o visual?</h4>
                       <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed mb-8 max-w-[200px]">
                           Baseado no seu histórico, o momento ideal para o próximo corte seria dia <span className="text-amber-500 underline decoration-amber-500/30 underline-offset-4">{format(stats.nextSuggestedDate, "dd 'de' MMMM", { locale: ptBR })}</span>.
                       </p>
                       <button 
                           onClick={() => setCurrentView('booking')}
                           className="bg-amber-500 text-black text-[10px] font-black uppercase italic tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                       >
                           RESERVAR AGORA
                       </button>
                   </div>
                </div>
              )}



              {/* Digital Wallet Card */}
              <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 p-8 rounded-[3.5rem] relative overflow-hidden group shadow-2xl">
                 <div className="absolute -right-8 -top-8 text-amber-500/5 group-hover:scale-110 transition-transform duration-1000 rotate-12">
                    <Wallet size={200} />
                  </div>
                  <div className="relative z-10">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                              <Wallet className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-1">Carteira Digital</p>
                              <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">Planos e Créditos</h4>
                           </div>
                        </div>
                        <span className="bg-neutral-800 text-neutral-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tight">VIP</span>
                     </div>

                     <div className="flex items-end justify-between gap-4">
                        <div>
                           <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Saldo Disponível</p>
                           <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black italic text-white tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user?.walletBalance || 0)}
                              </span>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            setIsRecharging(true);
                            setRechargeStep("select");
                            setRechargeSuccess(false);
                            setRechargeAmount(null);
                            setRechargeMpData(null);
                          }}
                          className="bg-white hover:bg-amber-500 hover:text-black text-black text-[9px] font-black uppercase italic tracking-widest px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                           RECARREGAR
                        </button>
                     </div>

                     <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
                        <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/5">
                           <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Cortes Restantes</p>
                           <p className="text-xl font-black italic text-white">{user?.cutsBalance || 0}</p>
                        </div>
                        <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/5">
                           <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Pontos Fidelidade</p>
                           <p className="text-xl font-black italic text-amber-500">{(stats.completedCount % 10) * 100}</p>
                        </div>
                     </div>
                  </div>
              </div>


              {/* Referral Section */}
              <div className="bg-neutral-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-700">
                    <Gift size={160} />
                  </div>
                  <div className="relative z-10 opacity-60">
                    <div className="flex items-center gap-2 mb-4">
                        <Share2 className="w-4 h-4 text-neutral-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Convide um amigo</span>
                        <span className="ml-auto bg-neutral-800 text-neutral-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic tracking-tighter">Em Breve</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">Indique e Ganhe</h3>
                    <p className="text-xs text-neutral-500 font-medium mb-6">Em breve você poderá indicar amigos e ganhar descontos exclusivos!</p>
                    
                    <div className="flex items-center gap-2 opacity-30 pointer-events-none">
                        <div className="flex-1 bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                            <span className="text-sm font-black tracking-widest text-white">------</span>
                            <button disabled className="text-neutral-500">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <button disabled className="bg-neutral-800 text-neutral-600 p-4 rounded-2xl font-black">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                  </div>
              </div>

              {/* Live Chat Card */}
              <div className="bg-neutral-900 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-amber-500/5 group-hover:scale-110 transition-transform duration-700">
                    <MessageSquare size={160} />
                  </div>
                  <div className="relative z-10 flex flex-col justify-between h-full pt-1">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Suporte & Dúvidas</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">Chat com Profissional</h3>
                    <p className="text-xs text-neutral-500 font-medium mb-6">Fale agora com o seu profissional para tirar dúvidas ou fazer solicitações especiais!</p>
                    
                    <button 
                        onClick={() => setCurrentView('chat')}
                        className="w-fit bg-amber-500/10 border border-amber-500/20 text-text-amber-500 hover:text-amber-500 text-amber-500 text-[10px] font-black uppercase italic tracking-widest px-6 py-3 rounded-xl hover:bg-amber-500 hover:text-black transition-all active:scale-95"
                    >
                        ABRIR CONVERSA
                    </button>
                  </div>
              </div>

              <PreferencesSummary appointments={appointments} />
 
              {/* My Cuts Gallery (Client's Own Photos) */}
              {appointments.some(app => app.reviewPhotoUrl) && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Minha Galeria</h3>
                       <button onClick={() => setCurrentView('my-cuts')} className="text-[9px] font-black italic uppercase text-amber-500">Ver Tudo</button>
                   </div>
                   <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                       {appointments
                        .filter(app => app.reviewPhotoUrl)
                        .slice(0, 6)
                        .map(app => (
                          <motion.div 
                            key={app.id} 
                            whileTap={{ scale: 0.95 }}
                            className="flex-shrink-0 w-32 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 relative group"
                          >
                             <img src={app.reviewPhotoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Meu Corte" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                                <p className="text-[8px] font-black text-white italic truncate uppercase">{app.serviceName}</p>
                                <p className="text-[7px] font-bold text-neutral-400 uppercase">{format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yy")}</p>
                             </div>
                          </motion.div>
                        ))
                       }
                   </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Histórico Recente</h3>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">{appointments.length} Cortes</span>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-10 opacity-30">
                     <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map(app => (
                      <div key={app.id} className="p-5 bg-[#0A0A0A] rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-amber-500/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 ${app.status === 'completed' ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-900 text-neutral-700'}`}>
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white uppercase italic">{app.serviceName}</h4>
                            <p className="text-[10px] text-neutral-600 uppercase font-bold tracking-tight">
                              {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy • HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="text-xs font-black text-white italic">R${(Number(app.totalPrice) || 0).toFixed(2)}</p>
                          {app.status === 'completed' && !app.rating && <button onClick={() => setShowReviewModal(app)} className="px-3 py-1.5 bg-amber-500 text-black text-[9px] font-black uppercase rounded-xl">AVALIAR</button>}
                          {(app.status === 'completed' || app.status === 'cancelled') && <button onClick={() => handleHideAppointment(app.id)} className="px-3 py-1.5 bg-neutral-900 text-neutral-600 hover:text-red-500 text-[9px] font-black uppercase rounded-xl transition-all border border-white/5"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'profile' && <ProfileEditScreen user={user} onBack={() => setCurrentView('home')} isClient={true} />}
        {currentView === 'booking' && <BookingScreen user={user} services={services} onBack={() => { setCurrentView('home'); setSelectedAppointment(null); setInitialBookingServiceId(undefined); setInitialBookingBarberId(undefined); }} editAppointment={selectedAppointment} initialServiceId={initialBookingServiceId} initialBarberId={initialBookingBarberId} />}
        {currentView === 'chat' && <ChatScreen user={user} onBack={() => setCurrentView('home')} />}
        {currentView === 'my-cuts' && (
          <MyCutsScreen 
            user={user} 
            appointments={appointments} 
            onBack={() => setCurrentView('home')} 
            onBookAgain={(serviceId, barberId) => { 
              setInitialBookingServiceId(serviceId); 
              setInitialBookingBarberId(barberId); 
              setCurrentView('booking'); 
            }}
            onReschedule={(app) => {
              setSelectedAppointment(app);
              setCurrentView('booking');
            }}
            onCancel={handleCancelAppointment}
          />
        )}
        {currentView === 'lookbook' && <LookbookScreen onBack={() => setCurrentView('home')} onBook={(style) => { setCurrentView('booking'); setInitialBookingServiceId(undefined); /* Could filter services by style if needed */ }} />}
        {currentView === 'notifications' && <NotificationsScreen notifications={notifications} appointments={appointments} onClear={handleClearNotifications} onBack={() => setCurrentView('home')} />}
        {currentView === 'style-sheet' && <StyleSheet user={user} onBack={() => setCurrentView('home')} />}
        {currentView === 'wallet' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="px-6 pt-12 pb-24 max-w-md mx-auto space-y-8 min-h-[85vh]"
          >
             {/* Header */}
             <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <button 
                  onClick={() => setCurrentView('home')} 
                  className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-500 hover:text-white transition-colors"
                >
                   ← VOLTAR
                </button>
                <h2 className="text-xl font-black italic uppercase text-white tracking-widest">MINHA CARTEIRA</h2>
                <div className="w-12 h-6" /> {/* alignment spacer */}
             </div>

             {/* Digital Wallet Card */}
             <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 p-8 rounded-[3.5rem] relative overflow-hidden group shadow-2xl text-left">
                <div className="absolute -right-8 -top-8 text-amber-500/5 rotate-12">
                   <Wallet size={200} />
                </div>
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <Wallet className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-1">Carteira Digital</p>
                            <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">Planos e Créditos</h4>
                         </div>
                      </div>
                      <span className="bg-neutral-800 text-neutral-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tight">VIP</span>
                   </div>

                   <div className="flex items-end justify-between gap-4">
                      <div>
                         <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Saldo Disponível</p>
                         <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black italic text-white tracking-tighter">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user?.walletBalance || 0)}
                            </span>
                         </div>
                      </div>
                      <button 
                        onClick={() => {
                          setIsRecharging(true);
                          setRechargeStep("select");
                          setRechargeSuccess(false);
                          setRechargeAmount(null);
                          setRechargeMpData(null);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase italic tracking-widest px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all shadow-amber-500/10"
                      >
                         RECARREGAR
                      </button>
                   </div>

                   <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
                      <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/5">
                         <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Cortes Restantes</p>
                         <p className="text-xl font-black italic text-white">{user?.cutsBalance || 0}</p>
                      </div>
                      <div className="flex-1 bg-black/40 rounded-2xl p-4 border border-white/5">
                         <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Pontos Fidelidade</p>
                         <p className="text-xl font-black italic text-amber-500">{(stats.completedCount % 10) * 100}</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Description Banner */}
             <div className="bg-neutral-900 border border-white/5 p-6 rounded-[2.5rem] text-left space-y-4">
               <h3 className="text-sm font-black uppercase italic tracking-wider text-amber-500">Vantagens de Adicionar Créditos</h3>
               <div className="space-y-3">
                 <div className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                   <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                     <span className="text-white">Pagamento sem Fricção:</span> Pague seus cortes de forma automática pelo saldo da carteira com apenas 1 clique no estabelecimento.
                   </p>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                   <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                     <span className="text-white">Cortes de Recompensa:</span> Ao recarregar valores específicos, ganhe cortes inteiros extras em seu saldo virtual!
                   </p>
                 </div>
                 <div className="flex items-start gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                   <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                     <span className="text-white">Agilidade Máxima:</span> Sem necessidade de levar cartão ou celular na hora do atendimento, tudo já está controlado no seu perfil.
                   </p>
                 </div>
               </div>
             </div>
          </motion.div>
        )}

        {currentView === 'more-options' && (
            <MoreOptionsScreen
                user={user}
                role="client"
                onLogout={onBack}
                onBack={() => setCurrentView('home')}
                staffNotifications={[]}
                appointments={appointments}
                onClearNotifications={() => {}}
                onToggleTheme={() => {}}
                isDarkMode={true}
            />
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0A0A0A]/95 border border-white/10 backdrop-blur-3xl rounded-[2.5rem] p-1.5 flex items-center gap-1.5 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
         <button onClick={() => setCurrentView('home')} className={`px-5 py-3.5 rounded-full ${currentView === 'home' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><Home className="w-4 h-4" /></button>
         <button onClick={() => setCurrentView('my-cuts')} className={`px-5 py-3.5 rounded-full ${currentView === 'my-cuts' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><Scissors className="w-4 h-4" /></button>
         <button onClick={() => setCurrentView('wallet')} className={`px-5 py-3.5 rounded-full ${currentView === 'wallet' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><Wallet className="w-4 h-4" /></button>
         <button onClick={() => setCurrentView('profile')} className={`px-5 py-3.5 rounded-full ${currentView === 'profile' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><User className="w-4 h-4" /></button>
         <div className="w-[1px] h-4 bg-white/10 mx-1" />
         <button onClick={onBack} className="p-4 text-neutral-600 hover:text-red-500 uppercase"><LogOut className="w-4 h-4" /></button>
      </div>

      <AnimatePresence>
        {showReviewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-neutral-900 border border-white/10 p-8 rounded-[3rem] w-full max-w-sm text-center relative overflow-hidden">
                <button 
                  onClick={() => {
                    setShowReviewModal(null);
                    setReviewSubmitted(false);
                    setComment("");
                    setRating(5);
                  }}
                  className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {!reviewSubmitted ? (
                  <>
                    <Star className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black italic uppercase mb-2">Avaliar Serviço</h2>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-6">{showReviewModal.serviceName}</p>
                    <div className="flex justify-center gap-2 mb-8">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform active:scale-125">
                          <Star className={`w-8 h-8 ${rating >= s ? 'text-amber-500 fill-amber-500' : 'text-neutral-700'}`} />
                        </button>
                      ))}
                    </div>
                    <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comentário (opcional)" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs mb-6 text-white outline-none focus:border-amber-500" />
                    <button onClick={handleSubmitReview} className="w-full bg-amber-500 hover:bg-amber-600 text-black py-4 rounded-2xl font-black uppercase italic transition-colors">Enviar Avaliação</button>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-4 flex flex-col items-center">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 mb-2">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black italic uppercase text-white mb-2">Obrigado!</h2>
                      <p className="text-xs text-neutral-400 font-bold leading-relaxed px-2">
                        Sua avaliação foi registrada internamente. Que tal nos ajudar ainda mais deixando sua avaliação no Google?
                      </p>
                    </div>
                    <div className="w-full space-y-3 pt-2">
                      <a 
                        href={GOOGLE_REVIEW_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black py-4 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-2 transition-colors text-xs text-center block"
                      >
                        Avaliar no Google ⭐
                      </a>
                      <button 
                        onClick={() => {
                          setShowReviewModal(null);
                          setReviewSubmitted(false);
                          setComment("");
                          setRating(5);
                        }}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-colors text-xs"
                      >
                        Agora Não
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
          </motion.div>
        )}

        {isRecharging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-neutral-900 border border-white/10 p-8 rounded-[3rem] w-full max-w-sm text-center relative overflow-hidden my-auto shadow-2xl">
                <button 
                  onClick={() => setIsRecharging(false)}
                  className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors z-20"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-6 py-4 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 mb-2 relative">
                    <Wallet className="w-8 h-8" />
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                    </span>
                  </div>
                  <div>
                    <span className="bg-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-sans mb-3 inline-block">
                      Em Breve!
                    </span>
                    <h2 className="text-xl font-black italic uppercase text-white mb-2 leading-tight">
                      Recargas via Pix
                    </h2>
                    <p className="text-xs text-neutral-400 font-bold leading-relaxed px-2 uppercase tracking-tight">
                      A possibilidade de recarregar sua carteira digital diretamente no app para adquirir créditos e bônus exclusivos estará disponível em breve!
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setIsRecharging(false)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black py-4 rounded-2xl font-black uppercase italic tracking-widest transition-colors text-xs mt-2"
                  >
                    Entendido
                  </button>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
