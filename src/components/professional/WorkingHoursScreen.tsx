import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  getFirestore
} from "firebase/firestore";
import {
  format,
  eachDayOfInterval,
  parseISO,
  addDays,
  nextSunday,
  isAfter,
  startOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  Clock,
  Sparkles,
  Calendar,
  CalendarPlus,
  Sunrise,
  Moon,
  Trash2,
  Check,
  Loader2,
  Users,
  RotateCcw,
  Copy,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { db, auth, handleFirestoreError, OperationType } from "../../lib/firebase";
import { toast } from "../ui/Toast";
import {
  WorkingHourRule,
  getDefaultHoursForDay,
  timeToMinutes,
  shiftTimeString,
  isExtendedHours
} from "../../lib/workingHours";
import { triggerLightHaptic, triggerSuccessHaptic } from "../../lib/haptics";

interface WorkingHoursScreenProps {
  user?: any;
  role?: string;
  onBack?: () => void;
  embedded?: boolean;
}

interface DayDraft {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, { short: string; full: string }> = {
  0: { short: "Dom", full: "Domingo" },
  1: { short: "Seg", full: "Segunda-feira" },
  2: { short: "Ter", full: "Terça-feira" },
  3: { short: "Qua", full: "Quarta-feira" },
  4: { short: "Qui", full: "Quinta-feira" },
  5: { short: "Sex", full: "Sexta-feira" },
  6: { short: "Sáb", full: "Sábado" },
};

export function WorkingHoursScreen({ user, role = "barber", onBack, embedded = false }: WorkingHoursScreenProps) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [rules, setRules] = useState<WorkingHourRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"special" | "weekly">("special");

  const currentUid = user?.uid || user?.id || auth.currentUser?.uid || "";
  const isManager = role === "manager" || role === "developer";

  const [selectedBarberId, setSelectedBarberId] = useState<string>(currentUid);

  // Special / End-of-Year Dates Form State
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [rangeMode, setRangeMode] = useState<"range" | "single">("range");
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const dec15 = new Date(now.getFullYear(), 11, 15);
    if (now > new Date(now.getFullYear(), 11, 31)) {
      return `${now.getFullYear() + 1}-12-15`;
    }
    return now > dec15 ? format(now, "yyyy-MM-dd") : `${now.getFullYear()}-12-15`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    const year = now > new Date(now.getFullYear(), 11, 31) ? now.getFullYear() + 1 : now.getFullYear();
    return `${year}-12-31`;
  });
  const [specialIsOpen, setSpecialIsOpen] = useState<boolean>(true);
  const [specialStartTime, setSpecialStartTime] = useState<string>("08:00");
  const [specialEndTime, setSpecialEndTime] = useState<string>("22:00");
  const [specialNote, setSpecialNote] = useState<string>("Horário Estendido Fim de Ano");
  const [applyToAllBarbers, setApplyToAllBarbers] = useState<boolean>(false);
  const [savingSpecial, setSavingSpecial] = useState<boolean>(false);

  // Weekly Draft State
  const [weeklyDraft, setWeeklyDraft] = useState<Record<number, DayDraft>>({});
  const [weeklyDirty, setWeeklyDirty] = useState<boolean>(false);
  const [savingWeekly, setSavingWeekly] = useState<boolean>(false);

  useEffect(() => {
    const firestore = db || getFirestore();
    const qUsers = query(collection(firestore, "users"), where("role", "in", ["barber", "manager"]));
    const unsubUsers = onSnapshot(
      qUsers,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setBarbers(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "users");
        setLoading(false);
      }
    );

    const qRules = query(collection(firestore, "workingHours"));
    const unsubRules = onSnapshot(
      qRules,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as WorkingHourRule[];
        setRules(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "workingHours");
      }
    );

    return () => {
      unsubUsers();
      unsubRules();
    };
  }, []);

  // Ensure valid selectedBarberId once barbers load
  useEffect(() => {
    if (!isManager && currentUid) {
      if (selectedBarberId !== currentUid) setSelectedBarberId(currentUid);
      return;
    }
    if (barbers.length > 0) {
      const exists = barbers.some((b) => b.id === selectedBarberId);
      if (!exists) {
        const selfMatch = barbers.find((b) => b.id === currentUid);
        setSelectedBarberId(selfMatch ? selfMatch.id : barbers[0].id);
      }
    }
  }, [barbers, currentUid, isManager, selectedBarberId]);

  const activeBarber = useMemo(() => {
    return barbers.find((b) => b.id === selectedBarberId) || (currentUid ? { id: currentUid, name: user?.name || user?.displayName || "Meu Perfil" } : null);
  }, [barbers, selectedBarberId, currentUid, user]);

  // Sync weeklyDraft whenever selectedBarberId or rules change (unless user has unsaved edits)
  useEffect(() => {
    if (!selectedBarberId) return;
    const nextDraft: Record<number, DayDraft> = {};
    ORDERED_DAYS.forEach((day) => {
      const def = getDefaultHoursForDay(day);
      const existing = rules.find(
        (r) =>
          r.barberId === selectedBarberId &&
          !r.date &&
          r.type !== "date" &&
          Number(r.dayOfWeek) === day
      );
      if (existing) {
        const hasTimes = Boolean(existing.startTime) && Boolean(existing.endTime);
        const isActive = existing.isActive !== undefined ? Boolean(existing.isActive) && hasTimes : hasTimes;
        nextDraft[day] = {
          dayOfWeek: day,
          isActive,
          startTime: existing.startTime || def.startTime,
          endTime: existing.endTime || def.endTime,
        };
      } else {
        nextDraft[day] = {
          dayOfWeek: day,
          isActive: def.isOpen,
          startTime: def.startTime,
          endTime: def.endTime,
        };
      }
    });
    setWeeklyDraft(nextDraft);
    setWeeklyDirty(false);
  }, [selectedBarberId, rules]);

  // Upcoming/active special date overrides for the selected barber
  const barberDateOverrides = useMemo(() => {
    if (!selectedBarberId) return [];
    const yesterdayStr = format(addDays(new Date(), -1), "yyyy-MM-dd");
    return rules
      .filter((r) => r.barberId === selectedBarberId && (r.type === "date" || Boolean(r.date)) && r.date)
      .filter((r) => (r.date || "") >= yesterdayStr)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [rules, selectedBarberId]);

  const applySeasonalPreset = (preset: "christmas" | "newyear" | "yearend" | "sunday") => {
    triggerLightHaptic();
    const now = new Date();
    const currentYear = now.getFullYear();

    if (preset === "christmas") {
      const year = now > new Date(currentYear, 11, 24) ? currentYear + 1 : currentYear;
      setRangeMode("range");
      setStartDate(`${year}-12-21`);
      setEndDate(`${year}-12-24`);
      setSpecialIsOpen(true);
      setSpecialStartTime("08:00");
      setSpecialEndTime("22:00");
      setSpecialNote("Especial Semana de Natal");
    } else if (preset === "newyear") {
      const year = now > new Date(currentYear, 11, 31) ? currentYear + 1 : currentYear;
      setRangeMode("range");
      setStartDate(`${year}-12-28`);
      setEndDate(`${year}-12-31`);
      setSpecialIsOpen(true);
      setSpecialStartTime("08:00");
      setSpecialEndTime("22:00");
      setSpecialNote("Especial Ano Novo");
    } else if (preset === "yearend") {
      const year = now > new Date(currentYear, 11, 31) ? currentYear + 1 : currentYear;
      setRangeMode("range");
      const dec15 = new Date(year, 11, 15);
      setStartDate(now > dec15 && now.getFullYear() === year ? format(now, "yyyy-MM-dd") : `${year}-12-15`);
      setEndDate(`${year}-12-31`);
      setSpecialIsOpen(true);
      setSpecialStartTime("08:00");
      setSpecialEndTime("22:00");
      setSpecialNote("Horário Estendido Fim de Ano");
    } else if (preset === "sunday") {
      const sun = now.getDay() === 0 ? now : nextSunday(now);
      const sunStr = format(sun, "yyyy-MM-dd");
      setRangeMode("single");
      setStartDate(sunStr);
      setEndDate(sunStr);
      setSpecialIsOpen(true);
      setSpecialStartTime("09:00");
      setSpecialEndTime("18:00");
      setSpecialNote("Domingo Especial Aberto");
    }
  };

  const handleSaveSpecialDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarberId && !applyToAllBarbers) {
      toast.error("Selecione um profissional.");
      return;
    }
    if (!startDate) {
      toast.error("Selecione a data inicial.");
      return;
    }

    const effectiveEnd = rangeMode === "single" ? startDate : (endDate || startDate);
    if (effectiveEnd < startDate) {
      toast.error("A data final precisa ser igual ou posterior à data inicial.");
      return;
    }

    if (specialIsOpen) {
      if (!specialStartTime || !specialEndTime) {
        toast.error("Informe os horários de abertura e fechamento.");
        return;
      }
      if (timeToMinutes(specialEndTime) <= timeToMinutes(specialStartTime)) {
        toast.error("O horário de fechamento deve ser após o horário de abertura.");
        return;
      }
    }

    const startD = parseISO(startDate);
    const endD = parseISO(effectiveEnd);
    const days = eachDayOfInterval({ start: startD, end: endD });

    if (days.length > 62) {
      toast.error("Selecione um período de no máximo 62 dias por vez.");
      return;
    }

    const targetBarberIds =
      isManager && applyToAllBarbers && barbers.length > 0
        ? barbers.map((b) => b.id)
        : [selectedBarberId];

    setSavingSpecial(true);
    try {
      const firestore = db || getFirestore();
      const cleanNote = (specialNote || "").trim().slice(0, 60);

      // Firestore batch limit is 500 writes
      const operations: Array<{ id: string; payload: any }> = [];
      targetBarberIds.forEach((bId) => {
        days.forEach((d) => {
          const dStr = format(d, "yyyy-MM-dd");
          operations.push({
            id: `${bId}_date_${dStr}`,
            payload: {
              barberId: bId,
              type: "date",
              date: dStr,
              dayOfWeek: d.getDay(),
              startTime: specialIsOpen ? specialStartTime : "09:00",
              endTime: specialIsOpen ? specialEndTime : "18:00",
              isActive: specialIsOpen,
              note: cleanNote || (specialIsOpen ? "Horário Especial" : "Folga / Fechado"),
              updatedAt: serverTimestamp(),
            },
          });
        });
      });

      for (let i = 0; i < operations.length; i += 450) {
        const chunk = operations.slice(i, i + 450);
        const batch = writeBatch(firestore);
        chunk.forEach((op) => {
          batch.set(doc(firestore, "workingHours", op.id), op.payload, { merge: true });
        });
        await batch.commit();
      }

      triggerSuccessHaptic();
      toast.success(
        days.length === 1
          ? `Horário especial salvo para ${format(startD, "dd/MM")}!`
          : `Horário estendido salvo para ${days.length} dias (${targetBarberIds.length > 1 ? "toda a equipe" : activeBarber?.name?.split(" ")[0] || "profissional"})!`
      );
    } catch (err) {
      console.error("Error saving special dates:", err);
      handleFirestoreError(err, OperationType.WRITE, "workingHours");
      toast.error("Erro ao salvar horários especiais.");
    } finally {
      setSavingSpecial(false);
    }
  };

  const handleDeleteOverride = async (ruleId: string) => {
    try {
      triggerLightHaptic();
      const firestore = db || getFirestore();
      await deleteDoc(doc(firestore, "workingHours", ruleId));
      toast.success("Data especial removida. Voltou ao padrão semanal.");
    } catch (err) {
      console.error("Error deleting override:", err);
      handleFirestoreError(err, OperationType.DELETE, `workingHours/${ruleId}`);
      toast.error("Erro ao remover regra.");
    }
  };

  const updateDayDraft = (day: number, patch: Partial<DayDraft>) => {
    setWeeklyDirty(true);
    setWeeklyDraft((prev) => {
      const current = prev[day] || {
        dayOfWeek: day,
        isActive: getDefaultHoursForDay(day).isOpen,
        startTime: getDefaultHoursForDay(day).startTime,
        endTime: getDefaultHoursForDay(day).endTime,
      };
      return {
        ...prev,
        [day]: { ...current, ...patch },
      };
    });
  };

  const handleSaveWeeklySchedule = async () => {
    if (!selectedBarberId) return;

    // Validate open days
    for (const day of ORDERED_DAYS) {
      const d = weeklyDraft[day];
      if (d?.isActive) {
        if (timeToMinutes(d.endTime) <= timeToMinutes(d.startTime)) {
          toast.error(`${DAY_LABELS[day].full}: o horário final precisa ser maior que o inicial.`);
          return;
        }
      }
    }

    setSavingWeekly(true);
    try {
      const firestore = db || getFirestore();
      const batch = writeBatch(firestore);

      ORDERED_DAYS.forEach((day) => {
        const d = weeklyDraft[day];
        if (!d) return;
        const deterministicId = `${selectedBarberId}_day_${day}`;
        batch.set(
          doc(firestore, "workingHours", deterministicId),
          {
            barberId: selectedBarberId,
            type: "weekly",
            dayOfWeek: day,
            startTime: d.startTime,
            endTime: d.endTime,
            isActive: d.isActive,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Clean up any legacy random-ID weekly docs for the same barber & dayOfWeek
        rules
          .filter(
            (r) =>
              r.id &&
              r.id !== deterministicId &&
              r.barberId === selectedBarberId &&
              !r.date &&
              r.type !== "date" &&
              Number(r.dayOfWeek) === day
          )
          .forEach((legacy) => {
            if (legacy.id) batch.delete(doc(firestore, "workingHours", legacy.id));
          });
      });

      await batch.commit();
      setWeeklyDirty(false);
      triggerSuccessHaptic();
      toast.success("Jornada semanal salva com sucesso!");
    } catch (err) {
      console.error("Error saving weekly hours:", err);
      handleFirestoreError(err, OperationType.WRITE, "workingHours");
      toast.error("Erro ao salvar jornada semanal.");
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleReplicateMondayToSat = () => {
    triggerLightHaptic();
    const mon = weeklyDraft[1];
    if (!mon) return;
    setWeeklyDirty(true);
    setWeeklyDraft((prev) => {
      const updated = { ...prev };
      [1, 2, 3, 4, 5, 6].forEach((d) => {
        updated[d] = {
          dayOfWeek: d,
          isActive: mon.isActive,
          startTime: mon.startTime,
          endTime: mon.endTime,
        };
      });
      return updated;
    });
    toast.success("Horário de segunda replicado para Seg–Sáb! Clique em Salvar para confirmar.");
  };

  const handleRestoreDefaults = () => {
    triggerLightHaptic();
    const next: Record<number, DayDraft> = {};
    ORDERED_DAYS.forEach((day) => {
      const def = getDefaultHoursForDay(day);
      next[day] = {
        dayOfWeek: day,
        isActive: def.isOpen,
        startTime: def.startTime,
        endTime: def.endTime,
      };
    });
    setWeeklyDraft(next);
    setWeeklyDirty(true);
    toast.info("Padrão da barbearia carregado. Clique em Salvar Jornada para aplicar.");
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">
          Carregando horários...
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={embedded ? "space-y-6 max-w-4xl mx-auto pb-20 px-4 md:px-0 text-left" : "max-w-md md:max-w-4xl lg:max-w-5xl mx-auto py-8 px-5 min-h-[100dvh] pb-32 space-y-6 text-left"}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && !embedded && (
            <button
              onClick={onBack}
              className="p-2.5 liquid-glass rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-amber-500" />
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight leading-none">
              Horários <span className="text-amber-500">& Fim de Ano</span>
            </h2>
            <p className="text-[9px] sm:text-[10px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">
              Estenda sua agenda abrindo mais cedo ou fechando mais tarde
            </p>
          </div>
        </div>
      </div>

      {/* Professional Selector (for Managers) or Active Professional Badge (for Barbers) */}
      {isManager && barbers.length > 0 ? (
        <div className="liquid-glass p-4 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-500" /> Profissional Selecionado
            </span>
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
              Modo Gestor
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {barbers.map((b) => {
              const isSelected = b.id === selectedBarberId;
              const isSelf = b.id === currentUid;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    triggerLightHaptic();
                    setSelectedBarberId(b.id);
                  }}
                  className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20"
                      : "bg-neutral-900/60 text-neutral-400 border-white/5 hover:text-white hover:border-white/20"
                  }`}
                >
                  {isSelf ? `Meu Horário (${b.name?.split(" ")[0]})` : b.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="liquid-glass p-4 rounded-3xl flex items-center justify-between border border-amber-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wide">
                {activeBarber?.name || "Minha Agenda"}
              </p>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">
                Suas configurações refletem na hora para clientes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Mode Tabs */}
      <div className="liquid-glass p-1.5 rounded-2xl grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveTab("special");
          }}
          className={`py-3 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "special"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Fim de Ano & Datas</span>
          {barberDateOverrides.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                activeTab === "special" ? "bg-black/20 text-black" : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {barberDateOverrides.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerLightHaptic();
            setActiveTab("weekly");
          }}
          className={`py-3 px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === "weekly"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Jornada Semanal</span>
        </button>
      </div>

      {/* TAB 1: END-OF-YEAR & SPECIAL DATES */}
      {activeTab === "special" && (
        <div className="space-y-6">
          {/* Quick Seasonal Templates */}
          <div className="liquid-glass p-5 rounded-[2rem] space-y-3 border border-amber-500/15">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Atalhos de Fim de Ano
              </span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase">
                Toque para preencher
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applySeasonalPreset("christmas")}
                className="p-3 rounded-2xl bg-neutral-900/80 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-white block">🎄 Natal</span>
                <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">21 a 24 de Dez</span>
              </button>
              <button
                type="button"
                onClick={() => applySeasonalPreset("newyear")}
                className="p-3 rounded-2xl bg-neutral-900/80 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-white block">🥂 Ano Novo</span>
                <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">28 a 31 de Dez</span>
              </button>
              <button
                type="button"
                onClick={() => applySeasonalPreset("yearend")}
                className="p-3 rounded-2xl bg-neutral-900/80 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-white block">🔥 Quinzena Dez</span>
                <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">15 a 31 de Dez</span>
              </button>
              <button
                type="button"
                onClick={() => applySeasonalPreset("sunday")}
                className="p-3 rounded-2xl bg-neutral-900/80 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 text-left transition-all cursor-pointer active:scale-95"
              >
                <span className="text-xs font-black text-white block">☀️ Próx. Domingo</span>
                <span className="text-[9px] text-neutral-400 font-bold block mt-0.5">Abrir no domingo</span>
              </button>
            </div>
          </div>

          {/* Special Date Form */}
          <form onSubmit={handleSaveSpecialDates} className="liquid-glass p-6 rounded-[2.25rem] space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4 text-amber-500" />
                  Estender ou Personalizar Datas
                </h3>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Defina se vai abrir mais cedo, fechar mais tarde ou abrir em dias fechados
                </p>
              </div>

              <div className="bg-black/40 p-1 rounded-xl flex items-center gap-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setRangeMode("range")}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    rangeMode === "range" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Período
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode("single")}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    rangeMode === "single" ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Data Única
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            <div className={`grid gap-3 ${rangeMode === "range" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 pl-1">
                  {rangeMode === "range" ? "Data Inicial" : "Selecione a Data"}
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-500 rounded-2xl p-3.5 text-sm font-bold text-white outline-none transition-colors"
                  required
                />
              </div>
              {rangeMode === "range" && (
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 pl-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    min={startDate || todayStr}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 focus:border-amber-500 rounded-2xl p-3.5 text-sm font-bold text-white outline-none transition-colors"
                    required
                  />
                </div>
              )}
            </div>

            {/* Open / Closed Switch */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
              <div>
                <p className="text-xs font-black uppercase text-white">
                  {specialIsOpen ? "Agenda Aberta nesta(s) data(s)" : "Folga / Fechado nesta(s) data(s)"}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {specialIsOpen
                    ? "Clientes poderão agendar dentro do horário escolhido abaixo."
                    : "Nenhum horário ficará disponível para agendamento nestas datas."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setSpecialIsOpen(!specialIsOpen);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  specialIsOpen ? "bg-emerald-500" : "bg-neutral-700"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                    specialIsOpen ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {specialIsOpen && (
              <>
                {/* Quick Shift Buttons for Opening Earlier / Closing Later */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opening Earlier Card */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                        <Sunrise className="w-4 h-4" /> Abertura (Mais Cedo)
                      </span>
                      <span className="text-[9px] font-bold text-neutral-500">Padrão: 09:00</span>
                    </div>
                    <input
                      type="time"
                      value={specialStartTime}
                      onChange={(e) => setSpecialStartTime(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-base font-black text-white outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "-2h (07h)", val: "07:00" },
                        { label: "-1h (08h)", val: "08:00" },
                        { label: "08:30", val: "08:30" },
                        { label: "Padrão 09h", val: "09:00" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setSpecialStartTime(opt.val);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            specialStartTime === opt.val
                              ? "bg-amber-500 text-black"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSpecialStartTime(shiftTimeString(specialStartTime, -30, "05:00", "22:00"))}
                        className="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        -30m
                      </button>
                    </div>
                  </div>

                  {/* Closing Later Card */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                        <Moon className="w-4 h-4" /> Fechamento (Mais Tarde)
                      </span>
                      <span className="text-[9px] font-bold text-neutral-500">Padrão: 20:00</span>
                    </div>
                    <input
                      type="time"
                      value={specialEndTime}
                      onChange={(e) => setSpecialEndTime(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-base font-black text-white outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Padrão 20h", val: "20:00" },
                        { label: "+1h (21h)", val: "21:00" },
                        { label: "+2h (22h)", val: "22:00" },
                        { label: "+3h (23h)", val: "23:00" },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            triggerLightHaptic();
                            setSpecialEndTime(opt.val);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            specialEndTime === opt.val
                              ? "bg-amber-500 text-black"
                              : "bg-white/5 text-neutral-300 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSpecialEndTime(shiftTimeString(specialEndTime, 30, "08:00", "23:30"))}
                        className="px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                      >
                        +30m
                      </button>
                    </div>
                  </div>
                </div>

                {/* One-Tap Combos */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 pl-1 block">
                    Combos Rápidos de Extensão
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setSpecialStartTime("07:30");
                        setSpecialEndTime("20:00");
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-[10px] font-bold text-neutral-200 cursor-pointer transition-all"
                    >
                      🌅 Só Abrir Mais Cedo (07:30 – 20:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setSpecialStartTime("09:00");
                        setSpecialEndTime("22:30");
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-[10px] font-bold text-neutral-200 cursor-pointer transition-all"
                    >
                      🌙 Só Fechar Mais Tarde (09:00 – 22:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        setSpecialStartTime("07:00");
                        setSpecialEndTime("23:00");
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-[10px] font-black text-amber-400 cursor-pointer transition-all"
                    >
                      🔥 Plantão Fim de Ano (07:00 – 23:00)
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Description / Label */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 pl-1">
                Descrição visível para clientes (opcional)
              </label>
              <input
                type="text"
                maxLength={60}
                placeholder="Ex: Horário Especial Fim de Ano"
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                className="w-full bg-black/60 border border-white/10 focus:border-amber-500 rounded-2xl p-3.5 text-xs font-bold text-white outline-none transition-colors"
              />
            </div>

            {/* Manager Option: Apply to All Barbers */}
            {isManager && barbers.length > 1 && (
              <label className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 cursor-pointer">
                <div className="pr-3">
                  <span className="text-xs font-black text-amber-400 uppercase block">
                    Aplicar para toda a equipe ({barbers.length} profissionais)
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
                    Estende o horário de todos os barbeiros nestas datas de uma só vez.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={applyToAllBarbers}
                  onChange={(e) => setApplyToAllBarbers(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            )}

            <button
              type="submit"
              disabled={savingSpecial}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black uppercase italic tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {savingSpecial ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando Horários...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Horário Especial</span>
                </>
              )}
            </button>
          </form>

          {/* List of Active Special Overrides */}
          <div className="liquid-glass p-6 rounded-[2.25rem] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                  Datas Especiais Configuradas ({activeBarber?.name?.split(" ")[0] || "Profissional"})
                </h4>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">
                  Têm prioridade sobre a jornada semanal padrão
                </p>
              </div>
            </div>

            {barberDateOverrides.length === 0 ? (
              <div className="py-8 text-center space-y-2 opacity-70">
                <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs font-bold text-neutral-400">
                  Nenhuma extensão ou data especial configurada ainda.
                </p>
                <p className="text-[10px] text-neutral-500">
                  Use o formulário acima ou os atalhos de Natal / Ano Novo para estender sua agenda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                {barberDateOverrides.map((rule) => {
                  const dateObj = rule.date ? parseISO(rule.date) : new Date();
                  const dayOfWeek = dateObj.getDay();
                  const def = getDefaultHoursForDay(dayOfWeek);
                  const isOpen = rule.isActive !== false;
                  const early = isOpen && timeToMinutes(rule.startTime) < def.startMinutes;
                  const late = isOpen && timeToMinutes(rule.endTime) > def.endMinutes;
                  const sundayOpen = isOpen && !def.isOpen;

                  return (
                    <div
                      key={rule.id}
                      className="p-4 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-between gap-3 group hover:border-amber-500/20 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white uppercase">
                            {format(dateObj, "dd/MM (EEE)", { locale: ptBR })}
                          </span>
                          {!isOpen ? (
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                              Fechado / Folga
                            </span>
                          ) : (
                            <>
                              {sundayOpen && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                  Domingo Aberto
                                </span>
                              )}
                              {early && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                  Abre +cedo
                                </span>
                              )}
                              {late && (
                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                                  Fecha +tarde
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-sm font-black text-amber-400 font-mono">
                          {isOpen ? `${rule.startTime} — ${rule.endTime}` : "Sem atendimentos"}
                        </p>
                        {rule.note && (
                          <p className="text-[10px] text-neutral-400 truncate">{rule.note}</p>
                        )}
                      </div>

                      {rule.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOverride(rule.id!)}
                          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 transition-all shrink-0 cursor-pointer"
                          title="Remover e voltar ao padrão"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY DEFAULT SCHEDULE */}
      {activeTab === "weekly" && (
        <div className="liquid-glass p-6 rounded-[2.25rem] space-y-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Jornada Semanal Padrão
              </h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Ative ou desative dias da semana (como domingos) e ajuste seu horário fixo
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReplicateMondayToSat}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" /> Copiar Seg p/ Seg–Sáb
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Padrão Loja
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {ORDERED_DAYS.map((day) => {
              const draft = weeklyDraft[day] || {
                dayOfWeek: day,
                isActive: getDefaultHoursForDay(day).isOpen,
                startTime: getDefaultHoursForDay(day).startTime,
                endTime: getDefaultHoursForDay(day).endTime,
              };
              const def = getDefaultHoursForDay(day);
              const extended = draft.isActive && isExtendedHours(
                {
                  startMinutes: timeToMinutes(draft.startTime),
                  endMinutes: timeToMinutes(draft.endTime),
                  isOpen: draft.isActive,
                },
                day
              );

              return (
                <div
                  key={day}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    draft.isActive
                      ? "bg-black/45 border-white/10 hover:border-amber-500/25"
                      : "bg-black/20 border-white/5 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        triggerLightHaptic();
                        updateDayDraft(day, { isActive: !draft.isActive });
                      }}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        draft.isActive ? "bg-amber-500" : "bg-neutral-800"
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] left-[2px] w-5 h-5 rounded-full bg-white transition-transform ${
                          draft.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase text-white">
                          {DAY_LABELS[day].full}
                        </span>
                        {extended && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                            Estendido
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                        {draft.isActive
                          ? `Padrão loja: ${def.isOpen ? `${def.startTime}–${def.endTime}` : "Fechado"}`
                          : "Fechado neste dia"}
                      </span>
                    </div>
                  </div>

                  {draft.isActive && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1.5">
                        <button
                          type="button"
                          onClick={() => updateDayDraft(day, { startTime: shiftTimeString(draft.startTime, -60, "05:00", "22:00") })}
                          className="text-[9px] font-black text-amber-400 hover:text-amber-300 px-1.5 py-1 rounded-lg bg-amber-500/10 cursor-pointer"
                          title="Abrir 1h mais cedo"
                        >
                          -1h
                        </button>
                        <input
                          type="time"
                          value={draft.startTime}
                          onChange={(e) => updateDayDraft(day, { startTime: e.target.value })}
                          className="bg-transparent text-xs sm:text-sm font-black text-white outline-none"
                        />
                      </div>

                      <span className="text-neutral-600 font-black text-xs">às</span>

                      <div className="flex items-center gap-1 bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1.5">
                        <input
                          type="time"
                          value={draft.endTime}
                          onChange={(e) => updateDayDraft(day, { endTime: e.target.value })}
                          className="bg-transparent text-xs sm:text-sm font-black text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateDayDraft(day, { endTime: shiftTimeString(draft.endTime, 60, "08:00", "23:30") })}
                          className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 px-1.5 py-1 rounded-lg bg-indigo-500/10 cursor-pointer"
                          title="Fechar 1h mais tarde"
                        >
                          +1h
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {weeklyDirty && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Você possui alterações não salvas na jornada semanal.</span>
            </div>
          )}

          <button
            type="button"
            disabled={savingWeekly}
            onClick={handleSaveWeeklySchedule}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black uppercase italic tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {savingWeekly ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando Jornada...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Salvar Jornada Semanal</span>
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function WorkingHoursManager() {
  return <WorkingHoursScreen embedded={true} role="manager" />;
}
