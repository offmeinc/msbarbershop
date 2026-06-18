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
  AlertTriangle,
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
  LayoutDashboard,
  Terminal
} from "lucide-react";
import React, { useState, useEffect, useRef, useMemo, ChangeEvent, FormEvent, lazy, Suspense, useCallback } from "react";
import confetti from "canvas-confetti";

// --- Custom Hook for Path-based Routing ---
function usePathNavigation<T extends string>(defaultScreen: T) {
  const getScreenFromPath = (): T => {
    if (typeof window === "undefined") return defaultScreen;
    const path = window.location.pathname.replace("/", "");
    return (path as T) || defaultScreen;
  };

  const [currentScreen, _setCurrentScreen] = useState<T>(getScreenFromPath);

  useEffect(() => {
    const handlePopState = () => {
      _setCurrentScreen(getScreenFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [defaultScreen]);

  const setCurrentScreen = useCallback((screen: T) => {
    if (screen === defaultScreen) {
      window.history.pushState(null, "", "/");
      _setCurrentScreen(screen);
    } else {
      window.history.pushState(null, "", `/${screen}`);
      _setCurrentScreen(screen);
    }
  }, [defaultScreen]);

  return { currentScreen, setCurrentScreen };
}

import { BrandLogo } from "./components/common/BrandLogo";
import { Toaster, toast } from "./components/ui/Toast";
import { NotificationModal } from "./components/common/NotificationModal";
import { useFanMode } from "./lib/useFanMode";
import { logToFirestore } from "./lib/logger";

// Helper logic for preloading lazy-loaded components
function makePreloadableLazy<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  let cache: Promise<{ default: T }> | null = null;
  const load = () => {
    if (!cache) {
      cache = importFn();
    }
    return cache;
  };
  const LazyComponent = lazy(load);
  (LazyComponent as any).preload = load;
  return LazyComponent as unknown as React.LazyExoticComponent<T> & { preload: () => Promise<{ default: T }> };
}

// Lazy-loaded components for better initial loading performance with on-demand preloading support
const NotificationsScreen = makePreloadableLazy(() => import("./components/NotificationsScreen").then(m => ({ default: m.NotificationsScreen })));
const EarningsScreen = makePreloadableLazy(() => import("./components/manager/EarningsScreen").then(m => ({ default: m.EarningsScreen })));
const BlockScreen = makePreloadableLazy(() => import("./components/manager/BlockScreen").then(m => ({ default: m.BlockScreen })));
const PromotionsManager = makePreloadableLazy(() => import("./components/manager/PromotionsManager").then(m => ({ default: m.PromotionsManager })));
const HelpScreen = makePreloadableLazy(() => import("./components/manager/OtherScreens").then(m => ({ default: m.HelpScreen })));
const ShareScreen = makePreloadableLazy(() => import("./components/manager/OtherScreens").then(m => ({ default: m.ShareScreen })));
const RecurrenceScreen = makePreloadableLazy(() => import("./components/manager/OtherScreens").then(m => ({ default: m.RecurrenceScreen })));
const ReconScreen = makePreloadableLazy(() => import("./components/manager/UtilityScreens").then(m => ({ default: m.ReconScreen })));
const ProfessionalHome = makePreloadableLazy(() => import("./components/professional/ProfessionalHome").then(m => ({ default: m.ProfessionalHome })));
const ClientDashboardScreen = makePreloadableLazy(() => import("./components/client/ClientDashboardScreen").then(m => ({ default: m.ClientDashboardScreen })));
const ProfileEditScreen = makePreloadableLazy(() => import("./components/common/ProfileEditScreen").then(m => ({ default: m.ProfileEditScreen })));
const BookingScreen = makePreloadableLazy(() => import("./components/client/BookingScreen").then(m => ({ default: m.BookingScreen })));
const ClientsScreen = makePreloadableLazy(() => import("./components/manager/ClientsScreen").then(m => ({ default: m.ClientsScreen })));
const ClientDetailsScreen = makePreloadableLazy(() => import("./components/manager/ClientDetailsScreen").then(m => ({ default: m.ClientDetailsScreen })));
const MoreOptionsScreen = makePreloadableLazy(() => import("./components/common/MoreOptionsScreen").then(m => ({ default: m.MoreOptionsScreen })));
const ClientPortalScreen = makePreloadableLazy(() => import("./components/auth/AuthScreens").then(m => ({ default: m.ClientPortalScreen })));
const CollaboratorLoginScreen = makePreloadableLazy(() => import("./components/auth/AuthScreens").then(m => ({ default: m.CollaboratorLoginScreen })));
const PortfolioManager = makePreloadableLazy(() => import("./components/professional/PortfolioManager").then(m => ({ default: m.PortfolioManager })));
const DashboardScreen = makePreloadableLazy(() => import("./components/manager/DashboardScreen").then(m => ({ default: m.DashboardScreen })));
const ProfessionalClientChatsScreen = makePreloadableLazy(() => import("./components/ChatScreens").then(m => ({ default: m.ProfessionalClientChatsScreen })));
const BarbershopManagement = makePreloadableLazy(() => import("./components/manager/BarbershopManagement").then(m => ({ default: m.BarbershopManagement })));

if (typeof window !== "undefined") {
  (window as any).__pwaPreloaders = {
    home: () => Promise.resolve(),
    booking: () => BookingScreen.preload(),
    agenda: () => DashboardScreen.preload(),
    clients: () => ClientsScreen.preload(),
    "client-details": () => ClientDetailsScreen.preload(),
    more: () => MoreOptionsScreen.preload(),
    "client-login": () => ClientPortalScreen.preload(),
    "client-dashboard": () => ClientDashboardScreen.preload(),
    earnings: () => EarningsScreen.preload(),
    promotions: () => PromotionsManager.preload(),
    portfolio: () => PortfolioManager.preload(),
    "professional-chat": () => ProfessionalClientChatsScreen.preload(),
    "barber-management": () => BarbershopManagement.preload(),
  };
}

import { HomeScreen } from "./components/client/HomeScreen";
import { BottomNav } from "./components/common/BottomNav";
import { WorldCupDecor } from "./components/common/WorldCupDecor";
import { PushPrompt } from "./components/pwa/PushPrompt";

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
  OperationType,
  safeStringify,
  messaging
} from "./lib/firebase";
import { onMessage } from "firebase/messaging";
import { uploadImage } from "./lib/uploadService";
import { getBackendUrl, setupPushSubscription } from "./lib/pushRegister";
import { setupNativePush } from "./lib/nativePush";
import { 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";


type Screen = "home" | "booking" | "agenda" | "clients" | "client-details" | "more" | "login" | "collaborators" | "services" | "client-login" | "client-dashboard" | "earnings" | "promotions" | "portfolio" | "professional-chat" | "barber-management";


function triggerLocalNotification(title: string, body: string, urlPath: string = "/") {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body: body,
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              data: { url: urlPath },
              tag: "chat-or-staff-notification-" + Date.now()
            });
          }).catch(() => {
            new Notification(title, { body: body, icon: "/pwa-192x192.png" });
          });
        } else {
          new Notification(title, { body: body, icon: "/pwa-192x192.png" });
        }
      } catch (err) {
        console.warn("[Local Notification] show failed", err);
        try {
          new Notification(title, { body: body });
        } catch (e) {}
      }
    }
  }
}


