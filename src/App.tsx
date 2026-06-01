/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BARBERSHOP_ADDRESS, BARBERSHOP_NAME } from "./constants";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
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
  Star,
  Home,
  Layout,
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
  Download,
  LayoutDashboard
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, ChangeEvent, FormEvent, lazy, Suspense } from "react";
import { BrandLogo } from "./components/common/BrandLogo";
import { Toaster, toast } from "./components/ui/Toast";

// Lazy-loaded components for better initial loading performance
const NotificationsScreen = lazy(() => import("./components/NotificationsScreen").then(m => ({ default: m.NotificationsScreen })));
const EarningsScreen = lazy(() => import("./components/manager/EarningsScreen").then(m => ({ default: m.EarningsScreen })));
const BlockScreen = lazy(() => import("./components/manager/BlockScreen").then(m => ({ default: m.BlockScreen })));
const PromotionsManager = lazy(() => import("./components/manager/PromotionsManager").then(m => ({ default: m.PromotionsManager })));
const HelpScreen = lazy(() => import("./components/manager/OtherScreens").then(m => ({ default: m.HelpScreen })));
const ShareScreen = lazy(() => import("./components/manager/OtherScreens").then(m => ({ default: m.ShareScreen })));
const RecurrenceScreen = lazy(() => import("./components/manager/OtherScreens").then(m => ({ default: m.RecurrenceScreen })));
const ReconScreen = lazy(() => import("./components/manager/UtilityScreens").then(m => ({ default: m.ReconScreen })));
const ProfessionalHome = lazy(() => import("./components/professional/ProfessionalHome").then(m => ({ default: m.ProfessionalHome })));
const ClientDashboardScreen = lazy(() => import("./components/client/ClientDashboardScreen").then(m => ({ default: m.ClientDashboardScreen })));
const ProfileEditScreen = lazy(() => import("./components/common/ProfileEditScreen").then(m => ({ default: m.ProfileEditScreen })));
const BookingScreen = lazy(() => import("./components/client/BookingScreen").then(m => ({ default: m.BookingScreen })));
const ClientsScreen = lazy(() => import("./components/manager/ClientsScreen").then(m => ({ default: m.ClientsScreen })));
const ClientDetailsScreen = lazy(() => import("./components/manager/ClientDetailsScreen").then(m => ({ default: m.ClientDetailsScreen })));
const MoreOptionsScreen = lazy(() => import("./components/common/MoreOptionsScreen").then(m => ({ default: m.MoreOptionsScreen })));
const ClientPortalScreen = lazy(() => import("./components/auth/AuthScreens").then(m => ({ default: m.ClientPortalScreen })));
const CollaboratorLoginScreen = lazy(() => import("./components/auth/AuthScreens").then(m => ({ default: m.CollaboratorLoginScreen })));
const PortfolioManager = lazy(() => import("./components/professional/PortfolioManager").then(m => ({ default: m.PortfolioManager })));
const DashboardScreen = lazy(() => import("./components/manager/DashboardScreen").then(m => ({ default: m.DashboardScreen })));
const ProfessionalClientChatsScreen = lazy(() => import("./components/ChatScreens").then(m => ({ default: m.ProfessionalClientChatsScreen })));

import { HomeScreen } from "./components/client/HomeScreen";
import { BottomNav } from "./components/common/BottomNav";

