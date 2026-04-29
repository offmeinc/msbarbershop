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
  XCircle
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
  signInWithPopup, 
  GoogleAuthProvider, 
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

type Screen = "home" | "booking" | "dashboard" | "login";

function BrandLogo({ className = "w-10 h-10", iconSize = "w-6 h-6" }: { className?: string, iconSize?: string }) {
  return (
    <div className={`${className} bg-amber-500 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.2)]`}>
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

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<string>("client");
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
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
              role: requestedRole,
              createdAt: Timestamp.now(),
            };
            await setDoc(userDocRef, newUser);
            setUserRole(requestedRole);
          } else {
            const data = userDoc.data();
            console.log("User document found. Role:", data?.role);
            setUserRole(data?.role || "client");
          }
        } catch (error) {
          console.error("Error fetching/creating user data", error);
        }
      } else {
        console.log("Auth state changed: User logged out");
      }
      setLoading(false);
    });
    return () => {
      unsubscribeServices();
      unsubscribeAuth();
    };
  }, [requestedRole]);

  const handleLogin = async (role: string = "client", email?: string, password?: string, isSignUp?: boolean, name?: string) => {
    setRequestedRole(role);
    
    try {
      if (email && password) {
        if (isSignUp) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }
          
          // Explicitly create user doc for email signups to ensure name and role are correct
          const userDocRef = doc(db, "users", userCredential.user.uid);
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            name: name || userCredential.user.displayName || "Usuário",
            email: userCredential.user.email,
            role: role,
            createdAt: Timestamp.now(),
          });
          setUserRole(role);
        } else {
           await signInWithEmailAndPassword(auth, email, password);
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setCurrentScreen("home")}
          >
            <BrandLogo className="w-12 h-12 group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block text-left">
              <span className="text-xl font-black tracking-tighter uppercase italic block leading-none">
                Marley Souza
              </span>
              <span className="text-[10px] text-amber-500 uppercase tracking-[0.3em] font-bold">Barber Shop</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-widest text-neutral-400">
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
                  onClick={() => setCurrentScreen("dashboard")}
                  className={`hover:text-white transition-colors flex items-center gap-2 ${currentScreen === "dashboard" ? "text-amber-500" : ""}`}
                >
                  Dashboard
                </button>
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
                      <div className="w-10 h-10 rounded-xl border border-white/20 bg-neutral-900 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <button onClick={handleLogout} className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all">
                    <LogOut className="w-4 h-4" />
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

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <main className="pt-20">
        <AnimatePresence mode="wait">
          {currentScreen === "home" && <HomeScreen key="home" services={services} onStartBooking={() => user ? setCurrentScreen("booking") : setCurrentScreen("login")} />}
          {currentScreen === "login" && <LoginScreen key="login" onLogin={handleLogin} setUserRole={setUserRole} setCurrentScreen={setCurrentScreen} />}
          {currentScreen === "booking" && <BookingScreen key="booking" user={user} services={services} onBack={() => setCurrentScreen("home")} />}
          {currentScreen === "dashboard" && <DashboardScreen key="dashboard" user={user} role={userRole} services={services} onBack={() => setCurrentScreen("home")} />}
        </AnimatePresence>
      </main>


      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center gap-8 text-2xl font-black uppercase italic"
          >
            <a href="#inicio" onClick={() => setIsMenuOpen(false)}>Início</a>
            <a href="#servicos" onClick={() => setIsMenuOpen(false)}>Serviços</a>
            <button onClick={() => { setCurrentScreen("login"); setIsMenuOpen(false); }}>Portal</button>
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
    </motion.div>
  );
}