export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      logToFirestore('error', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  const [clientLoginCode, setClientLoginCode] = useState<string>("");
  const [loggedInClient, setLoggedInClient] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ais_role_override') || "client";
    }
    return "client";
  });

  const bannerText = typeof window !== 'undefined' ? localStorage.getItem('ais_system_banner') : null;

  // Global Role Override for Developer testing
  useEffect(() => {
    const override = localStorage.getItem('ais_role_override');
    if (override && userRole !== override) {
      setUserRole(override);
    }
  }, [userRole]);

  const { currentScreen, setCurrentScreen } = usePathNavigation<Screen>("home");

  // Global Teleport Override
  useEffect(() => {
    const teleport = localStorage.getItem('ais_nav_teleport');
    if (teleport) {
      localStorage.removeItem('ais_nav_teleport');
      setCurrentScreen(teleport as any);
    }
  }, [setCurrentScreen]);

  // Global UI Customization Override
  useEffect(() => {
    const customColor = localStorage.getItem('ais_custom_color');
    if (customColor) {
      document.documentElement.style.setProperty('--primary-color', customColor);
    }
  }, []);
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFanMode, setIsFanMode] = useFanMode();
  const [isButtonFaded, setIsButtonFaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Hiding ball button...");
      setIsButtonFaded(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const validScreens = ["home", "booking", "agenda", "clients", "client-details", "more", "login", "collaborators", "services", "client-login", "client-dashboard", "earnings", "promotions", "portfolio", "professional-chat", "barber-management", "checkout"];
  const displayScreen = validScreens.includes(currentScreen as string) ? currentScreen : "home";

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 100);
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

  const [dashboardView, setDashboardView] = useState<"list" | "agenda" | "services" | "hours" | "collaborators">("agenda");
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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    console.log("toggleTheme called. Changing state to:", nextMode);
    setIsDarkMode(nextMode);
    localStorage.setItem("theme", nextMode ? "dark" : "light");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setIsDarkMode(e.matches);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  
  const hasNotifiedAccess = useRef<string | null>(null);
  const [clientUnreadChats, setClientUnreadChats] = useState(0);
  const [clientUnreadNotifications, setClientUnreadNotifications] = useState(0);
  const [staffUnreadChats, setStaffUnreadChats] = useState(0);

  const forceSyncNotifications = useCallback(async () => {
    try {
      const firestore = db || getFirestore();
      if (!firestore) return;

      console.log("[Notification Sync Manager] Synchronizing unread counts...");

      let cUid = "";
      if (user && userRole === "client") cUid = user.uid;
      else if (loggedInClient) cUid = loggedInClient.id;

      if (cUid) {
        // Refresh client-side unread states
        const chatSnap = await getDoc(doc(firestore, "chats", cUid));
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          setClientUnreadChats(data?.unreadByClient ? 1 : 0);
        }
        
        const qN = query(
          collection(firestore, "notifications"), 
          where("clientId", "==", cUid), 
          where("read", "==", false)
        );
        const nSnap = await getDocs(qN);
        setClientUnreadNotifications(nSnap.size);

        // Map and check for missed notifications (e.g. idle device wakeups)
        const clientNotifs = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        clientNotifs.forEach((docData: any) => {
          if (isInitialSyncRef.current) {
            notifiedIdsRef.current.add(docData.id);
          } else if (!notifiedIdsRef.current.has(docData.id)) {
            notifiedIdsRef.current.add(docData.id);
            
            // Re-sync alert triggered synchronously!
            triggerLocalNotification(
              docData.title || "MS Barbearia ⭐", 
              docData.message || "Nova atualização disponível."
            );
            
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
              toast.info(docData.message || "Nova atualização recebida!");
            }
          }
        });
      }

      if (["manager", "barber", "developer"].includes(userRole)) {
        // Refresh staff-side unread states
        const qC = query(
          collection(firestore, "chats"), 
          where("unreadByStaff", "==", true)
        );
        const cSnap = await getDocs(qC);
        setStaffUnreadChats(cSnap.size);

        const qSN = query(
          collection(firestore, "staff_notifications"), 
          orderBy("timestamp", "desc"), 
          limit(20)
        );
        const snSnap = await getDocs(qSN);
        const snData = snSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStaffNotifications(snData);

        // Check for missed unread staff notifications (wake up from idle)
        snData.forEach((docData: any) => {
          if (docData.read === false) {
            if (isInitialSyncRef.current) {
              notifiedIdsRef.current.add(docData.id);
            } else if (!notifiedIdsRef.current.has(docData.id)) {
              notifiedIdsRef.current.add(docData.id);
              
              const title = docData.title || "Alerta de Agendamento 📅";
              const message = docData.message || "Você tem uma nova reserva ou cancelamento.";
              triggerLocalNotification(title, message, "/agenda");
              
              if (typeof document !== "undefined" && document.visibilityState === "visible") {
                toast.success(`${title}: ${message}`);
              }
            }
          }
        });
      }
      
      // Initial baseline check successfully completed
      isInitialSyncRef.current = false;
      console.log("[Notification Sync Manager] Synchronization complete.");
    } catch (e) {
      console.warn("[Notification Sync Manager] Forced sync failed:", e);
    }
  }, [user, userRole, loggedInClient]);

  // Global Notification Sync Manager: Re-sync on page focus or PWA visibility change
  useEffect(() => {
    const handleSync = async () => {
      console.log("[PWA Sync Manager] App focused, visible or waking up from idle. Checking service worker ready...");
      
      // Robust service-worker readiness check
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          console.log("[PWA Sync Manager] Service worker ready active scope:", registration.scope);
          
          // Background trigger to fetch the latest cache list and updates
          await registration.update();
          console.log("[PWA Sync Manager] PWA cache was successfully checked/updated.");
        } catch (swErr) {
          console.warn("[PWA Sync Manager] Service worker ready/update check skipped or failed:", swErr);
        }
      }
      
      await forceSyncNotifications();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleSync);
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          handleSync();
        }
      };
      document.addEventListener("visibilitychange", onVisibilityChange);
      
      // Initial sync on mount
      handleSync();

      return () => {
        window.removeEventListener("focus", handleSync);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }
  }, [forceSyncNotifications]);


  const lastProcessedClientMsgTimeRef = useRef<number>(0);
  const lastProcessedStaffChatsRef = useRef<Record<string, number>>({});
  const lastProcessedStaffNotificationTimeRef = useRef<number>(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const isInitialSyncRef = useRef<boolean>(true);

  // 1. Initial Prompt for Notifications on Launch (for PWAs and Standard Browsers)
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          console.log("[Push] Initial permission request result:", perm);
        }).catch(console.error);
      }
    }
  }, []);

  // 2. Synchronized push subscriptions (Web FCM + native Capacitor) and professional access alert
  useEffect(() => {
    let id = "";
    let name = "";
    let role = "client";

    if (user) {
      id = user.uid;
      name = user.displayName || user.email || "Usuário";
      role = userRole;
    } else if (loggedInClient) {
      id = loggedInClient.id;
      name = loggedInClient.name || "Cliente";
      role = "client";
    }

    if (id) {
      // Setup Web VAPID/FCM or Native Apple/Android push depending on runtime context
      const cleanUid = id.replace(/[\s\-\(\)\+]/g, "");
      setupNativePush(id, role).catch(console.error);
      setupPushSubscription(cleanUid, role).catch(console.error);

      // Report client access to the workspace so barbers get live browser + push notification alerts
      if (role === "client" && hasNotifiedAccess.current !== id) {
        hasNotifiedAccess.current = id;
        fetch("/api/user-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: id, userName: name, role })
        }).then((res) => {
          if (!res.ok) console.warn("[Access Notification] Send failed");
        }).catch((err) => {
          console.error("[Access Notification] Endpoint failed:", err);
        });
      }
    }
  }, [user, loggedInClient, userRole]);

  // 3. Listen to live client-side notifications/chats to update icon badges in real-time
  useEffect(() => {
    let clientUid = "";
    if (user && userRole === "client") {
      clientUid = user.uid;
    } else if (loggedInClient) {
      clientUid = loggedInClient.id;
    }

    if (!clientUid) {
      setClientUnreadChats(0);
      setClientUnreadNotifications(0);
      return;
    }

    const firestore = db || getFirestore();
    if (!firestore) return;

    const chatRef = doc(firestore, "chats", clientUid);
    const unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
      // Establish baseline if not set
      const isInitialRun = lastProcessedClientMsgTimeRef.current === 0;

      if (snapshot.exists()) {
        const data = snapshot.data();
        const unread = !!data.unreadByClient;
        setClientUnreadChats(unread ? 1 : 0);

        const msgTime = data.lastMessageTime && typeof data.lastMessageTime.toDate === "function"
          ? data.lastMessageTime.toDate().getTime()
          : (data.lastMessageTime && data.lastMessageTime._seconds ? data.lastMessageTime._seconds * 1000 : new Date(data.lastMessageTime || 0).getTime());

        // Notify if it's a new message since baseline and recent enough
        if (unread && msgTime > lastProcessedClientMsgTimeRef.current) {
          if (!isInitialRun && Date.now() - msgTime < 60000) {
            const bodyText = data.lastMessage || "Nova mensagem recebida! 💬";
            console.log("[Notification System] Client Chat Trigger:", bodyText);
            setTimeout(() => toast.success(`MS Barbearia: ${bodyText}`), 0);
            triggerLocalNotification("Nova mensagem - MS Barbearia 💬", bodyText, "/");
          }
          lastProcessedClientMsgTimeRef.current = msgTime;
        } else if (!unread || msgTime > 0) {
           // Keep track of time even if not alerting
           if (msgTime > lastProcessedClientMsgTimeRef.current) {
             lastProcessedClientMsgTimeRef.current = msgTime;
           }
        }
      } else {
        setClientUnreadChats(0);
      }
    }, () => {
      setClientUnreadChats(0);
    });

    const q = query(
      collection(firestore, "notifications"),
      where("clientId", "==", clientUid),
      where("read", "==", false)
    );
    const unsubscribeNotifications = onSnapshot(q, (snapshot) => {
      setClientUnreadNotifications(snapshot.size);
    }, () => {
      setClientUnreadNotifications(0);
    });

    return () => {
      unsubscribeChat();
      unsubscribeNotifications();
    };
  }, [user, loggedInClient, userRole]);

  // 4. Global App Badge Manager
  // Responsable for aggregating all unread items and updating the PWA/Navigator badge
  useEffect(() => {
    if (typeof window === "undefined" || !("setAppBadge" in navigator)) return;

    let totalCount = 0;
    if (userRole === "client" || (!user && loggedInClient)) {
      totalCount = clientUnreadChats + clientUnreadNotifications;
    } else if (["manager", "barber", "developer"].includes(userRole)) {
      const unreadStaffNotifications = staffNotifications.filter(n => !n.read).length;
      totalCount = staffUnreadChats + unreadStaffNotifications;
    }

    try {
      if (totalCount > 0) {
        (navigator as any).setAppBadge(totalCount).catch((err: any) => 
          console.warn("[Badge Manager] Set failed:", err)
        );
      } else {
        (navigator as any).clearAppBadge().catch((err: any) => 
          console.warn("[Badge Manager] Clear failed:", err)
        );
      }
    } catch (e) {
      console.warn("[Badge Manager] Internal error:", e);
    }
  }, [clientUnreadChats, clientUnreadNotifications, staffUnreadChats, staffNotifications, userRole, user, loggedInClient]);

  // 4. Web FCM Foreground Message Handler
  useEffect(() => {
    const setupForegroundMessaging = async () => {
      const msg = await messaging();
      if (!msg) return;

      onMessage(msg, (payload) => {
        console.log("Foreground message received:", payload);
        const title = payload.notification?.title || payload.data?.title || "Nova Notificação";
        const body = payload.notification?.body || payload.data?.body || "";
        toast.success(`${title}: ${body}`);
      });
    };
    setupForegroundMessaging();
  }, []);
  
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Synchronize browser status bar theme meta tags dynamically for mobile/PWA environments
  useEffect(() => {
    if (typeof window === "undefined") return;

    let themeColor = "#000000"; // Deep black default to match the app's native layout color
    if (isFanMode) {
      themeColor = "#06110b"; // Forest green base for active Copa/Fan Mode
    }

    // 1. Update theme-color meta tag
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', themeColor);

    // 2. Optimize Safari / PWA statusbar style
    let metaAppleStyle = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaAppleStyle) {
      metaAppleStyle = document.createElement('meta');
      metaAppleStyle.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaAppleStyle);
    }
    metaAppleStyle.setAttribute('content', 'black-translucent');

    // 3. Keep root backgrounds identical to prevent iOS viewport elastic overflow flashes
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;
  }, [isDarkMode, isFanMode]);

  // Proactive background preloading of major screens when the app goes idle
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Always pre-warm the primary page for clients
        BookingScreen.preload().catch(() => {});
        
        if (userRole === "client") {
          ClientDashboardScreen.preload().catch(() => {});
        } else if (["manager", "barber", "developer"].includes(userRole)) {
          DashboardScreen.preload().catch(() => {});
          ClientsScreen.preload().catch(() => {});
          ProfessionalHome.preload().catch(() => {});
        }
        
        // Minor pre-warm options screen
        MoreOptionsScreen.preload().catch(() => {});
      } catch (e) {
        console.warn("[Background Preloader] Failed to pre-warm modules:", e);
      }
    }, 1500); // 1.5 seconds delay so we don't interfere with the critical rendering path
    return () => clearTimeout(timer);
  }, [userRole]);

  useEffect(() => {
    if (!['manager', 'barber', 'developer'].includes(userRole)) {
      setStaffNotifications([]);
      setStaffUnreadChats(0);
      return;
    }
    
    // Ensure db is available
    const firestore = db || getFirestore();
    if (!firestore) return;

    const qNotifications = query(
      collection(firestore, "staff_notifications"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    
    const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
      // First snapshot or empty snapshot establishes baseline
      const isInitialRun = lastProcessedStaffNotificationTimeRef.current === 0;
      let highestTime = lastProcessedStaffNotificationTimeRef.current;
      
      const data = snapshot.docs.map(docSnap => {
        const nData = docSnap.data();
        const timestamp = nData.timestamp && typeof nData.timestamp.toDate === "function"
          ? nData.timestamp.toDate().getTime()
          : (nData.timestamp && nData.timestamp._seconds ? nData.timestamp._seconds * 1000 : new Date(nData.timestamp || 0).getTime());
          
        if (timestamp > highestTime) {
          highestTime = timestamp;
        }

        // Notify if it's a new notification (not from baseline snapshot) and recent enough
        if (!isInitialRun && timestamp > lastProcessedStaffNotificationTimeRef.current) {
          if (Date.now() - timestamp < 60000) { // 60 seconds window for fresh notifications
            const title = nData.title || "Alerta do Sistema 💈";
            const message = nData.message || "Nova atualização recebida.";
            console.log("[Notification System] Staff Notification Trigger:", title);
            setTimeout(() => toast.success(`${title}: ${message}`), 0);
            triggerLocalNotification(title, message, "/agenda");
          }
        }
        
        return { id: docSnap.id, ...nData };
      });
      
      setStaffNotifications(data);
      if (highestTime > 0) {
        lastProcessedStaffNotificationTimeRef.current = highestTime;
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "staff_notifications");
    });

    const qChats = query(
      collection(firestore, "chats"),
      where("unreadByStaff", "==", true)
    );

    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const isInitialRun = Object.keys(lastProcessedStaffChatsRef.current).length === 0 && staffUnreadChats === 0;
      setStaffUnreadChats(snapshot.size);

      snapshot.docChanges().forEach((change) => {
        const docData = change.doc.data();
        const chatId = change.doc.id;
        const msgTime = docData.lastMessageTime && typeof docData.lastMessageTime.toDate === "function"
          ? docData.lastMessageTime.toDate().getTime()
          : (docData.lastMessageTime && docData.lastMessageTime._seconds ? docData.lastMessageTime._seconds * 1000 : new Date(docData.lastMessageTime || 0).getTime());

        const prevTime = lastProcessedStaffChatsRef.current[chatId] || 0;
        
        // Notify if time increased and not in the initial baseline set
        if (msgTime > prevTime) {
          if (!isInitialRun && Date.now() - msgTime < 60000) {
            const clientName = docData.clientName || "Cliente";
            const bodyText = docData.lastMessage || "Nova mensagem recebida! 💬";
            console.log("[Notification System] Staff Chat Trigger:", clientName);
            setTimeout(() => toast.success(`${clientName}: ${bodyText}`), 0);
            triggerLocalNotification(`${clientName} enviou uma mensagem 💬`, bodyText, "/professional-chat");
          }
          lastProcessedStaffChatsRef.current[chatId] = msgTime;
        }
      });

      // Update baseline for any document in the snapshot
      snapshot.docs.forEach((docSnap) => {
        const docData = docSnap.data();
        const chatId = docSnap.id;
        const msgTime = docData.lastMessageTime && typeof docData.lastMessageTime.toDate === "function"
          ? docData.lastMessageTime.toDate().getTime()
          : (docData.lastMessageTime && docData.lastMessageTime._seconds ? docData.lastMessageTime._seconds * 1000 : new Date(docData.lastMessageTime || 0).getTime());
        
        if (msgTime > (lastProcessedStaffChatsRef.current[chatId] || 0)) {
           lastProcessedStaffChatsRef.current[chatId] = msgTime;
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chats");
    });
    
    return () => {
      unsubscribeNotifications();
      unsubscribeChats();
    };
  }, [userRole]);


  useEffect(() => {
    if (!user || userRole === 'client') return;
    
    const firestore = db || getFirestore();
    if (!firestore) return;

    const q = (userRole === 'manager') 
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
              setCurrentScreen("client-dashboard");
            } else {
              const data = userDoc.data();
              console.log("User document found. Role:", data?.role);
              if ((firebaseUser.email === "marley@marley.com" || firebaseUser.email === "51992590046@barbershop.com") && data?.role !== "manager") {
                updateDoc(userDocRef, { role: "manager" });
                setUserRole("manager");
              } else {
                const role = data?.role || "client";
                setUserRole(role);
                if (role === 'client') {
                    setCurrentScreen("client-dashboard");
                }
              }
            }
          }).catch(error => {
            console.error("Error inside getDoc logic:", error);
          });
        } catch (error) {
          console.error("Error fetching/creating user data", error);
        }
      } else {
        console.log("Auth state changed: User logged out");
        setUserRole("client");
        
        // Restore client session if no Firebase user
        const savedClient = localStorage.getItem('loggedInClient');
        if (savedClient) {
          const parsedClient = JSON.parse(savedClient);
          setLoggedInClient(parsedClient);
          setCurrentScreen("client-dashboard");
        }
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
      if (error.code === 'auth/email-already-in-use') {
        message = isEmail 
          ? "Este endereço de e-mail já está cadastrado. Se você já tem uma conta, tente fazer login ou usar outra credencial." 
          : "Este número de telefone/WhatsApp já está cadastrado. Caso já possua uma conta, faça login diretamente.";
      }
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = "E-mail/Telefone ou senha incorretos.";
      if (error.code === 'auth/user-not-found') message = "Usuário não encontrado.";
      if (error.code === 'auth/invalid-email') message = "Número de telefone ou e-mail inválido.";
      if (error.code === 'auth/weak-password') message = "A senha deve ter pelo menos 6 caracteres.";
      toast.error(message);
    } finally {
      isSigningUp.current = false;
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // 1. Sign out Firebase user
    await signOut(auth);
    
    // 2. Clear client session
    setLoggedInClient(null);
    
    // 3. Reset roles and UI State
    setUserRole("client");
    
    // 4. Clear storage
    localStorage.removeItem('loggedInClient');
    localStorage.removeItem('userRole'); // Ensure this is also cleared if it's used
    
    // 5. Reset screen
    setCurrentScreen("home");
  };

  const handleClientLogin = async (phone: string) => {
    if (!phone) {
      toast.error("O número de WhatsApp é obrigatório.");
      return;
    }
    // Search by cleaned whatsapp number
    const cleanPhone = phone.replace(/\D/g, '');
    const firestore = db || getFirestore();
    const userQuery = query(collection(firestore, "users"), where("whatsapp", "==", cleanPhone));
    const userSnapshot = await getDocs(userQuery);
    
    // Try original phone too just in case
    let docs = userSnapshot.docs;
    if (docs.length === 0) {
      const altQuery = query(collection(firestore, "users"), where("whatsapp", "==", phone));
      const altSnap = await getDocs(altQuery);
      docs = altSnap.docs;
    }

    if (docs.length === 0) {
        toast.error("Nenhum cadastro encontrado com este WhatsApp. Agende um horário primeiro para criar seu cadastro!");
        return;
    }

    const userData = docs[0].data();
    const clientData = { id: docs[0].id, ...userData };
    setLoggedInClient(clientData);
    localStorage.setItem('loggedInClient', safeStringify(clientData));
    setCurrentScreen("client-dashboard");
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
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
    <div className="min-h-[100dvh] bg-black text-white font-sans selection:bg-amber-500/30 pb-24 md:pb-0 overflow-x-hidden w-full relative">
      {bannerText && (
        <div className="bg-red-600 text-white py-1.5 px-4 overflow-hidden relative z-[9999] border-b border-black/20">
          <div className="flex whitespace-nowrap animate-marquee">
             <div className="flex items-center gap-12 min-w-full justify-around pr-12">
               {[1,2,3,4,5,6].map(i => (
                 <span key={i} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   <AlertTriangle className="w-3 h-3" /> {bannerText} 
                 </span>
               ))}
             </div>
          </div>
        </div>
      )}
      <WorldCupDecor isFanMode={isFanMode} />
      <PushPrompt userId={user?.uid || loggedInClient?.id} userRole={userRole} />
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
        className="liquid-glass !rounded-none !rounded-b-[2rem] fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl pt-[max(env(safe-area-inset-top),1rem)] lg:pt-[max(env(safe-area-inset-top),0rem)]"
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
            {displayScreen !== "home" && (
              <button onClick={() => setCurrentScreen("home")} className="hover:text-amber-500 transition-colors">Início</button>
            )}
            {displayScreen === "home" && (
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
                    setDashboardView("agenda");
                    setCurrentScreen("agenda");
                  }}
                  className={`hover:text-amber-500 transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest leading-none ${displayScreen === "agenda" && dashboardView === "agenda" ? "text-amber-500" : "text-neutral-400"}`}
                >
                  Agenda
                </button>
                {(userRole === "manager" || userRole === "barber" || userRole === "developer") && (
                  <button 
                    onClick={() => {
                      setDashboardView("list");
                      setCurrentScreen("agenda");
                    }}
                    className={`hover:text-amber-500 transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest leading-none ${displayScreen === "agenda" && dashboardView === "list" ? "text-amber-500" : "text-neutral-400"}`}
                  >
                    Atendimentos
                  </button>
                )}
                {(userRole === "manager" || userRole === "barber" || userRole === "developer") && (
                  <>
                    {(userRole === "manager" || userRole === "developer") && (
                        <button 
                          onClick={() => setCurrentScreen("collaborators")}
                          className={`hover:text-white transition-colors flex items-center gap-2 ${displayScreen === "collaborators" ? "text-amber-500" : ""}`}
                        >
                          Equipe
                        </button>
                    )}
                    <button 
                      onClick={() => setCurrentScreen("services")}
                      className={`hover:text-white transition-colors flex items-center gap-2 ${displayScreen === "services" ? "text-amber-500" : ""}`}
                    >
                      Serviços
                    </button>
                  </>
                )}
                <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                  <div className="text-right">
                    <p className="text-white text-xs font-bold leading-none">{user.displayName}</p>
                    {userRole === 'developer' ? (
                      <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-widest animate-pulse leading-none mt-1">
                        <Terminal className="w-2 h-2" /> Dev / Admin
                      </span>
                    ) : (
                      <p className="text-[10px] text-amber-500 capitalize font-black">{userRole}</p>
                    )}
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
                      <div className="liquid-glass w-10 h-10 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                  </div>

                  {['manager', 'barber', 'developer'].includes(userRole) && (
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
                            className="absolute right-0 mt-4 w-80 liquid-glass  rounded-2xl shadow-2xl z-50 p-4 max-h-[32rem] flex flex-col"
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
                    onClick={() => setCurrentScreen(displayScreen === "more" ? "home" : "more")} 
                    className={`p-2 rounded-lg transition-all ${displayScreen === 'more' ? 'bg-amber-500 text-black' : 'bg-white/5 text-neutral-400 hover:bg-amber-500/20 hover:text-amber-500'}`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : loggedInClient ? (
              <div className="flex items-center gap-6">
                <button 
                  onClick={handleLogout}
                  className={`hover:text-amber-500 transition-colors flex items-center gap-2 uppercase text-[10px] font-black tracking-widest leading-none ${displayScreen === "client-dashboard" ? "text-amber-500" : "text-neutral-400"}`}
                >
                  Sair
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
                      <div className="liquid-glass w-10 h-10 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
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

      <main className="pt-[calc(max(env(safe-area-inset-top),1rem)+6rem)] lg:pt-[calc(max(env(safe-area-inset-top),0rem)+6rem)] max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={displayScreen}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="w-full"
            >
              {displayScreen === "home" && (
                (['manager', 'barber', 'developer'].includes(userRole)) 
                ? <ProfessionalHome 
                    user={user} 
                    role={userRole} 
                    services={services}
                    setCurrentScreen={(screen) => {
                      if (screen === "agenda") {
                        setDashboardView("agenda");
                      }
                      setCurrentScreen(screen);
                    }} 
                  /> 
                : <HomeScreen 
                    services={services} 
                    onStartBooking={() => setCurrentScreen("booking")} 
                    user={user} 
                    userRole={userRole} 
                    isFanMode={isFanMode}
                    setIsFanMode={setIsFanMode}
                    isScrolled={isScrolled}
                  />
              )}
              {displayScreen === "login" && <CollaboratorLoginScreen onLogin={handleLogin} setCurrentScreen={setCurrentScreen} setRequestedRole={setRequestedRole} />}
              {displayScreen === "client-login" && <ClientPortalScreen onLogin={handleClientLogin} onBack={() => setCurrentScreen("home")} />}
              {(displayScreen === "client-dashboard" || displayScreen === "checkout") && <ClientDashboardScreen user={loggedInClient} onBack={() => setCurrentScreen("home")} />}
              {displayScreen === "booking" && <BookingScreen user={user} role={userRole} services={services} onBack={() => { setCurrentScreen("home"); setAppointmentToEdit(null); setClientToSchedule(null); }} editAppointment={appointmentToEdit} initialClient={clientToSchedule} />}
              {displayScreen === "agenda" && <DashboardScreen user={user} role={userRole} services={services} dashboardView={dashboardView} onBack={() => setCurrentScreen("home")} onNewBooking={() => setCurrentScreen("booking")} onEditBooking={(app) => { setAppointmentToEdit(app); setCurrentScreen("booking"); }} />}
              {displayScreen === "collaborators" && <DashboardScreen user={user} role={userRole} services={services} dashboardView="collaborators" onBack={() => setCurrentScreen("home")} onNewBooking={() => setCurrentScreen("booking")} onEditBooking={(app) => { setAppointmentToEdit(app); setCurrentScreen("booking"); }} />}
              {displayScreen === "services" && <DashboardScreen user={user} role={userRole} services={services} dashboardView="services" onBack={() => setCurrentScreen("home")} onNewBooking={() => setCurrentScreen("booking")} onEditBooking={(app) => { setAppointmentToEdit(app); setCurrentScreen("booking"); }} />}
              {displayScreen === "earnings" && <EarningsScreen onBack={() => setCurrentScreen("home")} />}
              {displayScreen === "promotions" && <PromotionsManager onBack={() => setCurrentScreen("home")} />}
              {displayScreen === "clients" && <ClientsScreen user={user} role={userRole} onBack={() => setCurrentScreen("home")} onScheduleClient={(client) => { setClientToSchedule(client); setCurrentScreen("booking"); }} onClientClick={(client) => { setSelectedClient(client); setCurrentScreen("client-details"); }} />}
              {displayScreen === "client-details" && selectedClient && <ClientDetailsScreen client={selectedClient} onBack={() => { setCurrentScreen("clients"); setSelectedClient(null); }} onScheduleClient={(client) => { setClientToSchedule(client); setCurrentScreen("booking"); }} onMessageClient={(client) => { setSelectedClient(client); setCurrentScreen("professional-chat"); }} />}
              {displayScreen === "portfolio" && <PortfolioManager onBack={() => setCurrentScreen("home")} />}
              {displayScreen === "barber-management" && <BarbershopManagement user={user} role={userRole} onBack={() => setCurrentScreen("home")} />}
              {displayScreen === "professional-chat" && (
                <ProfessionalClientChatsScreen 
                  user={user} 
                  onBack={() => { setCurrentScreen("home"); setSelectedClient(null); }} 
                  initialClientId={selectedClient?.id} 
                  initialClientName={selectedClient?.name} 
                />
              )}
              {displayScreen === "more" && (
                <MoreOptionsScreen 
                  user={user || loggedInClient} 
                  role={userRole} 
                  onLogout={handleLogout} 
                  onBack={() => setCurrentScreen("home")}
                  staffNotifications={staffNotifications}
                  appointments={appointments}
                  onClearNotifications={async () => {
                    if (!confirm("Tem certeza que deseja limpar todo o feed de notificações?")) return;
                    await Promise.all(staffNotifications.map(n => deleteDoc(doc(db, "staff_notifications", n.id))));
                    toast.success("Feed limpo com sucesso!");
                  }}
                  onToggleTheme={toggleTheme}
                  isDarkMode={isDarkMode}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      <BottomNav 
        userRole={userRole} 
        currentScreen={displayScreen} 
        setCurrentScreen={setCurrentScreen} 
        user={user} 
        unreadCount={staffNotifications.filter(n => !n.read).length}
        isVisible={!hidden}
      />

      {['manager', 'barber', 'developer'].includes(userRole) && (
        <NotificationModal 
            notifications={staffNotifications}
            onClose={() => {}}
            onMarkAsRead={async (id) => {
                await updateDoc(doc(db, "staff_notifications", id), { read: true });
            }}
        />
      )}

      {currentScreen === "home" && (
        <>
          <div className="max-w-md mx-auto px-6 pt-8 pb-3 text-center space-y-4">
            <div className="liquid-glass h-[1px] w-1/4 mx-auto" />
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
              <div className="liquid-glass w-[1px] h-2.5" />
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">
                <CreditCard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Crédito</span>
              </div>
              <div className="liquid-glass w-[1px] h-2.5" />
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
            />

            {/* Sidebar Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="liquid-glass fixed top-0 right-0 h-full w-[85%] max-w-[340px] z-50 backdrop-blur-2xl !rounded-none !rounded-l-[2rem] !border-r-0 !border-y-0 !border-l flex flex-col justify-between shadow-2xl pt-[calc(1.5rem+env(safe-area-inset-top))] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
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
                  className="liquid-glass p-2 rounded-full text-neutral-400 hover:text-white transition-all hover:rotate-90 duration-200"
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
                      if (userRole === "manager" || userRole === "developer") {
                        menuItems.push({
                          label: "Agenda",
                          icon: <Calendar className="w-4 h-4" />,
                          onClick: () => { setDashboardView("agenda"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "agenda"
                        });
                        menuItems.push({
                          label: "Atendimentos",
                          icon: <Scissors className="w-4 h-4" />,
                          onClick: () => { setDashboardView("list"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "list"
                        });
                        if (userRole === "developer") {
                          menuItems.push({
                            label: "Painel Dev",
                            icon: <Terminal className="w-4 h-4" />,
                            onClick: () => { setDashboardView("developer"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                            isActive: currentScreen === "agenda" && dashboardView === "developer"
                          });
                        }
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
                          onClick: () => { setDashboardView("agenda"); setCurrentScreen("agenda"); setIsMenuOpen(false); },
                          isActive: currentScreen === "agenda" && dashboardView === "agenda"
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
                        onClick: () => { handleLogout(); setIsMenuOpen(false); },
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
                    <div className="liquid-glass flex items-center gap-3 p-3 rounded-2xl">
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
      
      {/* Floating 2026 World Cup Ball Switch */}
      <AnimatePresence>
        {!isButtonFaded && (
          <motion.button
            key="wc-floater"
            drag
            dragMomentum={false}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.15, rotate: 360, transition: { duration: 0.6 } }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const nextFanMode = !isFanMode;
              setIsFanMode(nextFanMode);
              if (nextFanMode) {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate([50, 30, 50]);
                }
                // Trigger glorious green & yellow confetti bursts from corners
                confetti({
                  particleCount: 100,
                  angle: 60,
                  spread: 60,
                  origin: { x: 0, y: 1 },
                  colors: ["#22c55e", "#eab308", "#10b981", "#facc15", "#ffffff"]
                });
                confetti({
                  particleCount: 100,
                  angle: 120,
                  spread: 60,
                  origin: { x: 1, y: 1 },
                  colors: ["#eab308", "#22c55e", "#facc15", "#10b981", "#ffffff"]
                });
              }
            }}
            className={`fixed z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(34,197,94,0.4)] cursor-pointer select-none transition-all duration-300 ${
              isFanMode 
                ? "bg-gradient-to-tr from-green-600 via-yellow-400 to-emerald-500 border-2 border-yellow-200 shadow-yellow-400/20" 
                : "bg-neutral-800 border-2 border-neutral-700 text-white"
            } bottom-32 right-5 md:bottom-8 md:right-8`}
            title="Alternar Tema Copa do Mundo 2026"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${
                isFanMode ? "bg-yellow-400" : "bg-green-500"
              }`} style={{ animationDuration: '2s' }} />
              
              <span className="text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] select-none">
                ⚽
              </span>
              
              <span className={`absolute -top-1 -right-1 text-[8px] font-black tracking-tighter px-1.5 py-0.5 rounded-full border border-black/20 ${
                isFanMode ? "bg-green-600 text-white" : "bg-yellow-400 text-black"
              }`}>
                '26
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}









