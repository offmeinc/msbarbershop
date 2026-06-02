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
      className="max-w-md mx-auto min-h-screen bg-white text-left font-sans flex flex-col"
    >
      {/* Header section like Google Calendar / Reference */}
      <div className="px-4 pt-6 pb-2 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-gray-900 capitalize">
            {format(today, "MMMM", { locale: ptBR })}
          </h1>
          <span className="text-sm font-medium text-gray-400">
            {format(today, "yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full">
              <CornerDownLeft className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Week Day Picker Carousel */}
      <div className="px-2 py-3 bg-white border-b border-gray-100 shadow-sm z-10 sticky top-[60px]">
        <div className="flex items-center justify-between">
          <button className="p-1 px-2 text-gray-400">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          
          <div className="flex gap-1 overflow-x-auto no-scrollbar justify-between flex-1 px-1">
            {daysOfTheWeek.map((dayDate, idx) => {
              const isSelected = isSameDay(selectedDay, dayDate);
              const dayLabel = format(dayDate, "eee", { locale: ptBR }).substring(0, 3);
              const dateNum = format(dayDate, "dd");

              // Count appointments for this day to draw a indicator badge (dot)
              const dayAppCount = weeklyAppointments.filter(app => {
                const aDate = getAppDate(app.date);
                return aDate && isSameDay(aDate, dayDate) && app.status !== "cancelled";
              }).length;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDay(dayDate)}
                  className={`flex flex-col items-center justify-center p-1.5 min-w-[40px] rounded-full transition-all cursor-pointer ${
                    isSelected ? "bg-[#0fc285] text-white" : "bg-transparent text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className={`text-[10px] font-medium uppercase font-bold tracking-tight ${isSelected ? "text-white/90" : "text-gray-400"}`}>
                    {dayLabel}
                  </span>
                  <span className={`text-base font-bold mt-0.5 ${isSelected ? "text-white" : "text-gray-900"}`}>
                    {dateNum}
                  </span>
                  {/* Dot indicator */}
                  <div className={`w-1 h-1 rounded-full mt-1 ${
                    dayAppCount > 0 
                      ? isSelected ? "bg-white" : "bg-[#0fc285]"
                      : "bg-transparent"
                  }`} />
                </button>
              );
            })}
          </div>

          <button className="p-1 px-2 text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Day Header Label */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 className="text-sm font-bold text-gray-900 capitalize flex items-center gap-2">
          {format(selectedDay, "EEEE", { locale: ptBR })}
          <span className="text-gray-400 font-normal text-xs">{format(selectedDay, "dd/MM")}</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            {selectedDayAppointments.length} agendamentos
          </span>
        </div>
      </div>

      {/* Appointment Day List container */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="pt-2">
          {selectedDayAppointments.map((app, index) => {
            // Determine if we need to show time on left
            const showTime = index === 0 || selectedDayAppointments[index - 1].time !== app.time;
            
            return (
              <motion.div
                layout
                key={app.id}
                className="flex items-start px-4 mb-2"
              >
                {/* Time Column */}
                <div className="w-[50px] shrink-0 pt-3 text-right pr-4">
                  <span className="text-[11px] font-semibold text-gray-400 leading-none">
                    {showTime ? app.time : ""}
                  </span>
                </div>

                {/* Event Card */}
                <div className={`flex-1 p-3.5 rounded-2xl flex items-center justify-between relative ${
                  app.status === "completed" ? "bg-gray-100 opacity-70" :
                  app.status === "cancelled" ? "bg-red-50 opacity-60" :
                  "bg-[#eef2fa]" // soft blue background like the screenshot
                }`}>
                  {/* Info */}
                  <div className="min-w-0 pr-2">
                    <h4 className={`text-sm font-bold truncate ${
                      app.status === "completed" ? "text-gray-600 line-through decoration-1" :
                      app.status === "cancelled" ? "text-red-700 line-through decoration-1" :
                      "text-gray-900"
                    }`}>
                      {app.clientName || "Cliente"}
                    </h4>
                    <p className={`text-xs mt-0.5 truncate ${
                      app.status === "completed" ? "text-gray-500" :
                      app.status === "cancelled" ? "text-red-500/70" :
                      "text-gray-600"
                    }`}>
                      {app.serviceName} • {app.duration || "30min"}
                    </p>
                  </div>

                  {/* Icon Check / Actions */}
                  <div className="shrink-0 pl-2">
                    {app.status === "completed" ? (
                      <div className="w-5 h-5 rounded-full border border-[#0fc285] flex items-center justify-center text-[#0fc285]">
                         <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    ) : app.status === "cancelled" ? (
                      <div className="w-5 h-5 rounded-full border border-red-400 flex items-center justify-center text-red-400">
                         <XCircle className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {selectedDayAppointments.length === 0 && (
            <div className="py-16 text-center space-y-2">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400 font-medium tracking-tight">Nenhum agendamento para este dia.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