function LoginScreen({ onLogin, setUserRole, setCurrentScreen }: { onLogin: (role: string, email?: string, password?: string, isSignUp?: boolean, name?: string) => void, setUserRole: (role: string) => void, setCurrentScreen: (screen: string) => void, key?: string }) {
  const [activeTab, setActiveTab] = useState<string>("client");
  const [authMode, setAuthMode] = useState<"choice" | "email">("choice");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const roles = [
    { id: "client", label: "Cliente", icon: <User className="w-4 h-4" />, desc: "Agende seus cortes e acumule pontos." },
    { id: "barber", label: "Colaborador", icon: <Scissors className="w-4 h-4" />, desc: "Veja sua agenda e gerencie atendimentos." },
  ];

  const handleManagerLogin = async () => {
    setAuthLoading(true);
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
      await onLogin(activeTab, email, password, isSignUp, name);
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
                onClick={() => onLogin(activeTab)}
                className="w-full bg-white text-black font-black uppercase italic py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all group"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google logo" />
                Continuar com Google
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

function BookingScreen({ user, services, onBack }: { user: any, services: any[], onBack: () => void, key?: string }) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmBooking = async () => {
    setError(null);
    if (!selectedService) {
      setError("Selecione um serviço para continuar.");
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
      const appointmentData = {
        clientId: user.uid,
        clientName: user.displayName,
        clientPhoto: user.photoURL,
        barberId: "manager-main", // Default barber for now
        serviceId: selectedService,
        serviceName: service?.name,
        date: Timestamp.fromDate(bookingDateTime),
        status: "pending",
        totalPrice: service?.price,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, "appointments"), appointmentData);
      onBack();
    } catch (error) {
      console.error(error);
      setError("Ocorreu um erro ao processar seu agendamento.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter">Novo <span className="text-amber-500">Agendamento</span></h2>
        <button onClick={onBack} className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 uppercase text-xs font-bold tracking-widest">
          <ChevronRight className="rotate-180 w-4 h-4" /> Cancelar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest mb-8 text-neutral-400">1. Escolha o Serviço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.filter(s => s.active !== false).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s.id);
                    setError(null);
                  }}
                  className={`p-6 rounded-2xl border text-left transition-all ${
                    selectedService === s.id ? "border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-white/5 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <p className={`font-black uppercase italic text-sm mb-1 ${selectedService === s.id ? "text-white" : "text-neutral-500"}`}>{s.name}</p>
                  <p className="text-amber-500 font-black italic">R${s.price}</p>
                  <p className="text-[10px] text-neutral-500 uppercase mt-2">{s.duration} min</p>
                </button>
              ))}
            </div>
          </div>

          <div className={`bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5 transition-all ${!selectedService ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-8 text-neutral-400">2. Data e Horário</h3>
            <input 
              type="datetime-local" 
              className={`w-full bg-black border p-5 rounded-2xl text-white outline-none transition-all cursor-pointer font-bold ${error && !bookingDate ? "border-red-500" : "border-white/10 focus:border-amber-500"}`}
              value={bookingDate}
              onChange={(e) => {
                setBookingDate(e.target.value);
                setError(null);
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-600 p-8 rounded-[2.5rem] text-black shadow-2xl relative overflow-hidden group">
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
  );
}

function DashboardScreen({ user, role, services, onBack }: { user: any, role: string, services: any[], onBack: () => void, key?: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [dashboardView, setDashboardView] = useState<"list" | "calendar" | "services" | "hours">("list");
  const [calendarMode, setCalendarMode] = useState<"day" | "week" | "month">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch user data: if manager/barber fetch own, if client fetch manager's profile
    const fetchUserData = async () => {
      if (role === 'client') {
        const q = query(collection(db, "users"), where("role", "==", "manager"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUserData(querySnapshot.docs[0].data());
        }
      } else {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setBioInput(data.bio || "");
        }
      }
    };
    fetchUserData();

    const appointmentsRef = collection(db, "appointments");
    let q;
    
    if (role === "manager") {
      q = query(appointmentsRef, orderBy("date", "desc"), limit(50));
    } else if (role === "barber") {
      q = query(appointmentsRef, where("barberId", "==", user.uid), orderBy("date", "desc"));
    } else {
      q = query(appointmentsRef, where("clientId", "==", user.uid), orderBy("date", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Dashboard error:", error);
    });

    return () => unsubscribe();
  }, [user, role]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "appointments", id), { status: newStatus });
    } catch (error) {
      console.error(error);
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const result = await uploadImage(file);
      await updateProfile(user, { photoURL: result.data.url });
      await updateDoc(doc(db, "users", user.uid), { photoUrl: result.data.url });
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateBio = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { bio: bioInput });
      setUserData({ ...userData, bio: bioInput });
      setEditingBio(false);
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar bio.");
    }
  };

  const totalRevenue = appointments.filter(a => a.status === 'confirmed').reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-7xl mx-auto py-12 px-6"
    >
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8 mb-16">
        <div className="relative group">
          <div className="w-28 h-28 rounded-3xl border-2 border-amber-500 overflow-hidden bg-neutral-900 shadow-2xl">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Profile" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-700">
                <User className="w-12 h-12" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center shadow-lg hover:bg-amber-500 transition-all"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <span className="text-amber-500 font-mono tracking-[0.3em] uppercase text-[10px] font-black italic mb-3 block">Ambiente do {role === 'manager' ? 'Gestor' : role === 'barber' ? 'Colaborador' : 'Cliente'}</span>
          <h2 className="text-5xl font-black italic uppercase leading-none tracking-tighter">{user.displayName}</h2>
          <p className="text-neutral-500 uppercase tracking-widest text-[9px] font-bold mt-2">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5">
          <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-2">Total de Atendimentos</p>
          <p className="text-4xl font-black italic uppercase">{appointments.length}</p>
        </div>
        
        {role === 'manager' ? (
          <div className="bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5">
            <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-2">Faturamento Confirmado</p>
            <p className="text-4xl font-black italic uppercase text-amber-500">R${totalRevenue}</p>
          </div>
        ) : (
          <div className="bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5">
             <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-2">Pontos Fidelidade</p>
             <p className="text-4xl font-black italic uppercase text-amber-500">{appointments.filter(a => a.status === 'confirmed').length * 10}</p>
          </div>
        )}
        
        <div className="md:col-span-2 bg-amber-500 p-8 rounded-[2rem] flex items-center justify-between shadow-xl text-black">
          <div>
            <p className="text-black/60 text-[10px] uppercase font-black tracking-widest mb-2">Próximo na Fila</p>
            <p className="text-2xl font-black italic uppercase leading-tight">
              {appointments.find(a => a.status === 'confirmed')?.clientName || "Nenhum confirmado"}
            </p>
            <p className="text-[10px] font-bold uppercase opacity-60 mt-1">
              {appointments.find(a => a.status === 'confirmed')?.serviceName || "---"}
            </p>
          </div>
          <Calendar className="w-12 h-12 opacity-30" />
        </div>
      </div>

      {/* Barber Profile Section */}
      <div className="bg-neutral-900/50 p-8 md:p-12 rounded-[3rem] border border-white/5 mb-12 relative overflow-hidden group">
        <div className="flex flex-col md:flex-row gap-10 items-start">
           <div className="w-40 h-40 rounded-[2.5rem] bg-black border-2 border-amber-500 overflow-hidden shadow-2xl shrink-0">
             {userData?.photoUrl || userData?.photoURL ? (
               <img src={userData?.photoUrl || userData?.photoURL} alt="Barber" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-700">
                  <User className="w-12 h-12" />
               </div>
             )}
           </div>
           <div className="flex-1">
             <div className="flex items-center justify-between mb-4">
               <div>
                 <p className="text-amber-500 font-black uppercase text-[10px] tracking-[0.2em] mb-1">Destaque da Casa</p>
                 <h3 className="text-3xl font-black italic uppercase tracking-tighter">{userData?.name || "Marley Souza"}</h3>
               </div>
               {role === 'manager' && !editingBio && (
                 <button 
                   onClick={() => setEditingBio(true)}
                   className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-white transition-colors"
                 >
                   Editar Bio
                 </button>
               )}
             </div>
             
             {editingBio ? (
               <div className="space-y-4">
                 <textarea
                   className="w-full bg-black/50 border border-white/10 rounded-2xl p-6 text-sm text-neutral-300 outline-none focus:border-amber-500 min-h-[120px] transition-all"
                   value={bioInput}
                   onChange={(e) => setBioInput(e.target.value)}
                   placeholder="Escreva sobre sua experiência e estilo de corte..."
                 />
                 <div className="flex gap-3">
                   <button 
                     onClick={handleUpdateBio}
                     className="px-6 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
                   >Salvar</button>
                   <button 
                     onClick={() => { setEditingBio(false); setBioInput(userData?.bio || ""); }}
                     className="px-6 py-2 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white/10 transition-colors"
                   >Cancelar</button>
                 </div>
               </div>
             ) : (
               <p className="text-neutral-400 text-sm leading-relaxed max-w-2xl font-medium">
                 {userData?.bio || "Especialista em visagismo e cortes modernos. Transformando estilos e elevando a autoestima em cada atendimento."}
               </p>
             )}
           </div>
        </div>
      </div>

      <div className="bg-neutral-900/50 p-8 md:p-12 rounded-[3.5rem] border border-white/5 min-h-[500px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Fluxo de <span className="text-amber-500">Agendamentos</span></h3>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Gerencie sua agenda em tempo real</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-black p-1 rounded-2xl border border-white/5">
              <button 
                onClick={() => setDashboardView("list")}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 ${dashboardView === 'list' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
              >
                <ListIcon className="w-3.5 h-3.5" /> Lista
              </button>
              <button 
                onClick={() => setDashboardView("calendar")}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 ${dashboardView === 'calendar' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
              >
                <Grid className="w-3.5 h-3.5" /> Calendário
              </button>
              {role === 'manager' && (
                <button 
                  onClick={() => setDashboardView("services")}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 ${dashboardView === 'services' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Scissors className="w-3.5 h-3.5" /> Serviços
                </button>
              )}
              {role === 'manager' && (
                <button 
                  onClick={() => setDashboardView("hours")}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 ${dashboardView === 'hours' ? 'bg-neutral-800 text-white shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Clock className="w-3.5 h-3.5" /> Horários
                </button>
              )}
            </div>

            {dashboardView === "calendar" && (
              <div className="flex items-center gap-2 bg-black p-1 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setCalendarMode("day")}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calendarMode === 'day' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
                >Dia</button>
                <button 
                  onClick={() => setCalendarMode("week")}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calendarMode === 'week' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
                >Semana</button>
                <button 
                  onClick={() => setCalendarMode("month")}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calendarMode === 'month' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
                >Mês</button>
              </div>
            )}
          </div>
        </div>
        
        {dashboardView === "list" ? (
          appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 opacity-20">
              <BrandLogo className="w-20 h-20 grayscale mb-6" />
              <p className="uppercase text-[10px] font-black tracking-widest">Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((app) => (
                <div key={app.id} className="bg-black/40 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-amber-500/20 transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-amber-500 overflow-hidden relative">
                      {app.clientPhoto ? (
                        <img src={app.clientPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Scissors className="w-6 h-6" />
                      )}
                      {app.status === 'pending' && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-black animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-black uppercase italic text-lg leading-none mb-1 group-hover:text-amber-500 transition-colors">
                        {role === 'client' ? app.serviceName : app.clientName}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                        <Clock className="w-3 h-3" />
                        {app.date instanceof Timestamp ? app.date.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "---"}
                        {role !== 'client' && <span className="text-amber-500/50">• {app.serviceName}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <p className="text-2xl font-black italic tracking-tighter">R${app.totalPrice}</p>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        app.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                        app.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 
                        'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {app.status}
                      </span>
                      
                      {(role === 'manager' || role === 'barber') && app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateStatus(app.id, 'confirmed')}
                            className="w-10 h-10 bg-green-500 text-black rounded-lg flex items-center justify-center hover:scale-110 transition-all font-bold"
                          >✓</button>
                          <button 
                            onClick={() => updateStatus(app.id, 'cancelled')}
                            className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center hover:scale-110 transition-all font-bold"
                          >✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : dashboardView === "calendar" ? (
          <CalendarWidget 
            appointments={appointments} 
            mode={calendarMode} 
            onModeChange={setCalendarMode}
            currentDate={currentDate} 
            onDateChange={setCurrentDate}
            role={role}
            updateStatus={updateStatus}
          />
        ) : dashboardView === "hours" ? (
          <WorkingHoursManager />
        ) : (
          <ServicesManagement services={services} />
        )}
      </div>
    </motion.div>
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

  if (loading) return <div className="p-8 text-neutral-500">Carregando barbeiros...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Horários dos <span className="text-amber-500">Barbeiros</span></h3>
      {barbers.map(barber => (
        <BarberHoursItem key={barber.id} barber={barber} />
      ))}
    </div>
  );
}

function BarberHoursItem(props: { barber: any; key?: any }) {
  const { barber } = props;
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHours = async () => {
      const hoursCollection = collection(db, "users", barber.id, "workingHours");
      const snapshot = await getDocs(hoursCollection);
      setHours(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchHours();
  }, [barber.id]);

  const saveHours = async (dayOfWeek: number, startTime: string, endTime: string) => {
    const hoursDocRef = doc(db, "users", barber.id, "workingHours", `day-${dayOfWeek}`);
    await setDoc(hoursDocRef, { dayOfWeek, startTime, endTime, isActive: true });
    setHours(prev => {
        const index = prev.findIndex(h => h.dayOfWeek === dayOfWeek);
        if (index > -1) {
            const next = [...prev];
            next[index] = { ...next[index], startTime, endTime, isActive: true };
            return next;
        }
        return [...prev, { dayOfWeek, startTime, endTime, isActive: true }];
    });
  };

  return (
    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
      <p className="font-black uppercase tracking-widest text-amber-500 mb-4">{barber.name}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3, 4, 5, 6].map(day => {
          const dayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][day];
          const workingDay = hours.find(h => h.dayOfWeek === day);
          return (
            <div key={day} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
              <span className="text-sm font-bold">{dayName}</span>
              <div className="flex gap-2">
                <input 
                  type="time" 
                  defaultValue={workingDay?.startTime || "09:00"}
                  onBlur={(e) => saveHours(day, e.target.value, workingDay?.endTime || "18:00")}
                  className="bg-black/50 px-2 py-1 rounded"
                />
                <input 
                  type="time" 
                  defaultValue={workingDay?.endTime || "18:00"}
                  onBlur={(e) => saveHours(day, workingDay?.startTime || "09:00", e.target.value)}
                  className="bg-black/50 px-2 py-1 rounded"
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: 0, duration: 0, active: true });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", price: 0, duration: 0, active: true });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (service: any) => {
    setFormData({ 
      name: service.name, 
      price: service.price, 
      duration: service.duration, 
      active: service.active !== false 
    });
    setEditingId(service.id);
    setIsAdding(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "services", editingId), formData);
      } else {
        await addDoc(collection(db, "services"), formData);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving service:", error);
      alert("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (service: any) => {
    try {
      await updateDoc(doc(db, "services", service.id), { active: service.active === false });
    } catch (error) {
      console.error("Error toggling service status:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h4 className="text-2xl font-black uppercase italic tracking-tighter">Catálogo de <span className="text-amber-500">Serviços</span></h4>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Gerencie os serviços oferecidos aos clientes</p>
        </div>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-amber-500 text-black px-6 py-2 rounded-xl font-black uppercase italic text-[10px] flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
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
            <form onSubmit={handleSubmit} className="bg-white/5 border border-amber-500/30 p-8 rounded-[2rem] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-2 block tracking-widest">Nome do Serviço</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Corte e Barba"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-2 block tracking-widest">Preço (R$)</label>
                  <input 
                    type="number"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-2 block tracking-widest">Duração (min)</label>
                  <input 
                    type="number"
                    required
                    placeholder="Ex: 30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-4 mb-2 block tracking-widest">Status Inicial</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-black uppercase italic text-[10px] transition-all border ${
                      formData.active ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"
                    }`}
                  >
                    {formData.active ? <><CheckCircle2 className="w-4 h-4" /> Ativo</> : <><XCircle className="w-4 h-4" /> Inativo</>}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 text-black px-10 py-4 rounded-xl font-black uppercase italic text-xs flex items-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> {editingId ? "Atualizar" : "Salvar"}</>}
                </button>
                <button 
                  type="button"
                  onClick={resetForm}
                  className="bg-white/5 text-white px-10 py-4 rounded-xl font-black uppercase italic text-xs hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 border-2 border-dashed border-white/10 rounded-[3rem]">
            <Scissors className="w-16 h-16 mb-4" />
            <p className="font-black uppercase tracking-[0.2em] text-[10px]">Nenhum serviço cadastrado no sistema</p>
          </div>
        ) : (
          services.map((service) => (
            <div 
              key={service.id} 
              className={`bg-black/40 p-8 rounded-[2rem] border transition-all relative group ${
                service.active === false ? "opacity-50 grayscale border-white/5" : "border-white/5 hover:border-amber-500/20"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  service.active === false ? "bg-white/5 text-neutral-500" : "bg-amber-500/10 text-amber-500"
                }`}>
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="p-3 bg-white/5 hover:bg-amber-500 hover:text-black rounded-xl transition-all"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => toggleActive(service)}
                    className={`p-3 rounded-xl transition-all ${
                      service.active === false ? "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                    }`}
                    title={service.active === false ? "Ativar" : "Desativar"}
                  >
                    {service.active === false ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <h5 className="text-xl font-black italic uppercase mb-2 tracking-tighter">{service.name}</h5>
              <div className="space-y-1 mb-6">
                <p className="text-amber-500 font-black italic text-2xl">R${service.price}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" /> {service.duration} min
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${service.active === false ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  {service.active === false ? "Oculto para Clientes" : "Visível no Catálogo"}
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

    const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const dayAppointments = getAppointmentsForDay(day);

        days.push(
          <div
            key={day.toString()}
            onClick={() => handleDaySelect(new Date(day))}
            className={`min-h-[120px] p-2 border transition-all cursor-pointer relative group/day ${
              !isSameMonth(day, monthStart) ? "bg-black/40 opacity-20" : "bg-black/20 hover:bg-neutral-800"
            } ${isToday(day) ? "ring-2 ring-inset ring-amber-500/50" : "border-white/5"} ${
              dayAppointments.length > 0 && isSameMonth(day, monthStart) ? "border-amber-500/20 bg-amber-500/5" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isToday(day) ? "text-amber-500" : "text-neutral-500"}`}>
                {formattedDate}
              </span>
              {dayAppointments.length > 0 && isSameMonth(day, monthStart) && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
            </div>
            <div className="mt-2 space-y-1">
              {dayAppointments.slice(0, 3).map((app) => (
                <div 
                  key={app.id} 
                  className={`text-[8px] p-1.5 rounded-lg truncate font-black border transition-all ${
                    app.status === 'confirmed' ? 'bg-green-500/20 border-green-500/30 text-green-500' : 
                    app.status === 'pending' ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : 
                    'bg-red-500/20 border-red-500/30 text-red-500'
                  }`}
                >
                  {format(app.date.toDate(), "HH:mm")} • {app.clientName?.split(' ')[0]}
                </div>
              ))}
              {dayAppointments.length > 3 && (
                <div className="text-[7px] text-center text-neutral-500 font-bold uppercase py-1 group-hover/day:text-amber-500">
                  + {dayAppointments.length - 3} mais
                </div>
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
      <div className="rounded-[2rem] overflow-hidden border border-white/5">
        <div className="grid grid-cols-7 bg-black/60 border-b border-white/5">
          {dayLabels.map((label, i) => (
            <div key={i} className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {label}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const endDate = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          return (
            <div 
              key={day.toString()} 
              onClick={() => handleDaySelect(day)}
              className={`rounded-[2.5rem] border p-6 min-h-[400px] cursor-pointer transition-all ${
                isToday(day) ? "bg-neutral-800/50 border-amber-500/30 ring-1 ring-amber-500/20" : "bg-black/30 border-white/5 hover:bg-black/50 hover:border-white/20"
              } ${dayAppointments.length > 0 ? "shadow-[0_10px_30px_rgba(0,0,0,0.3)]" : ""}`}
            >
              <div className="text-center mb-6">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">{format(day, "EEEE", { locale: ptBR })}</p>
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-xl font-black italic ${isToday(day) ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-white/5"}`}>
                  {format(day, "d")}
                </div>
              </div>
              <div className="space-y-4">
                {dayAppointments.length === 0 ? (
                  <p className="text-[8px] text-center text-neutral-700 uppercase font-bold mt-12">Sem cortes</p>
                ) : (
                  dayAppointments.map((app) => (
                    <div key={app.id} className="p-4 bg-black/40 rounded-2xl border border-white/5 relative group">
                      <p className="text-amber-500 font-black text-xs italic mb-1">{format(app.date.toDate(), "HH:mm")}</p>
                      <p className="text-[10px] font-bold text-white uppercase truncate mb-2">{app.clientName}</p>
                      <span className={`text-[7px] px-2 py-1 rounded-md border font-black uppercase ${
                         app.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                         app.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 
                         'bg-red-500/10 border-red-500/20 text-red-500'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDay(currentDate).sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
    
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-amber-500 p-8 rounded-[3rem] text-black shadow-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
            <h4 className="text-3xl font-black italic uppercase tracking-tighter">Agenda de Hoje</h4>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black italic leading-none">{dayAppointments.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest leading-none mt-1">Sessões</p>
          </div>
        </div>

        <div className="space-y-4 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-px before:bg-white/10">
          {dayAppointments.length === 0 ? (
            <div className="p-12 text-center bg-black/20 rounded-[2.5rem] border border-dashed border-white/10 opacity-30">
              <Calendar className="w-12 h-12 mx-auto mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">Nenhum agendamento para este dia</p>
            </div>
          ) : (
            dayAppointments.map((app) => (
              <div key={app.id} className="relative pl-12 group">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-900 border-2 border-amber-500/50 flex items-center justify-center z-10 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="bg-neutral-900/50 p-6 rounded-[2rem] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      {app.clientPhoto ? (
                         <img src={app.clientPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-700">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-amber-500 font-black text-xs italic">{format(app.date.toDate(), "HH:mm")}</p>
                      <p className="text-lg font-black uppercase italic leading-none my-1">{app.clientName}</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{app.serviceName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <span className={`text-[9px] px-4 py-2 rounded-xl border font-black uppercase ${
                       app.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 
                       app.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 
                       'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}>
                      {app.status}
                    </span>
                    {(role === 'manager' || role === 'barber') && app.status === 'pending' && (
                      <div className="flex gap-2">
                         <button onClick={() => updateStatus(app.id, 'confirmed')} className="w-10 h-10 bg-green-500 text-black rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-xs font-black italic">✓</button>
                         <button onClick={() => updateStatus(app.id, 'cancelled')} className="w-10 h-10 bg-red-500 text-white rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-xs font-black italic">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <h5 className="text-[10px] text-amber-500 font-black uppercase tracking-[0.4em] mb-1">Período Selecionado</h5>
          <h4 className="text-4xl font-black italic uppercase tracking-tighter">
            {mode === 'day' ? format(currentDate, "d 'de' MMMM", { locale: ptBR }) : 
             mode === 'week' ? `Semana de ${format(startOfWeek(currentDate), "d 'de' MMM", { locale: ptBR })}` :
             format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 border-none" />
          </button>
          <button 
            onClick={() => onDateChange(new Date())}
            className="px-6 h-12 rounded-2xl bg-black border border-white/5 text-[10px] font-black uppercase tracking-widest hover:text-amber-500 transition-colors"
          >Hoje</button>
          <button 
            onClick={() => navigate(1)}
            className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center hover:bg-neutral-800 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${currentDate.getTime()}`}
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
