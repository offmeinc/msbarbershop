import React, { useMemo, useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  BarChart2, 
  CalendarClock, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
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
  const [isUpdating, setIsUpdating] = useState(false);
  
  const monthKey = format(currentDate, "yyyy-MM");
  const previousMonthKey = format(subMonths(currentDate, 1), "yyyy-MM");
  
  const currentGoal = monthlyGoalsMap[monthKey] || 0;
  const previousGoal = monthlyGoalsMap[previousMonthKey] || 0;

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
  
  // 1. Current Month's Realized Revenue (Clientes que compareceram / concluídos)
  const currentMonthRevenue = useMemo(() => {
    return appointments.reduce((sum, app) => {
      if (app.status !== 'completed' || app.status === 'cancelled') return sum;
      const d = parseDate(app);
      if (d && isSameMonth(d, currentDate)) {
        return sum + parsePrice(app);
      }
      return sum;
    }, 0);
  }, [appointments, currentDate]);

  // 2. Current Month's Future / Projected Revenue (Clientes agendados neste mês)
  const currentMonthFutureRevenue = useMemo(() => {
    return appointments.reduce((sum, app) => {
      if (app.status === 'completed' || app.status === 'cancelled') return sum;
      const d = parseDate(app);
      if (d && isSameMonth(d, currentDate)) {
        return sum + parsePrice(app);
      }
      return sum;
    }, 0);
  }, [appointments, currentDate]);

  // 3. Projected Month Total (Realizado + Futuros Agendados)
  const projectedMonthTotal = currentMonthRevenue + currentMonthFutureRevenue;
  
  // 4. Previous Month's Revenue
  const previousMonthRevenue = useMemo(() => {
    const prevDate = subMonths(currentDate, 1);
    return appointments.reduce((sum, app) => {
      if (app.status !== 'completed' || app.status === 'cancelled') return sum;
      const d = parseDate(app);
      if (d && isSameMonth(d, prevDate)) {
        return sum + parsePrice(app);
      }
      return sum;
    }, 0);
  }, [appointments, currentDate]);
  
  const currentPercent = currentGoal > 0 ? (currentMonthRevenue / currentGoal) * 100 : 0;
  const projectedPercent = currentGoal > 0 ? (projectedMonthTotal / currentGoal) * 100 : 0;
  const previousPercent = previousGoal > 0 ? (previousMonthRevenue / previousGoal) * 100 : 0;
  
  const amountLeftRealized = Math.max(0, currentGoal - currentMonthRevenue);
  const amountLeftProjected = Math.max(0, currentGoal - projectedMonthTotal);
  
  // Generate smart suggestions based on performance and projections
  const suggestions = useMemo(() => {
    const s = [];
    const isNow = isSameMonth(currentDate, new Date());
    
    if (isNow && currentGoal > 0) {
      if (projectedPercent >= 100 && currentPercent < 100) {
        s.push(`🎉 Boa notícia! Com os agendamentos já marcados para este mês, você alcançará R$ ${projectedMonthTotal.toFixed(2)} (${projectedPercent.toFixed(0)}% da meta). Foque em garantir o comparecimento!`);
      } else if (projectedPercent < 100 && amountLeftProjected > 0) {
        s.push(`Faltam R$ ${amountLeftProjected.toFixed(2)} em novos agendamentos para fechar a meta do mês com folga.`);
      }

      if (new Date().getDate() > 15 && currentPercent < 50) {
        s.push("Metade do mês já passou. Tente disparar avisos no WhatsApp para clientes com retorno em aberto.");
      }
    }
    
    if (currentPercent >= 100) {
      s.push("🔥 Meta batida com sucesso! Aproveite para fidelizar os clientes que vieram e preparar a próxima meta.");
    }
    
    if (s.length === 0) {
      s.push("Ofereça serviços adicionais (ex: sobrancelha, barba, hidratação) para aumentar o ticket médio por atendimento.");
    }
    return s;
  }, [currentGoal, currentPercent, projectedPercent, currentMonthRevenue, projectedMonthTotal, amountLeftProjected, currentDate]);
  
  useEffect(() => {
    setIsUpdating(true);
    const timer = setTimeout(() => {
      setIsUpdating(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentMonthRevenue, currentMonthFutureRevenue, currentGoal]);

  // Historical data for chart (last 6 months with future projection)
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(currentDate, 5 - i);
      const mKey = format(d, "yyyy-MM");
      
      let rev = 0;
      let fut = 0;

      appointments.forEach(app => {
        const ad = parseDate(app);
        if (ad && isSameMonth(ad, d) && app.status !== 'cancelled') {
          if (app.status === 'completed') {
            rev += parsePrice(app);
          } else {
            fut += parsePrice(app);
          }
        }
      });
      
      return {
        monthKey: mKey,
        label: format(d, "MMM", { locale: ptBR }),
        revenue: rev,
        future: fut,
        total: rev + fut,
        goal: monthlyGoalsMap[mKey] || 0
      };
    });
  }, [appointments, monthlyGoalsMap, currentDate]);

  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.total, d.goal))) || 1;

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
            Acompanhamento em tempo real de faturamento realizado e projeção de agendamentos
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-black/50 p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-black text-white min-w-[120px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </div>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-neutral-400 hover:text-white cursor-pointer"
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

            {/* Current Realized vs Projected Card */}
            <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-4">
              
              {/* Realized */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                    Realizado (Compareceram)
                    {isUpdating && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                  </p>
                  <p className={`text-2xl sm:text-3xl font-black leading-none transition-colors duration-500 ${isUpdating ? 'text-emerald-400' : 'text-white'}`}>
                    R$ {currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${currentPercent >= 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                    {currentPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Future Projected Row */}
              <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px]">
                <span className="font-bold text-blue-400 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" /> Ganhos Futuros Agendados:
                </span>
                <span className="font-black text-blue-400">
                  + R$ {currentMonthFutureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Projected Total Row */}
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-neutral-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Projeção Total do Mês:
                </span>
                <span className="font-black text-amber-400">
                  R$ {projectedMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({projectedPercent.toFixed(0)}%)
                </span>
              </div>

              {/* Dual Visual Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-neutral-900 h-4 rounded-full overflow-hidden border border-white/5 relative flex">
                  {/* Realized segment */}
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, currentPercent)}%` }}
                    title={`Realizado: ${currentPercent.toFixed(1)}%`}
                  />
                  {/* Future projected segment */}
                  <div 
                    className="h-full bg-blue-500/70 border-l border-black/30 transition-all duration-1000"
                    style={{ width: `${Math.max(0, Math.min(100 - currentPercent, projectedPercent - currentPercent))}%` }}
                    title={`Agendados futuros: +${(projectedPercent - currentPercent).toFixed(1)}%`}
                  />
                </div>
                
                <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500">
                  <span className="text-emerald-400">● Realizado ({currentPercent.toFixed(0)}%)</span>
                  <span className="text-blue-400">● Previsto (+{(projectedPercent - currentPercent).toFixed(0)}%)</span>
                </div>
              </div>

              {currentGoal > 0 && currentPercent < 100 && (
                <p className="text-[10px] text-neutral-400 font-bold text-center">
                  Faltam <span className="text-amber-500 font-black">R$ {amountLeftRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> para bater a meta
                </p>
              )}
              {currentPercent >= 100 && (
                <p className="text-[10px] text-emerald-400 font-bold text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Meta batida com sucesso!
                </p>
              )}
            </div>
          </div>

          <div className="liquid-glass p-6 rounded-[2.5rem] space-y-4">
            <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Dicas e Diagnóstico de Metas
            </h4>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-2xl">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" /> Histórico & Projeções (Últimos 6 meses)
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-[9px] font-black uppercase text-neutral-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 block"></span> Realizado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 block"></span> Agendado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-600 block"></span> Meta</span>
              </div>
            </div>

            <div className="h-56 flex items-end justify-between gap-2 pt-4">
              {chartData.map((d, i) => {
                const revHeight = maxChartValue > 0 ? (d.revenue / maxChartValue) * 100 : 0;
                const futureHeight = maxChartValue > 0 ? (d.future / maxChartValue) * 100 : 0;
                const goalHeight = maxChartValue > 0 ? (d.goal / maxChartValue) * 100 : 0;
                const isCurrent = d.monthKey === monthKey;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                    <div className="w-full flex justify-center items-end gap-1 relative h-40">
                      {/* Tooltip */}
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 text-white text-[9px] p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap shadow-2xl">
                        <span className="text-emerald-400 font-bold">Real: R$ {d.revenue.toFixed(2)}</span><br/>
                        {d.future > 0 && <><span className="text-blue-400 font-bold">Futuro: R$ {d.future.toFixed(2)}</span><br/></>}
                        <span className="text-neutral-400 font-bold">Meta: R$ {d.goal.toFixed(2)}</span>
                      </div>
                      
                      {/* Target goal pillar */}
                      {d.goal > 0 && (
                        <div 
                          className="w-1/3 bg-neutral-700/50 rounded-t-sm transition-all duration-500"
                          style={{ height: `${Math.max(2, goalHeight)}%` }}
                        />
                      )}

                      {/* Stacked revenue + future pillar */}
                      <div className="w-1/2 flex flex-col justify-end h-full">
                        {d.future > 0 && (
                          <div 
                            className="w-full bg-blue-500/70 rounded-t-md transition-all duration-500"
                            style={{ height: `${Math.max(2, futureHeight)}%` }}
                          />
                        )}
                        <div 
                          className={`w-full transition-all duration-500 ${d.future > 0 ? '' : 'rounded-t-md'} ${isCurrent ? 'bg-emerald-400' : 'bg-emerald-500/70'}`}
                          style={{ height: `${Math.max(2, revHeight)}%` }}
                        />
                      </div>
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
