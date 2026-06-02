import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  isSameWeek, 
  addDays, 
  isSameDay, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  MessageSquare, 
  BrainCircuit, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  CornerDownLeft,
  CalendarCheck,
  Send
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { toast } from "../ui/Toast";
import { safeStringify } from "../../lib/firebase";

interface MyWeekScreenProps {
  user: any;
  appointments: any[];
  onBack: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function MyWeekScreen({ user, appointments, onBack }: MyWeekScreenProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  
  // Weekly analysis states
  const [aiReport, setAiReport] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  
  // Interactive Coach Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Time period details: Current Week boundaries
  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

  // Generate 7 days of the week starting from Monday
  const daysOfTheWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDays(startOfThisWeek, idx));
  }, [startOfThisWeek]);

  // Convert any format of date (stamp, string, Date) to JS Date
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

  // Filter appointments for exactly this week
  const weeklyAppointments = useMemo(() => {
    return appointments.filter(app => {
      const appDate = getAppDate(app.date);
      if (!appDate) return false;
      return isSameWeek(appDate, today, { weekStartsOn: 1 });
    });
  }, [appointments]);

  // Filter appointments for the specifically selected Day of the week
  const selectedDayAppointments = useMemo(() => {
    return weeklyAppointments.filter(app => {
      const appDate = getAppDate(app.date);
      if (!appDate) return false;
      return isSameDay(appDate, selectedDay);
    }).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [weeklyAppointments, selectedDay]);

  // Performance calculations
  const stats = useMemo(() => {
    let earned = 0;
    let completedCount = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;

    weeklyAppointments.forEach(app => {
      const price = Number(app.totalPrice || app.price || 0);
      if (app.status === "completed") {
        earned += price;
        completedCount++;
      } else if (app.status === "confirmed" || app.status === "pending" || !app.status) {
        earned += price; // Include estimated income for dynamic projections
        confirmedCount++;
      } else if (app.status === "cancelled") {
        cancelledCount++;
      }
    });

    const totalCalculated = completedCount + confirmedCount + cancelledCount;
    const occupancyRate = totalCalculated > 0 
      ? Math.round(((completedCount + confirmedCount) / 12) * 100) // Reference normal estimate
      : 0;

    return {
      earned,
      completedCount,
      confirmedCount,
      cancelledCount,
      occupancyRate: Math.min(occupancyRate, 100)
    };
  }, [weeklyAppointments]);

  // Transform data for chart of occupancy by Day of week
  const chartData = useMemo(() => {
    const daysName = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const records = daysOfTheWeek.map((dayDate, index) => {
      const dayApps = weeklyAppointments.filter(app => {
        const appDate = getAppDate(app.date);
        return appDate && isSameDay(appDate, dayDate);
      });
      
      const count = dayApps.filter(app => app.status !== "cancelled").length;
      return {
        name: daysName[index],
        count,
        fullDate: dayDate
      };
    });
    return records;
  }, [weeklyAppointments, daysOfTheWeek]);

  // Fetch AI Strategic Business Report
  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const professionalName = user?.displayName || user?.name || "Parceiro";
      const response = await fetch("/api/gemini/week-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeStringify({
          professionalName,
          appointments: weeklyAppointments
        })
      });

      if (!response.ok) {
        throw new Error("Falha na resposta do servidor.");
      }

      const data = await response.json();
      if (data.report) {
        setAiReport(data.report);
        // Initialize chat with warm-up prompt
        setChatMessages([
          { 
            role: "assistant", 
            content: `Olá, ${professionalName}! Acabo de analisar sua agenda desta semana e compilei seu Relatório de Desempenho. 📊\n\nComo posso ajudar você a otimizar seus horários hoje? Você pode me perguntar truques de vendas, técnicas de fidelização ou fazer perguntas do tipo "Como preencher minha próxima quarta-feira?"!` 
          }
        ]);
      } else {
        throw new Error("Nenhum relatório foi gerado.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar relatório estratégico com Inteligência Artificial.");
    } finally {
      setLoadingReport(false);
    }
  };

  // Run initial report generation once weeklyAppointments is ready
  useEffect(() => {
    if (weeklyAppointments.length >= 0 && !aiReport && !loadingReport) {
      handleGenerateReport();
    }
  }, [weeklyAppointments]);

  // Scroll to bottom on chatbots updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Send message to Coach Chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || chatLoading) return;

    const messageToSend = userInput.trim();
    const updatedMessages: ChatMessage[] = [...chatMessages, { role: "user", content: messageToSend }];
    setChatMessages(updatedMessages);
    setUserInput("");
    setChatLoading(true);

    try {
      const professionalName = user?.displayName || user?.name || "Parceiro";
      const response = await fetch("/api/gemini/week-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeStringify({
          professionalName,
          appointments: weeklyAppointments,
          messages: updatedMessages
        })
      });

      if (!response.ok) {
        throw new Error("Erro na solicitação");
      }

      const data = await response.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error("Sem resposta do assistente");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível conectar com o Coach IA agora.");
      setChatMessages(prev => [...prev, { role: "assistant", content: "Desculpe, mestre. Tive uma flutuação na conexão com o sistema. Pode repetir a pergunta, por favor?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper template questions to suggestions buttons
  const selectQuickQuestion = (question: string) => {
    setUserInput(question);
  };

  // Markdown Custom Parser helper
  function renderMarkdown(text: string) {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('###') || line.startsWith('##')) {
        const cleanText = line.replace(/^#{2,3}\s*/, '');
        return (
          <h3 key={idx} className="text-[11.5px] font-black text-amber-500 uppercase tracking-tight mt-4 mb-2 flex items-center gap-1 border-b border-white/5 pb-1 select-none">
            {cleanText}
          </h3>
        );
      }
      
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const cleanLine = line.replace(/^[\-\*]\s*/, '');
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(cleanLine)) !== null) {
          if (match.index > lastIndex) {
            parts.push(cleanLine.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="text-white font-black">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < cleanLine.length) {
          parts.push(cleanLine.substring(lastIndex));
        }

        return (
          <div key={idx} className="text-[10.5px] text-neutral-300 font-semibold pl-4 relative py-0.5 flex items-start gap-1.5">
            <span className="text-amber-500 select-none">•</span>
            <p className="leading-relaxed flex-1">{parts.length > 0 ? parts : cleanLine}</p>
          </div>
        );
      }

      if (line.trim() === '') return <div key={idx} className="h-1.5" />;
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-white font-black">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <p key={idx} className="text-[10.5px] text-neutral-300 font-medium leading-relaxed my-1">
          {parts.length > 0 ? parts : line}
        </p>
      );
    });
  }

  // Determine dynamic welcome greeting text
  const customWelcomeText = useMemo(() => {
    const hrs = today.getHours();
    if (hrs < 12) return "Bom dia";
    if (hrs < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const profName = user?.displayName || user?.name || "Parceiro";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-md mx-auto py-8 px-4 min-h-screen pb-36 text-left"
    >
      {/* Dynamic Welcoming Header Banner */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/10">
            ★ CENTRAL DE COMPETÊNCIA
          </span>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
            {customWelcomeText}, <span className="text-amber-400">{profName}</span>! 👋
          </h2>
          <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-wide leading-none">
            Análise atualizada da sua semana • {format(today, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        
        <button 
          onClick={onBack}
          className="text-[9px] text-neutral-400 hover:text-white font-black uppercase tracking-widest bg-neutral-900 border border-white/5 hover:border-white/10 px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1"
        >
          Voltar
        </button>
      </div>

      {/* Bento Grid Stats Card area */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Projections Card */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[95px]">
          <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">Faturamento Est.</span>
            <div className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3 h-3" />
            </div>
          </div>
          <div className="space-y-0.5 mt-2">
            <span className="text-xl font-black text-white tracking-tight leading-none block">
              R$ {stats.earned.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-[8px] text-emerald-400 font-black uppercase tracking-wider block">Estupendo progresso</span>
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[95px]">
          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">Eficiência Geral</span>
            <div className="w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div className="space-y-0.5 mt-2">
            <span className="text-xl font-black text-white tracking-tight leading-none block">
              {stats.occupancyRate}%
            </span>
            <span className="text-[8px] text-amber-500 font-black uppercase tracking-wider block">Taxa de Ocupação</span>
          </div>
        </div>

        {/* Action summaries nested inline */}
        <div className="col-span-2 bg-neutral-950/60 p-3 rounded-2xl border border-white/5 flex justify-between text-center divide-x divide-white/5">
          <div className="flex-1">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Ativos</span>
            <span className="text-xs font-black text-white">{stats.confirmedCount}</span>
          </div>
          <div className="flex-1">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Cortes Concluídos</span>
            <span className="text-xs font-black text-green-400">{stats.completedCount}</span>
          </div>
          <div className="flex-1">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Cancelados</span>
            <span className="text-xs font-black text-rose-400">{stats.cancelledCount}</span>
          </div>
        </div>
      </div>

      {/* Mini Visual Chart Bar represent Occupancy Index across Segment days */}
      <div className="bg-neutral-900/40 p-4 rounded-[2rem] border border-white/5 mb-6">
        <h4 className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Atendimentos Realizados na Semana
        </h4>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                stroke="#525252" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#525252" 
                fontSize={8} 
                tickLine={false} 
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                labelStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#ffb020' }}
                itemStyle={{ fontSize: '9px', color: '#fff' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isCurrentDay = isSameDay(entry.fullDate, today);
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isCurrentDay ? '#f59e0b' : '#3f3f46'} 
                      opacity={entry.count === 0 ? 0.3 : 1}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Week Day Picker Carousel */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[9px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-amber-500" /> Agenda do Dia Selecionado
          </h4>
          <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {format(selectedDay, "dd MMM", { locale: ptBR })}
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {daysOfTheWeek.map((dayDate, idx) => {
            const isSelected = isSameDay(selectedDay, dayDate);
            const isToday = isSameDay(today, dayDate);
            const dayLabel = format(dayDate, "eee", { locale: ptBR }).substring(0, 3);
            const dateNum = format(dayDate, "dd");

            // Count appointments for this day to draw a indicator badge
            const dayAppCount = weeklyAppointments.filter(app => {
              const aDate = getAppDate(app.date);
              return aDate && isSameDay(aDate, dayDate) && app.status !== "cancelled";
            }).length;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDay(dayDate)}
                className={`flex-1 min-w-[48px] py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all border relative cursor-pointer ${
                  isSelected 
                    ? "bg-amber-500 text-black border-amber-500 shadow-md transform scale-105" 
                    : isToday
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold"
                      : "bg-neutral-900/50 text-neutral-400 border-white/5 hover:border-white/10"
                }`}
              >
                <span className="text-[7.5px] uppercase font-black tracking-widest select-none">
                  {dayLabel}
                </span>
                <span className="text-xs font-black select-none mt-0.5">
                  {dateNum}
                </span>

                {dayAppCount > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[7.5px] font-black flex items-center justify-center border ${
                    isSelected 
                      ? "bg-black text-amber-400 border-amber-500"
                      : "bg-amber-500 text-black border-neutral-950"
                  }`}>
                    {dayAppCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointment Day List container */}
      <div className="mb-6 space-y-2.5">
        {selectedDayAppointments.map((app) => {
          return (
            <motion.div
              layout
              key={app.id}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 ${
                app.status === "completed" ? "bg-neutral-900/20 border-green-500/10 opacity-75" :
                app.status === "cancelled" ? "bg-neutral-900/10 border-rose-500/10 opacity-55" :
                "bg-neutral-900/60 border-white/5 shadow-md hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Time Indicator Badge */}
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border font-mono select-none shrink-0 ${
                  app.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/15" :
                  app.status === "cancelled" ? "bg-rose-500/10 text-rose-400 border-rose-500/15" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/15 font-bold"
                }`}>
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-tighter mt-0.5">
                    {app.time || "S/H"}
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white uppercase italic truncate">
                    {app.clientName || "Cliente"}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8px] text-amber-500 font-black uppercase tracking-wider">
                      {app.serviceName}
                    </span>
                    <span className="text-[8.5px] text-neutral-500 font-extrabold">•</span>
                    <span className="text-[8px] text-neutral-400 font-extrabold">
                      R$ {Number(app.totalPrice || app.price || 0).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action and status check */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-lg text-[7.5px] font-black uppercase tracking-wider border ${
                  app.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                  app.status === "cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-amber-500/10 text-amber-500 border-amber-500/20"
                }`}>
                  {app.status === "completed" ? "Conclúido" :
                   app.status === "cancelled" ? "Cancelado" :
                   "Confirmado"}
                </span>

                {/* Prompt contact helper button if confirmed */}
                {app.status !== "completed" && app.status !== "cancelled" && (
                  <a
                    href={`https://wa.me/${app.clientPhone ? app.clientPhone.replace(/\D/g, '') : ''}`}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg border border-white/5 active:scale-95 transition-all"
                    title="Enviar WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}

        {selectedDayAppointments.length === 0 && (
          <div className="py-8 text-center bg-black/10 rounded-2xl border border-dashed border-white/5 space-y-1">
            <Calendar className="w-6 h-6 text-neutral-800 mx-auto" />
            <p className="text-[9px] text-neutral-500 uppercase font-black tracking-widest">Agenda Livre</p>
            <p className="text-[7.5px] text-neutral-600 font-bold uppercase tracking-widest max-w-[200px] mx-auto">
              Nenhum agendamento ativo para este dia. Aproveite para descansar ou planejar promoções.
            </p>
          </div>
        )}
      </div>

      {/* AI Business Coach & Report Block */}
      <div className="mb-6 space-y-4">
        <div className="text-left">
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block mb-0.5">
            ✦ CO-PILOTO ESTRATÉGICO
          </span>
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">
            Coach de Negócios Inteligência Artificial
          </h3>
        </div>

        {/* Dynamic Strategic Report */}
        <div className="bg-neutral-900/80 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/[0.02] border-b border-white/5 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-black shadow font-bold">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-white uppercase tracking-tight">Relatório Semanal AI</h4>
                <p className="text-[7.5px] text-amber-500 font-extrabold uppercase tracking-widest">Estratégias de Agenda</p>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loadingReport}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-[8px] font-black uppercase tracking-widest text-neutral-300 rounded-lg border border-white/5 hover:border-white/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              {loadingReport ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Atualizar
                </>
              )}
            </button>
          </div>

          {/* Report Text Display Area */}
          <div className="p-5 text-left max-h-[290px] overflow-y-auto font-medium space-y-1 text-xs border-b border-white/5">
            {loadingReport && !aiReport ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest animate-pulse">
                  Gemini analisando sua agenda...
                </p>
              </div>
            ) : aiReport ? (
              <div className="space-y-1.5 transition-all duration-300">
                {renderMarkdown(aiReport)}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-neutral-800 mx-auto" />
                <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Resumo de desempenho Inteligente</p>
                <p className="text-[9px] text-neutral-600 font-semibold max-w-xs mx-auto leading-relaxed">
                  Gere um resumo estratégico baseando-se no faturamento, ocupação das terças de manhã, retenção e comparecimentos.
                </p>
                <button
                  onClick={handleGenerateReport}
                  className="bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black uppercase tracking-wider px-3py-2 rounded-lg py-1.5 active:scale-95 transition-all"
                >
                  Gerar Primeiro Resumo
                </button>
              </div>
            )}
          </div>

          {/* Interactive Strategist Chat Box */}
          <div className="bg-neutral-950 p-4 space-y-3">
            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block text-left">
              💬 Conversar sobre sua agenda e ticket médio:
            </span>

            {/* Chat Messages display */}
            {chatMessages.length > 0 && (
              <div className="space-y-4 max-h-[220px] overflow-y-auto mb-3 pr-1 text-xs text-left">
                {chatMessages.map((msg, mIdx) => (
                  <div 
                    key={mIdx} 
                    className={`flex gap-2.5 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role !== "user" && (
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-black flex items-center justify-center shrink-0 text-[10px] font-black">
                        AI
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-amber-500 text-black font-semibold rounded-tr-none" 
                        : "bg-neutral-900 text-neutral-200 font-medium rounded-tl-none border border-white/5"
                    }`}>
                      <p className="whitespace-pre-line text-[10.5px]">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex gap-2.5 items-center justify-start">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-black flex items-center justify-center shrink-0 animate-pulse text-[10px] font-black">
                      ...
                    </div>
                    <div className="bg-neutral-900 border border-white/5 text-neutral-500 p-2.5 rounded-2xl text-[9px] font-black tracking-widest uppercase animate-pulse flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      Coach IA formulando resposta estratégica...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Quick Templates questions */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => selectQuickQuestion("Como melhorar meu faturamento e o ticket médio nesta semana?")}
                className="text-[8px] px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 rounded-xl truncate shrink-0 cursor-pointer font-bold transition-all"
              >
                💡 Melhorar Faturamento
              </button>
              <button
                type="button"
                onClick={() => selectQuickQuestion("Quais são as melhores dicas para lotar horários menos movimentados?")}
                className="text-[8px] px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 rounded-xl truncate shrink-0 cursor-pointer font-bold transition-all"
              >
                📅 Preencher Agenda Ociosa
              </button>
              <button
                type="button"
                onClick={() => selectQuickQuestion("Como posso sugerir produtos de barbearia de forma elegante para meus clientes?")}
                className="text-[8px] px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 rounded-xl truncate shrink-0 cursor-pointer font-bold transition-all"
              >
                🧴 Upsell de Produtos
              </button>
            </div>

            {/* Form Input submit panel */}
            <form onSubmit={handleSendMessage} className="flex gap-1.5">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Pergunte ao seu consultor de negócios IA..."
                disabled={chatLoading}
                className="flex-1 bg-neutral-900 text-white placeholder-neutral-500 text-[10.5px] px-3 py-2.5 rounded-xl border border-white/5 focus:border-amber-500 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || chatLoading}
                className="w-10 h-10 bg-amber-500 hover:bg-amber-400 text-black rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 transition-all cursor-pointer shadow active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
