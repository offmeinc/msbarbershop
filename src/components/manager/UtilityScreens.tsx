import React, { useState, useEffect, useMemo } from "react";
import { 
  query, 
  collection, 
  onSnapshot,
  doc,
  updateDoc,
  Timestamp 
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  isSameDay, 
  isSameWeek, 
  isSameMonth, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Loader2, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  DollarSign, 
  CreditCard, 
  Coins, 
  QrCode, 
  Wallet, 
  Calendar, 
  User, 
  Clock, 
  SlidersHorizontal, 
  Check, 
  X, 
  HelpCircle,
  FileMinus,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Receipt,
  RotateCcw
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { toast } from "../ui/Toast";

type TimeRange = "today" | "week" | "month" | "all";
type ReconciledFilter = "all" | "unreconciled" | "reconciled";
type MethodFilter = "all" | "pix" | "card" | "money" | "wallet";

export function ReconScreen({ onBack }: { onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [reconFilter, setReconFilter] = useState<ReconciledFilter>("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all non-cancelled appointments to verify transactions in real-time
    const q = query(collection(db, "appointments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppointments(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getAppDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (dateVal instanceof Timestamp) return dateVal.toDate();
    if (dateVal.toDate && typeof dateVal.toDate === "function") return dateVal.toDate();
    if (typeof dateVal === "string") {
      try { return parseISO(dateVal); } catch { return null; }
    }
    return null;
  };

  // 1. Time-filtered appointments (non-cancelled only for revenue computation, but we keep active ones to show projections)
  const timeFilteredAppointments = useMemo(() => {
    const today = new Date();
    return appointments.filter(app => {
      // Exclude obviously cancelled bookings from general calculations
      if (app.status === "cancelled") return false;

      const appDate = getAppDate(app.date);
      if (!appDate) return false;

      if (timeRange === "today") return isSameDay(appDate, today);
      if (timeRange === "week") return isSameWeek(appDate, today, { weekStartsOn: 1 });
      if (timeRange === "month") return isSameMonth(appDate, today);
      return true; // all
    });
  }, [appointments, timeRange]);

  // 2. Metrics computation based on time-filtered dataset
  const metrics = useMemo(() => {
    let expectedTotal = 0; // Confirmed + Pending + Completed
    let completedTotal = 0; // Completed only
    let reconciledTotal = 0; // Completed & reconciled
    let unreconciledTotal = 0; // Completed & not reconciled

    let countCompleted = 0;
    let countReconciled = 0;

    // Payment methods indicators for completed
    let pixSum = 0;
    let cardSum = 0;
    let moneySum = 0;
    let walletSum = 0;
    let undefinedSum = 0;

    timeFilteredAppointments.forEach(app => {
      const price = Number(app.totalPrice || app.price || 0);
      expectedTotal += price;

      if (app.status === "completed") {
        completedTotal += price;
        countCompleted++;

        // Audit payment method
        const method = (app.paymentMethod || "").toLowerCase();
        if (method === "pix") pixSum += price;
        else if (method === "card" || method === "cartao") cardSum += price;
        else if (method === "money" || method === "dinheiro") moneySum += price;
        else if (method === "wallet" || method === "carteira") walletSum += price;
        else undefinedSum += price;

        if (app.reconciled) {
          reconciledTotal += price;
          countReconciled++;
        } else {
          unreconciledTotal += price;
        }
      }
    });

    const matchRate = countCompleted > 0 
      ? Math.round((countReconciled / countCompleted) * 100) 
      : 100;

    return {
      expectedTotal,
      completedTotal,
      reconciledTotal,
      unreconciledTotal,
      countCompleted,
      countReconciled,
      matchRate,
      pixSum,
      cardSum,
      moneySum,
      walletSum,
      undefinedSum
    };
  }, [timeFilteredAppointments]);

  // 3. User Filter applications (Search + Reconciliation State + Methods selections)
  const filteredAppointments = useMemo(() => {
    return timeFilteredAppointments.filter(app => {
      // Must be a completed appointment to show up in reconciliation log
      if (app.status !== "completed") return false;

      // Filter by Search term (client or barber name)
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        const client = (app.clientName || "").toLowerCase();
        const barber = (app.barberName || "").toLowerCase();
        const service = (app.serviceName || "").toLowerCase();
        if (!client.includes(search) && !barber.includes(search) && !service.includes(search)) {
          return false;
        }
      }

      // Filter by Reconciliation boolean status
      if (reconFilter === "reconciled" && !app.reconciled) return false;
      if (reconFilter === "unreconciled" && app.reconciled) return false;

      // Filter by Payment method
      if (methodFilter !== "all") {
        const payMethod = (app.paymentMethod || "").toLowerCase();
        if (methodFilter === "pix" && payMethod !== "pix") return false;
        if (methodFilter === "card" && payMethod !== "card" && payMethod !== "cartao") return false;
        if (methodFilter === "money" && payMethod !== "money" && payMethod !== "dinheiro") return false;
        if (methodFilter === "wallet" && payMethod !== "wallet" && payMethod !== "carteira") return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort oldest to latest or reverse? Usually chronologically latest on top
      const dateA = getAppDate(a.date)?.getTime() || 0;
      const dateB = getAppDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [timeFilteredAppointments, searchTerm, reconFilter, methodFilter]);

  // Count of completed but payment method missing
  const missingPaymentMethodCount = useMemo(() => {
    return timeFilteredAppointments.filter(app => 
      app.status === "completed" && !app.paymentMethod
    ).length;
  }, [timeFilteredAppointments]);

  // Action: Toggle reconciled status
  const handleToggleReconciled = async (id: string, currentState: boolean) => {
    setActionInProgress(id);
    try {
      await updateDoc(doc(db, "appointments", id), {
        reconciled: !currentState
      });
      toast.success(currentState ? "Status alterado para pendente" : "Transação conciliada com sucesso! ✓");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar conciliação no banco de dados.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Change payment method inline
  const handleChangePaymentMethod = async (id: string, method: string) => {
    setActionInProgress(id + "-method");
    try {
      await updateDoc(doc(db, "appointments", id), {
        paymentMethod: method,
        paymentStatus: "paid" // Enforce payment complete when method selected
      });
      toast.success(`Método de pagamento atualizado para ${method.toUpperCase()}! 💰`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar método de pagamento.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: Bulk reconcile all displayed completed items
  const handleAutoReconcileAll = async () => {
    const targetApps = filteredAppointments.filter(app => !app.reconciled);
    if (targetApps.length === 0) {
      toast.info("Não há transações pendentes para conciliar nesta lista.");
      return;
    }

    if (!window.confirm(`Deseja conciliar todas as ${targetApps.length} transações pendentes no filtro atual?`)) {
      return;
    }

    setActionInProgress("bulk");
    try {
      const promises = targetApps.map(app => 
        updateDoc(doc(db, "appointments", app.id), { reconciled: true })
      );
      await Promise.all(promises);
      toast.success(`Excelência! ${targetApps.length} transações conciliadas de uma vez! ✨🎯`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao executar conciliação em lote.");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md mx-auto py-8 px-5 min-h-screen pb-32 text-left"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 liquid-glass  rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-amber-500" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Conciliação</h2>
            <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Fechamento e Auditoria</span>
          </div>
        </div>

        {filteredAppointments.some(a => !a.reconciled) && (
          <button
            onClick={handleAutoReconcileAll}
            disabled={actionInProgress !== null}
            className="text-[9px] text-amber-400 hover:text-black font-black uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500 px-3.5 py-2.5 rounded-xl border border-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {actionInProgress === "bulk" ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            Zerar Pendências
          </button>
        )}
      </div>

      {/* Date Ranges selectors */}
      <div className="flex gap-1.5 p-1 liquid-glass rounded-2xl mb-6  shadow-inner select-none">
        {(["today", "week", "month", "all"] as TimeRange[]).map((range) => {
          const labels: Record<TimeRange, string> = {
            today: "Hoje",
            week: "Semana",
            month: "Mês",
            all: "Histórico"
          };
          return (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 py-2.5 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all ${
                timeRange === range
                  ? "bg-amber-500 text-black font-black shadow-md"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {labels[range]}
            </button>
          );
        })}
      </div>

      {/* Accuracy KPI and audit summary info */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* Top rate details */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-left space-y-0.5">
            <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest block">Índice de Acordo Caixa</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight">{metrics.matchRate}%</span>
              <span className="text-[9px] text-neutral-400 font-extrabold uppercase">Conciliado</span>
            </div>
          </div>

          <div className={`w-14 h-14 rounded-full border flex items-center justify-center relative ${
            metrics.matchRate === 100 
              ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" 
              : "border-amber-500/20 text-amber-500 bg-amber-500/5"
          }`}>
            <TrendingUp className="w-6 h-6" />
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle 
                cx="28" 
                cy="28" 
                r="24" 
                fill="transparent" 
                stroke={metrics.matchRate === 100 ? "#10b981" : "#f59e0b"} 
                strokeWidth="2.5" 
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - metrics.matchRate / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
          </div>
        </div>

        {/* Financial Sub-items */}
        <div className="grid grid-cols-3 gap-2 text-left pt-3 border-t border-white/5 divide-x divide-white/5">
          <div className="pl-1">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Receita Total</span>
            <span className="text-sm font-black text-white">R$ {metrics.completedTotal.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="pl-3">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Conciliado</span>
            <span className="text-sm font-black text-emerald-400">R$ {metrics.reconciledTotal.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="pl-3">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Pendente</span>
            <span className="text-sm font-black text-amber-500">R$ {metrics.unreconciledTotal.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
      </div>

      {/* Warnings & Diagnostics alerts */}
      <AnimatePresence>
        {missingPaymentMethodCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-left"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Atenção mestre, pendência identificada!</h4>
              <p className="text-[9px] text-rose-300 font-semibold leading-relaxed">
                Existem <strong>{missingPaymentMethodCount} agendamentos concluídos</strong> sem método de pagamento registrado. Escolha um método válido (PIX, Dinheiro, Cartão) nos cartões abaixo para reconciliar o caixa corretamente.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment methods stats distribution */}
      <div className="mb-6">
        <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
          Distribuição por Canal de Pagamento (Concluídos)
        </span>
        <div className="grid grid-cols-4 gap-2">
          {/* PIX */}
          <div className=" liquid-glass/60 p-2.5 rounded-xl  text-center">
            <QrCode className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
            <span className="text-[7px] font-black text-neutral-500 uppercase tracking-widest block">PIX</span>
            <span className="text-[10.5px] font-black text-white">R$ {metrics.pixSum.toFixed(0)}</span>
          </div>
          {/* Cartao */}
          <div className=" liquid-glass/60 p-2.5 rounded-xl  text-center">
            <CreditCard className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
            <span className="text-[7px] font-black text-neutral-500 uppercase tracking-widest block">Cartão</span>
            <span className="text-[10.5px] font-black text-white">R$ {metrics.cardSum.toFixed(0)}</span>
          </div>
          {/* Dinheiro */}
          <div className=" liquid-glass/60 p-2.5 rounded-xl  text-center">
            <Coins className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
            <span className="text-[7px] font-black text-neutral-500 uppercase tracking-widest block">Dinheiro</span>
            <span className="text-[10.5px] font-black text-white">R$ {metrics.moneySum.toFixed(0)}</span>
          </div>
          {/* Carteira */}
          <div className=" liquid-glass/60 p-2.5 rounded-xl  text-center">
            <Wallet className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
            <span className="text-[7px] font-black text-neutral-500 uppercase tracking-widest block">Carteira</span>
            <span className="text-[10.5px] font-black text-white">R$ {metrics.walletSum.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter panel: Search + status toggles */}
      <div className="space-y-3 mb-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar cliente, profissional, serviço..."
            className="w-full liquid-glass/90 text-white placeholder-neutral-500 text-xs pl-10 pr-4 py-3 rounded-2xl  focus:border-amber-500 focus:outline-none transition-all font-semibold"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="liquid-glass absolute right-3 top-3 p-0.5 rounded-lg hover:text-white"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Status filters & pay methods selection filters */}
        <div className="flex gap-2 py-0.5 overflow-x-auto no-scrollbar scroll-smooth select-none">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0 my-auto mr-1" />

          {/* Reconciliation status toggler pills */}
          <button
            onClick={() => setReconFilter("all")}
            className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
              reconFilter === "all"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Todos ({filteredAppointments.length})
          </button>

          <button
            onClick={() => setReconFilter("unreconciled")}
            className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
              reconFilter === "unreconciled"
                ? "bg-amber-500 text-black border-amber-500"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            ⚠️ Pendentes ({filteredAppointments.filter(a => !a.reconciled).length})
          </button>

          <button
            onClick={() => setReconFilter("reconciled")}
            className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
              reconFilter === "reconciled"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            ✓ Conciliadas
          </button>

          <span className="liquid-glass w-px h-4 my-auto shrink-0" />

          {/* Payment Method filter pills */}
          {(["all", "pix", "card", "money", "wallet"] as MethodFilter[]).map((method) => {
            const labels: Record<MethodFilter, string> = {
              all: "M. Pagamento",
              pix: "PIX",
              card: "Cartão",
              money: "Dinheiro",
              wallet: "Carteira"
            };
            return (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                  methodFilter === method
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                    : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                }`}
              >
                {labels[method]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Reconciliation log stream */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filteredAppointments.map((app, idx) => {
            const dateObj = getAppDate(app.date);
            const isReconciled = app.reconciled;
            const payMethod = (app.paymentMethod || "").toLowerCase();
            const price = Number(app.totalPrice || app.price || 0);

            return (
              <motion.div
                layout
                key={app.id}
                initial={{ opacity: 0, scale: 0.97, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                className={`text-left p-4 rounded-[2rem] border transition-all relative overflow-hidden group ${
                  isReconciled 
                    ? "bg-neutral-900/20 border-emerald-500/15 opacity-75 hover:opacity-100" 
                    : "bg-neutral-900/90 border-amber-500/15 shadow-xl hover:border-amber-500/30"
                }`}
              >
                {/* Visual Reconciliation Left checkpoint */}
                <div className="flex gap-4 items-start">
                  
                  {/* Inline Reconciled checkpoint switch */}
                  <button
                    onClick={() => handleToggleReconciled(app.id, !!isReconciled)}
                    disabled={actionInProgress === app.id}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                      isReconciled 
                        ? "bg-emerald-500 text-black border-emerald-500" 
                        : "bg-black/45 text-neutral-500 border-white/10 hover:border-amber-500/35 hover:text-amber-500"
                    }`}
                    title={isReconciled ? "Marcar como pendente" : "Marcar como conciliado"}
                  >
                    {actionInProgress === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    ) : isReconciled ? (
                      <Check className="w-5 h-5 stroke-[3px]" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-neutral-600 group-hover:bg-amber-500 transition-colors animate-pulse" />
                    )}
                  </button>

                  {/* Main Details area */}
                  <div className="flex-1 min-w-0 space-y-1 pr-6">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-wide">
                        {app.barberName || "Profissional"}
                      </span>
                      <span className="text-[8px] text-neutral-500 font-mono">
                        {dateObj ? format(dateObj, "dd MMM • HH:mm", { locale: ptBR }) : (app.time || "")}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white uppercase italic tracking-tight truncate leading-tight">
                      {app.clientName || "Cliente"}
                    </h4>

                    {/* Service detail and prices tags */}
                    <p className="text-[9.5px] text-neutral-400 uppercase font-bold tracking-widest flex items-center gap-1">
                      <span className="text-amber-500 italic font-black">{app.serviceName}</span>
                      <span>•</span>
                      <strong>R$ {price.toFixed(2).replace(".", ",")}</strong>
                    </p>

                    {/* Inline Payment Method Selector panel */}
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[7.5px] text-neutral-500 font-black uppercase tracking-wider">Método:</span>
                      
                      <div className="flex gap-1">
                        {/* PIX */}
                        <button
                          onClick={() => handleChangePaymentMethod(app.id, "pix")}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                            payMethod === "pix"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-black scale-105"
                              : "bg-black/30 text-neutral-600 border-white/5 hover:text-neutral-400"
                          }`}
                          title="Pagamento via PIX"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        {/* Cartao */}
                        <button
                          onClick={() => handleChangePaymentMethod(app.id, "card")}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                            payMethod === "card" || payMethod === "cartao"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30 font-black scale-105"
                              : "bg-black/30 text-neutral-600 border-white/5 hover:text-neutral-400"
                          }`}
                          title="Pagamento via Cartão"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                        {/* Money */}
                        <button
                          onClick={() => handleChangePaymentMethod(app.id, "money")}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                            payMethod === "money" || payMethod === "dinheiro"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/30 font-black scale-105"
                              : "bg-black/30 text-neutral-600 border-white/5 hover:text-neutral-400"
                          }`}
                          title="Pagamento via Dinheiro"
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </button>
                        {/* Wallet */}
                        <button
                          onClick={() => handleChangePaymentMethod(app.id, "wallet")}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                            payMethod === "wallet" || payMethod === "carteira"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30 font-black scale-105"
                              : "bg-black/30 text-neutral-600 border-white/5 hover:text-neutral-400"
                          }`}
                          title="Utilizou Saldo Carteira"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Not audited indicator visual flag */}
                      {!payMethod && (
                        <span className="text-[7px] text-rose-400 font-extrabold uppercase animate-pulse tracking-widest pl-1 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                          ⚠️ Sem Registro
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Reconciled/Pending Visual stamp text badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 pointer-events-none select-none">
                  <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                    isReconciled 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                      : "bg-amber-500/10 text-amber-400 border-amber-500/15 animate-pulse"
                  }`}>
                    {isReconciled ? "Conciliado" : "Pendente"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAppointments.length === 0 && (
          <div className="liquid-glass py-20 text-center space-y-4 rounded-[2.5rem] -dashed">
            <FileMinus className="w-12 h-12 text-neutral-800 mx-auto" />
            <div className="space-y-0.5">
              <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">Lista Vazia</p>
              <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest leading-normal max-w-xs mx-auto">
                Não há lançamentos de agendamentos concluídos correspondentes aos filtros de auditoria selecionados no momento.
              </p>
            </div>
            {(reconFilter !== "all" || methodFilter !== "all" || searchTerm) && (
              <button
                onClick={() => {
                  setReconFilter("all");
                  setMethodFilter("all");
                  setSearchTerm("");
                }}
                className="px-3.5 py-2 liquid-glass  hover:border-white/10 rounded-xl text-neutral-400 hover:text-white text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 mx-auto active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.1 h-3.1" /> Reiniciar Filtros
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
