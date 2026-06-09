import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Legend
} from "recharts";
import { format, parseISO, isSameDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Scissors, Users, Sparkles, TrendingUp } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { motion } from "motion/react";

export function AnalyticsScreen({ appointments, services }: { appointments: any[], services: any[] }) {
    const stats = useMemo(() => {
        const completed = appointments.filter(app => app.status === 'completed');
        const scheduled = appointments.filter(app => app.status === 'confirmed' || app.status === 'pending');
        
        const totalValue = completed.reduce((sum, app) => {
            const price = parseFloat((app.totalPrice || app.price || 0).toString().replace(/[^0-9.-]+/g, ""));
            return sum + (Number(price) || 0);
        }, 0);

        const totalCuts = completed.length;
        const avgValue = totalCuts > 0 ? (totalValue / totalCuts) : 0;
        
        return { totalValue, totalCuts, avgValue };
    }, [appointments]);

    const revenueData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
        return last7Days.map(day => {
            const dayApps = appointments.filter(app => {
                const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
                return isSameDay(d, day) && app.status === 'completed';
            });
            return {
                name: format(day, 'dd/MM', { locale: ptBR }),
                ganhos: dayApps.reduce((acc, curr) => acc + (Number((curr.totalPrice || curr.price || 0).toString().replace(/[^0-9.-]+/g, "")) || 0), 0)
            };
        });
    }, [appointments]);

    const serviceData = useMemo(() => {
        const counts: Record<string, number> = {};
        appointments.filter(app => app.status === 'completed').forEach(app => {
            counts[app.serviceName] = (counts[app.serviceName] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [appointments]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-black uppercase text-white tracking-tight">Business Analytics</h2>
            
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Faturamento", value: `R$ ${stats.totalValue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400" },
                    { label: "Atendimentos", value: stats.totalCuts, icon: Scissors, color: "text-amber-500" },
                    { label: "Ticket Médio", value: `R$ ${stats.avgValue.toFixed(2)}`, icon: Sparkles, color: "text-purple-400" },
                    { label: "Clientes", value: new Set(appointments.map(a => a.clientId)).size, icon: Users, color: "text-blue-400" },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ y: -5 }} className=" liquid-glass  rounded-2xl p-4">
                        <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{stat.label}</p>
                        <h3 className="text-lg font-black text-white">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className=" liquid-glass  rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500"/> Faturamento (Últimos 7 dias)</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorGanhos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333"/>
                                <XAxis dataKey="name" stroke="#666" fontSize={10}/>
                                <YAxis stroke="#666" fontSize={10}/>
                                <Tooltip contentStyle={{ backgroundColor: '#000' }}/>
                                <Area type="monotone" dataKey="ganhos" stroke="#f59e0b" fill="url(#colorGanhos)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className=" liquid-glass  rounded-2xl p-6">
                    <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2"><Scissors className="w-4 h-4 text-purple-500"/> Serviços Populares</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={serviceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333"/>
                                <XAxis dataKey="name" stroke="#666" fontSize={10}/>
                                <YAxis stroke="#666" fontSize={10}/>
                                <Tooltip contentStyle={{ backgroundColor: '#000' }}/>
                                <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
