import React, { useState, useEffect, useMemo } from "react";
import { format, subDays, addDays, isSameDay, isSameWeek, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  query, 
  collection, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} from 'recharts';
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { 
  TrendingUp, 
  Users, 
  Star, 
  ArrowLeft, 
  DollarSign, 
  Sparkles, 
  ReceiptText, 
  CalendarClock, 
  CheckCircle2, 
  Layers,
  ArrowUpRight
} from "lucide-react";

interface EarningsScreenProps {
  onBack: () => void;
}

export const EarningsScreen = ({ onBack }: EarningsScreenProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "all">("month");
  const [chartViewMode, setChartViewMode] = useState<"combined" | "realized" | "future">("combined");

  useEffect(() => {
    // Real-time listener for all appointments
    const q = query(collection(db, "appointments"));
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

  // Helper to parse price reliably
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

  // Helper to parse appointment date
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

  // 1. Attended / Completed appointments (Realized Revenue)
  const completedApps = useMemo(() => {
    return appointments.filter(a => a.status === 'completed' && a.status !== 'cancelled');
  }, [appointments]);

  // 2. Future / Scheduled appointments (Future / Projected Revenue)
  const futureApps = useMemo(() => {
    return appointments.filter(a => (a.status === 'confirmed' || a.status === 'pending' || !a.status) && a.status !== 'cancelled');
  }, [appointments]);

  const stats = useMemo(() => {
    const now = new Date();
    
    // Filter completed appointments by timeRange
    const filteredCompleted = completedApps.filter(app => {
      const date = parseDate(app);
      if (!date) return false;
      if (timeRange === "day") return isSameDay(date, now);
      if (timeRange === "week") return isSameWeek(date, now, { weekStartsOn: 0, locale: ptBR });
      if (timeRange === "month") return isSameMonth(date, now);
      return true;
    });

    // Filter future appointments by timeRange
    const filteredFuture = futureApps.filter(app => {
      const date = parseDate(app);
      if (!date) return false;
      if (timeRange === "day") return isSameDay(date, now);
      if (timeRange === "week") return isSameWeek(date, now, { weekStartsOn: 0, locale: ptBR });
      if (timeRange === "month") return isSameMonth(date, now);
      return true;
    });

    // 1. Realized Revenue (Clientes que compareceram)
    const realizedRevenue = filteredCompleted.reduce((acc, app) => acc + parsePrice(app), 0);
    const completedCount = filteredCompleted.length;
    
    // 2. Future / Projected Revenue (Agendados para o período)
    const futureRevenue = filteredFuture.reduce((acc, app) => acc + parsePrice(app), 0);
    const futureCount = filteredFuture.length;

    // 3. Combined Total Potential
    const totalPotentialRevenue = realizedRevenue + futureRevenue;
    const totalAppointmentsCombined = completedCount + futureCount;

    // 4. Ticket Médio (sobre realizados)
    const avgTicket = completedCount > 0 ? realizedRevenue / completedCount : 0;
    const avgRating = filteredCompleted.filter(a => a.rating).reduce((acc, app, _, arr) => acc + (app.rating / arr.length), 0);
    
    // 5. Retention Rate calculation based on client attendance history
    const clientVisitCounts: Record<string, number> = {};
    completedApps.forEach(app => {
      const clientId = app.clientId || app.loginCode || app.clientPhone;
      if (clientId) clientVisitCounts[clientId] = (clientVisitCounts[clientId] || 0) + 1;
    });
    const totalClients = Object.keys(clientVisitCounts).length;
    const returningClients = Object.values(clientVisitCounts).filter(count => count > 1).length;
    const retentionRate = totalClients === 0 ? 0 : (returningClients / totalClients) * 100;

    // 6. Recurrent Revenue (Faturamento de clientes fiéis / recorrentes)
    const recurringRevenue = filteredCompleted
      .filter(app => {
        const clientId = app.clientId || app.loginCode || app.clientPhone;
        return clientId && clientVisitCounts[clientId] > 1;
      })
      .reduce((acc, app) => acc + parsePrice(app), 0);

    return { 
      realizedRevenue, 
      futureRevenue, 
      totalPotentialRevenue, 
      completedCount, 
      futureCount, 
      totalAppointmentsCombined, 
      avgTicket, 
      avgRating, 
      retentionRate, 
      recurringRevenue 
    };
  }, [completedApps, futureApps, timeRange]);

  // Service distribution for attended appointments
  const serviceDistribution = useMemo(() => {
    const data: Record<string, number> = {};
    completedApps.forEach(app => {
        const key = app.serviceName || "Outros";
        data[key] = (data[key] || 0) + 1;
    });
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [completedApps]);

  // Chart data covering both Realized and Future Projected values
  const chartData = useMemo(() => {
    const now = new Date();
    const result: { name: string; realized: number; future: number; total: number }[] = [];

    if (timeRange === "day") {
      // 7 past days + Today + 7 future days
      const days = [];
      for (let i = 7; i >= 1; i--) days.push(subDays(now, i));
      days.push(now);
      for (let i = 1; i <= 7; i++) days.push(addDays(now, i));

      days.forEach(d => {
        const key = format(d, "dd/MM");
        let realized = 0;
        let future = 0;

        completedApps.forEach(app => {
          const ad = parseDate(app);
          if (ad && isSameDay(ad, d)) realized += parsePrice(app);
        });

        futureApps.forEach(app => {
          const ad = parseDate(app);
          if (ad && isSameDay(ad, d)) future += parsePrice(app);
        });

        result.push({
          name: key,
          realized,
          future,
          total: realized + future
        });
      });
    } else if (timeRange === "week") {
      // Last 4 weeks + Next 4 weeks
      const weeks = [];
      for (let i = 4; i >= 1; i--) weeks.push(subDays(now, i * 7));
      weeks.push(now);
      for (let i = 1; i <= 4; i++) weeks.push(addDays(now, i * 7));

      weeks.forEach(w => {
        const key = `Sem ${format(w, "ww")}`;
        let realized = 0;
        let future = 0;

        completedApps.forEach(app => {
          const ad = parseDate(app);
          if (ad && isSameWeek(ad, w, { weekStartsOn: 0, locale: ptBR })) {
            realized += parsePrice(app);
          }
        });

        futureApps.forEach(app => {
          const ad = parseDate(app);
          if (ad && isSameWeek(ad, w, { weekStartsOn: 0, locale: ptBR })) {
            future += parsePrice(app);
          }
        });

        result.push({
          name: key,
          realized,
          future,
          total: realized + future
        });
      });
    } else {
      // Last 6 months + Next 2 months
      const months = [];
      for (let i = 5; i >= 1; i--) months.push(subDays(now, i * 30));
      months.push(now);
      for (let i = 1; i <= 2; i++) months.push(addDays(now, i * 30));

      months.forEach(m => {
        const key = format(m, "MMM", { locale: ptBR });
        let realized = 0;
        let future = 0;

        completedApps.forEach(app => {
          const ad = parseDate(app);
          if (ad && isSameMonth(ad, m)) realized += parsePrice(app);
        });

        futureApps.forEach(app => {
          const ad = parseDate(app);
          if (ad && isSameMonth(ad, m)) future += parsePrice(app);
        });

        result.push({
          name: key,
          realized,
          future,
          total: realized + future
        });
      });
    }

    return result;
  }, [completedApps, futureApps, timeRange]);

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-black uppercase tracking-widest animate-pulse">Sincronizando faturamento em tempo real...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-3 group w-fit cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Voltar ao Painel</span>
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Business Analytics & Ganhos</h2>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" title="Atualização em tempo real ativa" />
            </div>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">
              Ganhos realizados de clientes atendidos e projeção de agendamentos futuros
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex bg-neutral-900/80 p-1.5 rounded-2xl border border-white/5 w-fit">
            {(["day", "week", "month", "all"] as const).map((r) => (
              <button 
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  timeRange === r 
                    ? 'bg-amber-500 text-black font-black shadow-lg shadow-amber-500/20' 
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {r === 'day' ? 'Hoje' : r === 'week' ? 'Semana' : r === 'month' ? 'Mês' : 'Geral'}
              </button>
            ))}
          </div>
        </header>

        {/* 1. Real-Time Earnings Overview: Realized vs. Future Projected */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Ganhos Realizados (Compareceram) */}
          <div className="liquid-glass p-6 rounded-[2rem] border border-emerald-500/20 relative overflow-hidden group shadow-xl bg-gradient-to-br from-emerald-950/20 to-black">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-[0.2em] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ganhos Realizados
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-black uppercase">
                {stats.completedCount} {stats.completedCount === 1 ? 'atendimento' : 'atendimentos'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black italic text-emerald-400 tracking-tight leading-none">
              R$ {stats.realizedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-neutral-400 font-bold uppercase mt-3 flex items-center gap-1">
              Clientes que compareceram e foram atendidos
            </p>
          </div>

          {/* Card 2: Ganhos Futuros (Agendados) */}
          <div className="liquid-glass p-6 rounded-[2rem] border border-blue-500/20 relative overflow-hidden group shadow-xl bg-gradient-to-br from-blue-950/20 to-black">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em] flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Ganhos Futuros (Previstos)
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-black uppercase">
                {stats.futureCount} {stats.futureCount === 1 ? 'agendado' : 'agendados'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black italic text-blue-400 tracking-tight leading-none">
              R$ {stats.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-neutral-400 font-bold uppercase mt-3 flex items-center gap-1">
              Valor a receber de clientes agendados no período
            </p>
          </div>

          {/* Card 3: Faturamento Total Projetado (Realizado + Futuro) */}
          <div className="liquid-glass p-6 rounded-[2rem] border border-amber-500/20 relative overflow-hidden group shadow-xl bg-gradient-to-br from-amber-950/20 to-black">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black uppercase text-amber-400 tracking-[0.2em] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Potencial Total
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-black uppercase">
                {stats.totalAppointmentsCombined} total
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black italic text-amber-400 tracking-tight leading-none">
              R$ {stats.totalPotentialRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[9px] text-neutral-400 font-bold uppercase mt-3 flex items-center gap-1">
              Faturamento consolidado + projeção de agenda
            </p>
          </div>

        </div>

        {/* 2. Secondary Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="liquid-glass p-5 rounded-[1.75rem] border border-white/5 space-y-1">
            <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Ticket Médio
            </p>
            <h4 className="text-lg sm:text-xl font-black text-purple-400">
              R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[8px] text-neutral-500 font-bold uppercase">Por corte realizado</p>
          </div>

          <div className="liquid-glass p-5 rounded-[1.75rem] border border-white/5 space-y-1">
            <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-1.5">
              <ReceiptText className="w-3.5 h-3.5 text-emerald-400" /> Receita Recorrente
            </p>
            <h4 className="text-lg sm:text-xl font-black text-emerald-400">
              R$ {stats.recurringRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[8px] text-neutral-500 font-bold uppercase">Clientes fiéis (2+ cortes)</p>
          </div>

          <div className="liquid-glass p-5 rounded-[1.75rem] border border-white/5 space-y-1">
            <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" /> Retenção
            </p>
            <h4 className="text-lg sm:text-xl font-black text-blue-400">
              {stats.retentionRate.toFixed(0)}%
            </h4>
            <p className="text-[8px] text-neutral-500 font-bold uppercase">Taxa de retorno</p>
          </div>

          <div className="liquid-glass p-5 rounded-[1.75rem] border border-white/5 space-y-1">
            <p className="text-[9px] font-black uppercase text-neutral-500 tracking-widest flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" /> Avaliação Média
            </p>
            <h4 className="text-lg sm:text-xl font-black text-amber-400">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '5.0'} ⭐
            </h4>
            <p className="text-[8px] text-neutral-500 font-bold uppercase">Satisfação dos clientes</p>
          </div>
        </div>

        {/* 3. Evolution Chart with Realized vs. Projected View Modes */}
        <div className="liquid-glass rounded-[2.5rem] p-6 sm:p-8 border border-white/5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" /> Evolução Financeira & Projeção
              </h3>
              <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">
                Visualização combinada de receita realizada e projeções futuras
              </p>
            </div>

            {/* Chart View Mode Selector */}
            <div className="flex bg-black/60 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setChartViewMode("combined")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  chartViewMode === "combined" ? "bg-amber-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Combinado
              </button>
              <button 
                onClick={() => setChartViewMode("realized")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  chartViewMode === "realized" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Realizados
              </button>
              <button 
                onClick={() => setChartViewMode("future")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  chartViewMode === "future" ? "bg-blue-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Futuros
              </button>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFuture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#666" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', padding: '12px' }} 
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  labelStyle={{ fontSize: '10px', color: '#888', marginBottom: '6px', fontWeight: '900', textTransform: 'uppercase' }}
                  formatter={(value: number, name: string) => [
                    `R$ ${value.toFixed(2)}`,
                    name === 'realized' ? 'Realizado (Compareceram)' : name === 'future' ? 'Ganhos Futuros (Agendados)' : 'Total Projetado'
                  ]}
                />
                
                {(chartViewMode === "combined" || chartViewMode === "realized") && (
                  <Area 
                    type="monotone" 
                    dataKey="realized" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRealized)" 
                    name="realized"
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#000', strokeWidth: 2 }}
                  />
                )}

                {(chartViewMode === "combined" || chartViewMode === "future") && (
                  <Area 
                    type="monotone" 
                    dataKey="future" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    strokeDasharray={chartViewMode === "combined" ? "5 5" : undefined}
                    fillOpacity={1} 
                    fill="url(#colorFuture)" 
                    name="future"
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/5 text-[10px] font-black uppercase text-neutral-400">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Realizado (Compareceram)
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Ganhos Futuros (Agendados)
            </span>
          </div>
        </div>

        {/* 4. Popular Services & Client Retention */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Popular Services */}
          <div className="liquid-glass rounded-[2.5rem] p-6 sm:p-8 border border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">
              Serviços Mais Procurados (Realizados)
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={serviceDistribution} 
                    innerRadius={45} 
                    outerRadius={75} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {serviceDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '12px' }} 
                    itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {serviceDistribution.map((s, idx) => (
                <span key={idx} className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-neutral-900 border border-white/5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  {s.name} ({s.value})
                </span>
              ))}
            </div>
          </div>

          {/* Retention Gauge */}
          <div className="liquid-glass rounded-[2.5rem] p-6 sm:p-8 border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" /> Fidelidade & Retenção de Clientes
              </h3>
              <p className="text-[9px] text-neutral-500 font-bold uppercase mt-1">
                Frequência de retorno dos clientes atendidos
              </p>
            </div>

            <div className="text-center py-6">
              <div className="relative inline-block">
                <svg className="w-36 h-36 transform -rotate-90">
                  <circle cx="72" cy="72" r="62" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-neutral-900" />
                  <circle 
                    cx="72" cy="72" r="62" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={389.5} 
                    strokeDashoffset={389.5 - (389.5 * stats.retentionRate) / 100} 
                    strokeLinecap="round"
                    className="text-amber-500 transition-all duration-1000" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black italic text-white">{stats.retentionRate.toFixed(0)}%</span>
                  <span className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Retenção</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-neutral-400 font-bold text-center">
              {stats.retentionRate >= 50 ? 'Ótima taxa de retorno dos clientes!' : 'Oportunidade para aplicar campanhas de cashback e fidelização.'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

