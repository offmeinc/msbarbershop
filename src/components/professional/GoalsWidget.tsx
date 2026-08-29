import React, { useState, useMemo } from "react";
import { 
  Target, 
  TrendingUp, 
  Sparkles, 
  Edit3, 
  Check, 
  X, 
  CalendarClock, 
  Award, 
  Zap, 
  ChevronRight,
  Flame,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { Timestamp, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface GoalsWidgetProps {
  appointments: any[];
  currentUserId?: string;
  role?: string;
  userMonthlyGoal?: number;
  onNavigateToAgenda?: () => void;
  onNavigateToGoals?: () => void;
}

export function GoalsWidget({
  appointments,
  currentUserId,
  role,
  userMonthlyGoal = 5000,
  onNavigateToAgenda,
  onNavigateToGoals
}: GoalsWidgetProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(userMonthlyGoal || 5000));
  const [dailyGoalInput, setDailyGoalInput] = useState("300");
  const [customDailyGoal, setCustomDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`daily_goal_${currentUserId || 'default'}`);
    return saved ? Number(saved) : 300;
  });
  const [customMonthlyGoal, setCustomMonthlyGoal] = useState<number>(userMonthlyGoal || 5000);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const monthKey = format(now, "yyyy-MM");

  // Helper to parse date
  const parseDate = (app: any): Date | null => {
    if (!app?.date) return null;
    if (app.date instanceof Timestamp) return app.date.toDate();
    if (typeof app.date === "string") {
      const d = parseISO(app.date);
      return isNaN(d.getTime()) ? null : d;
    }
    if (app.date instanceof Date) return isNaN(app.date.getTime()) ? null : app.date;
    return null;
  };

  // Helper to parse price
  const parsePrice = (app: any): number => {
    const raw = app.totalPrice ?? app.price ?? 0;
    if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
    if (typeof raw === "string") {
      const clean = raw.replace(/[^0-9.-]+/g, "");
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Calculations for Today & Month
  const metrics = useMemo(() => {
    // Filter for current user if role is barber
    const userApps = appointments.filter(app => {
      if (role === "barber" && currentUserId) {
        return app.barberId === currentUserId;
      }
      return true;
    });

    let todayRealized = 0;
    let todayScheduledFuture = 0;
    let todayCompletedCount = 0;
    let todayScheduledCount = 0;

    let monthRealized = 0;
    let monthScheduledFuture = 0;
    let monthCompletedCount = 0;

    userApps.forEach(app => {
      if (app.status === "cancelled" || app.status === "no_show") return;

      const d = parseDate(app);
      if (!d) return;

      const price = parsePrice(app);

      // Today
      if (isSameDay(d, now)) {
        if (app.status === "completed") {
          todayRealized += price;
          todayCompletedCount++;
        } else {
          // in_progress, confirmed, scheduled, pending
          todayScheduledFuture += price;
          todayScheduledCount++;
        }
      }

      // This Month
      if (isSameMonth(d, now)) {
        if (app.status === "completed") {
          monthRealized += price;
          monthCompletedCount++;
        } else {
          monthScheduledFuture += price;
        }
      }
    });

    // Projections (Realized + Future Confirmed)
    const todayProjected = todayRealized + todayScheduledFuture;
    const monthProjected = monthRealized + monthScheduledFuture;

    return {
      todayRealized,
      todayScheduledFuture,
      todayProjected,
      todayCompletedCount,
      todayScheduledCount,
      monthRealized,
      monthScheduledFuture,
      monthProjected,
      monthCompletedCount,
    };
  }, [appointments, currentUserId, role, now]);

  const targetValue = activeTab === "daily" ? customDailyGoal : customMonthlyGoal;
  const realizedValue = activeTab === "daily" ? metrics.todayRealized : metrics.monthRealized;
  const projectedValue = activeTab === "daily" ? metrics.todayProjected : metrics.monthProjected;
  const futureValue = activeTab === "daily" ? metrics.todayScheduledFuture : metrics.monthScheduledFuture;

  const realizedPercent = targetValue > 0 ? Math.min(100, Math.round((realizedValue / targetValue) * 100)) : 0;
  const projectedPercent = targetValue > 0 ? Math.min(150, Math.round((projectedValue / targetValue) * 100)) : 0;
  const remainingValue = Math.max(0, targetValue - realizedValue);
  const remainingProjected = Math.max(0, targetValue - projectedValue);

  const handleSaveGoal = async () => {
    const num = parseFloat(goalInput.replace(",", ".")) || 0;
    if (num <= 0) return;

    if (activeTab === "daily") {
      setCustomDailyGoal(num);
      localStorage.setItem(`daily_goal_${currentUserId || 'default'}`, String(num));
    } else {
      setCustomMonthlyGoal(num);
      if (currentUserId) {
        try {
          const userRef = doc(db, "users", currentUserId);
          await updateDoc(userRef, {
            monthlyGoal: num
          });
        } catch (e) {
          console.warn("Error updating monthly goal:", e);
        }
      }
    }
    setIsEditingGoal(false);
  };

  return (
    <div 
      id="goals-performance-widget"
      className="bg-neutral-900/40 liquid-glass/90 border border-white/5 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden space-y-5"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/[0.04] rounded-full blur-2xl pointer-events-none" />

      {/* Header with Title and Toggle Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Metas & Desempenho</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h3>
            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
              Acompanhamento de receita e projeção de fechamento
            </p>
          </div>
        </div>

        {/* Tab switchers: Diária / Mensal */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => {
              setActiveTab("daily");
              setGoalInput(String(customDailyGoal));
              setIsEditingGoal(false);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "daily"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Meta Hoje
          </button>
          <button
            onClick={() => {
              setActiveTab("monthly");
              setGoalInput(String(customMonthlyGoal));
              setIsEditingGoal(false);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "monthly"
                ? "bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Meta do Mês
          </button>
        </div>
      </div>

      {/* Main KPI Goal Progress Card */}
      <div className="bg-neutral-950/60 border border-white/5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4">
        
        {/* Value Numbers & Goal Edit */}
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">
              {activeTab === "daily" ? "Faturamento Concluído Hoje" : "Faturamento Concluído no Mês"}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                R$ {realizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-neutral-500 font-bold">
                de R$ {targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Goal Edit Button / Input Form */}
          <div>
            {isEditingGoal ? (
              <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-amber-500/40">
                <span className="text-[10px] text-neutral-400 font-bold pl-1.5">R$</span>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-20 bg-neutral-950 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-amber-400 font-black focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveGoal}
                  className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer"
                  title="Salvar Meta"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingGoal(false)}
                  className="p-1 rounded-lg bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setGoalInput(String(activeTab === "daily" ? customDailyGoal : customMonthlyGoal));
                  setIsEditingGoal(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-neutral-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>Ajustar Meta</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Layer Progress Bar (Realized + Projected) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-black">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              {realizedPercent}% Atingido
            </span>
            <span className="text-blue-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              {projectedPercent}% Projeção de Fechamento
            </span>
          </div>

          {/* Progress Container */}
          <div className="h-3 bg-neutral-900 rounded-full overflow-hidden relative border border-white/5">
            {/* Projected bar (behind / wider) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, projectedPercent)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute top-0 bottom-0 left-0 bg-blue-500/40 rounded-full"
            />
            {/* Realized bar (front / solid) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, realizedPercent)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            />
          </div>
        </div>

        {/* Insights & Projections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          
          {/* Card 1: Ganhos Futuros Agendados */}
          <div className="bg-neutral-900/60 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-wider block">
                Agendados {activeTab === "daily" ? "Hoje" : "no Mês"}
              </span>
              <strong className="text-xs font-black text-blue-400">
                + R$ {futureValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Card 2: Projeção de Fechamento */}
          <div className="bg-neutral-900/60 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-wider block">
                Projeção Estimada
              </span>
              <strong className="text-xs font-black text-white">
                R$ {projectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Card 3: Quanto falta */}
          <div className="bg-neutral-900/60 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              remainingValue === 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"
            }`}>
              {remainingValue === 0 ? <Award className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-wider block">
                {remainingValue === 0 ? "Meta Atingida! 🎉" : "Falta Realizar"}
              </span>
              <strong className={`text-xs font-black ${remainingValue === 0 ? "text-emerald-400" : "text-purple-300"}`}>
                {remainingValue === 0 ? "Parabéns!" : `R$ ${remainingValue.toFixed(2)}`}
              </strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
