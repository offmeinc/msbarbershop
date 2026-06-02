import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  X, 
  User,
  Plus,
  Compass,
  Check,
  Users,
  Briefcase
} from "lucide-react";
import { 
  format, 
  addDays, 
  subDays,
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

// Premium Barber Colors scheme resembling Google Calendar blocks
const BARBER_COLORS = [
  { name: "Esmeralda", bg: "bg-emerald-500/10 hover:bg-emerald-500/20", border: "border-emerald-500/20 hover:border-emerald-500/40", text: "text-emerald-400", accent: "border-l-emerald-500", rawBg: "rgba(16, 185, 129, 0.1)", rawBorder: "rgba(16, 185, 129, 0.3)", rawText: "#34d399", dot: "bg-emerald-400" },
  { name: "Violeta", bg: "bg-violet-500/10 hover:bg-violet-500/20", border: "border-violet-500/20 hover:border-violet-500/40", text: "text-violet-400", accent: "border-l-violet-500", rawBg: "rgba(139, 92, 246, 0.1)", rawBorder: "rgba(139, 92, 246, 0.3)", rawText: "#a78bfa", dot: "bg-violet-400" },
  { name: "Rosa Imperial", bg: "bg-pink-500/10 hover:bg-pink-500/20", border: "border-pink-500/20 hover:border-pink-500/40", text: "text-pink-400", accent: "border-l-pink-500", rawBg: "rgba(236, 72, 153, 0.1)", rawBorder: "rgba(236, 72, 153, 0.3)", rawText: "#f472b6", dot: "bg-pink-400" },
  { name: "Ciano", bg: "bg-cyan-500/10 hover:bg-cyan-500/20", border: "border-cyan-500/20 hover:border-cyan-500/40", text: "text-cyan-400", accent: "border-l-cyan-500", rawBg: "rgba(6, 182, 212, 0.1)", rawBorder: "rgba(6, 182, 212, 0.3)", rawText: "#22d3ee", dot: "bg-cyan-400" },
  { name: "Âmbar Luxo", bg: "bg-amber-500/10 hover:bg-amber-500/20", border: "border-amber-500/20 hover:border-amber-500/40", text: "text-amber-400", accent: "border-l-amber-500", rawBg: "rgba(245, 158, 11, 0.1)", rawBorder: "rgba(245, 158, 11, 0.3)", rawText: "#fbbf24", dot: "bg-amber-400" },
];

export function AppointmentModal({ appointment, onClose, onUpdate, onEdit, onDelete }: { appointment: any, onClose: () => void, onUpdate: (app: any, status: string, extraData?: any) => void, onEdit?: (app: any) => void, onDelete?: (app: any) => void }) {
  const [payerName, setPayerName] = useState("");
  if (!appointment) return null;
  const d = appointment.date instanceof Timestamp ? appointment.date.toDate() : (typeof appointment.date === 'string' ? parseISO(appointment.date) : appointment.date);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        className="bg-neutral-900 border border-white/5 p-8 rounded-[2.5rem] w-full max-w-sm text-center relative shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors p-1" id="close-modal">
          <X className="w-5 h-5"/>
        </button>
        
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl overflow-hidden relative group">
          {appointment.clientPhoto ? (
             <img src={appointment.clientPhoto} alt={appointment.clientName} className="w-full h-full object-cover group-hover:scale-105 transition" />
          ) : (
             <User className="w-8 h-8 text-amber-500 outline-none" />
          )}
        </div>
        
        <h2 className="text-xl font-black uppercase italic text-white leading-none tracking-tight mb-2">{appointment.clientName}</h2>
        <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block mb-6">{appointment.serviceName}</p>

        <div className="bg-black/45 p-5 rounded-2xl border border-white/5 space-y-3.5 mb-6 text-left text-xs uppercase tracking-widest font-black text-neutral-400">
            <div className="flex items-center gap-3">
                <CalendarIcon className="w-4 h-4 text-neutral-600" />
                <span className="text-white/90 text-[10px]">{format(d, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-neutral-600" />
                <span className="text-white/90 text-[10px]">{appointment.time || format(d, 'HH:mm')}</span>
            </div>
            <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-neutral-600" />
                <span className="text-white/90 text-[10px] truncate">Profissional: <span className="text-amber-500">{appointment.barberName}</span></span>
            </div>
        </div>

        {appointment.selectedStyle && (
          <div className="bg-neutral-950 p-4 rounded-[1.25rem] border border-amber-500/10 mb-6 text-left flex items-center gap-3">
            <img src={appointment.selectedStyle.imageUrl} className="w-11 h-11 object-cover rounded-xl border border-white/10 shrink-0" alt="Referência" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <span className="text-[7px] font-black uppercase text-amber-500 tracking-wider block">Estilo de Referência</span>
              <p className="text-[10px] font-black text-white uppercase italic truncate mt-0.5" title={appointment.selectedStyle.title}>
                {appointment.selectedStyle.title}
              </p>
            </div>
          </div>
        )}

        {appointment.status !== 'completed' && (
          <div className="mb-6">
            <input 
              type="text" 
              placeholder="Quem pagou? (Opcional)" 
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-neutral-700 focus:border-amber-500 outline-none transition-all"
            />
          </div>
        )}

        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
               <button onClick={() => { onUpdate(appointment, 'confirmed'); onClose(); }} className="py-3 bg-white/5 hover:bg-amber-500 hover:text-black border border-white/5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all">CONFIRMAR</button>
               <button onClick={() => { onUpdate(appointment, 'completed', { payerName: payerName || appointment.clientName }); onClose(); }} className="py-3 bg-green-500 hover:bg-green-600 text-black rounded-xl font-black uppercase tracking-widest text-[9px] transition-all" title="Registra o comparecimento e atualiza os ganhos automaticamente">COMPARECEU ✅</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
               <button onClick={() => { onUpdate(appointment, 'cancelled'); onClose(); }} className="py-3 bg-red-500/10 hover:bg-red-500/25 text-red-500 border border-red-500/20 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all">CANCELAR</button>
               {onDelete && (
                   <button onClick={() => { onDelete(appointment); onClose(); }} className="py-3 bg-neutral-950 hover:bg-red-950/40 text-red-400 border border-red-500/10 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all">EXCLUIR</button>
               )}
            </div>
            {onEdit && (
                <button onClick={() => { if (onEdit) onEdit(appointment); onClose(); }} className="w-full py-3.5 bg-neutral-950 text-neutral-300 border border-white/5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:text-white hover:bg-neutral-800 transition-all">EDITAR AGENDAMENTO</button>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CalendarWidget({ 
  appointments, 
  services = [],
  mode, 
  onModeChange,
  currentDate, 
  onDateChange, 
  role, 
  updateStatus,
  onNewBooking,
  onSelectAppointment
}: { 
  appointments: any[], 
  services?: any[],
  mode: "day" | "week" | "month", 
  onModeChange?: (mode: "day" | "week" | "month") => void,
  currentDate: Date, 
  onDateChange: (date: Date) => void,
  role: string,
  updateStatus: (app: any, status: string) => void,
  onNewBooking?: () => void,
  onSelectAppointment?: (app: any) => void
}) {
  const [now, setNow] = useState(new Date());
  const [miniMonth, setMiniMonth] = useState(() => startOfMonth(currentDate));

  // Auto-sync mini picker month when active calendar date changes
  useEffect(() => {
    setMiniMonth(startOfMonth(currentDate));
  }, [currentDate]);

  // Keep now updated for our glowing red current-time marker line
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000); // 30s
    return () => clearInterval(timer);
  }, []);

  const navigate = (direction: number) => {
    if (mode === "month") onDateChange(addMonths(currentDate, direction));
    else if (mode === "week") onDateChange(addWeeks(currentDate, direction));
    else onDateChange(addDays(currentDate, direction));
  };

  const handleMiniMonthNavigate = (direction: number) => {
    setMiniMonth(addMonths(miniMonth, direction));
  };

  const handleDaySelect = (day: Date) => {
    onDateChange(day);
    if (onModeChange && mode !== 'day') {
      onModeChange('day');
    }
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(app => {
      if (!app.date) return false;
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate instanceof Date && !isNaN(appDate.getTime()) && isSameDay(appDate, date);
    });
  };

  // Dynamically map active professionals and assign clean consistent theme colors
  const uniqueBarbers = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach(app => {
      if (app.barberId && app.barberName) {
        map.set(app.barberId, app.barberName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [appointments]);

  const barberColorMap = useMemo(() => {
    const map = new Map<string, typeof BARBER_COLORS[0]>();
    uniqueBarbers.forEach((barber, i) => {
      map.set(barber.id, BARBER_COLORS[i % BARBER_COLORS.length]);
    });
    return map;
  }, [uniqueBarbers]);

  // Timeline Hour constants
  const hours = useMemo(() => Array.from({ length: 15 }, (_, i) => i + 8), []); // 8:00 AM to 10:00 PM
  const ROW_HEIGHT = 120; // Height in pixels for a single hour block - increased to allow full details on 30m slots

  // Calculate live red line height position inside the timeline canvas
  const currentTimePosition = useMemo(() => {
    const hrs = now.getHours();
    const mins = now.getMinutes();
    const totalMins = hrs * 60 + mins;
    const startMins = 8 * 60; // 8:20
    const endMins = 22 * 60; // 22:00
    
    if (totalMins < startMins || totalMins > endMins) return null;
    
    const minutesSinceStart = totalMins - startMins;
    return (minutesSinceStart / 60) * ROW_HEIGHT;
  }, [now, ROW_HEIGHT]);

  // Overlap placement solver for multiple bookings in the hourly timeline matching Google Calendar columns
  const getPositionedEventsForDay = (day: Date, dayAppointments: any[]) => {
    const getEventTime = (evt: any) => {
      if (typeof evt.time === 'string') return evt.time;
      const d = evt.date instanceof Timestamp ? evt.date.toDate() : (typeof evt.date === 'string' ? parseISO(evt.date) : evt.date);
      return format(d, 'HH:mm');
    };

    const sorted = [...dayAppointments].sort((a, b) => {
      const timeA = getEventTime(a).split(':').map(Number);
      const timeB = getEventTime(b).split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    let clusters: any[][] = [];
    let currentCluster: any[] = [];
    let currentClusterEnd = 0;

    sorted.forEach(evt => {
      const timeStr = getEventTime(evt);
      const [h, m] = timeStr.split(':').map(Number);
      const start = h * 60 + m;
      
      const serviceInfo = (services || []).find(s => s.id === evt.serviceId);
      const duration = evt.serviceDuration || (serviceInfo?.duration) || 30;
      const end = start + duration;

      if (currentCluster.length > 0 && start >= currentClusterEnd) {
        clusters.push(currentCluster);
        currentCluster = [];
        currentClusterEnd = 0;
      }

      currentCluster.push({ ...evt, start, end, actualDuration: duration });
      currentClusterEnd = Math.max(currentClusterEnd, end);
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const positionedEvents: any[] = [];

    clusters.forEach(cluster => {
      const columns: any[][] = [];
      cluster.forEach(evt => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const lastEvt = columns[i][columns[i].length - 1];
          if (evt.start >= lastEvt.end) {
            columns[i].push(evt);
            evt.column = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          evt.column = columns.length;
          columns.push([evt]);
        }
      });

      cluster.forEach(evt => {
        evt.width = 100 / columns.length;
        evt.left = evt.column * evt.width;
        positionedEvents.push(evt);
      });
    });

    return positionedEvents;
  };

  // SIDEBAR COMPONENTS
  const renderMiniDatePicker = () => {
    const miniStart = startOfMonth(miniMonth);
    const miniEnd = endOfMonth(miniStart);
    const dateStart = startOfWeek(miniStart, { weekStartsOn: 0 });
    const dateEnd = endOfWeek(miniEnd, { weekStartsOn: 0 });
    const miniDays = eachDayOfInterval({ start: dateStart, end: dateEnd });

    return (
      <div className="bg-neutral-950/60 border border-white/5 p-4 rounded-[2rem] space-y-3.5 shadow-lg select-none">
        {/* Month Header selector */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">
            {format(miniMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => handleMiniMonthNavigate(-1)} 
              className="p-1 hover:bg-white/5 hover:text-white text-neutral-500 rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleMiniMonthNavigate(1)} 
              className="p-1 hover:bg-white/5 hover:text-white text-neutral-500 rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Small Weekdays labels */}
        <div className="grid grid-cols-7 text-center">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((val, idx) => (
            <span key={idx} className="text-[9px] font-extrabold text-neutral-600 uppercase">{val}</span>
          ))}
        </div>

        {/* Mini Month cells */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {miniDays.map((miniDay, idx) => {
            const isSel = isSameDay(miniDay, currentDate);
            const isCurrMon = isSameMonth(miniDay, miniMonth);
            const isTodayMini = isToday(miniDay);
            
            return (
              <button
                key={idx}
                onClick={() => onDateChange(miniDay)}
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isSel 
                    ? "bg-amber-500 text-black font-black shadow-md shadow-amber-500/10"
                    : isTodayMini 
                      ? "border border-amber-500/50 text-amber-500 font-extrabold"
                      : isCurrMon 
                        ? "text-neutral-400 hover:bg-white/5 hover:text-white"
                        : "text-neutral-700 hover:text-neutral-500"
                }`}
              >
                {format(miniDay, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // CALENDAR VIEWS
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayAppointments = getAppointmentsForDay(day);
        const isSelected = isSameDay(day, currentDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[110px] p-2.5 border-r border-b border-white/5 transition-all cursor-pointer hover:bg-white/[0.02] flex flex-col justify-between ${
              !isCurrentMonth ? "bg-black/40 opacity-20" : "bg-neutral-900/30"
            } ${isSelected ? "bg-amber-500/[0.02] ring-1 ring-inset ring-amber-500/30" : ""}`}
            onClick={() => handleDaySelect(cloneDay)}
          >
            <div className="flex items-center justify-between">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black tracking-tighter ${
                isTodayDate 
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" 
                  : isSameDay(cloneDay, currentDate)
                    ? "border border-white/30 text-white" 
                    : isCurrentMonth ? "text-neutral-400" : "text-neutral-700"
              }`}>
                {format(day, "d")}
              </span>
              {dayAppointments.length > 0 && (
                <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                  {dayAppointments.length}
                </span>
              )}
            </div>

            {/* Render mini color tags for professional slots inside cell */}
            <div className="space-y-1 my-1.5 overflow-hidden flex-1 flex flex-col justify-end">
               {dayAppointments.slice(0, 3).map((app, idx) => {
                 const colorObj = barberColorMap.get(app.barberId) || BARBER_COLORS[idx % BARBER_COLORS.length];
                 return (
                   <div 
                     key={idx} 
                     onClick={(e) => { e.stopPropagation(); onSelectAppointment && onSelectAppointment(app); }} 
                     className={`text-[8px] ${colorObj.bg} ${colorObj.text} ${colorObj.border} border px-2 py-0.5 rounded-lg truncate font-black flex items-center justify-between group hover:brightness-125 transition-all`}
                   >
                     <span className="truncate max-w-[80%]">{app.clientName?.split(' ')[0]}</span>
                     <span className="opacity-70 text-[7px] shrink-0">{app.time || '00:00'}</span>
                   </div>
                 );
               })}
               {dayAppointments.length > 3 && (
                 <div className="text-[7px] text-neutral-600 font-extrabold pl-1.5 uppercase">+{dayAppointments.length - 3} mais</div>
               )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-neutral-900/40 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden mt-2">
        <div className="grid grid-cols-7 bg-black/60 border-b border-white/5 select-none">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {d}
            </div>
          ))}
        </div>
        <div>{rows}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="space-y-4">
        {/* DESKTOP WEEK TIMELINE (Google Calendar style columns side-by-side) */}
        <div className="hidden md:block bg-neutral-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {/* Calendar Header days row */}
          <div className="grid grid-cols-8 border-b border-white/5 bg-black/30 select-none">
            {/* Hour labels space */}
            <div className="p-4 border-r border-white/5 flex flex-col justify-center items-center">
              <Clock className="w-4 h-4 text-neutral-600" />
            </div>
            
            {/* Columns headers */}
            {days.map((day, idx) => {
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, currentDate);
              const hasApps = getAppointmentsForDay(day).length > 0;
              
              return (
                <div 
                  key={idx} 
                  onClick={() => onDateChange(day)}
                  className={`p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition border-r border-white/5 last:border-r-0 ${
                    isSelected ? "bg-amber-500/[0.01]" : ""
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isTodayDate ? "text-amber-500" : "text-neutral-500"}`}>
                    {format(day, 'eee', { locale: ptBR })}
                  </span>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black mt-1 ${
                    isTodayDate 
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" 
                      : isSelected 
                        ? "border border-amber-500/30 text-amber-500 font-black bg-amber-505/10"
                        : "text-neutral-300"
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {hasApps && !isTodayDate && !isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Core Interactive Scrolling grid */}
          <div className="overflow-y-auto max-h-[600px] no-scrollbar">
            <div className="flex relative" style={{ height: `${hours.length * ROW_HEIGHT}px` }}>
              {/* Left Hour Tags gutter */}
              <div className="w-[12.5%] border-r border-white/5 relative z-10 bg-black/10 select-none">
                {hours.map((hour, i) => (
                  <div 
                    key={hour} 
                    className="absolute right-4 text-[10px] text-neutral-500 font-extrabold tracking-tight"
                    style={{ top: `${i * ROW_HEIGHT - 6}px` }}
                  >
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Day canvas grids */}
              <div className="flex-1 flex relative">
                {/* Visual horizontal row grid ticks */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {hours.map((hour, i) => (
                    <div 
                      key={hour} 
                      className="absolute left-0 right-0 border-t border-white/5" 
                      style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                    >
                      {/* Half-hourly divider */}
                      <div className="absolute left-0 right-0 border-t border-dashed border-white/5/30" style={{ top: `${ROW_HEIGHT / 2}px` }} />
                    </div>
                  ))}
                </div>

                {/* Vertical day columns mapping events */}
                {days.map((day, dIdx) => {
                  const dayApps = getAppointmentsForDay(day);
                  const positionedApps = getPositionedEventsForDay(day, dayApps);
                  const isTodayDate = isToday(day);

                  return (
                    <div 
                      key={dIdx} 
                      className={`flex-1 relative border-r border-white/5 last:border-r-0 h-full z-10 hover:bg-white/[0.005] transition-colors ${
                        isSameDay(day, currentDate) ? "bg-white/[0.005]" : ""
                      }`}
                    >
                      {positionedApps.map((app, appIdx) => {
                        const startOffset = ((app.start - (8 * 60)) / 60) * ROW_HEIGHT;
                        const duration = app.actualDuration;
                        const heightPixels = (duration / 60) * ROW_HEIGHT;
                        const colorObj = barberColorMap.get(app.barberId) || BARBER_COLORS[appIdx % BARBER_COLORS.length];

                        return (
                          <div
                            key={appIdx}
                            onClick={() => onSelectAppointment && onSelectAppointment(app)}
                            className={`absolute rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 cursor-pointer flex flex-col justify-between overflow-hidden group hover:shadow-xl active:scale-95 transition-all border-l-2 sm:border-l-4 ${colorObj.bg} ${colorObj.border} ${colorObj.accent}`}
                            style={{
                              top: `${startOffset + 2}px`,
                              height: `${heightPixels - 4}px`,
                              left: `calc(${app.left}% + 2px)`,
                              width: `calc(${app.width}% - 4px)`,
                              zIndex: 10 + app.column
                            }}
                          >
                            <div className="text-left select-none space-y-0.5 min-w-0">
                              <p className="text-[9px] sm:text-[10px] font-black text-white truncate leading-none">{app.clientName}</p>
                              <p className="text-[7px] sm:text-[8px] font-extrabold text-neutral-400 uppercase truncate mb-1">{app.serviceName}</p>
                            </div>
                            
                            <div className="flex items-center justify-between pointer-events-none gap-1 mt-auto">
                              <span className="text-[7px] sm:text-[8px] font-bold text-white/50 shrink-0">{app.time || format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), 'HH:mm')}</span>
                              <span className="text-[6px] sm:text-[7px] font-black uppercase text-white/80 px-1 rounded bg-black/40 max-w-[50%] truncate hidden sm:inline-block">
                                {app.barberName?.split(' ')[0]}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Glowing live red marker crossing today's timeline column */}
                      {isTodayDate && currentTimePosition !== null && (
                        <div 
                          className="absolute left-0 right-0 flex items-center pointer-events-none z-30"
                          style={{ top: `${currentTimePosition}px` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] -ml-1 flex-shrink-0 animate-pulse" />
                          <div className="flex-1 border-t border-red-500 shadow-[0_1px_5px_rgba(239,68,68,0.5)]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE WEEK TIMELINE (A compact visual list/carousel of cards optimized for touch targets) */}
        <div className="md:hidden space-y-4">
          <div className="grid grid-cols-7 gap-1 bg-neutral-900 border border-white/5 p-1 rounded-2xl select-none">
            {days.map((day, idx) => {
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, currentDate);
              const dApps = getAppointmentsForDay(day);
              
              return (
                <button
                  key={idx}
                  onClick={() => onDateChange(day)}
                  className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                    isSelected ? "bg-amber-500 text-black shadow-lg" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest">{format(day, 'eeeee', { locale: ptBR })}</span>
                  <span className="text-xs font-black mt-1">{format(day, 'd')}</span>
                  {dApps.length > 0 && (
                    <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-black' : 'bg-amber-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {getAppointmentsForDay(currentDate).length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed border-white/5 bg-neutral-900/20 rounded-3xl opacity-60">
                <Clock className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
                <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Nenhuma reserva para este dia</p>
                <p className="text-[8px] text-neutral-600 font-extrabold uppercase tracking-wide mt-1">Selecione outra data ou marque um corte</p>
              </div>
            ) : (
              getAppointmentsForDay(currentDate).map((app, idx) => {
                const colorObj = barberColorMap.get(app.barberId) || BARBER_COLORS[idx % BARBER_COLORS.length];
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectAppointment && onSelectAppointment(app)}
                    className={`bg-neutral-900/60 p-4 rounded-2xl border-l-4 flex items-center justify-between ${colorObj.accent} border border-white/5 shadow-md active:scale-98 transition`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 text-xs font-black text-amber-500 overflow-hidden">
                        {app.clientPhoto ? (
                          <img src={app.clientPhoto} alt={app.clientName} className="w-full h-full object-cover" />
                        ) : (
                          app.clientName?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black text-white">{app.clientName}</p>
                        <p className="text-[9px] text-neutral-500 font-extrabold uppercase mt-0.5">{app.serviceName}</p>
                        <p className="text-[8px] text-amber-500 font-black uppercase tracking-wide mt-1">Profissional: {app.barberName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-white bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-xl block tracking-widest">{app.time || '00:00'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayApps = getAppointmentsForDay(currentDate);
    const positionedApps = getPositionedEventsForDay(currentDate, dayApps);
    const isTodayDate = isToday(currentDate);

    return (
      <div className="bg-neutral-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        {/* Day header info indicator */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/15 select-none text-left">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Compass className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-base font-black text-white leading-none capitalize">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</h3>
                <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">{dayApps.length} Agendamentos Encontrados</p>
             </div>
          </div>
        </div>

        {/* Scrollable Day Timeline Canvas */}
        <div className="overflow-y-auto max-h-[600px] no-scrollbar">
          <div className="relative" style={{ height: `${hours.length * ROW_HEIGHT}px` }}>
            {/* Hour lines backing ticks */}
            {hours.map((hour, i) => (
              <div key={hour} className="absolute w-full flex" style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}>
                {/* Label column */}
                <div className="w-16 flex-shrink-0 text-right pr-4 relative -top-2.5 select-none">
                  <span className="text-[10px] font-extrabold text-neutral-500 tracking-tighter">{hour.toString().padStart(2, '0')}:00</span>
                </div>
                {/* Horizontal row line */}
                <div className="flex-1 border-t border-white/5 relative z-0">
                  <div className="absolute w-full border-t border-dashed border-white/5/40" style={{ top: `${ROW_HEIGHT / 2}px` }} />
                </div>
              </div>
            ))}

            {/* Absolute Placed appointments container */}
            <div className="absolute top-0 bottom-0 right-4 left-16 z-10">
              {positionedApps.map((app, idx) => {
                const startOffset = ((app.start - (8 * 60)) / 60) * ROW_HEIGHT;
                const duration = app.actualDuration;
                const heightPixels = (duration / 60) * ROW_HEIGHT;
                const colorObj = barberColorMap.get(app.barberId) || BARBER_COLORS[idx % BARBER_COLORS.length];

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={idx}
                    onClick={() => onSelectAppointment && onSelectAppointment(app)}
                    className={`absolute cursor-pointer rounded-xl px-3 py-1.5 overflow-hidden group hover:shadow-2xl active:scale-98 border border-white/5 transition-all text-left flex justify-between items-start border-l-4 ${colorObj.bg} ${colorObj.border} ${colorObj.accent}`}
                    style={{
                      top: `${startOffset + 2}px`,
                      height: `${heightPixels - 4}px`,
                      left: `calc(${app.left}% + 4px)`,
                      width: `calc(${app.width}% - 8px)`,
                      zIndex: 20 + app.column
                    }}
                  >
                    <div className="flex items-start gap-2.5 h-full max-w-[75%] min-w-0">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden select-none">
                        {app.clientPhoto ? (
                          <img src={app.clientPhoto} alt={app.clientName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex flex-col justify-center h-full text-white min-w-0">
                        <div className="truncate">
                          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide truncate leading-tight">{app.clientName}</p>
                          <p className="text-[8px] sm:text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider truncate leading-none mt-0.5">{app.serviceName}</p>
                        </div>
                        <span className="text-[7px] sm:text-[8px] font-black text-amber-400 uppercase tracking-widest truncate leading-none flex items-center gap-1 mt-1">
                          <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 shrink-0" /> {app.barberName}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-start sm:justify-between items-end h-full select-none shrink-0 gap-1">
                      <span className="text-[9px] sm:text-[10px] font-black text-white bg-black/45 border border-white/10 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg shadow-inner tracking-widest">{app.time || format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), 'HH:mm')}</span>
                      {app.status === 'confirmed' && (
                        <span className="text-[6px] sm:text-[7px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest hidden sm:inline-block">Confirmado</span>
                      )}
                      {app.status === 'completed' && (
                        <span className="text-[6px] sm:text-[7px] font-black bg-green-500/20 text-green-400 border border-green-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wide hidden sm:inline-block">Finalizado</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Glowing active red marker line for today online */}
              {isTodayDate && currentTimePosition !== null && (
                <div 
                  className="absolute left-0 right-0 flex items-center pointer-events-none z-30"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] -ml-1.5 flex-shrink-0 animate-pulse" />
                  <div className="flex-1 border-t-2 border-red-500 shadow-[0_1px_5px_rgba(239,68,68,0.5)]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full pb-10">
      <div className="flex flex-col lg:flex-row gap-8 w-full">
        {/* RESPONSIVE DESKTOP + TABLET LEFT SIDEBAR COLUMN */}
        <div className="lg:w-72 w-full flex-shrink-0 space-y-6 flex flex-col">
          {/* Nova Reserva Button (Desktop Top-Priority Action) */}
          {(role === 'manager' || role === 'barber') && onNewBooking && (
            <button
               onClick={onNewBooking}
               className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-amber-500/10 group cursor-pointer"
               style={{ cursor: "pointer" }}
               id="sidebar-new-booking-btn"
            >
               <Plus className="w-4 h-4 text-black font-black" />
               Novo Agendamento
            </button>
          )}

          {/* Interactive Mini-DatePicker */}
          <div className="lg:block hidden">
            {renderMiniDatePicker()}
          </div>

          {/* Colored Barber Guide Card */}
          {uniqueBarbers.length > 0 && (
            <div className="bg-neutral-900/30 border border-white/5 p-4 rounded-[2rem] space-y-3 shadow-lg select-none">
              <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-widest border-b border-white/5 pb-2 pl-1 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-amber-500" /> Profissionais Atendendo
              </h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1 pt-1">
                {uniqueBarbers.map((barber, i) => {
                  const styleObj = barberColorMap.get(barber.id) || BARBER_COLORS[i % BARBER_COLORS.length];
                  return (
                    <div key={barber.id} className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/40 border border-white/5 group hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <div className={`w-2.5 h-2.5 rounded-full ${styleObj.dot}`} />
                        <span className="text-[10px] font-bold text-neutral-300 capitalize truncate">{barber.name}</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${styleObj.bg} ${styleObj.text}`}>
                        Gestor
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* GLORIOUS RIGHT MAIN CALENDAR SHEET */}
        <div className="flex-1 min-w-0 bg-neutral-900/30 rounded-[2.5rem] border border-white/5 p-4 sm:p-6 shadow-2xl relative">
          {/* Main Top Header Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 px-1 gap-4 select-none">
             {/* Mode display title */}
             <div className="flex items-center gap-3 w-full sm:w-auto text-left">
                <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
                   <button 
                     onClick={() => navigate(-1)} 
                     className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition active:scale-90"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={() => onDateChange(new Date())} 
                     className="px-3.5 py-1 text-[9px] font-black uppercase tracking-widest text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition"
                   >
                     Hoje
                   </button>
                   <button 
                     onClick={() => navigate(1)} 
                     className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition active:scale-90"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
                <div>
                   <h3 className="text-base sm:text-lg font-black text-white leading-none capitalize">
                     {format(currentDate, mode === 'month' ? "MMMM 'de' yyyy" : mode === 'week' ? "MMMM 'de' yyyy" : "dd 'de' MMMM", { locale: ptBR })}
                   </h3>
                   <p className="text-[8px] text-amber-500 uppercase font-black tracking-[0.2em] mt-1">Status Ativo de Navegação</p>
                </div>
             </div>

             {/* Mode Toggler (Day, Week, Month) Segmented selector */}
             <div className="flex bg-neutral-950 p-1.5 rounded-2xl border border-white/5 shadow-inner self-end sm:self-auto overflow-x-auto max-w-full">
               {[
                 { id: 'day', label: 'Dia' },
                 { id: 'week', label: 'Semana' },
                 { id: 'month', label: 'Mês' }
               ].map((m) => (
                 <button
                   key={m.id}
                   onClick={() => onModeChange && onModeChange(m.id as any)}
                   className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap z-10 ${
                     mode === m.id ? "text-black font-black" : "text-neutral-500 hover:text-white"
                   }`}
                 >
                   {mode === m.id && (
                     <motion.div 
                       layoutId="calendarModeSelector" 
                       className="absolute inset-0 bg-amber-500 rounded-xl z-[-1]" 
                       transition={{ type: "spring", stiffness: 350, damping: 28 }}
                     />
                   )}
                   {m.label}
                 </button>
               ))}
             </div>
          </div>

          {/* Core Animating Content Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + currentDate.toISOString()}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {mode === "month" && renderMonthView()}
              {mode === "week" && renderWeekView()}
              {mode === "day" && renderDayView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
