import React, { useMemo, useState } from 'react';
import { Target, TrendingUp, TrendingDown, Lightbulb, CheckCircle2, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { format, parseISO, subMonths, isSameMonth, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface GoalsDashboardProps {
  appointments: any[];
  monthlyGoalsMap: Record<string, number>;
  onUpdateGoal: (monthKey: string, value: number) => void;
}

export function GoalsDashboard({ appointments, monthlyGoalsMap, onUpdateGoal }: GoalsDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthKey = format(currentDate, "yyyy-MM");
  const previousMonthKey = format(subMonths(currentDate, 1), "yyyy-MM");
  
  const currentGoal = monthlyGoalsMap[monthKey] || 0;
  const previousGoal = monthlyGoalsMap[previousMonthKey] || 0;
  
  // Calculate current month's revenue
  const currentMonthRevenue = useMemo(() => {
    return appointments.reduce((sum, app) => {
      if (app.status !== 'completed') return sum;
      const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      if (!(d instanceof Date) || isNaN(d.getTime())) return sum;
      if (isSameMonth(d, currentDate)) {
        const p = app.totalPrice || app.price || 0;
        const parsed = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
        return sum + (Number(parsed) || 0);
      }
      return sum;
    }, 0);
  }, [appointments, currentDate]);
  
  // Calculate previous month's revenue
  const previousMonthRevenue = useMemo(() => {
    const prevDate = subMonths(currentDate, 1);
    return appointments.reduce((sum, app) => {
      if (app.status !== 'completed') return sum;
      const d = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      if (!(d instanceof Date) || isNaN(d.getTime())) return sum;
      if (isSameMonth(d, prevDate)) {
        const p = app.totalPrice || app.price || 0;
        const parsed = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
        return sum + (Number(parsed) || 0);
      }
      return sum;
    }, 0);
  }, [appointments, currentDate]);
  
  const currentPercent = currentGoal > 0 ? Math.min(100, (currentMonthRevenue / currentGoal) * 100) : 0;
  const previousPercent = previousGoal > 0 ? Math.min(100, (previousMonthRevenue / previousGoal) * 100) : 0;
  
  const amountLeft = Math.max(0, currentGoal - currentMonthRevenue);
  
  // Generate suggestions based on performance
  const suggestions = useMemo(() => {
    const s = [];
    if (currentGoal > 0 && currentPercent < 50 && new Date().getDate() > 15 && isSameMonth(currentDate, new Date())) {
      s.push("Metade do mês já passou. Tente oferecer pacotes ou promoções em dias de menor movimento.");
    }
    if (currentMonthRevenue < previousMonthRevenue && isSameMonth(currentDate, new Date())) {
      s.push("O faturamento atual está menor que o mês passado. Considere entrar em contato com clientes inativos.");
    }
    if (currentPercent >= 90 && currentPercent < 100) {
      s.push("Quase lá! Um pequeno esforço extra nos serviços adicionais (ex: sobrancelha, platinado) vai bater a meta.");
    }
    if (currentPercent >= 100) {
      s.push("Meta atingida! Aproveite para fidelizar os clientes que vieram e já planejar uma meta mais ousada no próximo mês.");
    }
    if (s.length === 0) {
      s.push("Mantenha o bom atendimento, ofereça produtos extras (como pomadas e óleos) para aumentar o ticket médio.");
    }
    return s;
  }, [currentGoal, currentPercent, currentMonthRevenue, previousMonthRevenue, currentDate]);

  // Historical data for chart (last 6 months)
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(currentDate, 5 - i);
      const mKey = format(d, "yyyy-MM");
      
      const rev = appointments.reduce((sum, app) => {
        if (app.status !== 'completed') return sum;
        const ad = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        if (!(ad instanceof Date) || isNaN(ad.getTime())) return sum;
        if (isSameMonth(ad, d)) {
          const p = app.totalPrice || app.price || 0;
          const parsed = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
          return sum + (Number(parsed) || 0);
        }
        return sum;
      }, 0);
      
      return {
        monthKey: mKey,
        label: format(d, "MMM", { locale: ptBR }),
        revenue: rev,
        goal: monthlyGoalsMap[mKey] || 0
      };
    });
  }, [appointments, monthlyGoalsMap, currentDate]);

  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.revenue, d.goal))) || 1;

  return (
    <div className="space-y-6">
      {/* Header and Month Selector */}
      <div className="liquid-glass p-6 rounded-[2.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Metas e Desempenho Mensal
          </h3>
          <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">
            Analise seu crescimento e ajuste as projeções de faturamento
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-black/50 p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-black text-white min-w-[100px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </div>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input and Current Progress */}
        <div className="lg:col-span-1 space-y-6">
          <div className="liquid-glass p-6 rounded-[2.5rem] space-y-5">
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                Definir Meta para {format(currentDate, "MMM", { locale: ptBR })} (R$)
              </label>
              <input 
                type="number"
                value={currentGoal === 0 ? "" : currentGoal}
                onChange={e => {
                  const val = e.target.value;
                  onUpdateGoal(monthKey, val === "" ? 0 : Math.max(0, parseFloat(val) || 0));
                }}
                className="bg-black border border-white/10 p-4 rounded-2xl text-2xl font-black text-amber-500 w-full outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-800"
                placeholder="Ex: 10000"
              />
            </div>

            <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Alcançado</p>
                  <p className="text-3xl font-black text-white leading-none">R$ {currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${currentPercent >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                    {currentPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-neutral-900 h-4 rounded-full overflow-hidden border border-white/5 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${currentPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, currentPercent)}%` }}
                />
              </div>

              {currentGoal > 0 && currentPercent < 100 && (
                <p className="text-[10px] text-neutral-400 font-bold text-center">
                  Faltam <span className="text-amber-500 font-black">R$ {amountLeft.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> para bater a meta
                </p>
              )}
              {currentPercent >= 100 && (
                <p className="text-[10px] text-emerald-400 font-bold text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Meta batida com sucesso!
                </p>
              )}
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-[2.5rem] space-y-4">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Dicas de Melhoria
            </h4>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl">
                  <p className="text-xs text-neutral-300 font-medium leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Comparison & Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="liquid-glass p-5 rounded-3xl">
              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Meta Mês Anterior</p>
              <p className="text-lg font-black text-neutral-400">R$ {previousGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="liquid-glass p-5 rounded-3xl">
              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Realizado Anterior</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-white">R$ {previousMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                {previousGoal > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${previousPercent >= 100 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    {previousPercent.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-[2.5rem] space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" /> Histórico (Últimos 6 meses)
              </h4>
              <div className="flex items-center gap-3 text-[9px] font-black uppercase text-neutral-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 block"></span> Realizado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-600 block"></span> Meta</span>
              </div>
            </div>

            <div className="h-48 flex items-end justify-between gap-2">
              {chartData.map((d, i) => {
                const revHeight = maxChartValue > 0 ? (d.revenue / maxChartValue) * 100 : 0;
                const goalHeight = maxChartValue > 0 ? (d.goal / maxChartValue) * 100 : 0;
                const isCurrent = d.monthKey === monthKey;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                    <div className="w-full flex justify-center items-end gap-1 relative h-36">
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 text-white text-[9px] p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-xl">
                        Real: R$ {d.revenue.toFixed(2)}<br/>
                        Meta: R$ {d.goal.toFixed(2)}
                      </div>
                      
                      {d.goal > 0 && (
                        <div 
                          className="w-1/3 bg-neutral-600/50 rounded-t-sm transition-all duration-500"
                          style={{ height: `${Math.max(2, goalHeight)}%` }}
                        />
                      )}
                      <div 
                        className={`w-1/2 rounded-t-md transition-all duration-500 ${isCurrent ? 'bg-amber-400' : 'bg-amber-500/60'}`}
                        style={{ height: `${Math.max(2, revHeight)}%` }}
                      />
                    </div>
                    <span className={`text-[9px] font-black uppercase ${isCurrent ? 'text-amber-500' : 'text-neutral-500'}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
