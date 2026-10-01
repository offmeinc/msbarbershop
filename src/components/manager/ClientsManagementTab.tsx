import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  limit, 
  doc, 
  updateDoc, 
  Timestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { 
  Users, 
  Calendar, 
  CalendarCheck, 
  CalendarClock, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  Award, 
  Scissors, 
  UserCheck, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ArrowUpRight, 
  ShieldAlert, 
  Filter, 
  Star, 
  Save, 
  X, 
  CalendarPlus, 
  Loader2,
  Smile,
  Flame,
  ArrowRight,
  Bell,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  subDays, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subWeeks, 
  subMonths, 
  parseISO, 
  isSameDay, 
  isSameWeek, 
  isSameMonth, 
  differenceInDays, 
  addDays 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "../ui/Toast";
import { triggerLightHaptic } from "../../lib/haptics";
import { BARBERSHOP_NAME } from "../../constants";

interface ClientsManagementTabProps {
  appointments: any[];
  barbers: any[];
  user: any;
  role: string;
  onScheduleClient?: (client: any) => void;
}

export function ClientsManagementTab({
  appointments,
  barbers,
  user,
  role,
  onScheduleClient
}: ClientsManagementTabProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<
    "all" | "today" | "week" | "month" | "upcoming" | "vip" | "overdue"
  >("all");
  const [selectedClientModal, setSelectedClientModal] = useState<any | null>(null);
  const [clientNotes, setClientNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [sendingPushClientIds, setSendingPushClientIds] = useState<string[]>([]);
  const [batchPushLoading, setBatchPushLoading] = useState(false);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    client: any;
    templateIndex: number;
    customMessage: string;
  } | null>(null);

  // Real-time listener for users with role="client"
  useEffect(() => {
    setLoadingClients(true);
    const q = query(collection(db, "users"), where("role", "==", "client"), limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setClients(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingClients(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
        setLoadingClients(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Standardized Date Parser
  const getAppDate = (app: any): Date => {
    if (!app || !app.date) return new Date(0);
    if (app.date instanceof Timestamp) return app.date.toDate();
    if (app.date?.toDate && typeof app.date.toDate === "function") return app.date.toDate();
    if (app.date instanceof Date) return app.date;
    if (typeof app.date === "string") {
      if (app.time && typeof app.time === "string" && app.date.length === 10) {
        const parsedWithTime = parseISO(`${app.date}T${app.time.length === 5 ? app.time + ":00" : app.time}`);
        if (!isNaN(parsedWithTime.getTime())) return parsedWithTime;
      }
      const parsed = parseISO(app.date);
      if (!isNaN(parsed.getTime())) return parsed;
      const direct = new Date(app.date);
      if (!isNaN(direct.getTime())) return direct;
    }
    return new Date(app.date);
  };

  // Helper to normalize phone numbers (strip non-digits and Brazilian 55 country code)
  const normalizePhone = (phone: any): string => {
    if (!phone) return "";
    let digits = String(phone).replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("55")) {
      digits = digits.slice(2);
    }
    return digits;
  };

  // Standardized Price Parser
  const getAppPrice = (app: any): number => {
    const p = app.totalPrice || app.price || 0;
    if (typeof p === "number") return p;
    if (typeof p === "string") {
      const num = parseFloat(p.replace(/[^0-9.-]+/g, ""));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Filter appointments if user selected a specific barber
  const activeAppointments = useMemo(() => {
    if (selectedBarberFilter === "all") return appointments;
    return appointments.filter((a) => a.barberId === selectedBarberFilter);
  }, [appointments, selectedBarberFilter]);

  // Combine registered clients with unique clients detected in appointments
  const combinedClients = useMemo(() => {
    const clientMap = new Map<string, any>();
    const keyToIndex = new Map<string, string>();

    const getExistingClientId = (phone?: string, email?: string, id?: string, uid?: string): string | null => {
      const normPhone = normalizePhone(phone);
      const normEmail = (email || "").trim().toLowerCase();
      const normIdPhone = normalizePhone(id);
      const normUidPhone = normalizePhone(uid);

      const candidateKeys = [
        normPhone ? `p_${normPhone}` : null,
        (normIdPhone.length >= 10 && normIdPhone.length <= 13) ? `p_${normIdPhone}` : null,
        (normUidPhone.length >= 10 && normUidPhone.length <= 13) ? `p_${normUidPhone}` : null,
        normEmail ? `e_${normEmail}` : null,
        id ? `id_${id}` : null,
        uid ? `uid_${uid}` : null,
      ].filter(Boolean) as string[];

      for (const k of candidateKeys) {
        if (keyToIndex.has(k)) {
          return keyToIndex.get(k)!;
        }
      }
      return null;
    };

    const registerClientKeys = (canonicalId: string, phone?: string, email?: string, id?: string, uid?: string) => {
      const normPhone = normalizePhone(phone);
      const normEmail = (email || "").trim().toLowerCase();
      const normIdPhone = normalizePhone(id);
      const normUidPhone = normalizePhone(uid);

      const candidateKeys = [
        normPhone ? `p_${normPhone}` : null,
        (normIdPhone.length >= 10 && normIdPhone.length <= 13) ? `p_${normIdPhone}` : null,
        (normUidPhone.length >= 10 && normUidPhone.length <= 13) ? `p_${normUidPhone}` : null,
        normEmail ? `e_${normEmail}` : null,
        id ? `id_${id}` : null,
        uid ? `uid_${uid}` : null,
        `canonical_${canonicalId}`
      ].filter(Boolean) as string[];

      candidateKeys.forEach((k) => keyToIndex.set(k, canonicalId));
    };

    // 1. Process registered users
    clients.forEach((c) => {
      const normPhone = normalizePhone(c.whatsapp || c.phone);
      const existingId = getExistingClientId(c.whatsapp || c.phone, c.email, c.id, c.uid);

      if (existingId && clientMap.has(existingId)) {
        const existing = clientMap.get(existingId);
        existing.isRegistered = true;
        if (!existing.name || existing.name === "Cliente") existing.name = c.name || c.displayName || existing.name;
        if (!existing.whatsapp) existing.whatsapp = c.whatsapp || c.phone || "";
        if (!existing.phone) existing.phone = c.phone || c.whatsapp || "";
        if (!existing.email) existing.email = c.email || "";
        if (!existing.photoURL && c.photoURL) existing.photoURL = c.photoURL;
        if (c.notes) existing.notes = c.notes;
        if (c.loyaltyPoints) existing.loyaltyPoints = c.loyaltyPoints;
        registerClientKeys(existingId, c.whatsapp || c.phone, c.email, c.id, c.uid);
      } else {
        const canonicalId = c.id || c.uid || (normPhone ? `phone_${normPhone}` : `client_${clientMap.size}`);
        const clientObj = {
          id: canonicalId,
          uid: c.uid || c.id || canonicalId,
          name: c.name || c.displayName || "Cliente",
          whatsapp: c.whatsapp || c.phone || "",
          phone: c.phone || c.whatsapp || "",
          email: c.email || "",
          photoURL: c.photoURL || "",
          createdAt: c.createdAt,
          notes: c.notes || "",
          loyaltyPoints: c.loyaltyPoints || 0,
          isRegistered: true
        };
        clientMap.set(canonicalId, clientObj);
        registerClientKeys(canonicalId, c.whatsapp || c.phone, c.email, c.id, c.uid);
      }
    });

    // 2. Discover clients from appointments
    appointments.forEach((app) => {
      const normPhone = normalizePhone(app.clientPhone || app.clientWhatsapp);
      const existingId = getExistingClientId(app.clientPhone || app.clientWhatsapp, app.clientEmail, app.clientId, undefined);

      if (existingId && clientMap.has(existingId)) {
        const existing = clientMap.get(existingId);
        if (!existing.whatsapp && (app.clientPhone || app.clientWhatsapp)) {
          existing.whatsapp = app.clientPhone || app.clientWhatsapp;
        }
        if (!existing.phone && (app.clientPhone || app.clientWhatsapp)) {
          existing.phone = app.clientPhone || app.clientWhatsapp;
        }
        if (!existing.email && app.clientEmail) {
          existing.email = app.clientEmail;
        }
        if (!existing.photoURL && app.clientPhoto) {
          existing.photoURL = app.clientPhoto;
        }
        if ((!existing.name || existing.name === "Cliente") && app.clientName) {
          existing.name = app.clientName;
        }
        registerClientKeys(existingId, app.clientPhone || app.clientWhatsapp, app.clientEmail, app.clientId, undefined);
      } else {
        const canonicalId = app.clientId || (normPhone ? `phone_${normPhone}` : `guest_${app.id}`);
        const clientObj = {
          id: canonicalId,
          uid: app.clientId || canonicalId,
          name: app.clientName || "Cliente",
          whatsapp: app.clientPhone || app.clientWhatsapp || "",
          phone: app.clientPhone || app.clientWhatsapp || "",
          email: app.clientEmail || "",
          photoURL: app.clientPhoto || "",
          createdAt: app.createdAt || app.date,
          notes: "",
          loyaltyPoints: 0,
          isRegistered: false
        };
        clientMap.set(canonicalId, clientObj);
        registerClientKeys(canonicalId, app.clientPhone || app.clientWhatsapp, app.clientEmail, app.clientId, undefined);
      }
    });

    // Final deduplication guaranteeing completely unique IDs
    const result: any[] = [];
    const usedIds = new Set<string>();

    Array.from(clientMap.values()).forEach((c, idx) => {
      let finalId = c.id;
      if (!finalId || usedIds.has(finalId)) {
        finalId = `${finalId || "client"}_${idx}`;
      }
      usedIds.add(finalId);
      result.push({
        ...c,
        id: finalId
      });
    });

    return result;
  }, [clients, appointments]);

  // Compute stats for each client based on their appointments
  const clientStatsMap = useMemo(() => {
    const stats = new Map<string, {
      completedApps: any[];
      upcomingApps: any[];
      cancelledApps: any[];
      totalSpent: number;
      lastVisitDate: Date | null;
      nextVisitDate: Date | null;
      favoriteBarber: string;
      favoriteService: string;
      daysSinceLastVisit: number | null;
      rank: { name: string; color: string; tier: number };
    }>();

    const now = new Date();

    combinedClients.forEach((client) => {
      const cleanCliPhone = normalizePhone(client.whatsapp || client.phone || client.id || client.uid);
      const cliEmail = (client.email || "").toLowerCase().trim();
      const cliId = client.id;
      const cliUid = client.uid;

      const clientApps = appointments.filter((app) => {
        const cleanAppPhone = normalizePhone(app.clientPhone || app.clientWhatsapp || app.clientId);
        const appEmail = (app.clientEmail || "").toLowerCase().trim();
        const appId = app.clientId;

        const idMatch = (cliId && appId && cliId === appId) || (cliUid && appId && cliUid === appId);
        const phoneMatch = cleanCliPhone && cleanAppPhone && (cleanCliPhone === cleanAppPhone || cleanCliPhone.endsWith(cleanAppPhone) || cleanAppPhone.endsWith(cleanCliPhone));
        const emailMatch = cliEmail && appEmail && cliEmail === appEmail;

        return idMatch || phoneMatch || emailMatch;
      });

      const completed = clientApps
        .filter((a) => a.status === "completed")
        .sort((a, b) => getAppDate(b).getTime() - getAppDate(a).getTime());

      const upcoming = clientApps
        .filter((a) => a.status !== "completed" && a.status !== "cancelled" && getAppDate(a) >= startOfDay(now))
        .sort((a, b) => getAppDate(a).getTime() - getAppDate(b).getTime());

      const cancelled = clientApps.filter((a) => a.status === "cancelled");

      const totalSpent = completed.reduce((sum, a) => sum + getAppPrice(a), 0);

      const lastVisitDate = completed.length > 0 ? getAppDate(completed[0]) : null;
      const nextVisitDate = upcoming.length > 0 ? getAppDate(upcoming[0]) : null;
      const daysSinceLastVisit = lastVisitDate ? differenceInDays(now, lastVisitDate) : null;

      // Calculate favorite barber & service
      const barberCount: Record<string, number> = {};
      const serviceCount: Record<string, number> = {};

      completed.forEach((a) => {
        const bName = a.barberName || "Barbeiro";
        barberCount[bName] = (barberCount[bName] || 0) + 1;
        const sName = a.serviceName || a.service || (Array.isArray(a.services) ? a.services[0]?.name : "Serviço");
        if (sName) serviceCount[sName] = (serviceCount[sName] || 0) + 1;
      });

      let favoriteBarber = "Geral";
      let maxB = 0;
      Object.entries(barberCount).forEach(([name, c]) => {
        if (c > maxB) { maxB = c; favoriteBarber = name; }
      });

      let favoriteService = "Corte & Barba";
      let maxS = 0;
      Object.entries(serviceCount).forEach(([name, c]) => {
        if (c > maxS) { maxS = c; favoriteService = name; }
      });

      // Rank determination
      const cuts = completed.length;
      let rank = { name: "Novo", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20", tier: 1 };
      if (cuts >= 15 || totalSpent >= 700) {
        rank = { name: "VIP Diamante", color: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30", tier: 5 };
      } else if (cuts >= 8 || totalSpent >= 350) {
        rank = { name: "VIP Ouro", color: "bg-amber-500/15 text-amber-300 border border-amber-500/30", tier: 4 };
      } else if (cuts >= 4 || totalSpent >= 150) {
        rank = { name: "VIP Prata", color: "bg-slate-400/15 text-slate-200 border border-slate-400/30", tier: 3 };
      } else if (cuts >= 2) {
        rank = { name: "Bronze Fiel", color: "bg-orange-500/10 text-orange-300 border border-orange-500/20", tier: 2 };
      }

      stats.set(client.id, {
        completedApps: completed,
        upcomingApps: upcoming,
        cancelledApps: cancelled,
        totalSpent,
        lastVisitDate,
        nextVisitDate,
        favoriteBarber,
        favoriteService,
        daysSinceLastVisit,
        rank
      });
    });

    return stats;
  }, [combinedClients, appointments]);

  // ==============================================================
  // TIME METRICS: DIA, SEMANA, MÊS & QUANTO ESTÁ POR VIR (PIPELINE)
  // ==============================================================
  const metrics = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));

    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Completed appointments
    const completedAll = activeAppointments.filter((a) => a.status === "completed");

    // 1. DIA (HOJE)
    const todayCompleted = completedAll.filter((a) => {
      const d = getAppDate(a);
      return d >= todayStart && d <= todayEnd;
    });
    const yesterdayCompleted = completedAll.filter((a) => {
      const d = getAppDate(a);
      return d >= yesterdayStart && d <= yesterdayEnd;
    });

    const todayClientsSet = new Set(todayCompleted.map((a) => (a.clientPhone || a.clientName || a.clientId)));
    const yesterdayClientsSet = new Set(yesterdayCompleted.map((a) => (a.clientPhone || a.clientName || a.clientId)));
    const todayRevenue = todayCompleted.reduce((sum, a) => sum + getAppPrice(a), 0);

    // 2. SEMANA
    const weekCompleted = completedAll.filter((a) => {
      const d = getAppDate(a);
      return d >= weekStart && d <= weekEnd;
    });
    const lastWeekCompleted = completedAll.filter((a) => {
      const d = getAppDate(a);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });
    const weekClientsSet = new Set(weekCompleted.map((a) => (a.clientPhone || a.clientName || a.clientId)));
    const lastWeekClientsSet = new Set(lastWeekCompleted.map((a) => (a.clientPhone || a.clientName || a.clientId)));
    const weekRevenue = weekCompleted.reduce((sum, a) => sum + getAppPrice(a), 0);

    // 3. MÊS
    const monthCompleted = completedAll.filter((a) => {
      const d = getAppDate(a);
      return d >= monthStart && d <= monthEnd;
    });
    const lastMonthCompleted = completedAll.filter((a) => {
      const d = getAppDate(a);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });
    const monthClientsSet = new Set(monthCompleted.map((a) => (a.clientPhone || a.clientName || a.clientId)));
    const lastMonthClientsSet = new Set(lastMonthCompleted.map((a) => (a.clientPhone || a.clientName || a.clientId)));
    const monthRevenue = monthCompleted.reduce((sum, a) => sum + getAppPrice(a), 0);

    // 4. QUANTO ESTÁ POR VIR (UPCOMING PIPELINE)
    const upcomingAll = activeAppointments.filter((a) => {
      if (a.status === "completed" || a.status === "cancelled") return false;
      const d = getAppDate(a);
      return d >= todayStart;
    });

    // Upcoming Today remaining
    const upcomingToday = upcomingAll.filter((a) => {
      const d = getAppDate(a);
      return d >= now && d <= todayEnd;
    });

    // Upcoming Next 7 Days
    const in7DaysEnd = endOfDay(addDays(now, 7));
    const upcomingNext7Days = upcomingAll.filter((a) => {
      const d = getAppDate(a);
      return d >= now && d <= in7DaysEnd;
    });

    // Upcoming Rest of Month
    const upcomingMonth = upcomingAll.filter((a) => {
      const d = getAppDate(a);
      return d >= now && d <= monthEnd;
    });

    const totalUpcomingClients = upcomingAll.length;
    const totalUpcomingRevenue = upcomingAll.reduce((sum, a) => sum + getAppPrice(a), 0);

    const upcomingTodayRevenue = upcomingToday.reduce((sum, a) => sum + getAppPrice(a), 0);
    const upcoming7DaysRevenue = upcomingNext7Days.reduce((sum, a) => sum + getAppPrice(a), 0);
    const upcomingMonthRevenue = upcomingMonth.reduce((sum, a) => sum + getAppPrice(a), 0);

    // Average ticket & Recurring vs New
    const totalClientsBase = combinedClients.length;
    const recurringClientsCount = Array.from(clientStatsMap.values()).filter((s: any) => s.completedApps && s.completedApps.length > 1).length;
    const retentionRate = totalClientsBase > 0 ? Math.round((recurringClientsCount / totalClientsBase) * 100) : 0;
    const averageTicket = monthCompleted.length > 0 ? monthRevenue / monthCompleted.length : (todayCompleted.length > 0 ? todayRevenue / todayCompleted.length : 45);

    // Daily breakdown for this week (Mon-Sun)
    const weekDaysBreakdown = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
      const dayLetters = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const targetDay = addDays(weekStart, dayIdx === 0 ? 6 : dayIdx - 1);
      const apps = weekCompleted.filter((a) => isSameDay(getAppDate(a), targetDay));
      const isCurrentDay = isSameDay(targetDay, now);
      return {
        label: dayLetters[dayIdx],
        date: targetDay,
        count: apps.length,
        revenue: apps.reduce((s, a) => s + getAppPrice(a), 0),
        isCurrentDay
      };
    });

    // Overdue clients (> 30 days since last cut)
    const overdueClients = combinedClients.filter((c) => {
      const st = clientStatsMap.get(c.id);
      return st && st.daysSinceLastVisit !== null && st.daysSinceLastVisit >= 30 && st.upcomingApps.length === 0;
    });

    return {
      today: {
        count: todayClientsSet.size,
        servicesCount: todayCompleted.length,
        revenue: todayRevenue,
        diffYesterday: todayClientsSet.size - yesterdayClientsSet.size,
        yesterdayCount: yesterdayClientsSet.size
      },
      week: {
        count: weekClientsSet.size,
        servicesCount: weekCompleted.length,
        revenue: weekRevenue,
        diffLastWeek: weekClientsSet.size - lastWeekClientsSet.size,
        lastWeekCount: lastWeekClientsSet.size
      },
      month: {
        count: monthClientsSet.size,
        servicesCount: monthCompleted.length,
        revenue: monthRevenue,
        diffLastMonth: monthClientsSet.size - lastMonthClientsSet.size,
        lastMonthCount: lastMonthClientsSet.size
      },
      upcoming: {
        totalCount: totalUpcomingClients,
        totalRevenue: totalUpcomingRevenue,
        todayCount: upcomingToday.length,
        todayRevenue: upcomingTodayRevenue,
        next7DaysCount: upcomingNext7Days.length,
        next7DaysRevenue: upcoming7DaysRevenue,
        monthCount: upcomingMonth.length,
        monthRevenue: upcomingMonthRevenue,
        list: upcomingAll.sort((a, b) => getAppDate(a).getTime() - getAppDate(b).getTime())
      },
      retentionRate,
      recurringClientsCount,
      totalClientsBase,
      averageTicket,
      weekDaysBreakdown,
      overdueClientsCount: overdueClients.length
    };
  }, [activeAppointments, combinedClients, clientStatsMap]);

  // Filter clients for directory
  const filteredClients = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return combinedClients.filter((client) => {
      const name = (client.name || "").toLowerCase();
      const phone = (client.whatsapp || client.phone || "").toLowerCase();
      const email = (client.email || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || name.includes(search) || phone.includes(search) || email.includes(search);
      if (!matchesSearch) return false;

      const st = clientStatsMap.get(client.id);
      if (!st) return filterCategory === "all";

      if (filterCategory === "today") {
        return st.completedApps.some((a) => {
          const d = getAppDate(a);
          return d >= todayStart && d <= todayEnd;
        });
      }

      if (filterCategory === "week") {
        return st.completedApps.some((a) => {
          const d = getAppDate(a);
          return d >= weekStart && d <= weekEnd;
        });
      }

      if (filterCategory === "month") {
        return st.completedApps.some((a) => {
          const d = getAppDate(a);
          return d >= monthStart && d <= monthEnd;
        });
      }

      if (filterCategory === "upcoming") {
        return st.upcomingApps.length > 0;
      }

      if (filterCategory === "vip") {
        return st.rank.tier >= 3;
      }

      if (filterCategory === "overdue") {
        return st.daysSinceLastVisit !== null && st.daysSinceLastVisit >= 30 && st.upcomingApps.length === 0;
      }

      return true;
    }).sort((a, b) => {
      const stA = clientStatsMap.get(a.id);
      const stB = clientStatsMap.get(b.id);
      if (filterCategory === "upcoming") {
        const dateA = stA?.nextVisitDate ? stA.nextVisitDate.getTime() : Infinity;
        const dateB = stB?.nextVisitDate ? stB.nextVisitDate.getTime() : Infinity;
        return dateA - dateB;
      }
      if (filterCategory === "vip") {
        return (stB?.totalSpent || 0) - (stA?.totalSpent || 0);
      }
      if (filterCategory === "overdue") {
        return (stB?.daysSinceLastVisit || 0) - (stA?.daysSinceLastVisit || 0);
      }
      // Default: sort by last visit or total spent
      const timeA = stA?.lastVisitDate ? stA.lastVisitDate.getTime() : 0;
      const timeB = stB?.lastVisitDate ? stB.lastVisitDate.getTime() : 0;
      return timeB - timeA;
    });
  }, [combinedClients, searchTerm, filterCategory, clientStatsMap]);

  // Open modal with client details
  const handleOpenClientDetails = (client: any) => {
    setSelectedClientModal(client);
    setClientNotes(client.notes || "");
    triggerLightHaptic();
  };

  // Save notes for client in Firestore
  const handleSaveNotes = async () => {
    if (!selectedClientModal) return;
    setIsSavingNotes(true);
    try {
      const docId = selectedClientModal.uid || selectedClientModal.id;
      await updateDoc(doc(db, "users", docId), {
        notes: clientNotes
      });
      setSelectedClientModal((prev: any) => ({ ...prev, notes: clientNotes }));
      toast.success("Observações do cliente atualizadas!");
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Não foi possível salvar as anotações.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Build WhatsApp Reminder link
  const getWhatsAppMessageUrl = (phone: string, text: string) => {
    const clean = phone.replace(/\D/g, "");
    if (!clean) return "";
    const number = clean.startsWith("55") ? clean : `55${clean}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  // Dispatch PWA push reminder to a single client
  const handleSendHaircutReminderPush = async (client: any) => {
    const st = clientStatsMap.get(client.id);
    const daysSince = st?.daysSinceLastVisit || 0;
    const barberName = st?.favoriteBarber || "seu barbeiro habitual";
    
    setSendingPushClientIds((prev) => [...prev, client.id]);
    try {
      const res = await fetch("/api/push/send-haircut-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.uid || client.id,
          clientPhone: client.whatsapp || client.phone,
          clientName: client.name,
          daysSince,
          barberName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Notificação PWA enviada para ${client.name}! 🔔`);
      } else {
        toast.error(data.error || "Não foi possível enviar a notificação PWA.");
      }
    } catch (err: any) {
      toast.error("Erro ao conectar com o serviço de notificações.");
    } finally {
      setSendingPushClientIds((prev) => prev.filter((id) => id !== client.id));
    }
  };

  // Dispatch PWA push reminders to ALL overdue clients in batch
  const handleBatchSendHaircutReminders = async () => {
    const overdueList = combinedClients.filter((c) => {
      const st = clientStatsMap.get(c.id);
      return st && st.daysSinceLastVisit !== null && st.daysSinceLastVisit >= 21 && st.upcomingApps.length === 0;
    });

    if (overdueList.length === 0) {
      toast.info("Não há clientes com corte vencido (+21 dias) no momento.");
      return;
    }

    if (!window.confirm(`Deseja disparar a notificação PWA de retorno para todos os ${overdueList.length} clientes na janela de corte?`)) {
      return;
    }

    setBatchPushLoading(true);
    let sentSuccess = 0;

    for (const cli of overdueList) {
      const st = clientStatsMap.get(cli.id);
      try {
        await fetch("/api/push/send-haircut-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: cli.uid || cli.id,
            clientPhone: cli.whatsapp || cli.phone,
            clientName: cli.name,
            daysSince: st?.daysSinceLastVisit || 0,
            barberName: st?.favoriteBarber || "a equipe"
          })
        });
        sentSuccess++;
      } catch (e) {}
    }

    setBatchPushLoading(false);
    toast.success(`Disparo PWA concluído: ${sentSuccess} de ${overdueList.length} clientes notificados! 🚀`);
  };

  // Helper to generate the 3 WhatsApp templates
  const getWhatsAppTemplates = (client: any) => {
    const st = clientStatsMap.get(client?.id);
    const daysSince = st?.daysSinceLastVisit || 25;
    const barberName = st?.favoriteBarber || "seu barbeiro favorito";
    const firstName = client?.name ? client.name.split(" ")[0] : "Amigo";
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://barbearia.app";

    return [
      {
        id: 0,
        title: "Estilo & Régua (Recomendado)",
        desc: "Foco no visual impecável e alinhamento",
        text: `Fala, ${firstName}! Tudo bem? Já se passaram ${daysSince} dias desde o seu último corte na ${BARBERSHOP_NAME}. Seu visual na régua faz toda a diferença na sua presença! Que tal garantir seu horário com ${barberName} para esta semana? ✂️💈\n\nAgende seu horário aqui: ${appUrl}`
      },
      {
        id: 1,
        title: "Lembrete VIP & Exclusivo",
        desc: "Tom cordial e atencioso para clientes fiéis",
        text: `Olá, ${firstName}! Tudo bem? Passando para te lembrar que estamos na janela ideal para a manutenção do seu corte com ${barberName} na ${BARBERSHOP_NAME}. Podemos reservar um horário especial pra você esta semana? Abraço!\n\nLink rápido: ${appUrl}`
      },
      {
        id: 2,
        title: "Direto & Rápido",
        desc: "Mensagem curta e objetiva",
        text: `${firstName}, na régua de novo? Seu corte já completou ${daysSince} dias! Garanta sua vaga com a gente antes que a agenda esgote: ${appUrl}`
      }
    ];
  };

  const handleOpenWhatsAppModal = (client: any) => {
    const templates = getWhatsAppTemplates(client);
    setWhatsAppModalData({
      client,
      templateIndex: 0,
      customMessage: templates[0].text
    });
    triggerLightHaptic();
  };

  return (
    <motion.div
      key="clients-management-tab"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-8"
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER & BARBER FILTER */}
      {/* ============================================================== */}
      <div className="liquid-glass p-6 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">Painel de Clientes & Atendimentos</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tight">
              Inteligência de <span className="text-amber-500">Clientes</span>
            </h2>
            <p className="text-xs text-neutral-400 font-bold mt-1">
              Acompanhamento de fluxo diário, semanal, mensal e carteira futura de atendimentos.
            </p>
          </div>

          {/* Barber filter selector */}
          {role !== "barber" && barbers.length > 0 && (
            <div className="flex items-center gap-3 liquid-glass/60 px-4 py-2.5 rounded-2xl border border-white/5">
              <Scissors className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Filtrar Atendimentos</span>
                <select
                  value={selectedBarberFilter}
                  onChange={(e) => setSelectedBarberFilter(e.target.value)}
                  className="bg-transparent text-xs font-black text-white uppercase tracking-wider outline-none cursor-pointer"
                >
                  <option value="all" className="bg-neutral-900 text-white">Toda a Equipe (Geral)</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id} className="bg-neutral-900 text-white">
                      {b.name || "Barbeiro"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CORE METRICS: ATENDIDOS NO DIA, SEMANA, MÊS & POR VIR */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: ATENDIDOS NO DIA */}
        <div 
          onClick={() => setFilterCategory("today")}
          className={`liquid-glass rounded-[2rem] p-6 space-y-3 relative overflow-hidden group cursor-pointer transition-all border ${
            filterCategory === "today" ? "border-amber-500 shadow-lg shadow-amber-500/10" : "hover:border-white/10"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Atendidos Hoje</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {metrics.today.count}
              </h3>
              <span className="text-xs font-bold text-neutral-400 uppercase">
                {metrics.today.count === 1 ? "cliente" : "clientes"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[9px] font-black uppercase">
              <span className="text-emerald-400">R$ {metrics.today.revenue.toFixed(2)} faturado</span>
              <span className="text-neutral-500">
                {metrics.today.diffYesterday >= 0 ? `+${metrics.today.diffYesterday} vs ontem` : `${metrics.today.diffYesterday} vs ontem`}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: ATENDIDOS NA SEMANA */}
        <div 
          onClick={() => setFilterCategory("week")}
          className={`liquid-glass rounded-[2rem] p-6 space-y-3 relative overflow-hidden group cursor-pointer transition-all border ${
            filterCategory === "week" ? "border-blue-500 shadow-lg shadow-blue-500/10" : "hover:border-white/10"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Atendidos na Semana</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/15 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {metrics.week.count}
              </h3>
              <span className="text-xs font-bold text-neutral-400 uppercase">
                {metrics.week.count === 1 ? "cliente" : "clientes"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[9px] font-black uppercase">
              <span className="text-blue-400">R$ {metrics.week.revenue.toFixed(2)} faturado</span>
              <span className="text-neutral-500">
                {metrics.week.diffLastWeek >= 0 ? `+${metrics.week.diffLastWeek} vs semana ant.` : `${metrics.week.diffLastWeek} vs semana ant.`}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: ATENDIDOS NO MÊS */}
        <div 
          onClick={() => setFilterCategory("month")}
          className={`liquid-glass rounded-[2rem] p-6 space-y-3 relative overflow-hidden group cursor-pointer transition-all border ${
            filterCategory === "month" ? "border-emerald-500 shadow-lg shadow-emerald-500/10" : "hover:border-white/10"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Atendidos no Mês</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {metrics.month.count}
              </h3>
              <span className="text-xs font-bold text-neutral-400 uppercase">
                {metrics.month.count === 1 ? "cliente" : "clientes"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[9px] font-black uppercase">
              <span className="text-emerald-400">R$ {metrics.month.revenue.toFixed(2)} faturado</span>
              <span className="text-neutral-500">
                {metrics.month.diffLastMonth >= 0 ? `+${metrics.month.diffLastMonth} vs mês ant.` : `${metrics.month.diffLastMonth} vs mês ant.`}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: QUANTO ESTÁ POR VIR (PIPELINE FUTURO) */}
        <div 
          onClick={() => setFilterCategory("upcoming")}
          className={`liquid-glass rounded-[2rem] p-6 space-y-3 relative overflow-hidden group cursor-pointer transition-all border bg-gradient-to-br from-amber-500/[0.04] to-transparent ${
            filterCategory === "upcoming" ? "border-amber-400 shadow-xl shadow-amber-500/15" : "hover:border-amber-500/30"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Está Por Vir
              </span>
              <p className="text-[9px] text-neutral-500 uppercase font-extrabold mt-0.5">Agendados no radar</p>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-amber-400 tracking-tighter">
                {metrics.upcoming.totalCount}
              </h3>
              <span className="text-xs font-bold text-neutral-300 uppercase">
                {metrics.upcoming.totalCount === 1 ? "agendado" : "agendados"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-500/20 text-[9px] font-black uppercase">
              <span className="text-amber-300 font-black">
                R$ {metrics.upcoming.totalRevenue.toFixed(2)} a entrar
              </span>
              <span className="text-neutral-400">
                {metrics.upcoming.todayCount} hoje
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 3. PIPELINE DE FUTUROS ATENDIMENTOS (QUANTO ESTÁ POR VIR) */}
      {/* ============================================================== */}
      <div className="liquid-glass p-6 md:p-8 rounded-[2.5rem] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                Radar de Futuros Atendimentos (Por Vir)
              </h3>
            </div>
            <p className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">
              Clientes confirmados com horário marcado no sistema
            </p>
          </div>

          {/* Breakdown Pills: Hoje, 7 Dias, Mês */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
              Hoje mais tarde: <span className="text-white font-extrabold">{metrics.upcoming.todayCount}</span> (R$ {metrics.upcoming.todayRevenue.toFixed(2)})
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
              Próximos 7 dias: <span className="text-white font-extrabold">{metrics.upcoming.next7DaysCount}</span> (R$ {metrics.upcoming.next7DaysRevenue.toFixed(2)})
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              No mês: <span className="text-white font-extrabold">{metrics.upcoming.monthCount}</span> (R$ {metrics.upcoming.monthRevenue.toFixed(2)})
            </div>
          </div>
        </div>

        {/* List of upcoming clients */}
        {metrics.upcoming.list.length === 0 ? (
          <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs font-black text-neutral-400 uppercase tracking-wider">
              Nenhum agendamento futuro no momento
            </p>
            <p className="text-[10px] text-neutral-600">
              Novos horários marcados aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.upcoming.list.slice(0, 6).map((app, appIdx) => {
              const appDate = getAppDate(app);
              const isAppToday = isSameDay(appDate, new Date());
              const isAppTomorrow = isSameDay(appDate, addDays(new Date(), 1));
              const relativeDay = isAppToday 
                ? "Hoje" 
                : isAppTomorrow 
                  ? "Amanhã" 
                  : format(appDate, "dd 'de' MMMM", { locale: ptBR });
              const timeFormatted = app.time || format(appDate, "HH:mm");
              const price = getAppPrice(app);
              const serviceName = app.serviceName || app.service || (Array.isArray(app.services) ? app.services[0]?.name : "Corte");

              const waMsg = `Olá ${app.clientName || "Cliente"}! Tudo bem? Estamos confirmando seu agendamento na barbearia para ${relativeDay} às ${timeFormatted} (${serviceName}). Podemos te aguardar? Abraço!`;
              const waUrl = (app.clientPhone || app.clientWhatsapp) 
                ? getWhatsAppMessageUrl(app.clientPhone || app.clientWhatsapp, waMsg) 
                : "";

              return (
                <div 
                  key={app.id ? `${app.id}-${appIdx}` : `upcoming-${appIdx}`}
                  className="liquid-glass p-4 rounded-3xl space-y-3 relative group hover:border-amber-500/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          isAppToday 
                            ? "bg-amber-500 text-black shadow-sm font-extrabold" 
                            : "bg-neutral-800 text-neutral-300 border border-white/5"
                        }`}>
                          {relativeDay} às {timeFormatted}
                        </span>
                      </div>
                      <span className="text-xs font-black text-amber-400">
                        R$ {price.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white uppercase italic tracking-tight truncate">
                        {app.clientName || "Cliente"}
                      </h4>
                      <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-bold mt-0.5">
                        <Scissors className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{serviceName}</span>
                        {app.barberName && (
                          <span className="text-neutral-500 font-normal truncate">com {app.barberName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    {(app.clientPhone || app.clientWhatsapp) ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-emerald-500/20"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Confirmar WhatsApp
                      </a>
                    ) : (
                      <span className="text-[9px] text-neutral-500 uppercase font-bold">Sem telefone</span>
                    )}

                    <button
                      onClick={() => {
                        const cli = combinedClients.find(
                          (c) => c.id === app.clientId || c.name === app.clientName
                        ) || { name: app.clientName, phone: app.clientPhone, email: app.clientEmail, id: app.clientId };
                        handleOpenClientDetails(cli);
                      }}
                      className="p-1.5 liquid-glass hover:bg-white/10 text-neutral-400 hover:text-white rounded-xl transition-all"
                      title="Ver ficha do cliente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {metrics.upcoming.list.length > 6 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setFilterCategory("upcoming")}
              className="text-[10px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest inline-flex items-center gap-1.5"
            >
              Ver todos os {metrics.upcoming.list.length} clientes por vir
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. FLUXO SEMANAL E FIDELIZAÇÃO DE CLIENTES */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Day-by-Day Flow Bar Chart */}
        <div className="lg:col-span-2 liquid-glass p-6 md:p-8 rounded-[2.5rem] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                Fluxo Semanal de Atendimentos
              </h3>
              <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-0.5">
                Distribuição de clientes atendidos dia a dia (Seg a Dom)
              </p>
            </div>
            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20 uppercase">
              Total: {metrics.week.servicesCount} cortes
            </span>
          </div>

          {/* Visual Day Bars */}
          <div className="grid grid-cols-7 gap-2 pt-4 items-end min-h-[140px]">
            {metrics.weekDaysBreakdown.map((day, idx) => {
              const maxCount = Math.max(...metrics.weekDaysBreakdown.map((d) => d.count), 1);
              const heightPct = Math.max(12, Math.round((day.count / maxCount) * 100));

              return (
                <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-black text-neutral-400">
                    {day.count}
                  </span>
                  <div className="w-full bg-black/40 rounded-xl p-1 h-28 flex items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        day.isCurrentDay
                          ? "bg-amber-500 shadow-lg shadow-amber-500/30"
                          : day.count > 0
                            ? "bg-neutral-700 hover:bg-neutral-600"
                            : "bg-neutral-900"
                      }`}
                      title={`${day.label}: ${day.count} atendimentos (R$ ${day.revenue.toFixed(2)})`}
                    />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${
                    day.isCurrentDay ? "text-amber-500 font-extrabold" : "text-neutral-500"
                  }`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[9px] text-neutral-500 uppercase font-black pt-2 border-t border-white/5">
            <span>Barra Dourada = Hoje</span>
            <span>Média da semana: {(metrics.week.servicesCount / 7).toFixed(1)} clientes/dia</span>
          </div>
        </div>

        {/* Retention & Average Ticket Card */}
        <div className="liquid-glass p-6 md:p-8 rounded-[2.5rem] space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-white uppercase italic tracking-tight">
              Retenção & Fidelização
            </h3>
            <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-0.5">
              Comportamento e fidelidade da carteira
            </p>
          </div>

          <div className="space-y-4">
            {/* Retention Rate */}
            <div className="liquid-glass p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-neutral-400">Taxa de Clientes Recorrentes</span>
                <span className="font-black text-amber-500 text-base">{metrics.retentionRate}%</span>
              </div>
              <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, metrics.retentionRate)}%` }}
                />
              </div>
              <p className="text-[8px] text-neutral-500 font-bold uppercase">
                {metrics.recurringClientsCount} de {metrics.totalClientsBase} clientes já cortaram mais de 1 vez
              </p>
            </div>

            {/* Average Ticket */}
            <div className="liquid-glass p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Ticket Médio por Cliente</span>
                <p className="text-xl font-black text-white mt-0.5">
                  R$ {metrics.averageTicket.toFixed(2)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Inactive / Overdue Alert & Batch PWA Trigger */}
            {metrics.overdueClientsCount > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setFilterCategory("overdue")}
                  className="w-full p-3.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-2xl text-left flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-amber-400 uppercase">
                        {metrics.overdueClientsCount} Clientes para Resgatar
                      </p>
                      <p className="text-[8px] text-neutral-400 font-bold">
                        Não voltam há mais de 30 dias
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleBatchSendHaircutReminders}
                  disabled={batchPushLoading}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {batchPushLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  Disparar PWA Push em Massa ({metrics.overdueClientsCount})
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 5. DIRECTORY DE CLIENTES COM FILTROS AVANÇADOS E BUSCA */}
      {/* ============================================================== */}
      <div className="liquid-glass p-6 md:p-8 rounded-[2.5rem] space-y-6">
        
        {/* Title and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
              Base Geral de Clientes
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {filteredClients.length} listados
              </span>
            </h3>
            <p className="text-xs text-neutral-400 font-bold mt-0.5">
              Consulte histórico, preferências, faturamento e entre em contato direto.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="BUSCAR NOME, WHATSAPP, EMAIL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full liquid-glass rounded-2xl pl-11 pr-4 py-3 text-xs text-white uppercase font-black tracking-widest placeholder:text-neutral-600 outline-none focus:border-amber-500 focus:bg-white/[0.04] transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: "all", label: `Todos (${combinedClients.length})` },
            { id: "today", label: `Atendidos Hoje (${metrics.today.count})` },
            { id: "week", label: `Esta Semana (${metrics.week.count})` },
            { id: "month", label: `Este Mês (${metrics.month.count})` },
            { id: "upcoming", label: `Por Vir (${metrics.upcoming.totalCount})` },
            { id: "vip", label: "VIPs / Fiéis" },
            { id: "overdue", label: `Resgate (+30 dias) (${metrics.overdueClientsCount})` }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as any)}
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                filterCategory === cat.id
                  ? "bg-amber-500 border-amber-500 text-black shadow-md font-extrabold"
                  : "liquid-glass border-white/5 text-neutral-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Clients Cards Grid */}
        {loadingClients ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">
              Carregando carteira de clientes...
            </span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 border border-dashed border-white/10 rounded-3xl text-center space-y-2">
            <Users className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs font-black text-neutral-400 uppercase tracking-wider">
              Nenhum cliente encontrado com este filtro
            </p>
            <p className="text-[10px] text-neutral-600">
              Experimente alterar o termo de busca ou selecionar outra categoria acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client, clientIdx) => {
              const st = clientStatsMap.get(client.id);
              const rank = st?.rank || { name: "Cliente", color: "bg-neutral-800 text-neutral-400", tier: 1 };
              const cutsCount = st?.completedApps.length || 0;
              const totalSpent = st?.totalSpent || 0;
              const hasUpcoming = st && st.upcomingApps.length > 0;
              const isOverdue = st && st.daysSinceLastVisit !== null && st.daysSinceLastVisit >= 30;

              const cleanPhone = (client.whatsapp || client.phone || "").replace(/\D/g, "");
              const defaultWaMsg = isOverdue
                ? `Olá ${client.name || "amigo"}! Tudo bem? Faz um tempinho que você não passa aqui na barbearia. Que tal renovar o visual esta semana? Podemos reservar um horário top pra você!`
                : `Olá ${client.name || "amigo"}! Tudo bem? Passando para te desejar uma ótima semana da equipe da barbearia!`;

              const waUrl = cleanPhone ? getWhatsAppMessageUrl(cleanPhone, defaultWaMsg) : "";

              return (
                <div
                  key={`${client.id || "client"}-${clientIdx}`}
                  onClick={() => handleOpenClientDetails(client)}
                  className="liquid-glass p-5 rounded-3xl space-y-4 hover:border-amber-500/30 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Avatar, Name, Rank */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl liquid-glass border border-white/10 flex items-center justify-center text-neutral-400 font-bold overflow-hidden shrink-0 group-hover:border-amber-500/40 transition-colors">
                          {client.photoURL ? (
                            <img
                              src={client.photoURL}
                              alt={client.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-sm font-black text-amber-500">
                              {(client.name || "C").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-black text-sm text-white uppercase italic tracking-tight group-hover:text-amber-400 transition-colors leading-tight">
                            {client.name || "Cliente sem Nome"}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider inline-block mt-1 ${rank.color}`}>
                            {rank.name}
                          </span>
                        </div>
                      </div>

                      {hasUpcoming && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase">
                          Agendado
                        </span>
                      )}
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[9px] font-black uppercase">
                      <div className="liquid-glass/60 p-2 rounded-xl">
                        <span className="text-neutral-500 block text-[8px]">Total de Cortes</span>
                        <span className="text-white font-black">{cutsCount} visitas</span>
                      </div>
                      <div className="liquid-glass/60 p-2 rounded-xl">
                        <span className="text-neutral-500 block text-[8px]">Investimento Total</span>
                        <span className="text-amber-400 font-black">R$ {totalSpent.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Last visit or Upcoming info */}
                    <div className="text-[10px] text-neutral-400 font-bold space-y-1">
                      {st?.lastVisitDate ? (
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500 text-[9px] uppercase">Último atendimento:</span>
                          <span className={isOverdue ? "text-amber-400" : "text-neutral-300"}>
                            {format(st.lastVisitDate, "dd/MM/yyyy")} ({st.daysSinceLastVisit}d atrás)
                          </span>
                        </div>
                      ) : (
                        <div className="text-neutral-500 text-[9px] uppercase">Nenhum atendimento finalizado</div>
                      )}

                      {st?.favoriteBarber && st.favoriteBarber !== "Geral" && (
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-neutral-500 uppercase">Barbeiro habitual:</span>
                          <span className="text-neutral-300">{st.favoriteBarber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-white/5 flex-wrap">
                    {/* Botão Notificar PWA */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendHaircutReminderPush(client);
                      }}
                      disabled={sendingPushClientIds.includes(client.id)}
                      className="py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Disparar notificação PWA no celular do cliente"
                    >
                      {sendingPushClientIds.includes(client.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Bell className="w-3 h-3" />
                      )}
                      <span>PWA</span>
                    </button>

                    {/* Botão WhatsApp com Templates */}
                    {cleanPhone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsAppModal(client);
                        }}
                        className={`py-1.5 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border flex-1 cursor-pointer ${
                          isOverdue 
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                        title="Enviar lembrete pelo WhatsApp com modelos personalizados"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{isOverdue ? "Resgatar Whats" : "WhatsApp"}</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenClientDetails(client);
                      }}
                      className="py-1.5 px-2.5 liquid-glass hover:bg-white/10 text-neutral-300 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Ficha
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 6. MODAL DE FICHA COMPLETA DO CLIENTE */}
      {/* ============================================================== */}
      <AnimatePresence>
        {selectedClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="liquid-glass border border-white/15 bg-neutral-950/95 w-full max-w-2xl rounded-[2.5rem] p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedClientModal(null)}
                className="absolute top-6 right-6 p-2 rounded-2xl liquid-glass hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Client Basic Info Header */}
              {(() => {
                const st = clientStatsMap.get(selectedClientModal.id);
                const rank = st?.rank || { name: "Cliente", color: "bg-neutral-800 text-neutral-400", tier: 1 };
                const cleanPhone = (selectedClientModal.whatsapp || selectedClientModal.phone || "").replace(/\D/g, "");

                return (
                  <>
                    <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                      <div className="w-16 h-16 rounded-2xl liquid-glass border border-white/10 flex items-center justify-center text-amber-500 font-bold overflow-hidden shrink-0">
                        {selectedClientModal.photoURL ? (
                          <img
                            src={selectedClientModal.photoURL}
                            alt={selectedClientModal.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xl font-black">
                            {(selectedClientModal.name || "C").slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                            {selectedClientModal.name || "Cliente"}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${rank.color}`}>
                            {rank.name}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-bold mt-1">
                          {selectedClientModal.whatsapp || selectedClientModal.phone || "Sem telefone informado"}
                          {selectedClientModal.email && ` • ${selectedClientModal.email}`}
                        </p>
                      </div>
                    </div>

                    {/* Summary Numbers */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="liquid-glass p-3.5 rounded-2xl space-y-0.5">
                        <span className="text-[8px] font-black uppercase text-neutral-500 tracking-wider">Total Atendimentos</span>
                        <p className="text-lg font-black text-white">{st?.completedApps.length || 0}</p>
                      </div>
                      <div className="liquid-glass p-3.5 rounded-2xl space-y-0.5">
                        <span className="text-[8px] font-black uppercase text-neutral-500 tracking-wider">Total Investido</span>
                        <p className="text-lg font-black text-amber-400">R$ {(st?.totalSpent || 0).toFixed(2)}</p>
                      </div>
                      <div className="liquid-glass p-3.5 rounded-2xl space-y-0.5">
                        <span className="text-[8px] font-black uppercase text-neutral-500 tracking-wider">Ticket Médio</span>
                        <p className="text-lg font-black text-emerald-400">
                          R$ {st && st.completedApps.length > 0 ? (st.totalSpent / st.completedApps.length).toFixed(2) : "0.00"}
                        </p>
                      </div>
                    </div>

                    {/* Internal Notes Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          Observações & Preferências do Cliente
                        </span>
                        <button
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Salvar
                        </button>
                      </div>
                      <textarea
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder="Ex: Prefere corte degradê na zero, gosta de café sem açúcar, horário de preferência após 18h..."
                        rows={2}
                        className="w-full liquid-glass rounded-2xl p-3 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-amber-500 transition-all resize-none"
                      />
                    </div>

                    {/* Visit History Timeline */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block">
                        Histórico Recente de Atendimentos
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                        {st?.completedApps.length === 0 ? (
                          <div className="text-center py-6 text-neutral-500 text-[10px] uppercase font-bold">
                            Nenhum corte registrado até o momento
                          </div>
                        ) : (
                          st?.completedApps.map((app, appIdx) => (
                            <div
                              key={app.id ? `${app.id}-${appIdx}` : `comp-${appIdx}`}
                              className="liquid-glass p-3 rounded-2xl flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-white uppercase">
                                  {app.serviceName || app.service || "Corte Masculino"}
                                </p>
                                <p className="text-[9px] text-neutral-500">
                                  {format(getAppDate(app), "dd/MM/yyyy HH:mm")} • Barbeiro: {app.barberName || "Geral"}
                                </p>
                              </div>
                              <span className="font-black text-amber-400">
                                R$ {getAppPrice(app).toFixed(2)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Modal Bottom Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5">
                      {/* Enviar Notificação PWA Push */}
                      <button
                        onClick={() => handleSendHaircutReminderPush(selectedClientModal)}
                        disabled={sendingPushClientIds.includes(selectedClientModal.id)}
                        className="py-3 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        title="Disparar notificação PWA de retorno de corte"
                      >
                        {sendingPushClientIds.includes(selectedClientModal.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                        Lembrete PWA
                      </button>

                      {/* Mandar WhatsApp com Modelos */}
                      {cleanPhone && (
                        <button
                          onClick={() => handleOpenWhatsAppModal(selectedClientModal)}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Lembrete no WhatsApp
                        </button>
                      )}

                      {onScheduleClient && (
                        <button
                          onClick={() => {
                            onScheduleClient(selectedClientModal);
                            setSelectedClientModal(null);
                          }}
                          className="py-3 px-5 liquid-glass hover:bg-white/10 text-white font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/10 cursor-pointer"
                        >
                          <CalendarPlus className="w-4 h-4 text-amber-500" />
                          Agendar
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 7. MODAL DE TEMPLATES WHATSAPP DE RETORNO / RENOVAÇÃO DO CORTE */}
      {/* ============================================================== */}
      <AnimatePresence>
        {whatsAppModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="liquid-glass border border-emerald-500/30 bg-neutral-950/95 w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setWhatsAppModalData(null)}
                className="absolute top-6 right-6 p-2 rounded-2xl liquid-glass hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                    Lembrete de Corte via WhatsApp
                  </h3>
                  <p className="text-xs text-neutral-400 font-bold">
                    Cliente: <span className="text-white">{whatsAppModalData.client.name}</span>
                    {whatsAppModalData.client.whatsapp && ` • ${whatsAppModalData.client.whatsapp}`}
                  </p>
                </div>
              </div>

              {/* Template selector pills */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block">
                  Escolha um Modelo de Mensagem:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {getWhatsAppTemplates(whatsAppModalData.client).map((tpl, idx) => {
                    const isSelected = whatsAppModalData.templateIndex === idx;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setWhatsAppModalData({
                            ...whatsAppModalData,
                            templateIndex: idx,
                            customMessage: tpl.text
                          });
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500 text-white shadow-lg"
                            : "liquid-glass border-white/5 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase">{tpl.title}</p>
                        <p className="text-[8px] text-neutral-500 line-clamp-1 mt-0.5">{tpl.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Textarea */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center justify-between">
                  <span>Mensagem (editável antes de enviar):</span>
                  <span className="text-neutral-500 text-[9px]">WhatsApp</span>
                </span>
                <textarea
                  value={whatsAppModalData.customMessage}
                  onChange={(e) =>
                    setWhatsAppModalData({
                      ...whatsAppModalData,
                      customMessage: e.target.value
                    })
                  }
                  rows={5}
                  className="w-full liquid-glass rounded-2xl p-4 text-xs text-white outline-none focus:border-emerald-500 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={getWhatsAppMessageUrl(
                    whatsAppModalData.client.whatsapp || whatsAppModalData.client.phone,
                    whatsAppModalData.customMessage
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    triggerLightHaptic();
                    setWhatsAppModalData(null);
                  }}
                  className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-xl shadow-emerald-500/20 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Abrir no WhatsApp Agora
                </a>
                <button
                  onClick={() => setWhatsAppModalData(null)}
                  className="py-3.5 px-5 liquid-glass hover:bg-white/10 text-neutral-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
