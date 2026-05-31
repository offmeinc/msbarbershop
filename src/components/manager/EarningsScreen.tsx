import React, { useState, useEffect, useMemo } from "react";
import { format, subDays, isSameDay, isSameWeek, isSameMonth } from "date-fns";
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
  Line
} from 'recharts';
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { TrendingUp, Users, Star, ArrowLeft, DollarSign } from "lucide-react";

interface EarningsScreenProps {
  onBack: () => void;
}

export const EarningsScreen = ({ onBack }: EarningsScreenProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");

  useEffect(() => {
    // We want all appointments to calculate retention (not just completed ones)
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

  const completedApps = useMemo(() => appointments.filter(a => a.status === 'completed' && a.paymentStatus === 'paid' && a.status !== 'cancelled'), [appointments]);

  const stats = useMemo(() => {
    const now = new Date();
    
    const filteredForRange = completedApps.filter(app => {
      const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
      if (timeRange === "day") return isSameDay(date, now);
      if (timeRange === "week") return isSameWeek(date, now, { weekStartsOn: 0, locale: ptBR });
      if (timeRange === "month") return isSameMonth(date, now);
      return true;
    });

    const totalRevenue = filteredForRange.reduce((acc, app) => acc + (parseFloat(app.totalPrice || app.price) || 0), 0);
    const avgRating = filteredForRange.filter(a => a.rating).reduce((acc, app, _, arr) => acc + (app.rating / arr.length), 0);
    
    // Retention calculation based on all time or current range? Usually all time is better for retention.
    const clientVisitCounts: Record<string, number> = {};
    completedApps.forEach(app => {
      const clientId = app.clientId || app.loginCode;
      if (clientId) clientVisitCounts[clientId] = (clientVisitCounts[clientId] || 0) + 1;
    });
    const totalClients = Object.keys(clientVisitCounts).length;
    const returningClients = Object.values(clientVisitCounts).filter(count => count > 1).length;
    const retentionRate = totalClients === 0 ? 0 : (returningClients / totalClients) * 100;

    return { totalRevenue, avgRating, retentionRate };
  }, [completedApps, timeRange]);

  const dailyEarnings = useMemo(() => {
    const data: Record<string, number> = {};
    const last15Days = [...Array(15)].map((_, i) => format(subDays(new Date(), i), "dd/MM")).reverse();
    
    last15Days.forEach(d => data[d] = 0);
    
    completedApps.forEach(app => {
      const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
      const key = format(date, "dd/MM");
      if (data.hasOwnProperty(key)) {
        data[key] += (parseFloat(app.totalPrice || app.price) || 0);
      }
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [completedApps]);

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

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    const now = new Date();
    
    if (timeRange === "day") {
      // Last 15 days
      const last15Days = [...Array(15)].map((_, i) => format(subDays(now, i), "dd/MM")).reverse();
      last15Days.forEach(d => data[d] = 0);
      completedApps.forEach(app => {
        const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
        const key = format(date, "dd/MM");
        if (data.hasOwnProperty(key)) data[key] += (parseFloat(app.totalPrice || app.price) || 0);
      });
    } else if (timeRange === "week") {
      // Last 8 weeks
      const last8Weeks = [...Array(8)].map((_, i) => {
        const d = subDays(now, i * 7);
        return `Sem ${format(d, "ww")}`;
      }).reverse();
      last8Weeks.forEach(w => data[w] = 0);
      completedApps.forEach(app => {
        const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
        const key = `Sem ${format(date, "ww")}`;
        if (data.hasOwnProperty(key)) data[key] += (parseFloat(app.totalPrice || app.price) || 0);
      });
    } else {
      // Last 6 months
      const last6Months = [...Array(6)].map((_, i) => {
        const d = subDays(now, i * 30);
        return format(d, "MMM", { locale: ptBR });
      }).reverse();
      last6Months.forEach(m => data[m] = 0);
      completedApps.forEach(app => {
        const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
        const key = format(date, "MMM", { locale: ptBR });
        if (data.hasOwnProperty(key)) data[key] += (parseFloat(app.totalPrice || app.price) || 0);
      });
    }

    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [completedApps, timeRange]);

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  if (loading) return <div className="p-12 text-center text-white font-black italic uppercase animate-pulse">Analizando dados...</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="max-w-xl mx-auto px-6 py-12">
        <header className="flex flex-col mb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-4 group w-fit">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Painel</span>
            </button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Business Analytics</h2>
        </header>

        {/* Time Range Selector */}
        <div className="flex bg-neutral-900/50 p-1 rounded-2xl border border-white/5 mb-8 w-fit mx-auto">
            {(["day", "week", "month"] as const).map((r) => (
                <button 
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-amber-500 text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                    {r === 'day' ? 'Hoje' : r === 'week' ? 'Semana' : 'Mês'}
                </button>
            ))}
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-neutral-900/50 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <DollarSign className="w-24 h-24" />
                </div>
                <p className="text-[9px] font-black uppercase text-neutral-500 tracking-[0.2em] mb-4">Total Ganhos</p>
                <h3 className="text-2xl font-black italic">R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="bg-neutral-900/50 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Star className="w-24 h-24" />
                </div>
                <p className="text-[9px] font-black uppercase text-neutral-500 tracking-[0.2em] mb-4">Satisfação</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black italic">{stats.avgRating.toFixed(1)}</h3>
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500 mb-1" />
                </div>
            </div>
        </div>

        {/* Charts Container */}
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="bg-neutral-900 border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Rendimento</h3>
                   <p className="text-[10px] text-neutral-600 font-bold uppercase mt-1">Visão Geral de Fluxo</p>
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <XAxis dataKey="name" stroke="#333" fontSize={9} axisLine={false} tickLine={false} />
                        <Tooltip 
                            cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }}
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px', padding: '12px' }} 
                            itemStyle={{ color: '#f59e0b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                            labelStyle={{ fontSize: '9px', color: '#666', marginBottom: '4px', fontWeight: '900', textTransform: 'uppercase' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#f59e0b" 
                            strokeWidth={4} 
                            dot={{ r: 4, fill: '#000', stroke: '#f59e0b', strokeWidth: 2 }} 
                            activeDot={{ r: 6, fill: '#f59e0b' }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Popular Services */}
              <div className="bg-neutral-900 border border-white/5 rounded-[2.5rem] p-8">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-8">Serviços Mais Procurados</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={serviceDistribution} 
                                innerRadius={40} 
                                outerRadius={65} 
                                paddingAngle={5} 
                                dataKey="value"
                            >
                                {serviceDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
              </div>

              {/* Retention Rate */}
              <div className="bg-neutral-900 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Retenção de Clientes
                </h3>
                <div className="text-center">
                    <div className="relative inline-block">
                        <svg className="w-32 h-32 transform -rotate-90">
                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                            <circle 
                                cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                strokeDasharray={364.4} 
                                strokeDashoffset={364.4 - (364.4 * stats.retentionRate) / 100} 
                                className="text-amber-500 transition-all duration-1000" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-black italic">{stats.retentionRate.toFixed(0)}%</span>
                        </div>
                    </div>
                    <p className="text-[9px] text-neutral-500 uppercase font-bold mt-4 tracking-tighter">Taxa de retorno dos clientes</p>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
