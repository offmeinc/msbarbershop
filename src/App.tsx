/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BARBERSHOP_ADDRESS, BARBERSHOP_NAME } from "./constants";
import { motion, AnimatePresence } from "motion/react";
import { 
  Scissors,
  Tag,
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Instagram, 
  Clock, 
  ChevronRight,
  Menu,
  X,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
  Bell,
  BellOff,
  CalendarCheck,
  CalendarX,
  Camera,
  Loader2,
  ChevronLeft,
  Filter,
  Grid,
  List as ListIcon,
  Plus,
  Trash2,
  Pencil,
  Save,
  CheckCircle2,
  XCircle,
  Grip,
  Search,
  RefreshCw,
  MoreHorizontal,
  ChevronDown,
  Info,
  ExternalLink,
  Wallet,
  Lock,
  MessageSquare,
  MessageCircle,
  Moon,
  HelpCircle,
  Smartphone,
  TrendingUp,
  DollarSign,
  Download
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, ChangeEvent, FormEvent } from "react";

// Dummy components
const DarkScreen = ({ onBack }: { onBack: () => void }) => <div className="p-4">Dark Screen <button onClick={onBack}>Voltar</button></div>;
const NotificationsScreen = ({ notifications, appointments, onBack, onClear }: { notifications: any[], appointments: any[], onBack: () => void, onClear: () => void }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'history'>('recent');

  const history = useMemo(() => {
    return appointments
      .sort((a,b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [appointments]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-md mx-auto py-8 px-6 min-h-screen pb-32"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Notificações</h2>
        </div>
        {notifications.length > 0 && activeTab === 'recent' && (
          <button 
            onClick={onClear}
            className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-full"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-neutral-900 rounded-2xl mb-6 border border-white/5">
        <button 
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'recent' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
        >
          Recentes ({notifications.filter(n => !n.read).length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-neutral-500 hover:text-white'}`}
        >
          Histórico
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'recent' ? (
          <>
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 rounded-3xl border transition-all ${n.read ? 'bg-neutral-900/30 border-white/5 opacity-60' : 'bg-neutral-900 border-amber-500/30 shadow-lg shadow-amber-500/5'}`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.type === 'booking' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {n.type === 'booking' ? <CalendarCheck className="w-5 h-5" /> : <CalendarX className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${n.type === 'booking' ? 'text-green-500' : 'text-red-500'}`}>
                        {n.type === 'booking' ? 'Novo Agendamento' : 'Cancelamento'}
                      </span>
                      <span className="text-[9px] text-neutral-600 font-bold whitespace-nowrap">
                        {n.timestamp?.toDate ? format(n.timestamp.toDate(), "HH:mm • dd/MM", { locale: ptBR }) : "Agora"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <BellOff className="w-12 h-12 text-neutral-800 mx-auto" />
                <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">Sem notificações no momento.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {history.map((app) => (
              <div key={app.id} className="p-4 rounded-3xl bg-neutral-900/50 border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${app.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-neutral-800 text-neutral-500'}`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{app.clientName}</h4>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-tighter ring-offset-2">
                      {app.serviceName} • {app.time} • {format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), "dd/MM")}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                  app.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                  app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
};
const EarningsScreen = ({ onBack }: { onBack: () => void }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "completed")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const dailyEarnings = useMemo(() => {
    const data: Record<string, number> = {};
    appointments.forEach(app => {
      const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
      const key = format(date, "dd/MM");
      data[key] = (data[key] || 0) + (parseFloat(app.price) || 0);
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const serviceDistribution = useMemo(() => {
    const data: Record<string, number> = {};
    appointments.forEach(app => {
        const key = app.serviceName || "Outros";
        data[key] = (data[key] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  if (loading) return <div className="p-12 text-center text-white">Carregando relatórios...</div>;

  return (
    <div className="max-w-md mx-auto py-8 px-6 space-y-6">
      <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
        {"<"} Voltar
      </button>
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Relatórios de Ganhos</h2>

      <div className="bg-neutral-900 rounded-3xl p-6 border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white">Ganhos Diários</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyEarnings}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-neutral-900 rounded-3xl p-6 border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white">Distribuição de Serviços</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={serviceDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#ef4444'][index % 4]} />
                ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
const MyWeekScreen = ({ user, onBack }: { user: any, onBack: () => void }) => <div className="p-4">My Week Screen <button onClick={onBack}>Voltar</button></div>;
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  format, 
  addMonths, 
  subMonths, 
  subDays,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  parseISO
} from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from "./lib/firebase";
import { uploadImage } from "./lib/uploadService";
import { 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  serverTimestamp,
  addDoc,
  onSnapshot,
  limit,
  orderBy,
  deleteDoc
} from "firebase/firestore";

type Screen = "home" | "booking" | "agenda" | "clients" | "more" | "login" | "collaborators" | "services" | "client-login" | "client-dashboard";

function BrandLogo({ className = "w-10 h-10", iconSize = "w-6 h-6" }: { className?: string, iconSize?: string }) {
  return (
    <div className={`${className} rounded-xl flex items-center justify-center overflow-hidden transition-all`}>
      <img 
        src="/logo.png" 
        alt="MS Logo" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const container = e.currentTarget.parentElement;
          if (container && !container.querySelector('svg')) {
            container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scissors text-black ${iconSize}"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
          }
        }}
      />
    </div>
  );
}

function BlockScreen({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!date) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "blocked_times"), {
        date: Timestamp.fromDate(new Date(date)),
        createdAt: Timestamp.now()
      });
      alert("Período bloqueado!");
      setDate("");
    } catch(e) { console.error(e); alert("Erro ao bloquear."); }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           {"<"} Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6">
            <h2 className="text-xl font-bold text-center text-white">Gerenciamento de Bloqueios</h2>
            <p className="text-neutral-500 text-sm text-center">Defina períodos em que a agenda estará indisponível.</p>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white" />
            <button onClick={handleBlock} disabled={loading} className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold">{loading ? "Bloqueando..." : "Bloquear Horário"}</button>
        </div>
    </div>
  );
}

function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           {"<"} Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
            <h2 className="text-xl font-bold text-white">Central de Ajuda</h2>
            <p className="text-neutral-500">Dúvidas? Entre em contato com nosso suporte.</p>
        </div>
    </div>
  );
}

function ShareScreen({ onBack }: { onBack: () => void }) {
  return (
      <div className="max-w-md mx-auto py-8 px-6">
          <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
             {"<"} Voltar
          </button>
          <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
              <h2 className="text-xl font-bold text-white">Divulgar Horários</h2>
              <p className="text-neutral-500">Compartilhe sua agenda nas redes sociais.</p>
          </div>
      </div>
  );
}

function LinkScreen({ onBack }: { onBack: () => void }) {
    const publicLink = `${window.location.origin}/profile/${auth.currentUser?.uid || 'seu-perfil'}`;
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-md mx-auto py-8 px-6">
            <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
               {"<"} Voltar
            </button>
            <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
                <h2 className="text-xl font-bold text-white">Link Público</h2>
                <p className="text-neutral-500 text-sm">Compartilhe seu perfil profissional:</p>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 break-all font-mono text-amber-500 text-sm">
                    {publicLink}
                </div>
                <button onClick={copyToClipboard} className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                    {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
            </div>
        </div>
    );
}

function ReconScreen({ onBack }: { onBack: () => void }) {
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "completed")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.price) total += parseFloat(data.price);
      });
      setEarnings(total);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           {"<"} Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
            <h2 className="text-xl font-bold text-white">Reconciliação</h2>
            {loading ? <Loader2 className="animate-spin w-8 h-8 text-amber-500 mx-auto" /> : (
                <div className="p-6 bg-black/20 rounded-2xl border border-white/5">
                    <p className="text-neutral-500 text-xs font-bold uppercase">Total Arrecadado (Concluídos)</p>
                    <h3 className="text-4xl font-black text-amber-500 mt-2">R$ {earnings.toFixed(2)}</h3>
                </div>
            )}
        </div>
    </div>
  );
}

function RecurrenceScreen({ onBack }: { onBack: () => void }) {
      return (
          <div className="max-w-md mx-auto py-8 px-6">
              <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
                 {"<"} Voltar
              </button>
              <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
                  <h2 className="text-xl font-bold text-white">Configurações de Recorrência</h2>
                  <p className="text-neutral-500">Gerencie regras de agendamentos recorrentes.</p>
              </div>
          </div>
      );
  }

function ProfessionalHome({ user, role, setCurrentScreen }: { user: any, role: string, setCurrentScreen: (screen: string) => void, key?: string }) {
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
    const confirmedToday = todayApps.filter(a => a.status === 'confirmed');
    const pendingToday = todayApps.filter(a => a.status === 'pending');
    
    const earnings = completedToday.reduce((acc, a) => acc + (a.totalPrice || 0), 0);
    const uniqueClients = new Set(todayApps.map(a => a.clientId)).size;
    
    // Attendance rate
    const totalConsidered = completedToday.length + todayApps.filter(a => a.status === 'cancelled').length;
    const attendanceRate = totalConsidered > 0 ? Math.round((completedToday.length / totalConsidered) * 100) : 100;

    const pendingReconciliation = appointments.filter(a => {
      const d = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
      return d < today && (a.status === 'pending' || a.status === 'confirmed');
    });

    const upcoming = appointments.filter(a => {
      const d = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
      return d >= today && a.status !== 'cancelled' && a.status !== 'completed';
    }).slice(0, 5);

    return {
      earnings,
      appointmentsCount: todayApps.length,
      attendanceRate,
      uniqueClients,
      pendingReconciliationCount: pendingReconciliation.length,
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
      {/* Header */}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Earnings */}
        <div className="bg-neutral-900 p-5 rounded-[2rem] border border-neutral-800 space-y-3 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Ganhos Hoje</p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl font-black text-white tracking-tighter">R$ {stats.earnings.toFixed(2)}</h3>
          </div>
        </div>

        {/* Appointments Count */}
        <div className="bg-neutral-900 p-5 rounded-[2rem] border border-neutral-800 space-y-3 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Atendimentos</p>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/20 transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl font-black text-white tracking-tighter">{stats.appointmentsCount}</h3>
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-neutral-900 p-5 rounded-[2rem] border border-white/5 space-y-3">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Agendamentos</p>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white">{stats.appointmentsCount}</h3>
            <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> hoje
            </p>
          </div>
        </div>

        {/* Attendance */}
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

        {/* Unique Clients */}
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

      {/* Average Time Row */}
      <div className="flex items-center gap-2 text-neutral-500 font-bold text-xs">
        <Clock className="w-4 h-4" /> Tempo médio: <span className="text-white">36 min</span>
      </div>

      {/* Pending Banner */}
      {stats.pendingReconciliationCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:bg-amber-500/20 transition-all" onClick={() => setCurrentScreen("agenda")}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base leading-tight">
                {stats.pendingReconciliationCount} agendamentos pendentes
              </h4>
              <p className="text-[11px] text-neutral-500 uppercase font-black tracking-widest mt-1">Aguardando reconciliação de presença</p>
            </div>
          </div>
          <button className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-1 hover:bg-neutral-200 transition-colors">
            Resolver <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Actions (For Managers/Barbers) */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCurrentScreen("agenda")} className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex items-center gap-3 hover:bg-neutral-800 transition-all">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-white">Agenda</span>
          </button>
          <button onClick={() => setCurrentScreen("clients")} className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex items-center gap-3 hover:bg-neutral-800 transition-all">
            <User className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-white">Clientes</span>
          </button>
          {role === 'manager' && (
            <>
              <button onClick={() => setCurrentScreen("collaborators")} className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex items-center gap-3 hover:bg-neutral-800 transition-all">
                <Scissors className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-white">Equipe</span>
              </button>
              <button onClick={() => setCurrentScreen("services")} className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex items-center gap-3 hover:bg-neutral-800 transition-all">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-white">Serviços</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="space-y-4 pb-12">
        <div className="flex items-center justify-between">
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

function ClientDashboardSimpleScreen({ user, db, onBack }: { user: any, db: any, onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const clientId = user.uid || user.id;
    if (!clientId) return;
    const q = query(collection(db, "appointments"), where("clientId", "==", clientId), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [user, db]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-md mx-auto py-8 px-6 min-h-screen pb-32">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Painel do Cliente</h2>
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-neutral-900/50 p-6 rounded-3xl border border-white/5 mb-6">
        <h3 className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest mb-1">Cashback Disponível</h3>
        <p className="text-3xl font-black text-amber-500">R$ 0,00</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-neutral-400 font-bold uppercase text-[10px] tracking-widest">Meus Cortes</h3>
        {appointments.map(app => (
            <div key={app.id} className="p-4 bg-neutral-900/50 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                     <p className="text-white font-bold">{app.serviceName}</p>
                     <p className="text-neutral-500 text-xs">{new Date(app.date).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-neutral-800 text-neutral-400'}`}>
                    {app.status}
                </span>
            </div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileEditScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [profileData, setProfileData] = useState({
    name: user?.displayName || "",
    photoUrl: user?.photoURL || "",
    whatsapp: "",
    bio: "",
    password: "",
    specialties: [] as string[]
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          name: data.name || data.displayName || user?.displayName || "",
          photoUrl: data.photoUrl || data.photoURL || user?.photoURL || "",
          whatsapp: data.whatsapp || "",
          bio: data.bio || "",
          password: data.password || "",
          specialties: data.specialties || []
        });
      }
      setFetching(false);
    }, (error) => {
      console.error("Error fetching profile:", error);
      setFetching(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update Firebase Auth profile if applicable
      if (user && typeof user.getIdToken === 'function') {
        await updateProfile(user, { 
          displayName: profileData.name,
          photoURL: profileData.photoUrl
        });
      }

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), { 
        name: profileData.name,
        displayName: profileData.name,
        photoUrl: profileData.photoUrl,
        photoURL: profileData.photoUrl,
        whatsapp: profileData.whatsapp,
        bio: profileData.bio,
        password: profileData.password,
        specialties: profileData.specialties,
        updatedAt: Timestamp.now()
      });
      
      alert("Perfil atualizado com sucesso! ✨");
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar perfil.");
    }
    setLoading(false);
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !profileData.specialties.includes(newSpecialty.trim())) {
      setProfileData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-amber-500 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-white italic uppercase">Configurações de Perfil</h2>
        <div className="w-10" />
      </div>

      <form onSubmit={handleUpdate} className="space-y-8 pb-20">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-amber-500 ring-8 ring-amber-500/10 transition-all group-hover:scale-105">
              <img 
                src={profileData.photoUrl || `https://ui-avatars.com/api/?name=${profileData.name}&background=f59e0b&color=000`} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-amber-500 w-8 h-8 rounded-xl flex items-center justify-center text-black shadow-lg">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="w-full">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">URL da Foto</label>
            <input 
              type="text" 
              value={profileData.photoUrl} 
              onChange={(e) => setProfileData(prev => ({ ...prev, photoUrl: e.target.value }))}
              placeholder="https://exemplo.com/foto.jpg"
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Nome Público</label>
            <input 
              type="text" 
              value={profileData.name} 
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all font-bold"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">WhatsApp / Contato</label>
            <input 
              type="text" 
              value={profileData.whatsapp} 
              onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Alterar Senha do Portal</label>
            <input 
              type="text" 
              value={profileData.password} 
              onChange={(e) => setProfileData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
              placeholder="Senha de 4 dígitos ou mais"
            />
            <p className="text-[9px] text-neutral-600 mt-1 uppercase tracking-tight">Esta senha será usada para acessar seu painel pelo e-mail.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Biografia / Sobre você</label>
            <textarea 
              value={profileData.bio} 
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all resize-none"
              placeholder="Conte um pouco sobre sua experiência e estilo..."
            />
          </div>
        </div>

        {/* Specialties */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Especialidades</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newSpecialty} 
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              placeholder="Ex: Degradê, Barba, Pigmentação..."
              className="flex-1 bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
            />
            <button 
              type="button"
              onClick={addSpecialty}
              className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-neutral-200 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {profileData.specialties.map((spec, index) => (
              <div key={index} className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center gap-2 group">
                <span className="text-xs font-bold text-amber-500">{spec}</span>
                <button 
                  type="button" 
                  onClick={() => removeSpecialty(index)}
                  className="text-amber-500/40 hover:text-amber-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {profileData.specialties.length === 0 && (
              <p className="text-neutral-600 text-xs font-bold uppercase italic">Nenhuma especialidade adicionada</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase italic tracking-widest hover:bg-amber-400 transition-all transform active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/20"
        >
          {loading ? "Salvando Alterações..." : "Salvar Perfil Profissional"}
        </button>
      </form>
    </div>
  );
}

function StaffChatScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "internal_chats"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "internal_chats");
    });
    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db, "internal_chats"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      senderName: user.displayName || "Staff",
      senderId: user.uid
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-6 flex flex-col h-[600px]">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-white uppercase text-xs font-bold tracking-widest"><ChevronLeft className="w-4 h-4" /> Voltar</button>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-neutral-900 rounded-3xl mb-4 border border-white/5">
            {messages.map(m => <div key={m.id} className={`p-3 rounded-xl max-w-[80%] ${m.senderId === user.uid ? 'self-end bg-amber-500 text-black' : 'self-start bg-neutral-800 text-white'}`}>
                <p className="text-[10px] opacity-70 mb-1">{m.senderName}</p>
                <p>{m.text}</p>
            </div>)}
        </div>
        <div className="flex gap-2">
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-neutral-900 border border-white/5 rounded-xl p-4 text-white outline-none" placeholder="Digite sua mensagem..."/>
            <button onClick={sendMessage} className="bg-amber-500 p-4 rounded-xl text-black font-bold">Enviar</button>
        </div>
    </div>
  );
}

function ChatScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats", user.uid, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (user) {
        handleFirestoreError(error, OperationType.LIST, `chats/${user.uid}/messages`);
      }
    });
    return unsubscribe;
  }, [user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db, "chats", user.uid, "messages"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      userId: user.uid,
      sender: 'client'
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-6 flex flex-col h-[600px]">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-white uppercase text-xs font-bold tracking-widest"><ChevronLeft className="w-4 h-4" /> Voltar</button>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-neutral-900 rounded-3xl mb-4 border border-white/5">
            {messages.map(m => <div key={m.id} className={`p-3 rounded-xl max-w-[80%] ${m.sender === 'client' ? 'self-end bg-amber-500 text-black' : 'self-start bg-neutral-800 text-white'}`}>{m.text}</div>)}
        </div>
        <div className="flex gap-2">
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-neutral-900 border border-white/5 rounded-xl p-4 text-white outline-none" placeholder="Digite sua mensagem..."/>
            <button onClick={sendMessage} className="bg-amber-500 p-4 rounded-xl text-black font-bold">Enviar</button>
        </div>
    </div>
  );
}

function MoreOptionsScreen({ user, role, onLogout, onBack, staffNotifications, appointments, onClearNotifications, db }: { user: any, role: string, onLogout: () => void, onBack: () => void, key?: any, staffNotifications: any[], appointments: any[], onClearNotifications: () => void, db: any }) {
  const [activeSubScreen, setActiveSubScreen] = useState<
    'main' | 'profile' | 'dashboard' | 'notif' | 'block' | 'help' | 'share' | 'link' | 'earnings' | 'week' | 'recon' | 'recurrence' | 'support' | 'staff-chat' | 'dark' | 'promotions'
  >('main');

  const unreadCount = staffNotifications.filter(n => !n.read).length;

  const sections = [
    {
      title: "Perfil e Conta",
      items: [
        { id: 'profile', label: 'Meu Perfil', icon: <User className="w-5 h-5" />, onClick: () => setActiveSubScreen('profile') },
        { id: 'dashboard', label: 'Painel Cliente', icon: <CreditCard className="w-5 h-5" />, onClick: () => setActiveSubScreen('dashboard') },
        { 
          id: 'notif', 
          label: 'Notificações', 
          icon: <Bell className="w-5 h-5" />, 
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined, 
          onClick: () => setActiveSubScreen('notif') 
        },
        ...(role === 'barber' || role === 'manager' ? [{ id: 'earnings', label: 'Meus Ganhos', icon: <Wallet className="w-5 h-5" />, onClick: () => setActiveSubScreen('earnings') }] : []),
      ]
    },
    {
      title: "Agenda e Gestão",
      items: [
        { id: 'week', label: 'Minha Semana', icon: <Calendar className="w-5 h-5" />, onClick: () => setActiveSubScreen('week') },
        { id: 'block', label: 'Bloqueios', icon: <Lock className="w-5 h-5" />, onClick: () => setActiveSubScreen('block') },
        { id: 'recon', label: 'Reconciliação', icon: <CheckCircle2 className="w-5 h-5" />, onClick: () => setActiveSubScreen('recon') },
        { id: 'recurrence', label: 'Recorrências', icon: <RefreshCw className="w-5 h-5" />, onClick: () => setActiveSubScreen('recurrence') },
        ...(role === 'manager' ? [{ id: 'promotions', label: 'Promoções', icon: <Tag className="w-5 h-5" />, onClick: () => setActiveSubScreen('promotions') }] : []),
        { id: 'share', label: 'Divulgar', icon: <Smartphone className="w-5 h-5" />, onClick: () => setActiveSubScreen('share') },
        { id: 'link', label: 'Link Público', icon: <ExternalLink className="w-5 h-5" />, onClick: () => setActiveSubScreen('link') },
      ]
    },
    {
      title: "Suporte e Outros",
      items: [
        ...(role === 'barber' || role === 'manager' ? [{ id: 'staff-chat', label: 'Chat Equipe', icon: <MessageSquare className="w-5 h-5" />, onClick: () => setActiveSubScreen('staff-chat') }] : []),
        { id: 'support', label: 'Suporte', icon: <MessageCircle className="w-5 h-5" />, onClick: () => setActiveSubScreen('support') },
        { id: 'help', label: 'Ajuda', icon: <HelpCircle className="w-5 h-5" />, onClick: () => setActiveSubScreen('help') },
        { id: 'dark', label: 'Tema Escuro', icon: <Moon className="w-5 h-5" />, onClick: () => setActiveSubScreen('dark') },
      ]
    }
  ];

  if (activeSubScreen === 'block') return <BlockScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'help') return <HelpScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'share') return <ShareScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'link') return <LinkScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'recon') return <ReconScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'recurrence') return <RecurrenceScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'promotions') return <PromotionsManager db={db} />;
  if (activeSubScreen === 'dashboard') return <ClientDashboardSimpleScreen user={user} db={db} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'dark') return <DarkScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'profile') return <ProfileEditScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'notif') return <NotificationsScreen notifications={staffNotifications} appointments={appointments} onClear={onClearNotifications} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'earnings') return <EarningsScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'week') return <MyWeekScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'staff-chat') return <StaffChatScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'support') return <ChatScreen user={user} onBack={() => setActiveSubScreen('main')} />;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-md mx-auto py-8 px-6 min-h-screen pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Mais Opções</h2>
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{section.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              {section.items.map((item) => (
                <button 
                  key={item.id} 
                  onClick={item.onClick}
                  className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex items-center gap-3 hover:bg-neutral-800 transition-all group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-400 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-neutral-900">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4">
          <button 
            onClick={onLogout}
            className="w-full bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-all text-red-500 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Sair da Conta</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}


function ClientsScreen({ onBack }: { onBack: () => void, key?: any }) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "client"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-2xl mx-auto py-8 px-4"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black italic uppercase text-white">Clientes</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            className="bg-neutral-900 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="bg-neutral-900 p-4 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 font-bold overflow-hidden border border-white/10">
                  {client.photoURL ? <img src={client.photoURL} alt={client.name} className="w-full h-full object-cover" /> : client.name?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-white">{client.name}</h4>
                  <p className="text-xs text-neutral-500 uppercase font-medium">{client.whatsapp || client.email}</p>
                </div>
              </div>
              <button className="p-2 text-neutral-500 hover:text-amber-500 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
function BottomNav({ userRole, currentScreen, setCurrentScreen, user, unreadCount }: { userRole: string, currentScreen: string, setCurrentScreen: (s: any) => void, user: any, unreadCount: number }) {
  if (!user) return null;

  const items = [];
  items.push({ id: "home", label: "Início", icon: <Grid className="w-5 h-5" />, screen: "home"} );
    
    if (userRole === "manager" || userRole === "barber") {
      items.push({ id: "agenda", label: "Agenda", icon: <Calendar className="w-5 h-5" />, screen: "agenda"} );
      items.push({ id: "clients", label: "Clientes", icon: <User className="w-5 h-5" />, screen: "clients"} );
    } else {
      items.push({ id: "booking", label: "Agendar", icon: <Plus className="w-5 h-5" />, screen: "booking"} );
      items.push({ id: "agenda", label: "Meus Cortes", icon: <Calendar className="w-5 h-5" />, screen: "agenda"} );
    }
    
    items.push({ 
      id: "more", 
      label: "Mais", 
      icon: (
        <div className="relative">
          <motion.div animate={{ rotate: currentScreen === 'more' ? 90 : 0 }}>
            <Grip className="w-5 h-5" />
          </motion.div>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-black" />
          )}
        </div>
      ), 
      screen: "more"
    });


  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 bg-black/90 backdrop-blur-xl border border-white/10 p-2 flex justify-around items-center z-40 rounded-3xl shadow-xl shadow-amber-500/10">
      {items.map(item => (
        <button 
          key={item.id} 
          onClick={() => setCurrentScreen(currentScreen === item.screen ? "home" : item.screen as any)} 
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${currentScreen === item.screen ? "text-amber-500 bg-white/5" : "text-neutral-500"}`}
        >
            {item.icon}
            <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [clientLoginCode, setClientLoginCode] = useState<string>("");
  const [loggedInClient, setLoggedInClient] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("client");
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [dashboardView, setDashboardView] = useState<"list" | "calendar" | "services" | "hours" | "collaborators">("list");
  const [requestedRole, setRequestedRole] = useState<string>("client");
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staffNotifications, setStaffNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const isSigningUp = useRef(false);

  useEffect(() => {
    if (!['manager', 'barber'].includes(userRole)) return;
    
    const q = query(
      collection(db, "staff_notifications"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffNotifications(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "staff_notifications");
    });
    
    return () => unsubscribe();
  }, [userRole]);

  useEffect(() => {
    if (!user || userRole === 'client') return;
    
    const q = userRole === 'manager' 
      ? query(collection(db, "appointments"), orderBy("date", "desc"), limit(100))
      : query(collection(db, "appointments"), where("barberId", "==", user.uid), orderBy("date", "desc"), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });
    return () => unsubscribe();
  }, [user?.uid, userRole]);

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserRole(docSnap.data().role || "client");
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribeServices = onSnapshot(collection(db, "services"), (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const uniqueServices = Array.from(new Map(servicesData.map((item: any) => [item.name, item])).values());
      setServices(uniqueServices);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "services");
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log("Auth state changed: User logged in", firebaseUser.uid);
        if (isSigningUp.current) {
          setLoading(false);
          return;
        }
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log("Creating initial user document for:", firebaseUser.email);
            const newUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Usuário",
              email: firebaseUser.email,
              role: "client", // Default to client
              createdAt: Timestamp.now(),
            };
            await setDoc(userDocRef, newUser);
            setUserRole("client");
          } else {
            const data = userDoc.data();
            console.log("User document found. Role:", data?.role);
            if (firebaseUser.email === "marley@marley.com" && data?.role !== "manager") {
              await updateDoc(userDocRef, { role: "manager" });
              setUserRole("manager");
            } else {
              setUserRole(data?.role || "client");
            }
          }
        } catch (error) {
          console.error("Error fetching/creating user data", error);
        }
      } else {
        console.log("Auth state changed: User logged out");
        setUserRole("client");
      }
      setLoading(false);
    });
    return () => {
      unsubscribeServices();
      unsubscribeAuth();
    };
  }, []);

  const handleLogin = async (role: string = "client", email?: string, password?: string, isSignUp?: boolean, name?: string, whatsapp?: string) => {
    isSigningUp.current = isSignUp || false;
    setRequestedRole(role);
    console.log("HandleLogin: Attempting to create user with email:", email, "role:", role, "isSignUp:", isSignUp, "name:", name, "whatsapp:", whatsapp);
    
    try {
      if (email && password) {
        if (isSignUp) {
          console.log("HandleLogin: Creating user with email:", email);
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          console.log("HandleLogin: User created with UID:", userCredential.user.uid);
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }
          
          console.log("HandleLogin: Setting user document in Firestore");
          await setDoc(doc(db, "users", userCredential.user.uid), {
             uid: userCredential.user.uid,
             name: name || userCredential.user.displayName || "Usuário",
             email: userCredential.user.email,
             role: role,
             whatsapp: whatsapp,
             createdAt: Timestamp.now(),
           });
          console.log("HandleLogin: User document set successfully");

          setUserRole(role);
        } else {
           await signInWithEmailAndPassword(auth, email, password);
        }
      } else {
        alert("E-mail e senha são obrigatórios.");
      }
      
      setCurrentScreen("home");
    } catch (error: any) {
      console.error("Login failed", error);
      let message = "Erro na autenticação. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      if (error.code === 'auth/wrong-password') message = "Senha incorreta.";
      if (error.code === 'auth/user-not-found') message = "Usuário não encontrado.";
      if (error.code === 'auth/invalid-email') message = "E-mail inválido.";
      if (error.code === 'auth/weak-password') message = "A senha deve ter pelo menos 6 caracteres.";
      alert(message);
    } finally {
      isSigningUp.current = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentScreen("home");
  };

  const handleClientLogin = async (email: string, password: string) => {
    // 1. Verify if user exists with password
    const userQuery = query(collection(db, "users"), where("email", "==", email), where("password", "==", password));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
        alert("E-mail ou senha inválidos.");
        return;
    }
    
    setLoggedInClient({ id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() });
    setCurrentScreen("client-dashboard");
  };

  const handleForgotPassword = async () => {
    const email = prompt("Digite seu e-mail cadastrado:");
    if (!email) return;
    
    // Look up appointments with this email as clientEmail
    const appointmentsQuery = query(collection(db, "appointments"), where("clientEmail", "==", email), orderBy("createdAt", "desc"), limit(1));
    const querySnapshot = await getDocs(appointmentsQuery);

    if (querySnapshot.empty) {
        alert("Nenhum agendamento encontrado para este e-mail.");
        return;
    }

    const doc = querySnapshot.docs[0];
    const code = doc.data().loginCode;

    if (code) {
        alert("Seu código de acesso é: " + code + ". (Simulando envio por WhatsApp/E-mail)");
    } else {
        alert("Código não encontrado para este agendamento.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <BrandLogo className="w-16 h-16" iconSize="w-10 h-10" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30 pb-24 md:pb-0">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setCurrentScreen("home")}
          >
            <BrandLogo className="w-12 h-12 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block text-left">
              <span className="text-xl font-black tracking-tighter uppercase italic block leading-none">
                Marley Souza
              </span>
              <span className="text-[10px] text-amber-500 uppercase tracking-[0.3em] font-bold">BARBEARIA</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest text-neutral-400">
            {currentScreen !== "home" && (
              <button onClick={() => setCurrentScreen("home")} className="hover:text-amber-500 transition-colors">Início</button>
            )}
            {currentScreen === "home" && (
              <>
                <a href="#inicio" className="hover:text-amber-500 transition-colors">Início</a>
                <a href="#servicos" className="hover:text-amber-500 transition-colors">Serviços</a>
                <a href="#unidades" className="hover:text-amber-500 transition-colors">Local</a>
              </>
            )}
            
            {user ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setCurrentScreen("agenda")}
                  className={`hover:text-white transition-colors flex items-center gap-2 ${currentScreen === "agenda" ? "text-amber-500" : ""}`}
                >
                  {userRole === "manager" ? "Agenda" : "Dashboard"}
                </button>
                {userRole === "manager" && (
                  <>
                    <button 
                      onClick={() => setCurrentScreen("collaborators")}
                      className={`hover:text-white transition-colors flex items-center gap-2 ${currentScreen === "collaborators" ? "text-amber-500" : ""}`}
                    >
                      Equipe
                    </button>
                    <button 
                      onClick={() => setCurrentScreen("services")}
                      className={`hover:text-white transition-colors flex items-center gap-2 ${currentScreen === "services" ? "text-amber-500" : ""}`}
                    >
                      Serviços
                    </button>
                  </>
                )}
                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                  <div className="text-right">
                    <p className="text-white text-xs font-bold leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-amber-500 capitalize font-black">{userRole}</p>
                  </div>
                  <div className="relative">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        className="w-10 h-10 rounded-xl border border-amber-500/50 object-cover" 
                        referrerPolicy="no-referrer"
                        alt={user.displayName || "User avatar"}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                  </div>

                  {['manager', 'barber'].includes(userRole) && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2 rounded-lg transition-all relative ${showNotifications ? 'bg-amber-500 text-black' : 'bg-white/5 text-neutral-400 hover:bg-amber-500/20 hover:text-amber-500'}`}
                      >
                        <Bell className="w-4 h-4" />
                        {staffNotifications.filter(n => !n.read).length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
                            {staffNotifications.filter(n => !n.read).length}
                          </span>
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {showNotifications && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-4 w-80 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-4 max-h-[32rem] flex flex-col"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Notificações</h3>
                              <button 
                                onClick={async () => {
                                  const unread = staffNotifications.filter(n => !n.read);
                                  await Promise.all(unread.map(n => updateDoc(doc(db, "staff_notifications", n.id), { read: true })));
                                }}
                                className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider"
                              >
                                Limpar
                              </button>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto pr-1">
                              {staffNotifications.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`p-3 rounded-xl border transition-all cursor-pointer ${n.read ? 'bg-transparent border-white/5 opacity-60' : 'bg-white/5 border-amber-500/30 ring-1 ring-amber-500/10'}`}
                                  onClick={async () => {
                                    if (!n.read) await updateDoc(doc(db, "staff_notifications", n.id), { read: true });
                                  }}
                                >
                                  <div className="flex gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'booking' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                      <p className="text-[11px] text-white leading-relaxed">{n.message}</p>
                                      <p className="text-[9px] text-neutral-500 mt-1 font-bold uppercase tracking-tighter">
                                        {n.timestamp?.toDate ? format(n.timestamp.toDate(), "HH:mm • dd/MM", { locale: ptBR }) : "Agora"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {staffNotifications.length === 0 && (
                                <div className="py-8 text-center">
                                  <Bell className="w-8 h-8 text-neutral-800 mx-auto mb-2" />
                                  <p className="text-[10px] text-neutral-500 uppercase font-black">Sem notificações no momento.</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <button 
                    onClick={() => setCurrentScreen(currentScreen === "more" ? "home" : "more")} 
                    className={`p-2 rounded-lg transition-all ${currentScreen === 'more' ? 'bg-amber-500 text-black' : 'bg-white/5 text-neutral-400 hover:bg-amber-500/20 hover:text-amber-500'}`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setCurrentScreen("login")}
                  className="text-neutral-400 hover:text-white transition-colors uppercase text-sm font-medium tracking-widest"
                >
                  Portal Profissional
                </button>
                <button 
                  onClick={() => setCurrentScreen("client-login")}
                  className="bg-amber-500 text-black px-6 py-2 rounded-full font-bold hover:bg-amber-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  <User className="w-4 h-4" />
                  ACESSAR PORTAL
                </button>
              </>
            )}
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <main className="pt-20">
        <AnimatePresence mode="wait">
          {currentScreen === "home" && (
            (['manager', 'barber'].includes(userRole)) 
            ? <ProfessionalHome key="pro-home" user={user} role={userRole} setCurrentScreen={setCurrentScreen} /> 
            : <HomeScreen key="home" services={services} onStartBooking={() => setCurrentScreen("booking")} />
          )}
          {currentScreen === "login" && <CollaboratorLoginScreen onLogin={handleLogin} setCurrentScreen={setCurrentScreen} setRequestedRole={setRequestedRole} />}
          {currentScreen === "client-login" && <ClientPortalScreen onLogin={handleClientLogin} onForgotPassword={handleForgotPassword} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "client-dashboard" && <ClientDashboardSimpleScreen user={loggedInClient} db={db} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "booking" && <BookingScreen key="booking" user={user} services={services} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "agenda" && <DashboardScreen key="agenda" user={user} role={userRole} services={services} dashboardView={dashboardView || "list"} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "collaborators" && <DashboardScreen key="collaborators" user={user} role={userRole} services={services} dashboardView="collaborators" onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "services" && <DashboardScreen key="services" user={user} role={userRole} services={services} dashboardView="services" onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "promotions" && <PromotionsManager db={db} />}
          {currentScreen === "clients" && <ClientsScreen key="clients" onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "more" && (
            <MoreOptionsScreen 
              key="more" 
              user={user} 
              role={userRole} 
              onLogout={handleLogout} 
              onBack={() => setCurrentScreen("home")}
              staffNotifications={staffNotifications}
              appointments={appointments}
              onClearNotifications={async () => {
                const unread = staffNotifications.filter(n => !n.read);
                await Promise.all(unread.map(n => updateDoc(doc(db, "staff_notifications", n.id), { read: true })));
              }}
              db={db}
            />
          )}
        </AnimatePresence>
      </main>

      <BottomNav 
        userRole={userRole} 
        currentScreen={currentScreen} 
        setCurrentScreen={setCurrentScreen} 
        user={user} 
        unreadCount={staffNotifications.filter(n => !n.read).length}
      />

      <footer className="py-8 text-center border-t border-white/5 text-neutral-600 text-[10px] uppercase tracking-widest font-bold">
        © 2026 MS BARBER SHOP | Developed by Rulio
      </footer>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-6 text-xl font-black uppercase italic"
          >
            <button onClick={() => { setCurrentScreen("home"); setIsMenuOpen(false); }}>Início</button>
            
            {user ? (
              <>
                {userRole === "manager" && (
                  <>
                    <button onClick={() => { setCurrentScreen("agenda"); setIsMenuOpen(false); }}>Painel Gestor</button>
                    <button onClick={() => { setCurrentScreen("collaborators"); setIsMenuOpen(false); }}>Time/Equipe</button>
                    <button onClick={() => { setCurrentScreen("services"); setIsMenuOpen(false); }}>Serviços</button>
                  </>
                )}
                {userRole === "barber" && (
                  <button onClick={() => { setCurrentScreen("agenda"); setIsMenuOpen(false); }}>Minha Agenda</button>
                )}
                {userRole === "client" && (
                  <>
                    <button onClick={() => { setCurrentScreen("booking"); setIsMenuOpen(false); }}>Agendar</button>
                    <button onClick={() => { setCurrentScreen("agenda"); setIsMenuOpen(false); }}>Meus Agendamentos</button>
                  </>
                )}
                <button 
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="text-red-500"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <a href="#servicos" onClick={() => setIsMenuOpen(false)}>Serviços</a>
                <button onClick={() => { setCurrentScreen("login"); setIsMenuOpen(false); }}>Portal Profissional</button>
                <button onClick={() => { setCurrentScreen("client-login"); setIsMenuOpen(false); }}>Painel do Cliente</button>
              </>
            )}
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-24 right-6"><X /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HomeScreen({ services, onStartBooking }: { services: any[], onStartBooking: () => void, key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Hero Section */}
      <section id="inicio" className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=2070" 
            alt="Barbershop"
            className="w-full h-full object-cover opacity-30 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/50" />
        </div>

        <div className="relative z-10 max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-amber-500 font-mono tracking-widest uppercase mb-4 block">MS Barber Shop</span>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
              Sua autoestima <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200">
                em primeiro lugar
              </span>
            </h1>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onStartBooking}
                className="w-full sm:w-auto bg-amber-500 text-black px-10 py-5 rounded-full font-bold text-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                <Calendar className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Agendar Horário
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="servicos" className="py-24 max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-black italic uppercase mb-12">Serviços</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.filter(s => s.active !== false).map((service, i) => (
            <div 
              key={i} 
              className="bg-neutral-900 p-8 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group"
            >
              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                <Scissors />
              </div>
              <h3 className="text-xl font-bold mb-1 uppercase italic">{service.name}</h3>
              <p className="text-neutral-500 text-sm mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {service.duration} min
              </p>
              <p className="text-2xl font-black text-amber-500">R${service.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Opening Hours */}
      <section className="py-24 bg-neutral-900 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-black italic uppercase mb-12">Horários de Funcionamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-neutral-400">
                <div>
                  <h4 className="font-bold text-white uppercase italic">Segunda - Sexta</h4>
                  <p className="text-xl font-black text-amber-500">09:00 - 20:00</p>
                </div>
                <div>
                  <h4 className="font-bold text-white uppercase italic">Sábado</h4>
                  <p className="text-xl font-black text-amber-500">09:00 - 18:00</p>
                </div>
                <div>
                  <h4 className="font-bold text-white uppercase italic">Domingo</h4>
                  <p className="text-xl font-black text-neutral-600">Fechado</p>
                </div>
            </div>
        </div>
      </section>

      {/* Local */}
      <section id="unidades" className="py-24 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6 text-center">
              <h2 className="text-4xl font-black italic uppercase mb-12">Onde estamos</h2>
              <div className="flex items-center justify-center gap-3 text-neutral-400">
                  <MapPin className="w-6 h-6 text-amber-500"/>
                  <p className="text-lg font-bold text-white">{BARBERSHOP_ADDRESS}</p>
              </div>
          </div>
      </section>

      {/* Footer */}
      <section className="py-12 border-t border-white/5 flex flex-col items-center gap-4 bg-neutral-900/50">
      </section>
    </motion.div>
  );
}

function ClientDashboardScreen({ loginCode, onBack }: { loginCode: string, onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [profile, setProfile] = useState<{photoUrl?: string}>({});

  useEffect(() => {
    const docRef = doc(db, "client_profiles", loginCode);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if(docSnap.exists()) {
            setProfile(docSnap.data());
        }
    });
    return () => unsubscribe();
  }, [loginCode]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Upload to ImgBB
    const formData = new FormData();
    formData.append("image", file);
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${(import.meta as any).env.VITE_IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            await setDoc(doc(db, "client_profiles", loginCode), { photoUrl: data.data.url }, { merge: true });
        } else {
            console.error(data);
        }
    } catch(e) {
        console.error(e);
    }
  }

  useEffect(() => {
    const q = query(collection(db, "appointment_requests"), where("loginCode", "==", loginCode));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loginCode]);

  useEffect(() => {
    const q = query(collection(db, "notifications"), where("loginCode", "==", loginCode), orderBy("timestamp", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error(error);
    });
    return () => unsubscribe();
  }, [loginCode]);

  const handleDelete = async (id: string) => {
    if (confirm("Deseja mesmo cancelar este agendamento?")) {
      await deleteDoc(doc(db, "appointments", id));
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  const now = new Date();
  const sortedAppointments = appointments.sort((a,b) => {
    const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
    const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  const upcoming = sortedAppointments.filter(app => {
    const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
    return date >= now;
  });
  
  const history = sortedAppointments.filter(app => {
    const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
    return date < now;
  });

  const displayAppointments = activeTab === 'upcoming' ? upcoming : history;

  return (
    <div className="max-w-xl mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="flex items-center gap-4 bg-neutral-900 p-6 rounded-[2rem] border border-white/5">
        <label className="relative cursor-pointer">
          <input type="file" onChange={handlePhotoUpload} className="hidden" accept="image/*" />
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-amber-500 text-2xl font-black overflow-hidden border-2 border-amber-500/20">
            {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Foto" className="w-full h-full object-cover" />
            ) : (
                loginCode.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-neutral-900 border border-white/10 p-1 rounded-full text-white">
            <Camera className="w-4 h-4" />
          </div>
        </label>
        <div>
          <h2 className="text-white font-black text-xl">{getGreeting()}, Cliente</h2>
          <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-widest">Code: {loginCode}</p>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] space-y-3">
          <h3 className="text-amber-500 font-black uppercase text-[10px] tracking-widest">Notificações</h3>
          {notifications.map(n => (
            <p key={n.id} className="text-white text-sm font-medium leading-relaxed">・{n.message}</p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-neutral-900 rounded-full p-1 border border-white/5">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-3 px-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'upcoming' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}
        >
          Próximos
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-500 text-black' : 'text-neutral-500'}`}
        >
          Histórico
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
          </div>
        ) : displayAppointments.length === 0 ? (
          <div className="p-8 text-center text-neutral-600 font-bold uppercase text-xs border border-dashed border-white/5 rounded-3xl">
            Nenhum agendamento encontrado
          </div>
        ) : displayAppointments.map(app => (
          <div key={app.id} className="bg-neutral-900 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between hover:border-amber-500/30 transition-all group">
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">{app.serviceName || "Serviço"}</h4>
              <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                {app.date instanceof Timestamp ? app.date.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : app.date.toString()}
              </p>
              <div className={`text-[10px] uppercase font-black tracking-widest mt-1 ${app.status === 'confirmed' ? 'text-amber-500' : 'text-neutral-500'}`}>
                {app.status}
              </div>
            </div>
            {activeTab === 'upcoming' && (
                <button onClick={() => handleDelete(app.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-5 h-5"/>
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientPortalScreen({ onLogin, onForgotPassword, onBack }: { onLogin: (email: string, code: string) => void, onForgotPassword: () => void, onBack: () => void }) {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  return (
    <div className="max-w-md mx-auto py-8 px-6 space-y-4">
       <button onClick={onBack} className="text-neutral-500">Voltar</button>
       <h2 className="text-white font-black text-2xl">Portal do Cliente</h2>
       <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu E-mail" className="w-full bg-neutral-900 text-white p-4 rounded-xl border border-white/5 focus:border-amber-500"/>
       <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Senha" className="w-full bg-neutral-900 text-white p-4 rounded-xl border border-white/5 focus:border-amber-500"/>
       <button onClick={() => onLogin(email, code)} className="w-full bg-amber-500 text-black font-black p-4 rounded-xl">Entrar</button>
       <button onClick={onForgotPassword} className="w-full text-neutral-500 text-sm hover:text-amber-500">Esqueceu a senha?</button>
    </div>
  );
}
function CollaboratorLoginScreen({ onLogin, setCurrentScreen, setRequestedRole }: { onLogin: (role: string, email?: string, password?: string, isSignUp?: boolean, name?: string, whatsapp?: string) => void, setCurrentScreen: (screen: string) => void, setRequestedRole: (role: string) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleManagerLogin = async () => {
    setAuthLoading(true);
    setRequestedRole("manager");
    try {
      const email = "marley@marley.com";
      const password = "marley";
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: "Marley Souza" });
            const userDocRef = doc(db, "users", userCredential.user.uid);
            await setDoc(userDocRef, {
                uid: userCredential.user.uid,
                name: "Marley Souza",
                email: email,
                role: 'manager',
                createdAt: Timestamp.now(),
            });
        } else {
            throw err;
        }
      }
      signInWithEmailAndPassword(auth, email, password).then(() => {
        setRequestedRole("manager");
        setCurrentScreen("home");
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao entrar como gestor: " + (error as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && !emailRegex.test(email)) {
      newErrors.email = "Formato de e-mail inválido";
    }

    if (password && password.length < 6) {
      newErrors.password = "Mínimo 6 caracteres";
    }

    setErrors(newErrors);
  };

  useEffect(() => {
    validate();
  }, [email, password, isSignUp]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const finalErrors: any = {};
    if (!email) finalErrors.email = "E-mail obrigatório";
    if (!password) finalErrors.password = "Senha obrigatória";
    
    if (Object.keys(finalErrors).length > 0 || Object.keys(errors).length > 0) {
      setErrors({ ...errors, ...finalErrors });
      return;
    }

    setAuthLoading(true);
    try {
      await onLogin("barber", email, password, isSignUp);
    } catch (error) {
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md mx-auto py-16 px-6 text-center"
    >
      <div className="bg-neutral-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl">
        <h2 className="text-2xl font-black italic uppercase mb-6">Portal do Colaborador</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Seu E-mail" className="w-full bg-black/50 text-white p-4 rounded-xl border border-white/5 focus:border-amber-500"/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full bg-black/50 text-white p-4 rounded-xl border border-white/5 focus:border-amber-500"/>
          <button type="submit" className="w-full bg-amber-500 text-black font-black p-4 rounded-xl">Entrar</button>
        </form>
        <button onClick={handleManagerLogin} className="mt-4 text-xs text-neutral-500 hover:text-white">Acesso do Gestor</button>
      </div>
    </motion.div>
  );
}






function ConfirmationModal({ service, date, onConfirm, email, password, phone }: { service: any, date: string, onConfirm: () => void, email?: string, password?: string, phone: string }) {
  const sendWhatsAppConfirmation = () => {
    const passMsg = password ? `. Sua senha de acesso ao portal é: ${password}` : "";
    const text = `Agendamento confirmado! Serviço: ${service?.name}, Data: ${format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}${passMsg}`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-neutral-900 border border-amber-500/50 p-8 rounded-[2rem] max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black uppercase italic mb-2">Agendado!</h3>
        <p className="text-neutral-400 text-xs uppercase tracking-widest mb-4">Recebemos sua reserva.</p>
        
        <div className="text-left bg-black/30 p-4 rounded-xl mb-4 space-y-2">
            <p className="text-[10px] uppercase text-neutral-500 font-bold">Serviço</p>
            <p className="text-sm font-bold uppercase">{service?.name}</p>
            <p className="text-[10px] uppercase text-neutral-500 font-bold mt-2">Data/Hora</p>
            <p className="text-sm font-bold uppercase">{format(new Date(date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</p>
            
            {email && (
              <>
                <p className="text-[10px] uppercase text-neutral-500 font-bold mt-2">Sua conta (portal do cliente):</p>
                <p className="text-xs font-bold text-white uppercase">{email}</p>
                <p className="text-[10px] uppercase text-neutral-500 font-bold mt-1">Sua senha inicial:</p>
                <p className="text-2xl font-black text-amber-500 uppercase tracking-widest">{password}</p>
                <p className="text-[9px] text-neutral-600 mt-1">Use seu e-mail e esta senha para acessar o painel e gerenciar seu brinde/cashback.</p>
              </>
            )}
        </div>

        <button 
          onClick={sendWhatsAppConfirmation}
          className="w-full bg-green-500 text-white font-black uppercase italic py-4 rounded-xl mb-4 hover:bg-green-400 transition-all shadow-lg"
        >
          WhatsApp
        </button>

        <button 
          onClick={onConfirm}
          className="w-full bg-amber-500 text-black font-black uppercase italic py-4 rounded-xl hover:bg-amber-400 transition-all shadow-lg"
        >
          Fechar
        </button>
      </motion.div>
    </motion.div>
  );
}

function BookingScreen({ user, services, onBack }: { user: any, services: any[], onBack: () => void, key?: string }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [barberAppointments, setBarberAppointments] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [isBooking, setIsBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastLoginCode, setLastLoginCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barberData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(barberData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "blocked_times"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlockedTimes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "blocked_times");
    });
    return () => unsubscribe();
  }, []);

  // Fetch appointments for the selected barber to check availability
  useEffect(() => {
    if (!selectedBarber) return;
    setLoadingSlots(true);
    
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const q = query(
      collection(db, "appointments"),
      where("barberId", "==", selectedBarber),
      where("status", "in", ["pending", "confirmed", "completed"]),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBarberAppointments(snapshot.docs.map(doc => doc.data()));
      setLoadingSlots(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
    });
    return () => unsubscribe();
  }, [selectedBarber, selectedDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    const startHour = 9;
    const endHour = isWeekend && selectedDate.getDay() === 6 ? 18 : (selectedDate.getDay() === 0 ? 0 : 20);

    if (endHour === 0) return []; // Sunday typically closed or different hours

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        // Check if slot is taken
        const isBusy = barberAppointments.some(app => {
          const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
          return format(appDate, "HH:mm") === time;
        }) || blockedTimes.some(b => {
          const bDate = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
          return format(bDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && format(bDate, "HH:mm") === time;
        });

        // Check if user is booking for past time
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);
        const isPast = slotDate < new Date();

        slots.push({ time, available: !isBusy && !isPast });
      }
    }
    return slots;
  }, [selectedDate, barberAppointments]);

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
        setError("Todos os campos são obrigatórios.");
        return;
    }
    if (!user && (!guestName || !guestPhone)) {
        setError("Nome e WhatsApp são obrigatórios para visitantes.");
        return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);

    setError(null);
    setIsBooking(true);
    
    // --- Validation ---
    // Check if time is in past
    if (finalDate < new Date()) {
        setError("Este horário já passou.");
        setIsBooking(false);
        return;
    }

    // Check if time is blocked or already booked
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const isBusy = barberAppointments.some(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return format(appDate, "HH:mm") === timeFormatted && format(appDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
    }) || blockedTimes.some(b => {
      const bDate = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
      return format(bDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && format(bDate, "HH:mm") === timeFormatted;
    });

    if (isBusy) {
        setError("Este horário já não está disponível.");
        setIsBooking(false);
        return;
    }
    // ------------------

    try {
      const service = services.find(s => s.id === selectedService);
      const barber = barbers.find(b => b.id === selectedBarber);
      const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      let effectiveClientId = user ? user.uid : "guest";
      
      // Ensure user is in 'users' collection if logged in
      if (user && user.uid) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
           await setDoc(userDocRef, {
               uid: user.uid,
               name: user.displayName,
               email: user.email,
               role: 'client',
               createdAt: serverTimestamp(),
           });
        }
      } else if (guestEmail) {
        // Find if user already exists
        const qUser = query(collection(db, "users"), where("email", "==", guestEmail));
        const userSnapshot = await getDocs(qUser);
        if (userSnapshot.empty) {
          // Add as new client
          const newDoc = await addDoc(collection(db, "users"), {
            name: guestName,
            email: guestEmail,
            whatsapp: guestPhone,
            role: 'client',
            password: '1234',
            createdAt: serverTimestamp(),
          });
          effectiveClientId = newDoc.id;
        } else {
          effectiveClientId = userSnapshot.docs[0].id;
        }
      }


      const baseData = {
        clientId: effectiveClientId,
        clientName: user ? user.displayName : guestName,
        clientEmail: user ? user.email : guestEmail,
        clientPhone: guestPhone,
        clientPhoto: user ? user.photoURL : null,
        barberId: selectedBarber,
        barberName: barber?.name,
        serviceId: selectedService,
        serviceName: service?.name,
        status: "pending",
        totalPrice: (Number(service?.price) || 0) * (1 - appliedDiscount / 100),
        createdAt: serverTimestamp(),
        couponCode: couponCode || null,
        loginCode
      };
      
      const appointmentsToCreate = [];
      
      if (recurrence === 'none') {
        appointmentsToCreate.push({ ...baseData, date: Timestamp.fromDate(finalDate) });
      } else {
        const num = recurrence === 'monthly' ? 3 : 4;
        const intervalDays = recurrence === 'weekly' ? 7 : recurrence === 'biweekly' ? 14 : 30;
        
        for (let i = 0; i < num; i++) {
           let date = new Date(finalDate);
           if (recurrence === 'monthly') {
               date.setMonth(date.getMonth() + i);
           } else {
               date.setDate(date.getDate() + i * intervalDays);
           }
           appointmentsToCreate.push({ ...baseData, date: Timestamp.fromDate(date) });
        }
      }

      await Promise.all(appointmentsToCreate.map(async (app) => {
        console.log("Attempting to write appointment:", JSON.stringify(app));
        try {
          await addDoc(collection(db, "appointments"), app);
          
          // Staff notification
          await addDoc(collection(db, "staff_notifications"), {
            type: 'booking',
            message: `Novo agendamento: ${app.clientName} reservou ${app.serviceName} para ${format(app.date.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}`,
            timestamp: serverTimestamp(),
            read: false,
            clientId: app.clientId,
            appointmentId: 'new' // Simplified
          });
        } catch (error) {
          console.error("Error writing appointment:", error);
          handleFirestoreError(error, OperationType.WRITE, "appointments");
        }
        /*
        try {
          await addDoc(collection(db, "notifications"), {
            loginCode: app.loginCode,
            message: `Agendamento confirmado para ${app.date.toDate().toLocaleDateString()} - ${app.serviceName}`,
            timestamp: serverTimestamp(),
          });
        } catch (error) {
          console.error("Error writing notification:", error);
          handleFirestoreError(error, OperationType.WRITE, "notifications");
        }
        */
      }));
      
      // Auto send WhatsApp confirmation
      appointmentsToCreate.forEach((app) => {
          const dateFormatted = format(app.date.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
          const text = `Agendamento realizado! Serviço: ${app.serviceName}, Data: ${dateFormatted}. Código: ${loginCode}`;
          const url = `https://wa.me/${app.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
      });
      
      setLastLoginCode(loginCode);
      setShowConfirmation(true);
    } catch (error) {
      console.error("Booking error details:", error);
      setError(error instanceof Error ? error.message : "Ocorreu um erro ao processar seu agendamento.");
    } finally {
      setIsBooking(false);
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return "Escolha o Serviço";
      case 2: return "Escolha o Barbeiro";
      case 3: return "Data e Horário";
      case 4: return "Confirmar Agendamento";
      default: return "Booking";
    }
  };

  return (
    <>
    <AnimatePresence>
      {showConfirmation && (
        <ConfirmationModal 
          service={services.find(s => s.id === selectedService)}
          date={(() => {
            const [h, m] = (selectedTime || "00:00").split(':').map(Number);
            const d = new Date(selectedDate);
            d.setHours(h, m, 0, 0);
            return d.toISOString();
          })()}
          onConfirm={onBack}
          email={user ? user.email : guestEmail}
          password="1234"
          phone={guestPhone}
        />
      )}
    </AnimatePresence>
    
    <div className="min-h-screen bg-black pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto py-8 px-6"
      >
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={step === 1 ? onBack : () => setStep(step - 1)} className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-amber-500 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">{getStepTitle()}</h2>
            <div className="flex justify-center gap-1.5 mt-2">
              {[1,2,3,4].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step >= s ? "w-6 bg-amber-500" : "w-1.5 bg-neutral-800"}`} />
              ))}
            </div>
          </div>
          <div className="w-10" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                  <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em] mb-6">Selecione o procedimento desejado</p>
                  <div className="grid gap-3">
                    {services.filter(s => s.active !== false).map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => { setSelectedService(s.id); setStep(2); }} 
                        className={`group p-6 rounded-[2rem] border text-left transition-all relative overflow-hidden ${selectedService === s.id ? 'border-amber-500 bg-neutral-900 shadow-2xl shadow-amber-500/20' : 'border-white/5 bg-neutral-900/50 hover:border-white/10'}`}
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <div className="space-y-1">
                            <h4 className="font-black text-white text-lg uppercase italic tracking-tight">{s.name}</h4>
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase">
                              <Clock className="w-3.5 h-3.5" />
                              {s.duration} min
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl transition-all ${selectedService === s.id ? 'bg-amber-500 text-black' : 'bg-white/5 text-amber-500 font-black'}`}>
                              <span className="text-sm font-black italic">R${s.price}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
              </motion.div>
          )}

          {step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em] mb-6">Com qual profissional deseja agendar?</p>
                  <div className="grid gap-4">
                      {barbers.map(b => (
                          <button 
                            key={b.id} 
                            onClick={() => { setSelectedBarber(b.id); setStep(3); }} 
                            className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all group ${selectedBarber === b.id ? 'border-amber-500 bg-neutral-900 shadow-2xl shadow-amber-500/20' : 'border-white/5 bg-neutral-900/50 hover:border-white/10'}`}
                          >
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <img 
                                    src={b.photoURL || `https://ui-avatars.com/api/?name=${b.name}&background=f59e0b&color=000`} 
                                    className={`w-16 h-16 rounded-[1.5rem] object-cover border-2 transition-all ${selectedBarber === b.id ? 'border-amber-500' : 'border-white/10'}`} 
                                    alt={b.name}
                                  />
                                  {selectedBarber === b.id && <div className="absolute -top-1 -right-1 bg-amber-500 text-black rounded-full p-1 border-2 border-black"><CheckCircle2 className="w-3 h-3" /></div>}
                                </div>
                                <div className="text-left">
                                  <h4 className="font-black text-white text-lg tracking-tight">{b.name}</h4>
                                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Especialista</p>
                                </div>
                              </div>
                              <ChevronRight className={`w-5 h-5 transition-all ${selectedBarber === b.id ? 'text-amber-500 translate-x-1' : 'text-neutral-700'}`} />
                          </button>
                      ))}
                  </div>
              </motion.div>
          )}

          {step === 3 && (
              <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                  {/* Calendar Selector */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-black italic uppercase tracking-tight">Selecione o dia</h3>
                      <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest leading-none">{format(selectedDate, "MMMM", { locale: ptBR })}</span>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const day = addDays(new Date(), i);
                        const isSunday = day.getDay() === 0;
                        const active = isSameDay(day, selectedDate);
                        
                        return (
                          <button 
                            key={i}
                            disabled={isSunday}
                            onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                            className={`flex flex-col items-center min-w-[64px] py-4 rounded-3xl transition-all border ${active ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" : isSunday ? "opacity-20 border-transparent cursor-not-allowed" : "bg-neutral-900 border-white/5 text-neutral-500 hover:border-white/10"}`}
                          >
                            <span className="text-[10px] font-black uppercase mb-1 tracking-tighter">{format(day, "EEE", { locale: ptBR })}</span>
                            <span className={`text-base font-black ${active ? "text-black" : "text-neutral-200"}`}>{format(day, "d")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-4">
                    <h3 className="text-white font-black italic uppercase tracking-tight">Horários disponíveis</h3>
                    {loadingSlots ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {timeSlots.map(({ time, available }) => (
                          <button 
                            key={time} 
                            disabled={!available}
                            onClick={() => setSelectedTime(time)}
                            className={`py-4 rounded-2xl text-sm font-black transition-all border ${selectedTime === time ? "bg-amber-500 border-amber-500 text-black" : available ? "bg-neutral-900 border-white/5 text-white hover:border-amber-500/50" : "bg-neutral-900/30 border-transparent text-neutral-700 cursor-not-allowed line-through opacity-50"}`}
                          >
                            {time}
                          </button>
                        ))}
                        {timeSlots.length === 0 && (
                          <div className="col-span-3 p-8 text-center text-neutral-600 font-bold uppercase text-xs border border-dashed border-white/10 rounded-3xl">
                            Sem disponibilidade para este dia
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recurrence Selection */}
                  <RecurrenceUI userRole={user ? (user.role || 'client') : 'client'} recurrence={recurrence} setRecurrence={setRecurrence} />

                  <button 
                    disabled={!selectedTime}
                    onClick={() => setStep(4)} 
                    className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase italic tracking-widest hover:bg-neutral-200 transition-all disabled:opacity-30 flex items-center justify-center gap-2 group shadow-xl"
                  >
                    Próximo Passo <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
              </motion.div>
          )}

          {step === 4 && (
              <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                  {!user && (
                      <div className="bg-neutral-900 p-6 rounded-[2rem] border border-white/5 space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-amber-500">Dados do solicitante</h3>
                          <div className="space-y-3">
                             <input placeholder="Seu Nome" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white focus:border-amber-500 transition-all" value={guestName} onChange={e => setGuestName(e.target.value)} />
                             <input placeholder="WhatsApp" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white focus:border-amber-500 transition-all" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                             <input placeholder="E-mail (opcional)" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white focus:border-amber-500 transition-all" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
                          </div>
                      </div>
                  )}

                      <div className="bg-neutral-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6 text-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-5">
                       <Scissors className="w-24 h-24 rotate-12" />
                     </div>
                     
                     <div className="flex gap-2">
                         <input placeholder="Cupom (opcional)" className="flex-1 p-4 bg-black rounded-2xl border border-white/5 text-white" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                         <button onClick={async () => {
                            const q = query(collection(db, "promotions"), where("code", "==", couponCode.toUpperCase()), where("active", "==", true));
                            const snapshot = await getDocs(q);
                            if (!snapshot.empty) {
                                const promo = snapshot.docs[0].data() as any;
                                setAppliedDiscount(promo.discountPercentage);
                            } else {
                                alert("Cupom inválido");
                            }
                         }} className="p-4 bg-neutral-800 rounded-2xl text-white">Aplicar</button>
                     </div>

                     <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Procedimento</span>
                         <span className="font-black text-white italic uppercase">{services.find(s => s.id === selectedService)?.name}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Barbeiro</span>
                         <span className="font-black text-white uppercase">{barbers.find(b => b.id === selectedBarber)?.name}</span>
                     </div>
                     <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Data e Hora</span>
                         <span className="font-black text-amber-500">
                           {selectedDate ? format(selectedDate, "dd MMM", { locale: ptBR }) : '-'} • {selectedTime}
                         </span>
                     </div>
                     <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Recorrência</span>
                         <span className="font-black text-white text-[10px] bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-widest">
                           {recurrence === 'none' ? 'Apenas uma vez' : recurrence === 'weekly' ? 'Semanal' : recurrence === 'biweekly' ? 'Quinzenal' : 'Mensal'}
                         </span>
                     </div>
                     <div className="flex justify-between items-center pt-2">
                         <span className="text-neutral-500 font-black uppercase tracking-widest text-base">Total</span>
                         <span className="text-3xl font-black text-white">R${services.find(s => s.id === selectedService)?.price}</span>
                     </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500">
                      <XCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-xs font-bold leading-tight">{error}</p>
                    </motion.div>
                  )}

                  <button 
                    disabled={isBooking} 
                    onClick={handleConfirmBooking} 
                    className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 active:scale-95 disabled:opacity-50 text-xl"
                  >
                    {isBooking ? (
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        AGENDANDO...
                      </div>
                    ) : 'FINALIZAR AGENDAMENTO'}
                  </button>
              </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </>
  );
}

function ReviewModal({ appointment, onClose }: { appointment: any, onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "reviews"), {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        barberId: appointment.barberId,
        rating,
        comment,
        createdAt: Timestamp.now()
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar avaliação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-4">Avaliar atendimento</h2>
        <div className="flex gap-2 justify-center mb-6">
          {[1,2,3,4,5].map(r => (
            <button key={r} onClick={() => setRating(r)} className={`text-3xl ${r <= rating ? 'text-amber-500' : 'text-neutral-700'}`}>★</button>
          ))}
        </div>
        <textarea 
          placeholder="Deixe um comentário (opcional)..." 
          value={comment} 
          onChange={(e) => setComment(e.target.value)} 
          className="w-full bg-neutral-800 rounded-xl p-4 text-white mb-6"
        />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 text-neutral-500 font-bold">Cancelar</button>
          <button onClick={handleSubmit} className="flex-1 bg-amber-500 text-black py-3 rounded-xl font-bold">Enviar</button>
        </div>
      </div>
    </div>
  );
}

function EarningsDashboard({ appointments, services }: { appointments: any[], services: any[] }) {
  const [filter, setFilter] = useState<'week' | 'month' | 'year'>('month');
  
  const processedData = useMemo(() => {
    const now = new Date();
    let startDate = startOfMonth(now);
    if (filter === 'week') startDate = startOfWeek(now);
    
    return appointments
        .filter(app => (app.status === 'confirmed' || app.status === 'completed') &&
            (app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date)) >= startDate)
        .map(app => ({
            ...app,
            date: app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date),
            price: services.find(s => s.name === app.serviceName)?.price || 0
        }))
        .reduce((acc, curr) => {
            const dateStr = format(curr.date, 'dd/MM');
            acc[dateStr] = (acc[dateStr] || 0) + curr.price;
            return acc;
        }, {} as Record<string, number>);
  }, [appointments, services, filter]);

  const chartData = Object.entries(processedData).map(([date, earnings]) => ({ date, earnings }));

  return (
    <div className="space-y-6">
        <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-500" /> Dashboard de Ganhos
        </h2>
        
        <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === f ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                    {f === 'week' ? 'Semana' : f === 'month' ? 'Mês' : 'Ano'}
                </button>
            ))}
        </div>

        <div className="bg-neutral-900 p-6 rounded-3xl border border-white/5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" fontSize={10} />
                    <YAxis stroke="#666" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                    <Bar dataKey="earnings" fill="#f59e0b" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}

function AppointmentModal({ appointment, onClose, onUpdate }: { appointment: any, onClose: () => void, onUpdate: (app: any, status: string) => void }) {
    if (!appointment) return null;
    const appDate = appointment.date instanceof Timestamp ? appointment.date.toDate() : (typeof appointment.date === 'string' ? parseISO(appointment.date) : appointment.date);
    
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-6">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black text-white">{appointment.clientName}</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-neutral-400 font-bold">
                        <Scissors className="w-5 h-5 text-amber-500" />
                        <span>{appointment.serviceName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-neutral-400 font-bold">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        <span>{format(appDate, "dd/MM/yyyy HH:mm")}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { onUpdate(appointment, 'confirmed'); onClose(); }} className="flex-1 bg-amber-500 text-black font-black py-3 rounded-xl">Confirmar</button>
                    <button onClick={() => { onUpdate(appointment, 'cancelled'); onClose(); }} className="flex-1 bg-red-500/10 text-red-500 font-black py-3 rounded-xl">Cancelar</button>
                </div>
            </div>
        </div>
    );
}

function DashboardScreen
({ user, role, services, dashboardView, onBack }: { user: any, role: string, services: any[], dashboardView?: "list" | "calendar" | "services" | "hours" | "collaborators", onBack: () => void, key?: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"agenda" | "list" | "services" | "hours" | "collaborators" | "earnings">(dashboardView || (role === 'client' ? 'list' : 'agenda'));
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [reviewAppointment, setReviewAppointment] = useState<any>(null);

  const [expandedAppointmentId, setExpandedAppointmentId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleStatusUpdate = async (app: any, newStatus: string) => {
    try {
      await updateDoc(doc(db, "appointments", app.id), { status: newStatus });
      await addDoc(collection(db, "notifications"), {
        loginCode: app.loginCode,
        message: `Seu agendamento foi atualizado para: ${newStatus}`,
        timestamp: serverTimestamp(),
        read: false
      });

      // Staff notification
      await addDoc(collection(db, "staff_notifications"), {
        type: newStatus === 'cancelled' ? 'cancellation' : 'update',
        message: `${newStatus === 'cancelled' ? 'Cancelamento' : 'Atualização'}: ${app.clientName} ${newStatus === 'cancelled' ? 'desmarcou' : 'teve o status alterado para ' + newStatus} (${app.serviceName})`,
        timestamp: serverTimestamp(),
        read: false,
        clientId: app.clientId,
        appointmentId: app.id
      });

      if (newStatus === 'cancelled') {
        setStatusMsg('Agendamento cancelado com sucesso!');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "appointments");
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

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate]);

  const hoursSlots = useMemo(() => {
    return Array.from({ length: 24 }).flatMap((_, i) => [
        `${String(i).padStart(2, '0')}:00`,
        `${String(i).padStart(2, '0')}:30`
    ]).filter(h => {
        const hour = parseInt(h.split(':')[0]);
        return hour >= 8 && hour <= 21;
    });
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
        const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
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
      {/* Revised Header */}
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
           <Scissors className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
           <Lock className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
           <Search className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
           <RefreshCw className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
           <Calendar className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
        </div>
      </div>

      {/* Modern Date Selector */}
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="text-neutral-700 hover:text-amber-500 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
        <div className="flex-1 overflow-x-auto no-scrollbar flex gap-1 justify-between">
            {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i);
                const active = isSameDay(day, currentDate);
                
                // Check if there are appointments on this day
                const hasAppointments = appointments.some(app => {
                  const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                  return isSameDay(appDate, day);
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

      {/* Barber Filter (Avatars) */}
      {(role === 'manager' || role === 'barber') && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 pb-2">
              <button 
                onClick={() => setSelectedBarberId("all")}
                className="flex flex-col items-center gap-2 min-w-[64px]"
              >
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${selectedBarberId === 'all' ? 'border-amber-500' : 'border-white/10 bg-white/5 opacity-50'}`}>
                      <User className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedBarberId === 'all' ? 'text-white' : 'text-neutral-600'}`}>Todos</span>
              </button>
              {barbers.map(barber => {
                  const barberAppsCount = appointments.filter(a => a.barberId === barber.id && isSameDay(a.date instanceof Timestamp ? a.date.toDate() : parseISO(a.date), currentDate)).length;
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

      {/* Summary Row */}
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

      {/* Notice Banner */}
      <div className="bg-amber-500/5 border border-amber-500/10 px-4 py-2 rounded-full inline-flex items-center gap-2 mb-8 group cursor-pointer hover:bg-amber-500/10 transition-all">
        <Lock className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Bloqueios visíveis</span>
        <X className="w-3.5 h-3.5 text-amber-500/40 group-hover:text-amber-500 transition-colors" />
      </div>

      {/* Views */}
      {currentView === 'earnings' && <EarningsDashboard appointments={appointments} services={services} />}
      
      {selectedAppointment && (
        <AppointmentModal 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onUpdate={handleStatusUpdate}
        />
      )}
      
      {/* Agenda Main View */}
      {currentView === 'agenda' ? (
        loading ? (
          <div className="flex justify-center py-20 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-0 relative border-l border-white/5 ml-2 pl-6">
                {filteredAppointments.length === 0 && (
                    <div className="text-center text-neutral-500 py-10 font-bold uppercase text-xs tracking-widest">Nenhum agendamento hoje</div>
                )}
                {hoursSlots.map((hour, idx) => (
                    <div key={hour} className="relative flex gap-4 min-h-[50px] group border-b border-white/5 last:border-none">
                        {/* Hour Label */}
                        <div className="absolute -left-8 -translate-x-1/2 text-[10px] font-bold text-neutral-700 py-1 z-10">
                            {hour}
                        </div>
                        
                        <div className="flex-1 relative">
                            {filteredAppointments.filter(app => {
                                const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                                const timeStr = `${String(appDate.getHours()).padStart(2, '0')}:${String(appDate.getMinutes()).padStart(2, '0')}`;
                                const matchesTime = timeStr === hour;
                                const matchesStatus = filterStatus === 'all' || (filterStatus === 'pending' ? (!app.status || app.status === 'pending') : app.status === filterStatus);
                                return matchesTime && matchesStatus;
                            }).map(app => (
                                <motion.div 
                                  key={app.id} 
                                  initial={{ x: 10, opacity: 0 }}
                                  animate={{ x: 0, opacity: 1 }}
                                  className="absolute inset-x-0 top-0.5 p-2 bg-neutral-900 border border-white/10 rounded-xl z-20 flex items-center gap-2 cursor-pointer hover:bg-neutral-800 transition-all"
                                  onClick={() => setSelectedAppointment(app)}
                                >
                                    <div className="w-1 h-8 rounded-full bg-amber-500" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-black text-white truncate">{app.clientName}</h4>
                                        <p className="text-[9px] text-neutral-500 font-bold uppercase truncate">{app.serviceName}</p>
                                    </div>
                                    <div className="flex-none">
                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-neutral-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* FAB */}
            <button 
                onClick={() => onBack()}
                className="fixed bottom-32 right-8 w-16 h-16 bg-amber-500 text-black rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(245,158,11,0.3)] z-40 active:scale-95 transition-all hover:scale-110 active:rotate-90 group"
            >
                <Plus className="w-8 h-8 group-hover:stroke-[3px] transition-all" />
            </button>
          </>
        )
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
                      
                      {/* Filter Buttons */}
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
                                              <p className="text-[10px] text-amber-500 uppercase font-black mb-1">{format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "PPP", { locale: ptBR })}</p>
                                              <h4 className="font-bold text-lg text-white">{app.serviceName}</h4>
                                          </div>
                                          <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${app.status === 'confirmed' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-neutral-500'}`}>
                                              {app.status || 'Pendente'}
                                          </div>
                                      </div>
                                      <p className="text-sm text-neutral-400 font-medium">{app.clientName} • {app.barberName}</p>
                                      
                                      {expandedAppointmentId === app.id && (
                                        <div className="mt-4 pt-4 border-t border-white/10 text-white text-xs space-y-2 uppercase tracking-wider font-bold">
                                            <div className="flex justify-between"><span>Preço Total</span><span className="text-amber-500">R$ {app.price || '0,00'}</span></div>
                                            <div className="flex justify-between"><span>Pagamento</span><span className="text-neutral-400">{app.paymentStatus || 'Pendente'}</span></div>
                                        </div>
                                      )}

                                      {(role === 'manager' || role === 'barber') && (
                                        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                                            {app.status === 'pending' && <button onClick={() => handleStatusUpdate(app, 'confirmed')} className="bg-green-500/10 text-green-500 text-[10px] font-black uppercase p-2 rounded-lg flex-1">Confirmar</button>}
                                            {app.status === 'confirmed' && <button onClick={() => handleStatusUpdate(app, 'completed')} className="bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase p-2 rounded-lg flex-1">Concluir</button>}
                                            {app.status !== 'cancelled' && app.status !== 'completed' && <button onClick={() => handleStatusUpdate(app, 'cancelled')} className="bg-red-500/10 text-red-500 text-[10px] font-black uppercase p-2 rounded-lg flex-1">Cancelar</button>}
                                            {app.clientPhone && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const dateFormatted = format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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

function CollaboratorsManager() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBarbers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  const handleAddBarber = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        role: 'barber',
        createdAt: Timestamp.now(),
      });
      setName("");
      setEmail("");
      setPassword("");
      alert("Colaborador criado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao criar colaborador.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBarber = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este colaborador da listagem? (Isso não exclui a conta de acesso, apenas remove o perfil)")) return;
    try {
      await updateDoc(doc(db, "users", id), { role: 'inactive_barber' });
      alert("Colaborador removido com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao remover colaborador.");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      <form onSubmit={handleAddBarber} className="bg-neutral-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <User className="w-5 h-5" />
            </div>
            <h4 className="text-xl font-bold text-white">Novo Colaborador</h4>
        </div>
        <div className="space-y-3">
            <input type="text" placeholder="Nome completo" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="email" placeholder="E-mail profissional" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Senha de acesso" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-transform" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : "CADASTRAR COLABORADOR"}
        </button>
      </form>

      <div className="space-y-4 px-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Time de Especialistas</h4>
        <div className="grid grid-cols-1 gap-3">
            {barbers.map(barber => (
              <div key={barber.id} className="bg-neutral-900 p-4 rounded-3xl border border-white/5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 border border-white/5 overflow-hidden">
                    {barber.photoURL ? <img src={barber.photoURL} alt={barber.name} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                  </div>
                  <div>
                      <p className="font-bold text-white leading-none mb-1">{barber.name}</p>
                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-tight">{barber.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteBarber(barber.id)}
                  className="p-2 text-neutral-700 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function WorkingHoursManager() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barbersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(barbersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
    <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Carregando profissionais...</span>
  </div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col gap-2 px-4">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Horários <span className="text-amber-500">Operacionais</span></h3>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Configure a disponibilidade dos profissionais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0">
        {barbers.map(barber => (
          <BarberHoursItem key={barber.id} barber={barber} />
        ))}
      </div>
    </div>
  );
}

function BarberHoursItem({ barber }: { barber: any, key?: any }) {
  const [hours, setHours] = useState<any[]>([]);
  
  useEffect(() => {
    const q = query(collection(db, "workingHours"), where("barberId", "==", barber.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHours(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "workingHours");
    });
    return () => unsubscribe();
  }, [barber.id]);

  const saveHours = async (dayOfWeek: number, startTime: string, endTime: string) => {
    try {
      const existing = hours.find(h => h.dayOfWeek === dayOfWeek);
      if (existing) {
        await updateDoc(doc(db, "workingHours", existing.id), { startTime, endTime });
      } else {
        await addDoc(collection(db, "workingHours"), {
          barberId: barber.id,
          dayOfWeek,
          startTime,
          endTime,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-neutral-900 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
        </div>
        <div>
            <h4 className="font-bold text-white leading-none mb-1">{barber.name}</h4>
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Jornada de Trabalho</p>
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const dayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][day];
          const workingDay = hours.find(h => h.dayOfWeek === day);
          return (
            <div key={day} className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/5 group hover:border-amber-500/20 transition-all">
              <span className="text-xs font-black uppercase text-neutral-500 w-10">{dayName}</span>
              <div className="flex gap-4 items-center">
                <input 
                  type="time" 
                  defaultValue={workingDay?.startTime || "09:00"}
                  onBlur={(e) => saveHours(day, e.target.value, workingDay?.endTime || "18:00")}
                  className="bg-transparent text-sm font-bold text-neutral-300 outline-none focus:text-amber-500 transition-colors"
                />
                <span className="text-neutral-800">|</span>
                <input 
                  type="time" 
                  defaultValue={workingDay?.endTime || "18:00"}
                  onBlur={(e) => saveHours(day, workingDay?.startTime || "09:00", e.target.value)}
                  className="bg-transparent text-sm font-bold text-neutral-300 outline-none focus:text-amber-500 transition-colors"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServicesManagement({ services }: { services: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    duration: 30,
    active: true
  });

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price,
      duration: service.duration,
      active: service.active !== false
    });
    setIsAdding(false);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", price: 0, duration: 30, active: true });
  };

  const importServices = async () => {
    const defaultServices = [
      { name: "Barba completa", duration: 30, price: 30 },
      { name: "Corte Degrade", duration: 30, price: 35 },
      { name: "Corte fast ( 1 pente )", duration: 20, price: 20 },
      { name: "Corte Infantil", duration: 30, price: 35 },
      { name: "Corte social", duration: 30, price: 30 },
      { name: "Corte+ sobrancelha", duration: 30, price: 40 },
      { name: "Corte+barba", duration: 60, price: 60 },
      { name: "Corte+barba+limpeza", duration: 60, price: 80 },
      { name: "Corte+limpeza", duration: 60, price: 60 },
      { name: "Corte+relaxamento", duration: 60, price: 60 },
      { name: "Luzes", duration: 90, price: 120 },
      { name: "Platinado", duration: 90, price: 150 },
      { name: "Sobrancelhas", duration: 10, price: 10 },
    ];
    setLoading(true);
    try {
      await Promise.all(defaultServices.map(service => 
        addDoc(collection(db, "services"), { ...service, active: true, createdAt: Timestamp.now() })
      ));
      alert("Serviços importados!");
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, "services");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "services", editingId), formData);
      } else {
        await addDoc(collection(db, "services"), { ...formData, createdAt: Timestamp.now() });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, editingId ? `services/${editingId}` : 'services');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (service: any) => {
    try {
      await updateDoc(doc(db, "services", service.id), { active: service.active === false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `services/${service.id}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white">Catálogo de <span className="text-amber-500">Serviços</span></h4>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Gerencie os serviços oferecidos</p>
        </div>
        {!isAdding && !editingId && (
          <div className="flex gap-2">
            <button 
              onClick={importServices}
              className="bg-neutral-800 text-white px-6 py-2 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-neutral-700 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Importar Padrão
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-amber-500 text-black px-6 py-2 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Novo Serviço
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-neutral-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-2 tracking-widest">Nome do Serviço</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Corte e Barba"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-2 tracking-widest">Preço (R$)</label>
                  <input 
                    type="number"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-2 tracking-widest">Duração (min)</label>
                  <input 
                    type="number"
                    required
                    placeholder="Ex: 30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col pt-6">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-2xl font-black uppercase text-[10px] transition-all border ${
                      formData.active ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-red-500/10 border-red-500/50 text-red-500"
                    }`}
                  >
                    {formData.active ? <><CheckCircle2 className="w-4 h-4" /> Ativo</> : <><XCircle className="w-4 h-4" /> Inativo</>}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> {editingId ? "Atualizar" : "Confirmar"}</>}
                </button>
                <button 
                  type="button"
                  onClick={resetForm}
                  className="bg-white/5 text-neutral-400 px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {services.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/10 rounded-[3rem]">
            <Scissors className="w-16 h-16 mb-4 text-amber-500" />
            <p className="font-black uppercase tracking-[0.2em] text-[10px] text-neutral-400">Nenhum serviço catalogado</p>
          </div>
        ) : (
          services.map((service) => (
            <div 
              key={service.id} 
              className={`bg-neutral-900 p-8 rounded-[2.5rem] border transition-all relative group shadow-2xl flex flex-col ${
                service.active === false ? "opacity-50 grayscale border-white/5" : "border-white/5 hover:border-amber-500/30"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  service.active === false ? "bg-black text-neutral-600" : "bg-amber-500/10 text-amber-500"
                }`}>
                  <Scissors className="w-7 h-7" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="w-10 h-10 bg-white/5 hover:bg-amber-500 hover:text-black text-neutral-500 rounded-xl transition-all flex items-center justify-center"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => toggleActive(service)}
                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${
                      service.active === false ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                    }`}
                    title={service.active === false ? "Ativar" : "Desativar"}
                  >
                    {service.active === false ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <h5 className="text-xl font-bold text-white mb-1 leading-tight">{service.name}</h5>
              <div className="space-y-1 mb-8 flex-1">
                <p className="text-amber-500 font-black text-3xl">R${service.price}</p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                  <Clock className="w-3.5 h-3.5" /> {service.duration} min
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-auto">
                <div className={`w-2 h-2 rounded-full ${service.active === false ? "bg-red-500" : "bg-amber-500"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  {service.active === false ? "Oculto" : "Disponível"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CalendarWidget({ 
  appointments, 
  mode, 
  onModeChange,
  currentDate, 
  onDateChange, 
  role, 
  updateStatus 
}: { 
  appointments: any[], 
  mode: "day" | "week" | "month", 
  onModeChange?: (mode: "day" | "week" | "month") => void,
  currentDate: Date, 
  onDateChange: (date: Date) => void,
  role: string,
  updateStatus: (id: string, status: string) => void
}) {
  const navigate = (direction: number) => {
    if (mode === "month") onDateChange(addMonths(currentDate, direction));
    else if (mode === "week") onDateChange(addWeeks(currentDate, direction));
    else onDateChange(addDays(currentDate, direction));
  };

  const handleDaySelect = (day: Date) => {
    onDateChange(day);
    if (onModeChange && mode !== 'day') {
      onModeChange('day');
    }
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return isSameDay(appDate, date);
    });
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayAppointments = getAppointmentsForDay(day);
        const isSelected = isSameDay(day, currentDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] p-2 border-r border-b border-white/5 transition-all cursor-pointer hover:bg-white/5 flex flex-col gap-1 ${
              !isCurrentMonth ? "bg-black opacity-20" : "bg-neutral-900"
            } ${isSelected ? "ring-2 ring-inset ring-amber-500 z-10" : ""}`}
            onClick={() => handleDaySelect(cloneDay)}
          >
            <div className={`flex items-center justify-between`}>
              <span className={`text-xs font-bold ${
                isTodayDate ? "w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)]" : 
                isCurrentMonth ? "text-white" : "text-neutral-600"
              }`}>
                {formattedDate}
              </span>
              {dayAppointments.length > 0 && (
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                  {dayAppointments.length}
                </span>
              )}
            </div>
            <div className="space-y-1 mt-1 overflow-hidden">
               {dayAppointments.slice(0, 3).map((app, idx) => (
                 <div key={idx} className="text-[8px] bg-white/5 text-neutral-400 px-1.5 py-0.5 rounded truncate font-medium border border-white/5">
                   {app.clientName?.split(' ')[0] || "Cliente"}
                 </div>
               ))}
               {dayAppointments.length > 3 && (
                 <div className="text-[8px] text-neutral-600 font-bold pl-1 uppercase">+{dayAppointments.length - 3} mais</div>
               )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-neutral-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden mt-4">
        <div className="grid grid-cols-7 bg-black border-b border-white/5">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-neutral-600">
              {d}
            </div>
          ))}
        </div>
        <div>{rows}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const endDate = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-8">
        {days.map((day, idx) => {
          const dayApps = getAppointmentsForDay(day);
          const isTodayDate = isToday(day);
          return (
            <div key={idx} className="flex flex-col gap-3">
               <div className={`p-4 rounded-2xl flex flex-col items-center transition-all ${
                 isTodayDate ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-neutral-900 border border-white/5 text-white"
               }`}>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${isTodayDate ? "text-black/50" : "text-neutral-500"}`}>
                   {format(day, 'eee', { locale: ptBR })}
                 </span>
                 <span className="text-2xl font-black italic">{format(day, 'd')}</span>
               </div>
               <div className="space-y-2">
                 {dayApps.map((app, appIdx) => (
                   <div key={appIdx} className="bg-neutral-900 p-3 rounded-2xl border border-white/5 shadow-lg flex flex-col gap-1 group hover:border-amber-500/30 transition-all">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-amber-500 uppercase">{app.time}</span>
                         <div className={`w-2 h-2 rounded-full ${app.status === 'completed' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      </div>
                      <p className="text-xs font-bold text-white truncate">{app.clientName}</p>
                      <p className="text-[9px] text-neutral-500 uppercase font-black">{app.serviceName}</p>
                   </div>
                 ))}
                 {dayApps.length === 0 && (
                   <div className="py-8 flex flex-col items-center justify-center opacity-10 bg-white/5 rounded-2xl border-2 border-dashed border-white/10">
                     <Clock className="w-4 h-4 mb-1 text-neutral-400" />
                   </div>
                 )}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayApps = getAppointmentsForDay(currentDate);
    const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <div className="bg-neutral-900 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
           <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white leading-none mb-1">{format(currentDate, "eeee, d 'de' MMMM", { locale: ptBR })}</h3>
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{dayApps.length} Agendamentos</p>
                 </div>
              </div>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                 <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-neutral-500 hover:text-amber-500 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                 <button onClick={() => navigate(1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-neutral-500 hover:text-amber-500 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
              </div>
           </div>

           <div className="space-y-2">
              {hours.map(hour => {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const hourApps = dayApps.filter(a => a.time.startsWith(hour.toString().padStart(2, '0')));
                
                return (
                  <div key={hour} className="group flex gap-4 min-h-[50px] border-b border-white/5 last:border-none">
                     <div className="w-12 pt-0.5 text-right">
                        <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-tight">{timeStr}</span>
                     </div>
                     <div className="flex-1 flex flex-col gap-1 pb-2">
                          {hourApps.map((app, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-black border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-amber-500/30 transition-all group/card"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-1 h-8 rounded-full ${
                                  app.status === 'completed' ? 'bg-amber-500' : 
                                  app.status === 'confirmed' ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                                <div>
                                  <p className="text-xs font-black text-white">{app.clientName}</p>
                                  <p className="text-[9px] text-neutral-500 font-bold uppercase">{app.serviceName}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                 {(role === 'manager' || role === 'barber') && app.status === 'pending' && (
                                   <div className="flex gap-1">
                                      <button 
                                        onClick={() => updateStatus(app.id, 'confirmed')}
                                        className="bg-amber-500 text-black p-1.5 rounded-lg hover:bg-amber-400"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                      </button>
                                   </div>
                                 )}
                              </div>
                            </motion.div>
                          ))}
                     </div>
                   </div>
                );
              })}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full pb-20">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 px-4 gap-4">
         <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
               Meu <span className="text-amber-500">Fluxo</span>
            </h2>
            <p className="hidden sm:block text-[10px] text-neutral-500 uppercase tracking-widest font-black pt-1">Calendário de Atendimentos</p>
         </div>
         <div className="flex bg-neutral-900 p-1 rounded-2xl border border-white/5 shadow-xl overflow-x-auto max-w-full">
           {[
             { id: 'day', label: 'Dia' },
             { id: 'week', label: 'Semana' },
             { id: 'month', label: 'Mês' }
           ].map((m) => (
             <button
               key={m.id}
               onClick={() => onModeChange && onModeChange(m.id as any)}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 mode === m.id ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"
               }`}
             >
               {m.label}
             </button>
           ))}
         </div>
      </div>

      <div className="flex items-center justify-center gap-6 mb-8 bg-neutral-900 py-4 rounded-[2rem] border border-white/5 shadow-2xl max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 hover:bg-amber-500 hover:text-black rounded-xl transition-all shadow-sm active:scale-95"><ChevronLeft className="w-5 h-5 text-neutral-500 group-hover:text-black" /></button>
        <div className="text-center min-w-[160px]">
          <h3 className="text-lg font-bold text-white leading-none mb-1">
            {format(currentDate, mode === 'month' ? 'MMMM yyyy' : mode === 'week' ? "MMM d" : "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest">Navegação</p>
        </div>
        <button onClick={() => navigate(1)} className="p-2 bg-white/5 hover:bg-amber-500 hover:text-black rounded-xl transition-all shadow-sm active:scale-95"><ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-black" /></button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {mode === "month" && renderMonthView()}
          {mode === "week" && renderWeekView()}
          {mode === "day" && renderDayView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function RecurrenceUI({ userRole, recurrence, setRecurrence }: { userRole: string, recurrence: any, setRecurrence: any }) {
  if (userRole !== 'barber' && userRole !== 'manager') return null;
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-black uppercase text-neutral-400 tracking-widest">Deseja tornar recorrente?</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(r => (
          <button 
            key={r}
            onClick={() => setRecurrence(r)}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${recurrence === r ? "bg-amber-500 text-black" : "bg-white/5 text-neutral-600 hover:text-white"}`}
          >
            {r === 'none' ? 'Único' : r === 'weekly' ? 'Semanal' : r === 'biweekly' ? 'Quinzenal' : 'Mensal'}
          </button>
        ))}
      </div>
    </div>
  );
}

const PromotionsManager = ({ db }: { db: any }) => {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "promotions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [db]);

  const handleAddPromotion = async () => {
    if (!code || !discount) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "promotions"), {
        code: code.toUpperCase(),
        discountPercentage: Number(discount),
        active: true,
        createdAt: new Date().toISOString()
      });
      setCode("");
      setDiscount("");
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const deletePromotion = async (id: string) => {
    await deleteDoc(doc(db, "promotions", id));
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-black text-white">Promoções</h2>
      <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
        <input placeholder="Código" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white" value={code} onChange={e => setCode(e.target.value)} />
        <input placeholder="Desconto (%)" type="number" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white" value={discount} onChange={e => setDiscount(e.target.value)} />
        <button onClick={handleAddPromotion} disabled={loading} className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase">Adicionar</button>
      </div>
      <div className="space-y-2">
        {promotions.map(p => (
          <div key={p.id} className="flex justify-between items-center p-4 bg-neutral-900/50 rounded-2xl">
            <span className="text-white font-black">{p.code} ({p.discountPercentage}%)</span>
            <button onClick={() => deletePromotion(p.id)} className="text-red-500 text-xs">Excluir</button>
          </div>
        ))}
      </div>
    </div>
  );
};

