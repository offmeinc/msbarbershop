import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  parseISO 
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
  Timestamp 
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
  Sparkles
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { MoreOptionsScreen } from "../common/MoreOptionsScreen";
import { BookingScreen } from "./BookingScreen";
import { ProfileEditScreen } from "../common/ProfileEditScreen";
import { MyCutsScreen } from "./MyCutsScreen";
import { PreferencesSummary } from "./PreferencesSummary";
import { GOOGLE_REVIEW_URL } from "../../constants";

interface ClientDashboardScreenProps {
  user: any;
  onBack: () => void;
}

export function ClientDashboardScreen({ user, onBack }: ClientDashboardScreenProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<"home" | "profile" | "booking" | "my-cuts" | "more-options">("home");
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

  useEffect(() => {
    if (user?.uid && !user.referralCode && !referralCode) {
      const newRef = Math.random().toString(36).substring(2, 8).toUpperCase();
      updateDoc(doc(db, "users", user.uid), { referralCode: newRef })
        .then(() => setReferralCode(newRef));
    }
  }, [user?.uid, user?.referralCode, referralCode]);

  useEffect(() => {
    if (!user || !user.email) return;
    const q = query(collection(db, "appointments"), where("clientEmail", "==", user.email), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((app: any) => app.hiddenByClient !== true)
      );
      setLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
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

    return { totalSpent, completedCount, upcoming };
  }, [appointments]);

  const handleCancelAppointment = async (app: any) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    
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

      alert("Agendamento cancelado com sucesso.");
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
                      <button onClick={() => setCurrentView('more-options')} className="p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all">
                        <Menu className="w-5 h-5" />
                      </button>
                   </div>
                </div>
                 <div className="flex items-center gap-2">
                  <button onClick={onBack} className="p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-full">
                <button
                  onClick={() => setCurrentView('booking')}
                  className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black italic uppercase tracking-widest text-lg shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <CalendarCheck className="w-6 h-6" />
                  AGENDAR HORÁRIO
                </button>
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
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Cashback</p>
                    <p className="text-2xl font-black italic text-green-500 leading-none">R$ 0,00</p>
                 </div>
              </div>

              {/* Referral Section */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-700">
                    <Gift size={160} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Share2 className="w-4 h-4 text-indigo-200" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Convide um amigo</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">Indique e Ganhe</h3>
                    <p className="text-xs text-indigo-100/70 font-medium mb-6">Compartilhe seu código e ambos ganham 15% de desconto no próximo corte!</p>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                            <span className="text-sm font-black tracking-widest text-white">{referralCode || "GERANDO..."}</span>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(referralCode);
                                    alert("Código copiado!");
                                }}
                                className="text-indigo-300 hover:text-white transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: 'Minha Barbearia Favorita',
                                        text: `Use meu código ${referralCode} para ganhar 15% de desconto na barbearia!`,
                                        url: window.location.href
                                    });
                                }
                            }}
                            className="bg-white text-indigo-600 p-4 rounded-2xl font-black transition-all active:scale-95"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                  </div>
              </div>

              <PreferencesSummary appointments={appointments} />

              {stats.upcoming && (
                <div className="bg-amber-500 p-6 rounded-[2.5rem] shadow-2xl shadow-amber-500/20 text-black">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                         <CalendarCheck className="w-5 h-5" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em]">Próximo Agendamento</span>
                      </div>
                      <span className="bg-black text-amber-500 text-[10px] font-black px-2 py-1 rounded-lg">CONFIRMADO</span>
                   </div>
                   <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-1 leading-tight">{stats.upcoming.serviceName}</h4>
                   <div className="flex items-center gap-4 text-xs font-bold opacity-80 mb-6">
                      <p>{(() => {
                         const d = stats.upcoming.date instanceof Timestamp ? stats.upcoming.date.toDate() : parseISO(stats.upcoming.date);
                         return format(d, "dd 'de' MMMM", { locale: ptBR });
                      })()}</p>
                      <div className="w-1 h-1 bg-black rounded-full" />
                      <p>{stats.upcoming.time}</p>
                   </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedAppointment(stats.upcoming); setCurrentView('booking'); }} className="flex-1 bg-black text-white font-black uppercase italic py-4 rounded-2xl text-[10px] tracking-widest">REAGENDAR</button>
                      <button onClick={() => handleCancelAppointment(stats.upcoming)} className="px-6 bg-red-600 text-white font-black uppercase italic py-4 rounded-2xl text-[10px] tracking-widest">CANCELAR</button>
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
        {currentView === 'my-cuts' && <MyCutsScreen user={user} appointments={appointments} onBack={() => setCurrentView('home')} onBookAgain={(serviceId, barberId) => { setInitialBookingServiceId(serviceId); setInitialBookingBarberId(barberId); setCurrentView('booking'); }} />}
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
      </AnimatePresence>
    </motion.div>
  );
}
