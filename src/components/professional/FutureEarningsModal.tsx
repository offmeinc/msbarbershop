import React, { useState, useMemo } from "react";
import { 
  format, 
  isSameDay, 
  parseISO, 
  startOfDay, 
  endOfDay, 
  isAfter, 
  addDays, 
  isWithinInterval 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  X, 
  CalendarClock, 
  DollarSign, 
  Calendar, 
  User, 
  Clock, 
  TrendingUp, 
  Search, 
  Filter, 
  Phone, 
  Sparkles, 
  ChevronRight,
  BarChart3,
  CalendarDays,
  Scissors,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  CartesianGrid
} from "recharts";
import { Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface FutureEarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: any[];
  services?: any[];
  barbers?: { id: string; name: string }[];
  currentUserId?: string;
  role?: string;
  onNavigateToAgenda?: () => void;
}

export function FutureEarningsModal({
  isOpen,
  onClose,
  appointments,
  services = [],
  barbers = [],
  currentUserId,
  role,
  onNavigateToAgenda
}: FutureEarningsModalProps) {
  const [periodFilter, setPeriodFilter] = useState<"all" | "tomorrow" | "next7" | "next30">("all");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showChart, setShowChart] = useState(true);

  // Universal date parser
  const parseAppDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
    if (dateVal instanceof Timestamp) return dateVal.toDate();
    if (dateVal && typeof dateVal.toDate === "function") return dateVal.toDate();
    if (typeof dateVal === "string") {
      try {
        const d = parseISO(dateVal);
        if (d instanceof Date && !isNaN(d.getTime())) return d;
        const fallback = new Date(dateVal);
        return isNaN(fallback.getTime()) ? null : fallback;
      } catch {
        const fallback = new Date(dateVal);
        return isNaN(fallback.getTime()) ? null : fallback;
      }
    }
    if (typeof dateVal === "number") {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  // Price extractor with fallback
  const getAppointmentPrice = (app: any): number => {
    if (!app) return 0;
    const rawPrice = app.totalPrice ?? app.price ?? 0;
    if (typeof rawPrice === "number") return isNaN(rawPrice) ? 0 : rawPrice;
    if (typeof rawPrice === "string") {
      const cleaned = rawPrice.replace(/[^0-9.-]+/g, "");
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const serviceInfo = services.find(s => s.id === app.serviceId || s.name === app.serviceName);
    if (serviceInfo && serviceInfo.price) {
      const sp = typeof serviceInfo.price === "number" ? serviceInfo.price : parseFloat(String(serviceInfo.price).replace(/[^0-9.-]+/g, ""));
      if (!isNaN(sp) && sp > 0) return sp;
    }
    return 0;
  };

  // Base future appointments (strictly from tomorrow onwards, not completed, not cancelled)
  const allFutureAppointments = useMemo(() => {
    const today = new Date();
    const endOfTodayVal = endOfDay(today);
    const startOfTodayVal = startOfDay(today);

    return appointments
      .filter(app => {
        if (app.status === "completed" || app.status === "cancelled") return false;
        const d = parseAppDate(app.date);
        if (!d) return false;
        return isAfter(d, endOfTodayVal) || startOfDay(d) > startOfTodayVal;
      })
      .map(app => {
        const parsedDate = parseAppDate(app.date)!;
        const calculatedPrice = getAppointmentPrice(app);
        return {
          ...app,
          parsedDate,
          calculatedPrice
        };
      })
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [appointments, services]);

  // Filtered future appointments based on user selection
  const filteredAppointments = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);

    return allFutureAppointments.filter(app => {
      // 1. Period filter
      if (periodFilter === "tomorrow") {
        if (!isSameDay(app.parsedDate, tomorrow)) return false;
      } else if (periodFilter === "next7") {
        const next7End = endOfDay(addDays(today, 7));
        if (!isWithinInterval(app.parsedDate, { start: startOfDay(tomorrow), end: next7End })) return false;
      } else if (periodFilter === "next30") {
        const next30End = endOfDay(addDays(today, 30));
        if (!isWithinInterval(app.parsedDate, { start: startOfDay(tomorrow), end: next30End })) return false;
      }

      // 2. Barber filter
      if (selectedBarberFilter !== "all") {
        if (app.barberId !== selectedBarberFilter) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const clientName = (app.clientName || "").toLowerCase();
        const serviceName = (app.serviceName || "").toLowerCase();
        const barberName = (app.barberName || "").toLowerCase();
        const time = (app.time || "").toLowerCase();
        const phone = (app.clientPhone || "").toLowerCase();

        if (
          !clientName.includes(queryLower) &&
          !serviceName.includes(queryLower) &&
          !barberName.includes(queryLower) &&
          !time.includes(queryLower) &&
          !phone.includes(queryLower)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allFutureAppointments, periodFilter, selectedBarberFilter, searchQuery]);

  // Metrics
  const summaryMetrics = useMemo(() => {
    const totalEarnings = filteredAppointments.reduce((acc, a) => acc + a.calculatedPrice, 0);
    const count = filteredAppointments.length;
    const avgTicket = count > 0 ? totalEarnings / count : 0;
    
    // Unique days count
    const uniqueDays = new Set(filteredAppointments.map(a => format(a.parsedDate, "yyyy-MM-dd"))).size;

    return {
      totalEarnings,
      count,
      avgTicket,
      uniqueDays
    };
  }, [filteredAppointments]);

  // Grouped by day
  const groupedByDay = useMemo(() => {
    const groups: { [key: string]: { date: Date; dateStr: string; items: typeof filteredAppointments; totalEarnings: number } } = {};

    filteredAppointments.forEach(app => {
      const key = format(app.parsedDate, "yyyy-MM-dd");
      if (!groups[key]) {
        groups[key] = {
          date: app.parsedDate,
          dateStr: key,
          items: [],
          totalEarnings: 0
        };
      }
      groups[key].items.push(app);
      groups[key].totalEarnings += app.calculatedPrice;
    });

    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredAppointments]);

  // Chart data for daily projections
  const chartData = useMemo(() => {
    return groupedByDay.slice(0, 10).map(group => ({
      name: format(group.date, "dd/MM (EEE)", { locale: ptBR }),
      total: group.totalEarnings,
      count: group.items.length
    }));
  }, [groupedByDay]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="future-earnings-modal-overlay"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="future-earnings-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-neutral-950/95 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left"
        >
          {/* 1. Modal Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-neutral-900/60 to-neutral-950 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                    Relatório de Ganhos Futuros
                  </h2>
                  <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-500/30">
                    Projeção de Entrada
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">
                  Agendamentos marcados a partir de amanhã com previsão detalhada de faturamento.
                </p>
              </div>
            </div>

            <button
              id="close-future-earnings-modal-btn"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">
            
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Total Previsto */}
              <div className="bg-blue-950/20 border border-blue-500/20 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/[0.04] rounded-full blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-widest">
                    Possível Entrada
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    R$ {summaryMetrics.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-blue-400 font-bold mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Faturamento previsto
                  </p>
                </div>
              </div>

              {/* Total Agendamentos */}
              <div className="bg-neutral-900/60 border border-white/5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                    Agendamentos
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {summaryMetrics.count}
                  </h3>
                  <p className="text-[9px] text-amber-400 font-bold mt-1">
                    Cortes / Serviços confirmados
                  </p>
                </div>
              </div>

              {/* Ticket Médio */}
              <div className="bg-neutral-900/60 border border-white/5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                    Ticket Médio
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Scissors className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    R$ {summaryMetrics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-purple-400 font-bold mt-1">
                    Média por cliente
                  </p>
                </div>
              </div>

              {/* Dias com Atendimento */}
              <div className="bg-neutral-900/60 border border-white/5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                    Dias de Agenda
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <CalendarDays className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {summaryMetrics.uniqueDays}
                  </h3>
                  <p className="text-[9px] text-emerald-400 font-bold mt-1">
                    Dias futuros com marcações
                  </p>
                </div>
              </div>

            </div>

            {/* Filter Bar */}
            <div className="bg-neutral-900/50 border border-white/5 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              
              {/* Period Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  id="period-filter-all"
                  onClick={() => setPeriodFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    periodFilter === "all"
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  Todos os Futuros ({allFutureAppointments.length})
                </button>
                <button
                  id="period-filter-tomorrow"
                  onClick={() => setPeriodFilter("tomorrow")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    periodFilter === "tomorrow"
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  Amanhã
                </button>
                <button
                  id="period-filter-next7"
                  onClick={() => setPeriodFilter("next7")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    periodFilter === "next7"
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  Próximos 7 Dias
                </button>
                <button
                  id="period-filter-next30"
                  onClick={() => setPeriodFilter("next30")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    periodFilter === "next30"
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  Próximos 30 Dias
                </button>
              </div>

              {/* Search Bar & Barber filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Buscar cliente ou serviço..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-blue-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowChart(!showChart)}
                  title="Alternar gráfico"
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    showChart 
                      ? "bg-blue-500/20 border-blue-500/30 text-blue-400" 
                      : "bg-neutral-800 border-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Chart Projection (Optional toggle) */}
            {showChart && chartData.length > 0 && (
              <div className="bg-neutral-900/40 border border-white/5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Projeção de Faturamento Diário
                    </h4>
                    <p className="text-[10px] text-neutral-500">Distribuição dos valores por dia agendado</p>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-bold">
                    Total: R$ {summaryMetrics.totalEarnings.toFixed(2)}
                  </span>
                </div>

                <div className="h-44 sm:h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#737373" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#737373" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => `R$${v}`} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#0a0a0a", 
                          border: "1px solid rgba(59, 130, 246, 0.3)", 
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                        }}
                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Previsto"]}
                        labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: "11px" }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#3b82f6" 
                        radius={[6, 6, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? "#60a5fa" : "#3b82f6"} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List of Detailed Appointments Grouped by Day */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                  <span>Detalhamento dos Agendamentos</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </h4>
                <span className="text-[10px] text-neutral-500">
                  {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? "s" : ""} encontrado{filteredAppointments.length !== 1 ? "s" : ""}
                </span>
              </div>

              {groupedByDay.length === 0 ? (
                <div className="py-14 px-4 text-center border border-dashed border-white/10 rounded-3xl bg-neutral-900/20 flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-neutral-500">
                    <CalendarClock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-sm font-black text-white uppercase tracking-wider">
                      Nenhum agendamento futuro encontrado
                    </h5>
                    <p className="text-xs text-neutral-500 max-w-sm">
                      {searchQuery 
                        ? `Nenhum resultado corresponde à busca "${searchQuery}".`
                        : "Não há agendamentos futuros marcados para o período selecionado."}
                    </p>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-blue-400 font-bold hover:underline cursor-pointer"
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
              ) : (
                groupedByDay.map((group) => (
                  <div 
                    key={group.dateStr}
                    className="bg-neutral-900/40 border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden"
                  >
                    {/* Day Header Banner */}
                    <div className="p-3.5 sm:p-4 bg-white/[0.02] border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">
                          {format(group.date, "dd")}
                        </div>
                        <div>
                          <h5 className="text-xs sm:text-sm font-black text-white capitalize">
                            {format(group.date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </h5>
                          <span className="text-[10px] text-neutral-500 font-semibold">
                            {group.items.length} atendimento{group.items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                          Subtotal do Dia:
                        </span>
                        <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                          R$ {group.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Day's Appointments Cards */}
                    <div className="p-3 sm:p-4 space-y-2.5">
                      {group.items.map((app) => {
                        const appTime = app.time || (app.parsedDate ? format(app.parsedDate, "HH:mm") : "--:--");
                        const cleanPhone = (app.clientPhone || "").replace(/\D/g, "");

                        return (
                          <div 
                            key={app.id || `${group.dateStr}_${appTime}_${app.clientName}`}
                            className="bg-neutral-950/80 border border-white/5 hover:border-blue-500/25 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            {/* Left: Time & Client Info */}
                            <div className="flex items-start sm:items-center gap-3.5">
                              {/* Time Badge */}
                              <div className="w-14 sm:w-16 py-2 rounded-xl bg-neutral-900 border border-white/10 flex flex-col items-center justify-center shrink-0 group-hover:border-blue-500/30 group-hover:bg-blue-950/20 transition-all">
                                <Clock className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
                                <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                                  {appTime}
                                </span>
                              </div>

                              {/* Details */}
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h6 className="text-xs sm:text-sm font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-wide">
                                    {app.clientName || "Cliente"}
                                  </h6>
                                  {app.status && (
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      app.status === "confirmed" || app.status === "scheduled"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    }`}>
                                      {app.status === "confirmed" ? "Confirmado" : (app.status === "scheduled" ? "Agendado" : app.status)}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                                  <Scissors className="w-3 h-3 text-neutral-500 shrink-0" />
                                  <span>{app.serviceName || "Serviço"}</span>
                                  {app.serviceDuration && (
                                    <span className="text-[9px] text-neutral-500 font-normal">
                                      ({app.serviceDuration} min)
                                    </span>
                                  )}
                                </p>

                                {/* Additional addons or barber name */}
                                <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-medium">
                                  {app.barberName && (
                                    <span>Profissional: <strong className="text-neutral-400">{app.barberName}</strong></span>
                                  )}
                                  {app.addon && app.addon.name && (
                                    <span className="text-amber-400/90 font-bold">
                                      + {app.addon.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Value & Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                              
                              {/* Contact quick button if phone exists */}
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                                    `Olá, ${app.clientName || ""}! Confirmando seu agendamento de ${app.serviceName || "serviço"} na barbearia para o dia ${format(app.parsedDate, "dd/MM")} às ${appTime}. Te esperamos!`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Enviar mensagem WhatsApp"
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Price Display */}
                              <div className="text-right">
                                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block">
                                  Possível Entrada
                                </span>
                                <span className="text-sm sm:text-base font-black text-emerald-400 tracking-tight">
                                  R$ {app.calculatedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* 3. Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-neutral-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Valores previstos calculados com base no preço do serviço e adicionais cadastrados.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {onNavigateToAgenda && (
                <button
                  id="go-to-agenda-from-modal-btn"
                  onClick={() => {
                    onClose();
                    onNavigateToAgenda();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs font-bold text-neutral-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ver na Agenda</span>
                </button>
              )}

              <button
                id="close-modal-footer-btn"
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
