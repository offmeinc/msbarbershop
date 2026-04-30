/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  Scissors, 
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
  Bell,
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
  MessageCircle,
  Moon,
  HelpCircle,
  Smartphone
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, ChangeEvent, FormEvent } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
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
  addDoc,
  onSnapshot,
  limit,
  orderBy
} from "firebase/firestore";

type Screen = "home" | "booking" | "agenda" | "clients" | "more" | "login" | "collaborators" | "services";

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

function ProfileEditScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [name, setName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(user, { displayName: name });
      await updateDoc(doc(db, "users", user.uid), { displayName: name });
      alert("Perfil atualizado!");
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar.");
    }
    setLoading(false);
  };
  
  return (
    <div className="max-w-md mx-auto py-8 px-6">
      <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           {"<"} Voltar
        </button>
        <h2 className="text-xl font-bold text-center text-white">Editar Perfil</h2>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nome</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-white"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold hover:bg-amber-400 transition-colors"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MoreOptionsScreen({ user, role, onLogout, onBack }: { user: any, role: string, onLogout: () => void, onBack: () => void, key?: any }) {
  const [activeSubScreen, setActiveSubScreen] = useState<
    'main' | 'profile' | 'notif' | 'block' | 'help' | 'share' | 'link' | 'earnings' | 'week' | 'recon' | 'recurrence' | 'support' | 'dark'
  >('main');

  const menuItems = [
    { id: 'notif', label: 'Notificações', icon: <Bell className="w-6 h-6" />, badge: '99+', onClick: () => setActiveSubScreen('notif') },
    { id: 'block', label: 'Bloqueios', icon: <Lock className="w-6 h-6" />, onClick: () => setActiveSubScreen('block') },
    { id: 'help', label: 'Central de Ajuda', icon: <HelpCircle className="w-6 h-6" />, onClick: () => setActiveSubScreen('help') },
    { id: 'share', label: 'Divulgar Horários', icon: <Smartphone className="w-6 h-6" />, onClick: () => setActiveSubScreen('share') },
    { id: 'link', label: 'Link Público', icon: <ExternalLink className="w-6 h-6" />, onClick: () => setActiveSubScreen('link') },
    { id: 'profile', label: 'Meu Perfil', icon: <User className="w-6 h-6" />, onClick: () => setActiveSubScreen('profile') },
    { id: 'earnings', label: 'Meus Ganhos', icon: <Wallet className="w-6 h-6" />, onClick: () => setActiveSubScreen('earnings') },
    { id: 'week', label: 'Minha Semana', icon: <Calendar className="w-5 h-5" />, onClick: () => setActiveSubScreen('week') },
    { id: 'recon', label: 'Reconciliação', icon: <CheckCircle2 className="w-6 h-6" />, onClick: () => setActiveSubScreen('recon') },
    { id: 'recurrence', label: 'Recorrências', icon: <RefreshCw className="w-6 h-6" />, onClick: () => setActiveSubScreen('recurrence') },
    { id: 'support', label: 'Suporte', icon: <MessageCircle className="w-6 h-6" />, onClick: () => setActiveSubScreen('support') },
    { id: 'dark', label: 'Escuro', icon: <Moon className="w-6 h-6" />, onClick: () => setActiveSubScreen('dark') },
  ];

  if (activeSubScreen === 'profile') {
    return <ProfileEditScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  }

  if (activeSubScreen !== 'main') {
    return (
      <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={() => setActiveSubScreen('main')} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           {"<"} Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-center text-white capitalize">{activeSubScreen}</h2>
          <p className="text-neutral-500 text-center">Tela de {activeSubScreen} em desenvolvimento.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-md mx-auto py-8 px-6"
    >
      <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5">
        <h2 className="text-xl font-bold text-center mb-8 text-white">Mais opções</h2>
        <div className="grid grid-cols-3 gap-y-8 gap-x-4">
          {menuItems.map((item) => (
            <button key={item.id} onClick={item.onClick} className="flex flex-col items-center gap-2 group">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center relative group-active:scale-95 transition-transform text-neutral-400 border border-white/5">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-neutral-900">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-neutral-400 leading-tight text-center px-1">
                {item.label}
              </span>
            </button>
          ))}
          <button 
            onClick={onLogout}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center group-active:scale-95 transition-transform text-red-500 border border-red-500/20">
              <LogOut className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-medium text-red-500 leading-tight text-center">
              Sair
            </span>
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
function BottomNav({ userRole, currentScreen, setCurrentScreen, user }: { userRole: string, currentScreen: string, setCurrentScreen: (s: any) => void, user: any }) {
  if (!user) return null;

  const items = [];
  items.push({ id: "home", label: "Início", icon: <Grid className="w-5 h-5" />, screen: "home"} );
    
    if (userRole === "manager" || userRole === "barber") {
      items.push({ id: "agenda", label: "Agenda", icon: <Calendar className="w-5 h-5" />, screen: "agenda"} );
      if (userRole === "manager") {
        items.push({ id: "collaborators", label: "Time", icon: <Scissors className="w-5 h-5" />, screen: "collaborators"} );
      }
      items.push({ id: "clients", label: "Clientes", icon: <User className="w-5 h-5" />, screen: "clients"} );
    } else {
      items.push({ id: "booking", label: "Agendar", icon: <Plus className="w-5 h-5" />, screen: "booking"} );
      items.push({ id: "agenda", label: "Meus Cortes", icon: <Calendar className="w-5 h-5" />, screen: "agenda"} );
    }
    
    items.push({ id: "more", label: "Mais", icon: <motion.div animate={{ rotate: currentScreen === 'more' ? 90 : 0 }}><Grip className="w-5 h-5" /></motion.div>, screen: "more"} );


  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 bg-black/90 backdrop-blur-xl border border-white/10 p-2 flex justify-around items-center z-40 rounded-3xl shadow-xl shadow-amber-500/10">
      {items.map(item => (
        <button 
          key={item.id} 
          onClick={() => setCurrentScreen(item.screen as any)} 
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
  const [userRole, setUserRole] = useState<string>("client");
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [dashboardView, setDashboardView] = useState<"list" | "calendar" | "services" | "hours" | "collaborators">("list");
  const [requestedRole, setRequestedRole] = useState<string>("client");
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeServices = onSnapshot(collection(db, "services"), (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(servicesData);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log("Auth state changed: User logged in", firebaseUser.uid);
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
    setRequestedRole(role);
    
    try {
      if (email && password) {
        if (isSignUp) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }
          
          await setDoc(doc(db, "users", userCredential.user.uid), {
             uid: userCredential.user.uid,
             name: name || userCredential.user.displayName || "Usuário",
             email: userCredential.user.email,
             role: role,
             whatsapp: whatsapp,
             createdAt: Timestamp.now(),
           });

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
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentScreen("home");
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
              <span className="text-[10px] text-amber-500 uppercase tracking-[0.3em] font-bold">Barber Shop</span>
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
                  <button onClick={() => setCurrentScreen("more")} className="p-2 bg-white/5 hover:bg-amber-500/20 hover:text-amber-500 rounded-lg transition-all">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setCurrentScreen("login")}
                className="bg-amber-500 text-black px-6 py-2 rounded-full font-bold hover:bg-amber-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                <User className="w-4 h-4" />
                ACESSAR PORTAL
              </button>
            )}
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <main className="pt-20">
        <AnimatePresence mode="wait">
          {currentScreen === "home" && <HomeScreen key="home" services={services} onStartBooking={() => user ? setCurrentScreen("booking") : setCurrentScreen("login")} />}
          {currentScreen === "login" && <LoginScreen key="login" onLogin={handleLogin} setUserRole={setUserRole} setCurrentScreen={setCurrentScreen} setRequestedRole={setRequestedRole} />}
          {currentScreen === "booking" && <BookingScreen key="booking" user={user} services={services} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "agenda" && <DashboardScreen key="agenda" user={user} role={userRole} services={services} dashboardView={dashboardView || "list"} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "collaborators" && <DashboardScreen key="collaborators" user={user} role={userRole} services={services} dashboardView="collaborators" onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "services" && <DashboardScreen key="services" user={user} role={userRole} services={services} dashboardView="services" onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "clients" && <ClientsScreen key="clients" onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "more" && <MoreOptionsScreen key="more" user={user} role={userRole} onLogout={handleLogout} onBack={() => setCurrentScreen("home")} />}
        </AnimatePresence>
      </main>

      <BottomNav userRole={userRole} currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} user={user} />

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
                <button onClick={() => { setCurrentScreen("login"); setIsMenuOpen(false); }}>Portal</button>
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
            <span className="text-amber-500 font-mono tracking-widest uppercase mb-4 block">Marley Souza Barber Shop</span>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] mb-8">
              A Arte do Corte <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200">
                Impecável
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

      {/* Footer / Login Link */}
      <section className="py-12 border-t border-white/5 flex flex-col items-center gap-4 bg-neutral-900/50">
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">© 2024 Marley Souza Barber Shop</p>
        <button 
          onClick={() => onStartBooking()} 
          className="text-amber-500 text-xs font-black uppercase tracking-widest hover:underline"
        >
          Acessar Portal do Cliente
        </button>
      </section>
    </motion.div>
  );
}

function LoginScreen({ onLogin, setUserRole, setCurrentScreen, setRequestedRole }: { onLogin: (role: string, email?: string, password?: string, isSignUp?: boolean, name?: string, whatsapp?: string) => void, setUserRole: (role: string) => void, setCurrentScreen: (screen: string) => void, setRequestedRole: (role: string) => void, key?: string }) {
  const [activeTab, setActiveTab] = useState<string>("client");
  const [authMode, setAuthMode] = useState<"choice" | "email">("choice");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const roles = [
    { id: "client", label: "Cliente", icon: <User className="w-4 h-4" />, desc: "Agende seus cortes e acumule pontos." },
    { id: "barber", label: "Colaborador", icon: <Scissors className="w-4 h-4" />, desc: "Veja sua agenda e gerencie atendimentos." },
  ];

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
            // Try sign up
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: "Gestor Marley" });
            const userDocRef = doc(db, "users", userCredential.user.uid);
            await setDoc(userDocRef, {
                uid: userCredential.user.uid,
                name: "Gestor Marley",
                email: email,
                role: 'manager',
                createdAt: Timestamp.now(),
            });
        } else {
            throw err;
        }
      }
      // Re-sign in after creation or if it existed
      await signInWithEmailAndPassword(auth, email, password);
      setUserRole("manager");
      setCurrentScreen("dashboard");
    } catch (error) {
      console.error(error);
      alert("Erro ao entrar como gestor: " + (error as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
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
    if (authMode === "email") {
      validate();
    }
  }, [email, password, name, isSignUp, authMode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Final check before submission
    const finalErrors: any = {};
    if (!email) finalErrors.email = "E-mail obrigatório";
    if (!password) finalErrors.password = "Senha obrigatória";
    if (isSignUp && !name) finalErrors.name = "Nome obrigatório";
    
    if (Object.keys(finalErrors).length > 0 || Object.keys(errors).length > 0) {
      setErrors({ ...errors, ...finalErrors });
      return;
    }

    setAuthLoading(true);
    try {
      await onLogin(activeTab, email, password, isSignUp, name, whatsapp);
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
      className="max-w-2xl mx-auto py-16 px-6 text-center"
    >
      <div className="bg-neutral-900 p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="w-24 h-24 bg-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
          <BrandLogo className="w-full h-full" iconSize="w-12 h-12" />
        </div>
        
        <h2 className="text-3xl font-black italic uppercase mb-2">Portal MS Barber</h2>
        <p className="text-neutral-500 text-sm mb-10 uppercase tracking-widest font-bold">
          {authMode === "choice" ? "Selecione seu perfil de acesso" : isSignUp ? "Criar nova conta" : "Entrar na sua conta"}
        </p>
        
        {authMode === "choice" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setActiveTab(role.id)}
                  className={`p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                    activeTab === role.id 
                    ? "border-amber-500 bg-amber-500/5" 
                    : "border-white/5 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors ${
                    activeTab === role.id ? "bg-amber-500 text-black" : "bg-white/5 text-neutral-500"
                  }`}>
                    {role.icon}
                  </div>
                  <p className={`font-bold uppercase text-xs mb-1 ${activeTab === role.id ? "text-amber-500" : "text-neutral-300"}`}>
                    {role.label}
                  </p>
                  <p className="text-[10px] text-neutral-500 leading-tight uppercase font-medium">
                    {role.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleManagerLogin}
                className="w-full bg-neutral-900 border border-amber-500 text-amber-500 font-bold uppercase italic py-4 rounded-2xl hover:bg-neutral-800 transition-all text-xs"
              >
                Entrar como Gestor
              </button>
              
              <button 
                onClick={() => setAuthMode("email")}
                className="w-full bg-neutral-800 text-white font-black uppercase italic py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-700 transition-all"
              >
                <Calendar className="w-5 h-5" />
                Entrar com E-mail
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left max-w-sm mx-auto">
            {isSignUp && (
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-1 block tracking-widest">Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Seu nome"
                  className={`w-full bg-black border p-4 rounded-xl text-white outline-none transition-all ${errors.name ? "border-red-500" : "border-white/10 focus:border-amber-500"}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-1 block tracking-widest mt-4">WhatsApp</label>
                <input 
                  type="text" 
                  placeholder="(00) 00000-0000"
                  className="w-full bg-black border p-4 rounded-xl text-white outline-none transition-all border-white/10 focus:border-amber-500"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                <AnimatePresence>
                  {errors.name && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-4 overflow-hidden"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-1 block tracking-widest">E-mail</label>
              <input 
                type="email" 
                placeholder="seu@email.com"
                className={`w-full bg-black border p-4 rounded-xl text-white outline-none transition-all ${errors.email ? "border-red-500" : "border-white/10 focus:border-amber-500"}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-4 overflow-hidden"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-1 block tracking-widest">Senha</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className={`w-full bg-black border p-4 rounded-xl text-white outline-none transition-all ${errors.password ? "border-red-500" : "border-white/10 focus:border-amber-500"}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <AnimatePresence>
                {errors.password && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-4 overflow-hidden"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              type="submit"
              disabled={authLoading}
              className="w-full bg-amber-500 text-black font-black uppercase italic py-5 rounded-2xl flex items-center justify-center gap-3 transition-all mt-6 shadow-xl disabled:opacity-50"
            >
              {authLoading ? <Loader2 className="animate-spin w-5 h-5" /> : isSignUp ? "Criar Minha Conta" : "Entrar no Portal"}
            </button>

            <div className="flex flex-col gap-4 mt-8">
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="text-xs font-bold text-amber-500 uppercase tracking-widest hover:text-amber-400"
              >
                {isSignUp ? "Já tenho uma conta" : "Não tenho uma conta"}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setAuthMode("choice");
                  setErrors({});
                }}
                className="text-xs font-bold text-neutral-500 uppercase tracking-widest hover:text-white flex items-center justify-center gap-2"
              >
                <ChevronRight className="rotate-180 w-4 h-4" /> Voltar
              </button>
            </div>
          </form>
        )}
        
        <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] mt-12 font-bold leading-relaxed">
          Os acessos de Gestor e Colaborador <br /> exigem aprovação administrativa.
        </p>
      </div>
    </motion.div>
  );
}


function ConfirmationModal({ service, date, onConfirm }: { service: any, date: string, onConfirm: () => void }) {
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
        <p className="text-neutral-400 text-xs uppercase tracking-widest mb-8">Recebemos sua reserva.</p>
        
        <div className="text-left bg-black/30 p-4 rounded-xl mb-8 space-y-2">
            <p className="text-[10px] uppercase text-neutral-500 font-bold">Serviço</p>
            <p className="text-sm font-bold uppercase">{service?.name}</p>
            <p className="text-[10px] uppercase text-neutral-500 font-bold mt-2">Data/Hora</p>
            <p className="text-sm font-bold uppercase">{format(new Date(date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</p>
        </div>

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
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [bookingDate, setBookingDate] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "barber"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barberData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(barberData);
    });
    return () => unsubscribe();
  }, []);

  const handleConfirmBooking = async () => {
    setError(null);
    if (!selectedService) {
      setError("Selecione um serviço para continuar.");
      return;
    }
    if (!selectedBarber) {
      setError("Selecione um colaborador para continuar.");
      return;
    }
    if (!bookingDate) {
      setError("Selecione uma data e horário.");
      return;
    }
    if (!user) {
      setError("Você precisa estar logado para agendar.");
      return;
    }
    
    const bookingDateTime = new Date(bookingDate);
    if (bookingDateTime < new Date()) {
      setError("A data e hora devem ser no futuro.");
      return;
    }

    setIsBooking(true);
    try {
      const service = services.find(s => s.id === selectedService);
      const barber = barbers.find(b => b.id === selectedBarber);
      const appointmentData = {
        clientId: user.uid,
        clientName: user.displayName,
        clientPhoto: user.photoURL,
        barberId: selectedBarber,
        barberName: barber?.name,
        serviceId: selectedService,
        serviceName: service?.name,
        date: Timestamp.fromDate(bookingDateTime),
        status: "pending",
        totalPrice: service?.price,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, "appointments"), appointmentData);
      setShowConfirmation(true);
    } catch (error) {
      console.error(error);
      setError("Ocorreu um erro ao processar seu agendamento.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {showConfirmation && (
        <ConfirmationModal 
          service={services.find(s => s.id === selectedService)}
          date={bookingDate}
          onConfirm={onBack}
        />
      )}
    </AnimatePresence>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6"
    >

      <div className="flex items-center justify-between mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">Novo <span className="text-amber-500">Agendamento</span></h2>
        <button onClick={onBack} className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 uppercase text-xs font-bold tracking-widest">
          <ChevronRight className="rotate-180 w-4 h-4" /> Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 overflow-y-auto max-h-[80vh] md:max-h-none no-scrollbar pb-32">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 md:mb-8 text-neutral-400">1. Escolha o Serviço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {services.filter(s => s.active !== false).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s.id);
                    setError(null);
                  }}
                  className={`p-5 md:p-6 rounded-2xl border text-left transition-all ${
                    selectedService === s.id ? "border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-white/5 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <p className={`font-black uppercase italic text-sm mb-1 ${selectedService === s.id ? "text-white" : "text-neutral-500"}`}>{s.name}</p>
                  <p className="text-amber-500 font-black italic">R${s.price}</p>
                  <p className="text-[10px] text-neutral-500 uppercase mt-2">{s.duration} min</p>
                </button>
              ))}
            </div>

            {selectedService && (
              <div className="pt-6 border-t border-white/5">
                <p className="text-xs font-bold text-neutral-500 uppercase mb-4">Barbeiros disponíveis:</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {barbers.map((b) => (
                    <div key={b.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                        <img 
                          src={b.photoURL || "https://ui-avatars.com/api/?name=" + b.name} 
                          alt={b.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 text-center truncate w-full">{b.name.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`bg-neutral-900 border border-white/5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] shadow-2xl transition-all ${!selectedService ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 md:mb-8 text-neutral-400">2. Escolha o Colaborador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBarber(b.id);
                    setError(null);
                  }}
                  className={`p-5 md:p-6 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                    selectedBarber === b.id ? "border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-white/5 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                    <img 
                      src={b.photoURL || "https://ui-avatars.com/api/?name=" + b.name} 
                      alt={b.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className={`font-black uppercase italic text-sm ${selectedBarber === b.id ? "text-white" : "text-neutral-500"}`}>{b.name}</p>
                    <p className="text-[10px] text-neutral-500 uppercase mt-1">Colaborador</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`bg-neutral-900 border border-white/5 p-5 md:p-8 rounded-2xl md:rounded-[2rem] shadow-2xl transition-all ${!selectedBarber ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 md:mb-8 text-neutral-400">3. Data e Horário</h3>
            <input 
              type="datetime-local" 
              className={`w-full bg-black border p-4 md:p-5 rounded-2xl text-white outline-none transition-all cursor-pointer font-bold ${error && !bookingDate ? "border-red-500" : "border-white/10 focus:border-amber-500"}`}
              value={bookingDate}
              onChange={(e) => {
                setBookingDate(e.target.value);
                setError(null);
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-500 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] text-black shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:rotate-45 transition-transform">
              <Scissors className="w-20 h-20" />
            </div>
            <h4 className="font-black uppercase italic mb-6 text-xl tracking-tighter relative z-10">Resumo</h4>
            <div className="space-y-4 text-[10px] font-black uppercase tracking-widest relative z-10">
              <div className="flex justify-between border-b border-black/10 pb-2">
                <span className="opacity-60">Cliente</span>
                <span>{user?.displayName?.split(' ')[0]}</span>
              </div>
              <div className="flex justify-between border-b border-black/10 pb-2">
                <span className="opacity-60">Serviço</span>
                <span className="truncate ml-4">{selectedService ? services.find(s => s.id === selectedService)?.name : "---"}</span>
              </div>
              <div className="flex justify-between pt-6 text-3xl font-black italic tracking-tighter">
                <span>Total</span>
                <span>R${selectedService ? services.find(s => s.id === selectedService)?.price : "0"}</span>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-4 bg-black/20 rounded-xl text-black text-[10px] font-black uppercase text-center overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              disabled={isBooking}
              onClick={handleConfirmBooking}
              className="w-full bg-black text-white font-black uppercase italic py-5 rounded-2xl mt-8 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-30"
            >
              {isBooking ? <Loader2 className="animate-spin w-5 h-5" /> : <><CreditCard className="w-5 h-5" /> Confirmar Reserva</>}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}

function DashboardScreen({ user, role, services, dashboardView, onBack }: { user: any, role: string, services: any[], dashboardView?: "list" | "calendar" | "services" | "hours" | "collaborators", onBack: () => void, key?: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<"agenda" | "list" | "services" | "hours" | "collaborators">(role === 'client' ? 'list' : 'agenda');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dashboardView === 'calendar') setCurrentView('agenda');
    else if (dashboardView === 'list') setCurrentView('list');
    else if (dashboardView === 'services') setCurrentView('services');
    else if (dashboardView === 'hours') setCurrentView('hours');
    else if (dashboardView === 'collaborators') setCurrentView('collaborators');
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
    });

    const qBarbers = query(collection(db, "users"), where("role", "==", "barber"));
    const unsubscribeBarbers = onSnapshot(qBarbers, (sn) => {
        setBarbers(sn.docs.map(d => ({ id: d.id, ...d.data() })));
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
    <div className="min-h-screen bg-black px-4 md:px-6 pt-16 md:pt-6 relative pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <h1 className="text-2xl font-black text-white capitalize">{format(currentDate, "MMMM", { locale: ptBR })}</h1>
           <span className="text-neutral-600 font-medium">{format(currentDate, "yyyy")}</span>
           <ChevronDown className="w-4 h-4 text-neutral-600" />
        </div>
        <div className="flex items-center gap-4 text-neutral-500">
           <Search className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
           <RefreshCw className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
           <Calendar className="w-5 h-5 cursor-pointer hover:text-amber-500 transition-colors" />
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setCurrentDate(addDays(currentDate, -7))}><ChevronLeft className="w-5 h-5 text-neutral-700" /></button>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {weekDays.map((day, i) => {
                const active = isSameDay(day, currentDate);
                const isTodayDate = isToday(day);
                return (
                    <button 
                        key={i} 
                        onClick={() => setCurrentDate(day)}
                        className={`flex flex-col items-center min-w-[50px] p-2 rounded-2xl transition-all ${active ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-neutral-500"}`}
                    >
                        <span className="text-[10px] font-bold uppercase mb-1">{format(day, "EEE", { locale: ptBR })}</span>
                        <span className={`text-sm font-black ${active ? "text-black" : "text-neutral-300"}`}>{format(day, "d")}</span>
                        {isTodayDate && !active && <div className="w-1 h-1 bg-amber-500 rounded-full mt-1" />}
                        {active && <div className="w-1 h-1 bg-black rounded-full mt-1" />}
                    </button>
                );
            })}
        </div>
        <button onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight className="w-5 h-5 text-neutral-700" /></button>
      </div>

      {/* Barber Filter */}
      {(role === 'manager' || role === 'barber') && (
          <div className="flex gap-4 overflow-x-auto no-scrollbar mb-8 pb-2">
              <button 
                onClick={() => setSelectedBarberId("all")}
                className="flex flex-col items-center gap-2 min-w-[64px]"
              >
                  <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${selectedBarberId === 'all' ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}>
                      <Grip className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${selectedBarberId === 'all' ? 'text-amber-500' : 'text-neutral-500'}`}>Todos</span>
              </button>
              {barbers.map(barber => (
                  <button 
                    key={barber.id}
                    onClick={() => setSelectedBarberId(barber.id)}
                    className="flex flex-col items-center gap-2 min-w-[64px]"
                  >
                      <div className={`w-14 h-14 rounded-full border-2 overflow-hidden transition-all relative ${selectedBarberId === barber.id ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-white/10 opacity-40'}`}>
                          <img src={barber.photoURL || `https://ui-avatars.com/api/?name=${barber.name}`} alt={barber.name} className="w-full h-full object-cover" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase truncate w-14 text-center ${selectedBarberId === barber.id ? 'text-amber-500' : 'text-neutral-500'}`}>{barber.name.split(' ')[0]}</span>
                  </button>
              ))}
          </div>
      )}

      {/* Agenda Main View */}
      {currentView === 'agenda' ? (
        <>
            <div className="flex items-center justify-between mb-4 border-t border-white/5 pt-4">
                <div className="flex items-center gap-2 text-white">
                    <span className="font-bold">Hoje</span>
                    <span className="text-neutral-500 text-sm">{format(currentDate, "dd/MM")}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-white border-l border-white/10 pl-4 py-1">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> 30min</div>
                    <div>{filteredAppointments.length} agendamentos</div>
                </div>
            </div>

            <div className="space-y-0 relative">
                {hoursSlots.map((hour, idx) => (
                    <div key={hour} className="flex gap-4 min-h-[60px] group">
                        <div className="w-12 text-right text-[11px] font-bold text-neutral-600 pt-1 group-hover:text-amber-500 transition-colors">
                            {hour}
                        </div>
                        <div className="flex-1 border-t border-white/5 relative h-full min-h-[60px] group-hover:border-amber-500/20 transition-colors">
                            {filteredAppointments.filter(app => {
                                const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                                const timeStr = `${String(appDate.getHours()).padStart(2, '0')}:${String(appDate.getMinutes()).padStart(2, '0')}`;
                                return timeStr === hour;
                            }).map(app => (
                                <div key={app.id} className="absolute left-2 top-2 right-2 bg-neutral-900 border border-white/5 rounded-2xl p-4 shadow-xl z-10 flex justify-between items-center group/card animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div>
                                        <h4 className="text-base font-black text-white">{app.clientName}</h4>
                                        <p className="text-[11px] text-amber-500 uppercase font-bold tracking-tight">{app.serviceName} • 30min</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-amber-500 flex items-center justify-center text-amber-500 group-hover/card:bg-amber-500 group-hover/card:text-black transition-all">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* FAB */}
            <button 
                onClick={() => onBack()}
                className="fixed bottom-24 right-6 w-16 h-16 bg-amber-500 text-black rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/40 z-30 active:scale-95 transition-transform"
            >
                <Plus className="w-8 h-8" />
            </button>
        </>
      ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              {currentView === 'list' && (
                  <div className="space-y-6">
                      <h2 className="text-xl font-black uppercase italic tracking-tight underline decoration-amber-500/30 decoration-4 underline-offset-4 text-white">Meus Atendimentos</h2>
                      {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div> : appointments.length === 0 ? (
                          <div className="p-12 text-center text-neutral-600 font-bold uppercase text-xs tracking-widest">Nenhum agendamento encontrado</div>
                      ) : (
                          <div className="space-y-3">
                              {appointments.map(app => (
                                  <div key={app.id} className="bg-neutral-900 p-5 rounded-3xl border border-white/5 shadow-lg">
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
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}
              {currentView === 'services' && <ServicesManagement services={services} />}
              {currentView === 'collaborators' && <CollaboratorsManager />}
              {currentView === 'hours' && <WorkingHoursManager />}
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
    const q = query(collection(db, "users"), where("role", "==", "barber"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBarbers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    const fetchBarbers = async () => {
      const q = query(collection(db, "users"), where("role", "==", "barber"));
      const querySnapshot = await getDocs(q);
      const barbersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(barbersData);
      setLoading(false);
    };
    fetchBarbers();
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
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-amber-500 text-black px-6 py-2 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" /> Novo Serviço
          </button>
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
                  <div key={hour} className="group flex gap-4 min-h-[60px]">
                    <div className="w-12 pt-1 text-right">
                       <span className="text-[10px] font-black text-neutral-700 group-hover:text-amber-500 transition-colors uppercase tracking-tight">{timeStr}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2 relative">
                       <div className="absolute left-0 right-0 top-3 h-[1px] bg-white/5 group-hover:bg-amber-500/10 transition-colors" />
                       <div className="relative z-10 pl-2">
                          {hourApps.map((app, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-black border border-white/5 p-4 rounded-2xl shadow-xl flex items-center justify-between mb-2 hover:border-amber-500/30 hover:shadow-amber-500/5 transition-all group/card"
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-2 h-10 rounded-full transition-colors ${
                                  app.status === 'completed' ? 'bg-amber-500' : 
                                  app.status === 'confirmed' ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                                <div>
                                  <p className="font-bold text-white group-hover/card:text-amber-500 transition-colors">{app.clientName}</p>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{app.serviceName} • {app.time}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                 {(role === 'manager' || role === 'barber') && app.status === 'pending' && (
                                   <div className="flex gap-1">
                                      <button 
                                        onClick={() => updateStatus(app.id, 'confirmed')}
                                        className="bg-amber-500 text-black p-2 rounded-xl hover:bg-amber-400 transition-colors"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </button>
                                       <button 
                                        onClick={() => updateStatus(app.id, 'cancelled')}
                                        className="bg-red-500/10 text-red-500 p-2 rounded-xl hover:bg-red-500/20 transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                   </div>
                                 )}
                                 <button className="bg-white/5 text-neutral-500 p-2 rounded-xl hover:bg-white/10">
                                   <MoreHorizontal className="w-4 h-4" />
                                 </button>
                              </div>
                            </motion.div>
                          ))}
                       </div>
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
