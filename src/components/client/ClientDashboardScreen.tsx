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
  getFirestore,
  increment
} from "firebase/firestore";
import { 
  X, 
  XCircle,
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
  MessageCircle,
  Lock,
  Image as ImageIcon,
  CreditCard,
  ShieldCheck,
  Zap,
  Check,
  RotateCcw,
  Info
} from "lucide-react";
import { db, handleFirestoreError, OperationType, safeStringify } from "../../lib/firebase";
import { getBackendUrl } from "../../lib/pushRegister";
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
import { ReferralsScreen } from "./ReferralsScreen";
import { GOOGLE_REVIEW_URL } from "../../constants";
import { toast } from "../ui/Toast";
import { triggerLightHaptic } from "../../lib/haptics";

interface ClientDashboardScreenProps {
  user: any;
  onBack: () => void;
}

export function ClientDashboardScreen({ user, onBack }: ClientDashboardScreenProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadChat, setUnreadChat] = useState(false);
  const [appToCancel, setAppToCancel] = useState<any | null>(null);
  const [cancelReasonTxt, setCancelReasonTxt] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentView, setCurrentView] = useState<"home" | "profile" | "booking" | "my-cuts" | "more-options" | "style-sheet" | "notifications" | "lookbook" | "wallet" | "chat" | "referrals">("home");
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

  const [liveUser, setLiveUser] = useState<any>(user);
  const [selectedLookbookStyle, setSelectedLookbookStyle] = useState<{ title: string, imageUrl: string } | null>(null);

  useEffect(() => {
    const finalUserId = user?.uid || user?.id;
    if (!finalUserId) return;
    
    const unsubscribe = onSnapshot(doc(db, "users", finalUserId), (docSnap) => {
      if (docSnap.exists()) {
        setLiveUser({ uid: docSnap.id, id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [user]);

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
  const [customRechargeInput, setCustomRechargeInput] = useState<string>("");
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
      const res = await fetch(getBackendUrl("/api/payments/mercado-pago/create-payment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: safeStringify({
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
      setRechargeError("Não foi possível conectar ao Mercado Pago. Verifique sua conexão e tente novamente.");
    } finally {
      setRechargeLoading(false);
    }
  };

  const handleCompleteRechargeSimulation = async () => {
    if (!rechargeAmount) return;
    try {
      const totalToAdd = rechargeAmount + rechargeBonus;
      const currentBalance = Number(liveUser?.walletBalance || 0);
      const currentCuts = Number(liveUser?.cutsBalance || 0);

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
         clientId: user?.uid || user?.id || "",
         clientEmail: user?.email || "",
         message: `Recarga Concluída! R$ ${totalToAdd.toFixed(2).replace('.', ',')} adicionados à sua Carteira Digital. Por estar em fase inicial, o valor foi simulado com sucesso!`,
         timestamp: serverTimestamp(),
         read: false,
         type: 'recharge'
      });

      setRechargeSuccess(true);
      toast.success("Recarga efetuada com sucesso!");
    } catch (err: any) {
      console.error("Error saving topup:", err);
      alert("Houve um problema ao salvar seus créditos. Tente novamente.");
    }
  };



  useEffect(() => {
    if (isRecharging && rechargeStep === "pix" && rechargeMpData?.payment_id && !rechargeSuccess) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(getBackendUrl(`/api/payments/mercado-pago/status/${rechargeMpData.payment_id}`));
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
    if (!user) return;
    const finalUserId = user?.uid || user?.id;
    if (!finalUserId) return;

    let unsubEmail: (() => void) | null = null;
    let appointmentsById: any[] = [];
    let appointmentsByEmail: any[] = [];

    const updateCombinedAppointments = (byId: any[], byEmail: any[]) => {
      const merged = [...byId];
      byEmail.forEach((app) => {
        if (!merged.some((m) => m.id === app.id)) {
          merged.push(app);
        }
      });
      // Sort combined array by date descending
      merged.sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate().getTime() : (typeof a.date === 'string' ? parseISO(a.date).getTime() : a.date.getTime());
        const dateB = b.date instanceof Timestamp ? b.date.toDate().getTime() : (typeof b.date === 'string' ? parseISO(b.date).getTime() : b.date.getTime());
        return dateB - dateA;
      });
      setAppointments(merged.filter((app: any) => app.hiddenByClient !== true));
      setLoading(false);
    };

    const qId = query(collection(db, "appointments"), where("clientId", "==", finalUserId));
    const unsubId = onSnapshot(qId, (snapshot) => {
      appointmentsById = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCombinedAppointments(appointmentsById, appointmentsByEmail);
    }, (error: any) => {
      console.error("Error fetching appointments by ID:", error);
      setLoading(false);
    });

    if (user.email) {
      const qEmail = query(collection(db, "appointments"), where("clientEmail", "==", user.email));
      unsubEmail = onSnapshot(qEmail, (snapshot) => {
        appointmentsByEmail = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateCombinedAppointments(appointmentsById, appointmentsByEmail);
      }, (error: any) => {
        console.error("Error fetching appointments by Email:", error);
      });
    }

    return () => {
      unsubId();
      if (unsubEmail) unsubEmail();
    };
  }, [user]);

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

  useEffect(() => {
    if (user?.uid && !liveUser?.referralCode && !referralCode && stats.completedCount > 0) {
      const newRef = Math.random().toString(36).substring(2, 8).toUpperCase();
      updateDoc(doc(db, "users", user.uid), { referralCode: newRef })
        .then(() => setReferralCode(newRef));
    }
  }, [user?.uid, liveUser?.referralCode, referralCode, stats.completedCount]);

  const handleCancelAppointment = async (app: any, reason?: string) => {
    try {
      const res = await fetch(getBackendUrl("/api/appointments/cancel"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeStringify({
          appointmentId: app.id,
          userId: user?.uid || user?.id,
          reason: reason || ""
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao cancelar agendamento");
      }

      const data = await res.json();
      if (data.refundedAmount > 0) {
        toast.success(`Cancelado! R$ ${data.refundedAmount.toFixed(2)} foram devolvidos à sua carteira.`);
      } else {
        toast.success("Agendamento cancelado com sucesso.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar cancelamento.");
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
    if (!user) return;
    const finalUserId = user?.uid || user?.id;
    if (!finalUserId) return;

    let unsubEmail: (() => void) | null = null;
    let notifsById: any[] = [];
    let notifsByEmail: any[] = [];

    const updateCombinedNotifications = (byId: any[], byEmail: any[]) => {
      const merged = [...byId];
      byEmail.forEach((n) => {
        if (!merged.some((m) => m.id === n.id)) {
          merged.push(n);
        }
      });
      // Sort combined array by timestamp descending
      merged.sort((a, b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      // Avoid trigger loop: ONLY update state if the length or content has actually changed
      setNotifications((prev) => {
        if (prev.length === merged.length && prev.every((v, i) => v.id === merged[i].id && v.read === merged[i].read)) {
          return prev;
        }
        
        // Trigger toast for new unread notifications if they were added
        if (prev.length > 0 && merged.length > prev.length) {
          const latest = merged[0];
          if (!latest.read) {
            toast.success(latest.message);
          }
        }
        return merged;
      });
    };

    const qId = query(collection(db, "notifications"), where("clientId", "==", finalUserId));
    const unsubId = onSnapshot(qId, (snapshot) => {
      notifsById = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateCombinedNotifications(notifsById, notifsByEmail);
    }, (error: any) => {
      console.error("Error fetching notifications by ID:", error);
    });

    if (user.email) {
      const qEmail = query(collection(db, "notifications"), where("clientEmail", "==", user.email));
      unsubEmail = onSnapshot(qEmail, (snapshot) => {
        notifsByEmail = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateCombinedNotifications(notifsById, notifsByEmail);
      }, (error: any) => {
        console.error("Error fetching notifications by Email:", error);
      });
    }

    return () => {
      unsubId();
      if (unsubEmail) unsubEmail();
    };
  }, [user]);

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

  const currentClientName = liveUser?.name || liveUser?.displayName || user?.name || user?.displayName || "Cliente";
  const currentClientPhoto = liveUser?.photoURL || liveUser?.photoUrl || user?.photoURL || user?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentClientName)}&background=1a1a1a&color=fff`;

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
            <div className="liquid-glass pt-12 px-6 pb-6 sticky top-0 backdrop-blur-2xl z-20 -b -white/[0.02]">
              <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-full liquid-glass overflow-hidden shadow-xl shrink-0  relative group">
                        <img src={currentClientPhoto} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] pointer-events-none" />
                     </div>
                     <div className="flex flex-col justify-center">
                        <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-[0.25em] leading-none mb-1.5 flex items-center gap-1.5">
                          Bem-vind{((liveUser?.gender || user?.gender) === 'female') ? 'a' : 'o'}
                          <Sparkles className="w-3 h-3 text-amber-500/70" />
                        </p>
                        <h2 className="text-2xl font-light tracking-tight truncate max-w-[140px] md:max-w-xs">{currentClientName.split(' ')[0]}</h2>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setCurrentView('notifications')} className="liquid-glass relative p-2.5 rounded-full text-neutral-400 hover:text-white   transition-all">
                        <Bell className="w-5 h-5 md:w-5 md:h-5" strokeWidth={1.5} />
                        {notifications.filter(n => !n.read).length > 0 && (
                          <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border border-black" />
                        )}
                      </button>
                      <button onClick={() => setCurrentView('chat')} className="liquid-glass relative p-2.5 rounded-full text-neutral-400 hover:text-white   transition-all" title="Chat com Profissional">
                        <MessageSquare className="w-5 h-5 md:w-5 md:h-5" strokeWidth={1.5} />
                        {unreadChat && (
                          <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border border-black animate-pulse" />
                        )}
                      </button>
                      <button onClick={() => setCurrentView('more-options')} className="liquid-glass p-2.5 rounded-full text-neutral-400 hover:text-white   transition-all">
                        <Menu className="w-5 h-5 md:w-5 md:h-5" strokeWidth={1.5} />
                      </button>
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
                          onClick={() => {
                            setAppToCancel(stats.upcoming);
                            setCancelReasonTxt("");
                          }} 
                          className="px-6 bg-red-600 text-white font-black uppercase italic py-4 rounded-2xl text-[10px] tracking-widest hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          CANCELAR
                        </button>
                      </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2 liquid-glass p-6 rounded-[2.5rem]  relative overflow-hidden group">
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
                 
                  <div className=" liquid-glass p-5 rounded-[2rem] ">
                     <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Visitas</p>
                     <p className="text-2xl font-black italic underline decoration-amber-500 decoration-2 underline-offset-4">{stats.completedCount}</p>
                  </div>
                 
                 <div className=" liquid-glass p-5 rounded-[2rem] ">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Rank</p>
                    <p className="text-2xl font-black italic text-amber-500 leading-none">
                      {stats.completedCount >= 20 ? 'GOLD' : stats.completedCount >= 10 ? 'SILVER' : 'BRONZE'}
                    </p>
                 </div>
              </div>

              {/* Return Reminder Widget */}
              {!stats.upcoming && stats.nextSuggestedDate && (
                <div className=" liquid-glass  p-8 rounded-[3rem] relative overflow-hidden group shadow-xl">
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
                        <span className="liquid-glass text-neutral-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tight">VIP</span>
                     </div>

                     <div className="flex items-end justify-between gap-4">
                        <div>
                           <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Saldo Disponível</p>
                           <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black italic text-white tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liveUser?.walletBalance || 0)}
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
                        <div className="flex-1 liquid-glass rounded-2xl p-4 ">
                           <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Cortes Restantes</p>
                           <p className="text-xl font-black italic text-white">{liveUser?.cutsBalance || 0}</p>
                        </div>
                        <div className="flex-1 liquid-glass rounded-2xl p-4 ">
                           <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Pontos Fidelidade</p>
                           <p className="text-xl font-black italic text-amber-500">{(stats.completedCount % 10) * 100}</p>
                        </div>
                     </div>
                  </div>
               </div>

              {/* Referral Section Card */}
              <div 
                onClick={() => {
                  triggerLightHaptic();
                  setCurrentView('referrals');
                }}
                className="bg-neutral-900  liquid-glass  hover:border-amber-500/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group mt-6 cursor-pointer transition-all duration-300"
              >
                <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-700">
                  <Gift size={160} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                      <Gift className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Indique & Ganhe</span>
                      {stats.completedCount > 0 ? (
                        <span className="ml-auto bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic tracking-tighter">Ativo</span>
                      ) : (
                        <span className="ml-auto liquid-glass text-neutral-400  text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic tracking-tighter">Pendente</span>
                      )}
                  </div>
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-left">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none flex items-center gap-1.5">
                        Central de Indicações <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                      </h3>
                      <p className="text-xs text-neutral-400 font-medium max-w-sm">
                        {stats.completedCount > 0 
                          ? `Indique amigos usando seu código exclusivo e acumule bônus de R$ 5,00 diretamente na sua carteira digital!` 
                          : `Ganhe R$ 5,00 na carteira a cada amigo indicado! Complete seu primeiro corte com a gente para desbloquear o programa.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between liquid-glass  p-4 rounded-2xl">
                    <div className="text-left">
                      <span className="text-[8px] font-black uppercase text-neutral-500 tracking-wider">Código de Cupom</span>
                      <p className="text-[13px] font-mono font-black text-amber-500 tracking-wider">
                        {stats.completedCount > 0 ? (referralCode || liveUser?.referralCode || "GERANDO...") : "🔒 BLOQUEADO"}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase text-amber-500 shrink-0 italic tracking-wider group-hover:underline">
                      Gerenciar Convidados →
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Chat Card */}
              <div className=" liquid-glass  p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
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
                        className="w-fit bg-amber-500/10 border border-amber-500/20 text-text-amber-500 hover:text-amber-500 text-amber-500 text-[10px] font-black uppercase italic tracking-widest px-6 py-3 rounded-xl hover:bg-amber-500 hover:text-black transition-all active:scale-95 cursor-pointer"
                    >
                        ABRIR CONVERSA
                    </button>
                  </div>
              </div>

              {/* Lookbook / Inspirações e Portfólio Bento Card */}
              <div 
                id="lookbook-bento-card"
                onClick={() => setCurrentView('lookbook')}
                className=" liquid-glass  p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group cursor-pointer active:scale-95 transition-all text-left"
              >
                  <div className="absolute -right-4 -bottom-4 text-amber-500/5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <ImageIcon size={160} />
                  </div>
                  <div className="relative z-10 flex flex-col justify-between h-full pt-1">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Galeria & Inspiração</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">Fotos & Portfólio</h3>
                    <p className="text-xs text-neutral-400 font-medium mb-6">Exiba cortes da equipe ou tendências globais para escolher o modelo perfeito para o seu rosto!</p>
                    
                    <button 
                        className="w-fit bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase italic tracking-widest px-6 py-3 rounded-xl hover:bg-amber-500 hover:text-black transition-all pointer-events-none"
                    >
                        EXPLORAR GALERIA
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
                      <div key={app.id} className="p-5 liquid-glass rounded-[2rem]  flex items-center justify-between group hover:border-amber-500/20 transition-all">
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
                          {(app.status === 'completed' || app.status === 'cancelled') && <button onClick={() => handleHideAppointment(app.id)} className="px-3 py-1.5 liquid-glass text-neutral-600 hover:text-red-500 text-[9px] font-black uppercase rounded-xl transition-all "><Trash2 className="w-3 h-3" /></button>}
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
        {currentView === 'booking' && (
          <BookingScreen 
            user={user} 
            services={services} 
            onBack={() => { 
              setCurrentView('home'); 
              setSelectedAppointment(null); 
              setInitialBookingServiceId(undefined); 
              setInitialBookingBarberId(undefined); 
              setSelectedLookbookStyle(null); 
            }} 
            editAppointment={selectedAppointment} 
            initialServiceId={initialBookingServiceId} 
            initialBarberId={initialBookingBarberId} 
            initialStyle={selectedLookbookStyle}
          />
        )}
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
        {currentView === 'lookbook' && (
          <LookbookScreen 
            onBack={() => setCurrentView('home')} 
            onBook={(styleObj) => { 
              setSelectedLookbookStyle(styleObj);
              setInitialBookingServiceId(undefined);
              setCurrentView('booking'); 
            }} 
          />
        )}
        {currentView === 'notifications' && <NotificationsScreen user={user} notifications={notifications} appointments={appointments} onClear={handleClearNotifications} onBack={() => setCurrentView('home')} />}
        {currentView === 'referrals' && (
          <ReferralsScreen 
            user={user} 
            onBack={() => setCurrentView('home')} 
            stats={stats} 
            appointments={appointments} 
          />
        )}
        {currentView === 'style-sheet' && <StyleSheet user={user} onBack={() => setCurrentView('home')} />}
        {currentView === 'wallet' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="px-4 sm:px-6 pt-10 pb-32 max-w-md mx-auto space-y-6 min-h-[85vh] text-left"
          >
             {/* Header */}
             <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <button 
                  onClick={() => setCurrentView('home')} 
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-500 hover:text-white transition-all hover:translate-x-[-2px] cursor-pointer"
                >
                   ← PAINEL
                </button>
                <div className="flex items-center gap-1.5 self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="text-xs font-black uppercase text-white tracking-[0.2em]">Sua Carteira VIP</h2>
                </div>
                <div className="w-10 h-6" />
             </div>

             {/* Digital Wallet Card - Premium Design */}
             <div className="bg-gradient-to-tr from-[#121212] via-[#0e0e0e] to-neutral-950 border border-white/5 rounded-[2.5rem] p-6 sm:p-7 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:border-amber-500/20">
                {/* Holographic light layer mimicking reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-amber-500/[0.02] pointer-events-none" />
                
                {/* Embedded dynamic luxury vector log */}
                <div className="absolute -right-4 -bottom-4 text-amber-500/[0.02] select-none pointer-events-none group-hover:scale-105 transition-transform duration-1000 rotate-12">
                   <Wallet size={190} />
                </div>
                
                <div className="relative z-10 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                         <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10 shrink-0">
                            <CreditCard className="w-4 h-4" />
                         </div>
                         <div>
                            <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-tight italic">MENSBARBER VIP</h4>
                            <p className="text-[7px] font-mono text-neutral-500 uppercase tracking-widest leading-none">FIDELIDADE EXCLUSIVA</p>
                         </div>
                      </div>
                      <span className="bg-gradient-to-r from-amber-500/10 to-amber-500/20 text-amber-400 border border-amber-500/10 text-[8px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest">
                         MEMBER
                      </span>
                   </div>

                   {/* Simulated Golden RFID smart-chip and Contactless Wave */}
                   <div className="flex items-center justify-between pt-1 select-none">
                     <div className="w-8 h-6 bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-amber-600/10 rounded-md border border-amber-500/20 relative" />
                     <div className="flex flex-col gap-0.5 items-end rotate-90 text-[8px] text-neutral-600 font-black tracking-widest leading-none">
                       <span>)))</span>
                     </div>
                   </div>

                   <div className="space-y-1">
                      <p className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.2em] leading-normal">SALDO INTEGRADO</p>
                      <div className="flex items-baseline gap-1.5">
                         <span className="text-3xl font-black italic text-white tracking-tighter drop-shadow-md">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liveUser?.walletBalance || 0)}
                         </span>
                         <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/15 py-0.5 px-1.5 rounded-md border border-emerald-500/10 leading-none">
                           ATIVO
                         </span>
                      </div>
                   </div>

                   {/* Micro statistics or references */}
                   <div className="pt-5 border-t border-white/5 flex items-center justify-between gap-4 font-mono">
                      <div>
                        <p className="text-[7.5px] font-extrabold text-[#555555]">CÓDIGO CLIENTE</p>
                        <p className="text-[9px] font-black text-neutral-300">
                          MB-{(liveUser?.id || user?.uid || "MEMBER").slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7.5px] font-extrabold text-[#555555]">ATIVAÇÃO</p>
                        <p className="text-[9px] font-black text-amber-500">GOLD PREMIUM</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Dynamic Gauges: Cuts and Loyalty Points */}
             <div className="grid grid-cols-2 gap-3">
                <div className=" liquid-glass  p-4 rounded-3xl text-left flex flex-col justify-between space-y-2 group hover:border-amber-500/10 transition-colors">
                   <div className="flex items-center justify-between">
                     <span className="text-[7.5px] font-black text-[#555] uppercase tracking-[0.15em]">Cortes Grátis</span>
                     <Gift className="w-3.5 h-3.5 text-amber-500" />
                   </div>
                   <div>
                     <p className="text-2xl font-black italic text-white tracking-tight leading-none mb-0.5">
                       {liveUser?.cutsBalance || 0}
                     </p>
                     <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">Regastáveis na reserva</p>
                   </div>
                </div>

                <div className=" liquid-glass  p-4 rounded-3xl text-left flex flex-col justify-between space-y-2 group hover:border-amber-500/10 transition-colors">
                   <div className="flex items-center justify-between">
                     <span className="text-[7.5px] font-black text-[#555] uppercase tracking-[0.15em]">Fidelidade</span>
                     <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                   </div>
                   <div>
                     <p className="text-2xl font-black italic text-amber-500 tracking-tight leading-none mb-0.5">
                       {((stats.completedCount || 0) % 10) * 100}
                     </p>
                     <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">
                       {10 - ((stats.completedCount || 0) % 10)} cortes p/ brinde!
                     </p>
                   </div>
                </div>
             </div>

             {/* Fidelity Progress bar */}
             <div className=" liquid-glass  p-4 rounded-3xl space-y-2 text-left">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider">
                  <span className="text-neutral-400">Progresso do Próximo Corte Cortesia</span>
                  <span className="text-amber-500">{((stats.completedCount || 0) % 10) * 10}%</span>
                </div>
                <div className="w-full h-2 liquid-glass rounded-full overflow-hidden  relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((stats.completedCount || 0) % 10) * 10}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full relative"
                  >
                    <div className="absolute top-0 right-0 w-1 h-full bg-white/40 animate-pulse" />
                  </motion.div>
                </div>
                <div className="flex items-center gap-1.5 text-[8.5px] text-neutral-500 font-medium">
                  <Info className="w-3 h-3 text-amber-500" />
                  <span>Cada 10 cortes completados geram automaticaticamente 1 corte livre!</span>
                </div>
             </div>

             {/* Packages and Quick Top-up cards - STUNNING RECHARGES */}
             <div className="space-y-3 pt-2 text-left">



             </div>

             {/* Custom Value Top up expander */}
             <div className=" liquid-glass  rounded-3xl p-4.5 text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[8px] font-black text-neutral-500 uppercase tracking-[0.25em]">VALOR PERSONALIZADO</span>
                  <span className="text-[8.5px] font-mono text-neutral-600">Min. R$ 10,00</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsRecharging(true);
                      setRechargeStep("select");
                      setRechargeSuccess(false);
                      setRechargeAmount(null);
                      setRechargeMpData(null);
                    }}
                    className="w-full py-3.5 bg-neutral-900  liquid-glass text-neutral-300 hover:text-white  hover:border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest italic cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 shadow-md"
                  >
                     <Zap className="w-3 h-3 text-amber-500" /> RECARREGAR OUTRO VALOR
                  </button>
                </div>
             </div>

             {/* Advantages Accordion Grid */}
             <div className=" liquid-glass/40  p-6 rounded-[2.2rem] text-left space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-500 italic">TERMOS & BENEFÍCIOS DO SALDO</h4>
                </div>
                
                <div className="space-y-3 text-[9px] uppercase font-bold tracking-wider text-neutral-400">
                  <div className="flex gap-2 items-start leading-snug">
                    <span className="text-amber-500 mt-0.5">✔</span>
                    <p>
                      <strong className="text-white">Uso Imediato:</strong> Use para pagar cortes de cabelo, barba, ou produtos sem usar carteiras físicas.
                    </p>
                  </div>
                  <div className="flex gap-2 items-start leading-snug">
                    <span className="text-amber-500 mt-0.5">✔</span>
                    <p>
                      <strong className="text-white">Segurança Integral:</strong> Sistema auditado em tempo real por tecnologia de ledger integrada da barbearia.
                    </p>
                  </div>
                  <div className="flex gap-2 items-start leading-snug">
                    <span className="text-amber-500 mt-0.5">✔</span>
                    <p>
                      <strong className="text-white">Sem Expiração:</strong> Seus créditos acumulados não expiram, use-os quando quiser durante o ano.
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
                onReferrals={() => setCurrentView('referrals')}
            />
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 liquid-glass  backdrop-blur-3xl rounded-[2.5rem] p-1.5 flex items-center gap-1.5 z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
         <button onClick={() => setCurrentView('home')} className={`px-5 py-3.5 rounded-full ${currentView === 'home' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><Home className="w-4 h-4" /></button>
         <button onClick={() => setCurrentView('my-cuts')} className={`px-5 py-3.5 rounded-full ${currentView === 'my-cuts' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><Scissors className="w-4 h-4" /></button>
         <button onClick={() => setCurrentView('wallet')} className={`px-5 py-3.5 rounded-full ${currentView === 'wallet' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><Wallet className="w-4 h-4" /></button>
         <button onClick={() => setCurrentView('profile')} className={`px-5 py-3.5 rounded-full ${currentView === 'profile' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}><User className="w-4 h-4" /></button>
         <div className="liquid-glass w-[1px] h-4 mx-1" />
         <button onClick={onBack} className="p-4 text-neutral-600 hover:text-red-500 uppercase"><LogOut className="w-4 h-4" /></button>
      </div>

      <AnimatePresence>
        {showReviewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="liquid-glass fixed inset-0 z-[100] backdrop-blur-xl flex items-center justify-center p-6">
              <div className=" liquid-glass  p-8 rounded-[3rem] w-full max-w-sm text-center relative overflow-hidden">
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
                        className="liquid-glass w-full  text-neutral-300 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-colors text-xs"
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
              <div className=" liquid-glass  p-7 rounded-[3rem] w-full max-w-sm text-center relative overflow-hidden my-auto shadow-2xl">
                <button 
                  onClick={() => setIsRecharging(false)}
                  className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors z-20 cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-5 py-2 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10 shrink-0 relative">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black italic uppercase text-white mb-1 leading-tight tracking-wider">
                      Recarga Eletrônica
                    </h2>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                      CRÉDITOS NA CARTEIRA DIGITAL
                    </p>
                  </div>
                  
                  {rechargeSuccess ? (
                    <div className="py-4 space-y-4 w-full text-center">
                      <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                         <Check className="w-7 h-7 stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white uppercase italic tracking-wider leading-none mb-1">Recarga Concluída!</h3>
                        <p className="text-[10px] text-neutral-400 font-semibold px-4 leading-normal uppercase">
                          Os bônus e créditos foram vinculados ao saldo da sua conta com sucesso!
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setIsRecharging(false);
                          setRechargeSuccess(false);
                          setRechargeStep("select");
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black py-3.5 rounded-2xl font-black uppercase italic tracking-widest transition-all text-[10px] cursor-pointer hover:shadow-lg shadow-amber-500/15"
                      >
                        CONCLUIR PARABÉNS
                      </button>
                    </div>
                  ) : rechargeLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-3">
                      <span className="w-7 h-7 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                      <p className="text-[9px] text-amber-500 uppercase font-black tracking-[0.2em] animate-pulse">Gerando Pix no Ledger...</p>
                    </div>
                  ) : rechargeError ? (
                    <div className="py-4 space-y-4 w-full text-center">
                       <div className="bg-[#1A1110] border border-red-900/40 p-4 rounded-2xl text-left space-y-1">
                          <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block leading-none">Erro de Conexão</span>
                          <p className="text-[10px] text-neutral-400 font-semibold uppercase leading-snug">
                             Incapaz de gerar Pix de recarga neste momento. Verifique seus dados e tente novamente.
                          </p>
                       </div>
                       

                        <button 
                           onClick={() => handleGenerateRechargePix(rechargeAmount || 50, rechargeBonus, rechargeCutsReward)}
                           className="w-full py-2.5 liquid-glass  rounded-xl text-[8.5px] text-neutral-405 font-black uppercase text-center hover:bg-neutral-800 cursor-pointer"
                        >
                           Tentar Conexão Novamente
                        </button>
                    </div>
                 ) : rechargeMpData?.qr_code_base64 && rechargeMpData?.qr_code ? (
                    <div className="space-y-4 w-full">
                      <div className="bg-white p-3.5 rounded-[2rem] mx-auto w-fit shadow-xl shadow-amber-500/5 relative group">
                        <img src={`data:image/png;base64,${rechargeMpData.qr_code_base64}`} alt="QR Code Pix" className="w-[160px] h-[160px] rounded-2xl" />
                      </div>
                      
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(rechargeMpData.qr_code);
                          setCopiedRechargePix(true);
                          toast.success("Código Copiado!");
                          setTimeout(() => setCopiedRechargePix(false), 2000);
                        }}
                        className="liquid-glass w-full py-3.5 rounded-[1.1rem] text-[9.5px] font-mono text-white  transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedRechargePix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedRechargePix ? "RECORTE COPIADO!" : "COPIAR CÓDIGO COPIA E COLA"}
                      </button>

                      <div className="liquid-glass h-[1px] my-1" />
                      
                      <div className="space-y-2">
                         <div className="text-center text-neutral-500 text-[8.5px] uppercase font-bold tracking-widest animate-pulse flex items-center justify-center gap-1.5 mb-1 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shadow-lg" />
                            <span>Aguardando Pix eletrônico...</span>
                         </div>

                         
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full mt-4">
                      <div>
                        <label className="text-[8.5px] text-neutral-500 font-extrabold uppercase tracking-widest pl-2 mb-1.5 block">
                          DIGITE O VALOR DA RECARGA
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black italic">R$</span>
                          <input 
                            type="number"
                            value={customRechargeInput}
                            onChange={(e) => setCustomRechargeInput(e.target.value)}
                            placeholder="0,00"
                            className="liquid-glass w-full -2 focus:-amber-500 rounded-2xl py-4 pl-12 pr-4 text-white font-black text-xl italic outline-none transition-colors"
                          />
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          const val = parseFloat(customRechargeInput.replace(",", "."));
                          if (!isNaN(val) && val > 0) {
                             handleGenerateRechargePix(val, 0, 0); // No bonus for arbitrary amount for now
                          } else {
                             toast.error("Insira um valor válido para recarga");
                          }
                        }}
                        disabled={!customRechargeInput}
                        className="liquid-glass w-full  disabled:opacity-50  disabled:text-neutral-500 text-black py-4 rounded-2xl font-black uppercase italic tracking-widest transition-colors text-xs"
                      >
                        Gerar Pagamento Pix
                      </button>
                    </div>
                  )}
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CANCEL AGENDAMENTO CONFIRM DIALOG */}
      <AnimatePresence>
        {appToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCancelling) {
                  setAppToCancel(null);
                  setCancelReasonTxt("");
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
                <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Cancelar Agendamento?</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                  Deseja realmente cancelar seu agendamento de <span className="text-white font-black">{appToCancel.serviceName}</span> para:
                </p>
              </div>

              <div className=" liquid-glass rounded-2xl p-4  space-y-2 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                  <Calendar className="w-3 h-3" />
                  {format(appToCancel.date instanceof Timestamp ? appToCancel.date.toDate() : parseISO(appToCancel.date), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                  <Clock className="w-3 h-3" />
                  às {appToCancel.time}
                </p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">
                  Motivo do Cancelamento
                </label>
                <textarea
                  value={cancelReasonTxt}
                  onChange={(e) => setCancelReasonTxt(e.target.value)}
                  placeholder="Por que você está cancelando? (ex: Tive um imprevisto)"
                  maxLength={150}
                  className="w-full liquid-glass  rounded-2xl p-4 text-xs text-white placeholder-neutral-700 focus:border-red-500/50 outline-none resize-none h-20 transition-all font-medium"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={async () => {
                    setIsCancelling(true);
                    try {
                      await handleCancelAppointment(appToCancel, cancelReasonTxt);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsCancelling(false);
                      setAppToCancel(null);
                      setCancelReasonTxt("");
                    }
                  }}
                  disabled={isCancelling}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-red-500/5 disabled:cursor-not-allowed"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      CANCELANDO...
                    </>
                  ) : (
                    "SIM, CANCELAR AGENDAMENTO"
                  )}
                </button>
                <button 
                  onClick={() => { setAppToCancel(null); setCancelReasonTxt(""); }}
                  disabled={isCancelling}
                  className="w-full bg-neutral-900  liquid-glass text-neutral-300 py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all cursor-pointer  disabled:cursor-not-allowed"
                >
                  MANTER AGENDAMENTO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
