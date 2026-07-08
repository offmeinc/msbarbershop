import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Loader2, Calendar, Clock, User, Users, Lock, Unlock, 
  Trash2, Plus, Search, AlertCircle, Coffee, Sparkles, ShieldAlert, ListFilter 
} from "lucide-react";
import { 
  collection, query, onSnapshot, doc, deleteDoc, addDoc, 
  Timestamp, serverTimestamp, where, orderBy 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

// Suggested preset reasons for quick block
const PRESET_REASONS = [
  { label: "Horário de Almoço 🍱", value: "Horário de Almoço" },
  { label: "Compromisso Externo 🚗", value: "Compromisso Externo" },
  { label: "Manutenção na Barbearia 🛠️", value: "Manutenção na Barbearia" },
  { label: "Folga Coletiva / Feriado 🏖️", value: "Folga ou Feriado" },
  { label: "Treinamento / Workshop 📚", value: "Capacitação / Workshop" },
  { label: "Ausência Médica 🩺", value: "Ausência Médica" }
];

export function BlockScreen({ onBack }: { onBack: () => void }) {
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [lockDate, setLockDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [blockingBarberId, setBlockingBarberId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Tab filters
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    // 1. Fetch blocked times list in real-time
    const qBlocked = query(collection(db, "blocked_times"), orderBy("date", "asc"));
    const unsubscribeBlocked = onSnapshot(qBlocked, (snapshot) => {
      setBlockedTimes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch blocked times:", error);
      setLoading(false);
    });

    // 2. Fetch list of barbers/managers
    const qBarbers = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribeBarbers = onSnapshot(qBarbers, (sn) => {
      setBarbers(sn.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => {
      unsubscribeBlocked();
      unsubscribeBarbers();
    };
  }, []);

  const getLockDateObj = (lock: any) => {
    if (!lock.date) return new Date(0);
    if (lock.date instanceof Timestamp) return lock.date.toDate();
    if (lock.date.toDate && typeof lock.date.toDate === "function") return lock.date.toDate();
    if (lock.date instanceof Date) return lock.date;
    if (typeof lock.date === "string") return parseISO(lock.date);
    return new Date(lock.date);
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockDate) {
      alert("Selecione uma data para o bloqueio!");
      return;
    }
    if (!startTime || !endTime) {
      alert("Selecione o horário inicial e final!");
      return;
    }
    if (startTime >= endTime) {
      alert("O horário final deve ser após o horário inicial.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedBarber = blockingBarberId === "all" 
        ? "Todos" 
        : (barbers.find(b => b.id === blockingBarberId)?.name || "Profissional");

      const lockObj = {
        date: Timestamp.fromDate(new Date(`${lockDate}T${startTime}:00`)),
        startTime,
        endTime,
        reason: lockReason.trim() || "Bloqueio administrativo 🔒",
        barberId: blockingBarberId,
        barberName: selectedBarber,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "blocked_times"), lockObj);
      
      // Reset form fields
      setLockDate("");
      setStartTime("");
      setEndTime("");
      setLockReason("");
      setBlockingBarberId("all");
      
      setStatusMsg("Horário bloqueado com sucesso real-time!");
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      console.error("Error creating block limit:", err);
      alert("Erro ao criar bloqueio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLock = async (lockId: string) => {
    if (!confirm("Deseja realmente descontinuar este bloqueio e liberar o horário correspondente?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "blocked_times", lockId));
      setStatusMsg("Horário desbloqueado com sucesso!");
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      console.error("Error deleting block limit:", err);
      alert("Erro ao deletar bloqueio.");
    }
  };

  // Filter list by searching and tabs
  const now = new Date();
  
  const filteredBlocks = useMemo(() => {
    return blockedTimes.filter(lock => {
      const lockDt = getLockDateObj(lock);
      const matchesTab = activeTab === "upcoming" 
        ? isAfter(lockDt, now) || Math.abs(differenceInMinutes(lockDt, now)) < 60
        : isBefore(lockDt, now);

      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch = 
        (lock.reason || "").toLowerCase().includes(normalizedSearch) ||
        (lock.barberName || "").toLowerCase().includes(normalizedSearch);

      return matchesTab && matchesSearch;
    });
  }, [blockedTimes, activeTab, searchTerm, now]);

  // Helper utility for exact time differences
  function differenceInMinutes(d1: Date, d2: Date) {
    return Math.floor((d1.getTime() - d2.getTime()) / 60000);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto py-8 px-4 relative"
    >
      {/* Alert toast notifications banner */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-4 right-4 max-w-md mx-auto bg-amber-500 text-black p-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest text-center z-50 shadow-2xl flex items-center justify-center gap-2 border border-amber-600"
          >
            <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
            <span>{statusMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack} 
          className="liquid-glass flex items-center gap-2 text-neutral-500 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-2xl cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4 text-amber-500" />
          Voltar ao menu
        </button>

        <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-black uppercase tracking-widest liquid-glass px-4 py-2.5 rounded-2xl ">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          Controle da Agenda
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Create a New Block Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className=" liquid-glass backdrop-blur-md rounded-[2.5rem] p-6  shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="text-left space-y-1">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl w-fit border border-amber-500/20 mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Bloquear Horário</h2>
              <p className="text-neutral-500 text-[10px] font-black uppercase tracking-wider">
                Impeça novos agendamentos em horários específicos
              </p>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4 text-left">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Data do Bloqueio</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={lockDate} 
                    onChange={e => setLockDate(e.target.value)} 
                    required
                    className="w-full liquid-glass  hover:border-white/20 focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all outline-none" 
                  />
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Hora Inicial</label>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    required
                    className="w-full liquid-glass  hover:border-white/20 focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Hora Final</label>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                    required
                    className="w-full liquid-glass  hover:border-white/20 focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all outline-none" 
                  />
                </div>
              </div>

              {/* Barber dropdown select */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Aplicar a Qual Profissional?</label>
                <select
                  value={blockingBarberId}
                  onChange={e => setBlockingBarberId(e.target.value)}
                  className="w-full liquid-glass  hover:border-white/20 focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all outline-none appearance-none"
                >
                  <option value="all">🌍 Todos os Profissionais (Geral)</option>
                  {barbers.map(barber => (
                    <option key={barber.id} value={barber.id}>
                      💈 {barber.name} ({barber.role === "manager" ? "Gestor" : "Profissional"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lock Reason Select or custom type */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Motivo do Bloqueio</label>
                <input 
                  type="text" 
                  placeholder="Escreva um motivo ex: Almoço, Folga, etc."
                  value={lockReason} 
                  onChange={e => setLockReason(e.target.value)}
                  className="w-full liquid-glass  hover:border-white/20 focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all outline-none"
                />

                {/* Quick suggestions badge clicks */}
                <div className="pt-2 flex flex-wrap gap-1.5">
                  {PRESET_REASONS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLockReason(preset.value)}
                      className={`text-[8px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                        lockReason === preset.value
                          ? "bg-amber-500 text-black border-amber-600 shadow"
                          : "bg-black/30 text-neutral-400 border-white/5 hover:border-white/15"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit button bar */}
              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 text-black" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-black shrink-0" />
                      Confirmar Bloqueio
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Manage & List Active Blockers */}
        <div className="lg:col-span-7 space-y-6">
          <div className=" liquid-glass backdrop-blur-md rounded-[2.5rem] p-6  shadow-2xl min-h-[500px] flex flex-col justify-between">
            <div>
              {/* Header section with Filter controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="text-left space-y-1">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Grade de Horários Bloqueados</h3>
                  <p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">
                    Gerenciador e listagem de restrições em tempo real
                  </p>
                </div>

                {/* Tab layout selectors */}
                <div className=" liquid-glass  p-1 rounded-xl flex items-center self-start sm:self-auto shrink-0 shadow-inner">
                  <button
                    onClick={() => setActiveTab("upcoming")}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                      activeTab === "upcoming"
                        ? "bg-amber-500 text-black shadow"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    Ativos / Futuros
                  </button>
                  <button
                    onClick={() => setActiveTab("past")}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                      activeTab === "past"
                        ? "bg-amber-500 text-black shadow"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    Histórico Antigo
                  </button>
                </div>
              </div>

              {/* Search filter input block */}
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Pesquisar por profissional, motivo ou data..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full liquid-glass  hover:border-white/10 focus:border-amber-500 text-xs rounded-xl pl-10 pr-4 py-3 placeholder:text-neutral-600 text-white transition-all outline-none"
                />
              </div>

              {/* Real time list content */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="animate-spin text-amber-500 w-8 h-8 font-black" />
                  <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">Carregando bloqueios da nuvem...</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {filteredBlocks.map((lock, idx) => {
                      const dt = getLockDateObj(lock);
                      const isAll = lock.barberId === "all";

                      return (
                        <motion.div
                          key={lock.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                          className=" liquid-glass  hover:border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all group"
                        >
                          <div className="flex items-center gap-3.5 text-left">
                            <div className={`p-3 rounded-xl border ${
                              isAll 
                                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}>
                              {isAll ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>

                            <div className="space-y-0.5">
                              <p className="text-white text-xs font-extrabold uppercase italic tracking-tight flex items-center gap-1.5 flex-wrap">
                                {lock.reason || "Bloqueio de Horário"}
                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                                  isAll 
                                    ? "bg-red-500/10 text-red-400" 
                                    : "bg-neutral-800 text-neutral-300"
                                }`}>
                                  {isAll ? "Geral / Todos" : `💈 ${lock.barberName}`}
                                </span>
                              </p>

                              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                                {format(dt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                <span className="text-neutral-600">•</span>
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                {lock.startTime && lock.endTime ? `${lock.startTime}h - ${lock.endTime}h` : format(dt, "HH:mm'h'")}
                              </div>
                            </div>
                          </div>

                          {/* Quick delete / unlock action */}
                          {activeTab === "upcoming" && (
                            <button
                              onClick={() => handleDeleteLock(lock.id)}
                              className="p-2.5 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/30 text-red-400 rounded-xl transition-all cursor-pointer group-hover:scale-105 active:scale-95"
                              title="Remover restrição de horário"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {filteredBlocks.length === 0 && (
                    <div className="liquid-glass text-center py-20 rounded-2xl -dashed flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-neutral-600" />
                      <div className="space-y-0.5">
                        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Nenhum bloqueio encontrado</p>
                        <p className="text-[8px] text-neutral-600 font-black uppercase tracking-widest">
                          {activeTab === "upcoming" ? "Sua agenda futura está limpa e liberada" : "Sem histórico anterior no banco de dados"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom brief footer notice */}
            <div className="border-t border-white/5 pt-4 mt-6 text-left">
              <span className="text-[7.5px] text-neutral-500 uppercase font-bold tracking-widest leading-relaxed block leading-normal">
                💡 ALERTA: Os bloqueios impedem imediata e automaticamente que clientes agendem qualquer serviço no dia e hora determinados através do aplicativo.
              </span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