// Dummy components
const DarkScreen = ({ onBack }: { onBack: () => void }) => <div className="p-4">Dark Screen <button onClick={onBack}>Voltar</button></div>;
const MyWeekScreen = ({ user, onBack }: { user: any, onBack: () => void }) => <div className="p-4">My Week Screen <button onClick={onBack}>Voltar</button></div>;
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
import { ptBR } from "date-fns/locale";
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
  deleteDoc,
  getFirestore
} from "firebase/firestore";
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from "./lib/firebase";
import { uploadImage } from "./lib/uploadService";
import { getBackendUrl, urlBase64ToUint8Array } from "./lib/pushRegister";
import { 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";


type Screen = "home" | "booking" | "agenda" | "clients" | "client-details" | "more" | "login" | "collaborators" | "services" | "client-login" | "client-dashboard" | "earnings" | "promotions" | "portfolio" | "professional-chat";


export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [clientLoginCode, setClientLoginCode] = useState<string>("");
  const [loggedInClient, setLoggedInClient] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("client");
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    const diff = latest - previous;
    
    // Threshold for hiding (scroll down)
    if (latest > previous && latest > 150) {
      if (Math.abs(diff) > 5) setHidden(true);
    } 
    // Threshold for showing (scroll up)
    else {
      if (Math.abs(diff) > 10 || latest < 50) setHidden(false);
    }
  });
  const [dashboardView, setDashboardView] = useState<"list" | "calendar" | "services" | "hours" | "collaborators">("list");
  const [requestedRole, setRequestedRole] = useState<string>("client");
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staffNotifications, setStaffNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any>(null);
  const [clientToSchedule, setClientToSchedule] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const isSigningUp = useRef(false);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const toggleTheme = () => {
    console.log("toggleTheme called. Current state:", isDarkMode);
    setIsDarkMode(!isDarkMode);
  };
  
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw-push.js')
        .then(async (reg) => {
          console.log('[App] SW registered', reg);
          if (Notification.permission === 'granted') {
             subscribeUser(reg);
          } else if (Notification.permission !== 'denied') {
             const permission = await Notification.requestPermission();
             if (permission === 'granted') {
               subscribeUser(reg);
             }
          }
        })
        .catch(err => console.error('[App] SW registration failed', err));
    }
  }, [user, loggedInClient]);

  const subscribeUser = async (reg: ServiceWorkerRegistration) => {
    try {
      const resp = await fetch(getBackendUrl('/api/push-config'));
      const { publicKey } = await resp.json();
      
      let sub = await reg.pushManager.getSubscription();
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      } catch (subErr: any) {
        // If subscription fails, it might be due to a changed VAPID key. Unsubscribe and try again.
        if (sub) {
          await sub.unsubscribe();
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        } else {
          throw subErr;
        }
      }

      const userId = user?.uid || loggedInClient?.id;
      if (userId && sub) {
        await fetch(getBackendUrl('/api/subscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             subscription: sub.toJSON(), 
             userId: userId,
             userRole: userRole 
          })
        });
        console.log('[App] Subscribed to push notifications');
      }
    } catch (err: any) {
      console.warn('[App] Push subscribe skipped/failed:', err.message || err);
    }
  };
  
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!['manager', 'barber'].includes(userRole)) return;
    
    // Ensure db is available
    const firestore = db || getFirestore();
    if (!firestore) return;

    const q = query(
      collection(firestore, "staff_notifications"),
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
    
    const firestore = db || getFirestore();
    if (!firestore) return;

    const q = userRole === 'manager' 
      ? query(collection(firestore, "appointments"), orderBy("date", "desc"), limit(100))
      : query(collection(firestore, "appointments"), where("barberId", "==", user.uid), orderBy("date", "desc"), limit(100));

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
    if (!loggedInClient?.id) return;
    const docRef = doc(db, "users", loggedInClient.id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLoggedInClient({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return unsubscribe;
  }, [loggedInClient?.id]);

  useEffect(() => {
    const unsubscribeServices = onSnapshot(collection(db, "services"), (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(servicesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "services");
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // Set loading to false as soon as auth state is determined
      
      if (firebaseUser) {
        console.log("Auth state changed: User logged in", firebaseUser.uid);
        if (isSigningUp.current) {
          return;
        }
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          // Don't await getDoc here to unlock UI faster
          getDoc(userDocRef).then(async (userDoc) => {
            if (!userDoc.exists()) {
              console.log("Creating initial user document for:", firebaseUser.email || firebaseUser.uid);
              const newUser = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || "Usuário",
                email: firebaseUser.email,
                role: "client",
                createdAt: Timestamp.now(),
              };
              await setDoc(userDocRef, newUser);
              setUserRole("client");
            } else {
              const data = userDoc.data();
              console.log("User document found. Role:", data?.role);
              if ((firebaseUser.email === "marley@marley.com" || firebaseUser.email === "51992590046@barbershop.com") && data?.role !== "manager") {
                updateDoc(userDocRef, { role: "manager" });
                setUserRole("manager");
              } else {
                setUserRole(data?.role || "client");
              }
            }
          });
        } catch (error) {
          console.error("Error fetching/creating user data", error);
        }
      } else {
        console.log("Auth state changed: User logged out");
        setUserRole("client");
      }
    });
    return () => {
      unsubscribeServices();
      unsubscribeAuth();
    };
  }, []);

  const handleLogin = async (role: string = "client", phone?: string, password?: string, isSignUp?: boolean, name?: string, whatsapp?: string) => {
    isSigningUp.current = isSignUp || false;
    setRequestedRole(role);
    
    // Check if the input is an email, otherwise convert phone to virtual email
    const isEmail = phone?.includes('@');
    const email = phone 
      ? (isEmail ? phone : `${phone.replace(/\D/g, '')}@barbershop.com`) 
      : undefined;
    const finalWhatsapp = whatsapp || phone;

    console.log("HandleLogin: Attempting to create user with email:", email, "role:", role, "isSignUp:", isSignUp);
    
    try {
      if (email && password) {
        if (isSignUp) {
          console.log("HandleLogin: Creating user with email:", email);
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }
          
          await setDoc(doc(db, "users", userCredential.user.uid), {
             uid: userCredential.user.uid,
             name: name || userCredential.user.displayName || "Usuário",
             email: email,
             role: role,
             whatsapp: finalWhatsapp,
             createdAt: Timestamp.now(),
           });

          setUserRole(role);
        } else {
           await signInWithEmailAndPassword(auth, email, password);
        }
      } else {
        toast.error("Número de telefone e senha são obrigatórios.");
      }
      
      setCurrentScreen("home");
    } catch (error: any) {
      console.error("Login failed", error);
      let message = "Erro na autenticação. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') message = "Este número já está cadastrado.";
      if (error.code === 'auth/wrong-password') message = "Senha incorreta.";
      if (error.code === 'auth/user-not-found') message = "Usuário não encontrado.";
      if (error.code === 'auth/invalid-email') message = "Número de telefone inválido.";
      if (error.code === 'auth/weak-password') message = "A senha deve ter pelo menos 6 caracteres.";
      toast.error(message);
    } finally {
      isSigningUp.current = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentScreen("home");
  };

  const handleClientLogin = async (phone: string, password: string) => {
    // Search by cleaned whatsapp number
    const cleanPhone = phone.replace(/\D/g, '');
    const firestore = db || getFirestore();
    const userQuery = query(collection(firestore, "users"), where("whatsapp", "==", cleanPhone), where("password", "==", password));
    const userSnapshot = await getDocs(userQuery);
    
    // Try original phone too just in case
    let docs = userSnapshot.docs;
    if (docs.length === 0) {
      const altQuery = query(collection(firestore, "users"), where("whatsapp", "==", phone), where("password", "==", password));
      const altSnap = await getDocs(altQuery);
      docs = altSnap.docs;
    }

    if (docs.length === 0) {
        toast.error("Telefone ou senha inválidos.");
        return;
    }
    
    setLoggedInClient({ id: docs[0].id, ...docs[0].data() });
    setCurrentScreen("client-dashboard");
  };

  const handleForgotPassword = async () => {
    const phone = prompt("Digite seu WhatsApp cadastrado:");
    if (!phone) return;
    
    // Look up appointments with this phone
    const cleanPhone = phone.replace(/\D/g, '');
    const firestore = db || getFirestore();
    const appointmentsQuery = query(collection(firestore, "appointments"), where("clientPhone", "==", cleanPhone), orderBy("createdAt", "desc"), limit(1));
    const querySnapshot = await getDocs(appointmentsQuery);

    if (querySnapshot.empty) {
        toast.error("Nenhum agendamento encontrado para este número.");
        return;
    }

    const doc = querySnapshot.docs[0];
    const code = doc.data().loginCode;

    if (code) {
        toast.info("Seu código de acesso é: " + code);
    } else {
        toast.error("Código não encontrado.");
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

  const LoadingFallback = () => (
    <div className="flex items-center justify-center p-20 min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Carregando...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30 pb-24 md:pb-0">
      <motion.nav 
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: "-100%", opacity: 0 },
        }}
        animate={hidden && !isMenuOpen ? "hidden" : "visible"}
        transition={{ 
          duration: 0.4, 
          ease: [0.33, 1, 0.68, 1], // Custom cubic-bezier for a smoother feel
          opacity: { duration: 0.25 }
        }}
        className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setCurrentScreen("home")}
          >
            <BrandLogo className="w-12 h-12 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block text-left">
              <span className="text-xl font-black tracking-tighter uppercase italic block leading-none">
                MS
              </span>
              <span className="text-[10px] text-amber-500 uppercase tracking-[0.3em] font-bold">BARBER SHOP</span>
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
                  onClick={() => {
                    setDashboardView("calendar");
                    setCurrentScreen("agenda");
                  }}
                  className={`hover:text-amber-500 transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest leading-none ${currentScreen === "agenda" && dashboardView === "calendar" ? "text-amber-500" : "text-neutral-400"}`}
                >
                  Agenda
                </button>
                {(userRole === "manager" || userRole === "barber") && (
                  <button 
                    onClick={() => {
                      setDashboardView("list");
                      setCurrentScreen("agenda");
                    }}
                    className={`hover:text-amber-500 transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest leading-none ${currentScreen === "agenda" && dashboardView === "list" ? "text-amber-500" : "text-neutral-400"}`}
                  >
                    Atendimentos
                  </button>
                )}
                {(userRole === "manager" || userRole === "barber") && (
                  <>
                    {userRole === "manager" && (
                        <button 
                          onClick={() => setCurrentScreen("collaborators")}
                          className={`hover:text-white transition-colors flex items-center gap-2 ${currentScreen === "collaborators" ? "text-amber-500" : ""}`}
                        >
                          Equipe
                        </button>
                    )}
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
            ) : loggedInClient ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setCurrentScreen("client-dashboard")}
                  className={`hover:text-amber-500 transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest leading-none ${currentScreen === "client-dashboard" ? "text-amber-500" : "text-neutral-400"}`}
                >
                  Meu Painel
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                  <div className="text-right">
                    <p className="text-white text-xs font-bold leading-none">{loggedInClient.name?.split(' ')[0]}</p>
                    <p className="text-[10px] text-amber-500 capitalize font-black">Cliente</p>
                  </div>
                  <div className="relative">
                    {loggedInClient.photoURL ? (
                      <img 
                        src={loggedInClient.photoURL} 
                        className="w-10 h-10 rounded-xl border border-amber-500/50 object-cover" 
                        referrerPolicy="no-referrer"
                        alt={loggedInClient.name}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => { setLoggedInClient(null); setCurrentScreen("home"); }}
                  className={`p-2 rounded-lg transition-all bg-white/5 text-neutral-400 hover:bg-red-500/20 hover:text-red-500`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
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
      </motion.nav>

      <main className="pt-[calc(5rem+env(safe-area-inset-top))]">
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait">
            {currentScreen === "home" && (
              (['manager', 'barber'].includes(userRole)) 
              ? <ProfessionalHome 
                  user={user} 
                  role={userRole} 
                  setCurrentScreen={(screen) => {
                    if (screen === "agenda") {
                      setDashboardView("list");
                    }
                    setCurrentScreen(screen);
                  }} 
                /> 
              : <HomeScreen services={services} onStartBooking={() => setCurrentScreen("booking")} />
            )}
            {currentScreen === "login" && <CollaboratorLoginScreen onLogin={handleLogin} setCurrentScreen={setCurrentScreen} setRequestedRole={setRequestedRole} />}
            {currentScreen === "client-login" && <ClientPortalScreen onLogin={handleClientLogin} onForgotPassword={handleForgotPassword} onBack={() => setCurrentScreen("home")} />}
            {currentScreen === "client-dashboard" && <ClientDashboardScreen user={loggedInClient} onBack={() => setCurrentScreen("home")} />}
            {currentScreen === "booking" && <BookingScreen user={user} role={userRole} services={services} onBack={() => { setCurrentScreen("home"); setAppointmentToEdit(null); setClientToSchedule(null); }} editAppointment={appointmentToEdit} initialClient={clientToSchedule} />}
            {currentScreen === "agenda" && <DashboardScreen user={user} role={userRole} services={services} dashboardView={dashboardView} onBack={() => setCurrentScreen("home")} onNewBooking={() => setCurrentScreen("booking")} onEditBooking={(app) => { setAppointmentToEdit(app); setCurrentScreen("booking"); }} />}
            {currentScreen === "collaborators" && <DashboardScreen user={user} role={userRole} services={services} dashboardView="collaborators" onBack={() => setCurrentScreen("home")} onNewBooking={() => setCurrentScreen("booking")} onEditBooking={(app) => { setAppointmentToEdit(app); setCurrentScreen("booking"); }} />}
            {currentScreen === "services" && <DashboardScreen user={user} role={userRole} services={services} dashboardView="services" onBack={() => setCurrentScreen("home")} onNewBooking={() => setCurrentScreen("booking")} onEditBooking={(app) => { setAppointmentToEdit(app); setCurrentScreen("booking"); }} />}
            {currentScreen === "earnings" && <EarningsScreen onBack={() => setCurrentScreen("home")} />}
            {currentScreen === "promotions" && <PromotionsManager onBack={() => setCurrentScreen("home")} />}
            {currentScreen === "clients" && <ClientsScreen onBack={() => setCurrentScreen("home")} onScheduleClient={(client) => { setClientToSchedule(client); setCurrentScreen("booking"); }} onClientClick={(client) => { setSelectedClient(client); setCurrentScreen("client-details"); }} />}
            {currentScreen === "client-details" && selectedClient && <ClientDetailsScreen client={selectedClient} onBack={() => { setCurrentScreen("clients"); setSelectedClient(null); }} onScheduleClient={(client) => { setClientToSchedule(client); setCurrentScreen("booking"); }} onMessageClient={(client) => { setSelectedClient(client); setCurrentScreen("professional-chat"); }} />}
            {currentScreen === "portfolio" && <PortfolioManager onBack={() => setCurrentScreen("home")} />}
            {currentScreen === "professional-chat" && (
              <ProfessionalClientChatsScreen 
                user={user} 
                onBack={() => { setCurrentScreen("home"); setSelectedClient(null); }} 
                initialClientId={selectedClient?.id} 
                initialClientName={selectedClient?.name} 
              />
            )}
            {currentScreen === "more" && (
              <MoreOptionsScreen 
                user={user || loggedInClient} 
                role={userRole} 
                onLogout={handleLogout} 
                onBack={() => setCurrentScreen("home")}
                staffNotifications={staffNotifications}
                appointments={appointments}
                onClearNotifications={async () => {
                  const unread = staffNotifications.filter(n => !n.read);
                  await Promise.all(unread.map(n => updateDoc(doc(db, "staff_notifications", n.id), { read: true })));
                }}
                onToggleTheme={toggleTheme}
                isDarkMode={isDarkMode}
              />
            )}
          </AnimatePresence>
        </Suspense>
      </main>

      <BottomNav 
        userRole={userRole} 
        currentScreen={currentScreen} 
        setCurrentScreen={setCurrentScreen} 
        user={user} 
        unreadCount={staffNotifications.filter(n => !n.read).length}
        isVisible={!hidden}
      />

      {currentScreen === "home" && (
        <>
          <div className="max-w-md mx-auto px-6 pt-8 pb-3 text-center space-y-4">
            <div className="h-[1px] bg-white/5 w-1/4 mx-auto" />
            <span className="block text-[8px] text-neutral-500 font-extrabold uppercase tracking-[0.25em] leading-none">
              Meios de pagamento aceitos
            </span>
            <div className="flex items-center justify-center gap-5 text-neutral-400 py-1">
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-3.5 h-3.5 text-emerald-400 fill-current shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L2 12l10 10 10-10L12 2zm0 15.17L5.83 11 12 4.83 18.17 11 12 17.17z m-3.66-6.17l3.66 3.66 3.66-3.66-3.66-3.66-3.66 3.66z"/>
                </svg>
                <span>Pix</span>
              </div>
              <div className="w-[1px] h-2.5 bg-white/5" />
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">
                <CreditCard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Crédito</span>
              </div>
              <div className="w-[1px] h-2.5 bg-white/5" />
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">
                <CreditCard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Débito</span>
              </div>
            </div>
          </div>
          <footer className="py-8 text-center border-t border-white/5 text-neutral-600 text-[10px] uppercase tracking-widest font-bold">
            © 2026 MS BARBER SHOP | Developed by Rulio
          </footer>
        </>
      )}

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
            />

            {/* Sidebar Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-[85%] max-w-[340px] z-50 bg-neutral-950/95 backdrop-blur-2xl border-l border-white/5 flex flex-col justify-between shadow-2xl p-6"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-5">
                <div className="flex items-center gap-3">
                  <BrandLogo className="w-10 h-10 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" />
                  <div className="text-left">
                    <span className="text-sm font-black tracking-tighter uppercase italic block leading-none text-white">
                      MS
                    </span>
                    <span className="text-[9px] text-amber-500 uppercase tracking-widest font-black">BARBER MENU</span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-2 bg-white/5 rounded-full text-neutral-400 hover:text-white border border-white/5 transition-all hover:rotate-90 duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content (Navigation List) */}
              <div className="flex-1 py-8 overflow-y-auto space-y-4 pr-1">
                <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest pl-2">Navegação</p>
                
                <div className="space-y-2.5">
                  {(() => {
                    const menuItems = [];
                    
                    // Base Home item
                    menuItems.push({
                      label: "Início",
                      icon: <Home className="w-4 h-4" />,
                      onClick: () => { setCurrentScreen("home"); setIsMenuOpen(false); },
                      isActive: currentScreen === "home"
                    });

                    // Conditional items
                    if (user) {
                      if (userRole === "manager") {
                        menuItems.push({
                          label: "Agenda",
                          icon: <Calendar className="w-4 h-4" />,
                          onClick: () => { setDashboardView("calendar"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "calendar"
                        });
                        menuItems.push({
                          label: "Atendimentos",
                          icon: <Scissors className="w-4 h-4" />,
                          onClick: () => { setDashboardView("list"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "list"
                        });
                        menuItems.push({
                          label: "Time de Profissionais",
                          icon: <User className="w-4 h-4" />,
                          onClick: () => { setCurrentScreen("collaborators"); setIsMenuOpen(false); },
                          isActive: currentScreen === "collaborators"
                        });
                        menuItems.push({
                          label: "Serviços",
                          icon: <Scissors className="w-4 h-4" />,
                          onClick: () => { setCurrentScreen("services"); setIsMenuOpen(false); },
                          isActive: currentScreen === "services"
                        });
                      } else if (userRole === "barber") {
                        menuItems.push({
                          label: "Minha Agenda",
                          icon: <Calendar className="w-4 h-4" />,
                          onClick: () => { setDashboardView("calendar"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "calendar"
                        });
                        menuItems.push({
                          label: "Atendimentos",
                          icon: <Scissors className="w-4 h-4" />,
                          onClick: () => { setDashboardView("list"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "list"
                        });
                        menuItems.push({
                          label: "Serviços",
                          icon: <Scissors className="w-4 h-4" />,
                          onClick: () => { setCurrentScreen("services"); setIsMenuOpen(false); },
                          isActive: currentScreen === "services"
                        });
                      } else if (userRole === "client") {
                        menuItems.push({
                          label: "Agendar",
                          icon: <Plus className="w-4 h-4" />,
                          onClick: () => { setCurrentScreen("booking"); setIsMenuOpen(false); },
                          isActive: currentScreen === "booking"
                        });
                        menuItems.push({
                          label: "Meus Cortes",
                          icon: <CalendarCheck className="w-4 h-4" />,
                          onClick: () => { setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda"
                        });
                      }
                    } else if (loggedInClient) {
                      menuItems.push({
                        label: "Meu Painel",
                        icon: <User className="w-4 h-4" />,
                        onClick: () => { setCurrentScreen("client-dashboard"); setIsMenuOpen(false); },
                        isActive: currentScreen === "client-dashboard"
                      });
                      menuItems.push({
                        label: "Sair",
                        icon: <LogOut className="w-4 h-4" />,
                        onClick: () => { setLoggedInClient(null); setCurrentScreen("home"); setIsMenuOpen(false); },
                        isActive: false
                      });
                    } else {
                      // Guest view
                      menuItems.push({
                        label: "Nossos Serviços",
                        icon: <Scissors className="w-4 h-4" />,
                        onClick: () => { 
                          setIsMenuOpen(false);
                          if (currentScreen !== "home") {
                            setCurrentScreen("home");
                          }
                          setTimeout(() => {
                            const el = document.getElementById("servicos");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }, 300);
                        },
                        isActive: false
                      });
                      menuItems.push({
                        label: "Portal Profissional",
                        icon: <Lock className="w-4 h-4" />,
                        onClick: () => { setCurrentScreen("login"); setIsMenuOpen(false); },
                        isActive: currentScreen === "login"
                      });
                      menuItems.push({
                        label: "Painel do Cliente",
                        icon: <User className="w-4 h-4" />,
                        onClick: () => { setCurrentScreen("client-login"); setIsMenuOpen(false); },
                        isActive: currentScreen === "client-login"
                      });
                    }

                    return menuItems.map((item, idx) => {
                      const isActive = item.isActive;
                      return (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={item.onClick}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group active:scale-95 duration-200 border ${isActive ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10" : "bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-black/10 text-black" : "bg-black/40 text-amber-500 group-hover:scale-110 group-hover:rotate-6 duration-300"}`}>
                              {item.icon}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider italic">{item.label}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 duration-200 ${isActive ? "text-black" : "text-neutral-600 group-hover:text-amber-500"}`} />
                        </motion.button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-white/5 pt-5 mt-auto">
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover border border-amber-500/30" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div className="text-left overflow-hidden">
                        <h4 className="text-xs font-black uppercase text-white truncate italic tracking-wide">{user.displayName || user.name || "Profissional"}</h4>
                        <p className="text-[9px] text-amber-500/80 font-black uppercase tracking-widest mt-0.5">{userRole}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="w-full bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:text-white text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all active:scale-95 duration-200"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair da Conta
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-[9px] text-neutral-600 uppercase tracking-widest font-black py-4">
                    Estilo & Tradição • MS Barber
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Toaster />
    </div>
  );
}









