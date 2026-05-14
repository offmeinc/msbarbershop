import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  X, 
  MoreHorizontal, 
  User 
} from "lucide-react";
import { 
  format, 
  addDays, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  addMonths, 
  addWeeks,
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

export function AppointmentModal({ appointment, onClose, onUpdate, onEdit }: { appointment: any, onClose: () => void, onUpdate: (app: any, status: string) => void, onEdit?: (app: any) => void }) {
  if (!appointment) return null;
  const d = appointment.date instanceof Timestamp ? appointment.date.toDate() : (typeof appointment.date === 'string' ? parseISO(appointment.date) : appointment.date);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-neutral-900 border border-white/10 p-8 rounded-[3rem] w-full max-w-sm text-center relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-500 hover:text-white"><X className="w-6 h-6"/></button>
        
        <div className="w-20 h-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/20 overflow-hidden">
          {appointment.clientPhoto ? (
             <img src={appointment.clientPhoto} alt={appointment.clientName} className="w-full h-full object-cover" />
          ) : (
             <User className="w-10 h-10 text-black outline-none" />
          )}
        </div>
        
        <h2 className="text-2xl font-black italic uppercase mb-2">{appointment.clientName}</h2>
        <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">{appointment.serviceName}</p>

        <div className="bg-black/50 p-6 rounded-3xl border border-white/5 space-y-4 mb-8 text-left">
            <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-bold text-white/90">{format(d, "dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-bold text-white/90">{appointment.time || format(d, 'HH:mm')}</span>
            </div>
            <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-bold text-white/90">Profissional: {appointment.barberName}</span>
            </div>
        </div>

        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => onUpdate(appointment, 'confirmed')} className="py-4 bg-amber-500 text-black rounded-2xl font-black uppercase italic text-xs">CONFIRMAR</button>
               <button onClick={() => onUpdate(appointment, 'cancelled')} className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase italic text-xs">CANCELAR</button>
            </div>
            {onEdit && (
                <button onClick={() => onEdit(appointment)} className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase italic text-xs hover:bg-white/10 transition-colors">EDITAR AGENDAMENTO</button>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CalendarWidget({ 
  appointments, 
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
  mode: "day" | "week" | "month", 
  onModeChange?: (mode: "day" | "week" | "month") => void,
  currentDate: Date, 
  onDateChange: (date: Date) => void,
  role: string,
  updateStatus: (app: any, status: string) => void,
  onNewBooking?: () => void,
  onSelectAppointment?: (app: any) => void
}) {
  const navigate = (direction: number) => {
    if (mode === "month") onDateChange(addMonths(currentDate, direction));
    else if (mode === "week") onDateChange(addWeeks(currentDate, direction));
    else onDateChange(addDays(currentDate, direction));
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

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayAppointments = getAppointmentsForDay(day);
        const isSelected = isSameDay(day, currentDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] p-2 border-r border-b border-white/5 transition-all cursor-pointer hover:bg-white/5 flex flex-col gap-1 ${
              !isCurrentMonth ? "bg-black opacity-20" : "bg-neutral-900"
            } ${isSelected ? "ring-2 ring-inset ring-amber-500 z-10" : ""}`}
            onClick={() => handleDaySelect(cloneDay)}
          >
            <div className={`flex items-center justify-between`}>
              <span className={`text-xs font-bold ${
                isTodayDate ? "w-6 h-6 bg-amber-500 text-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.3)]" : 
                isCurrentMonth ? "text-white" : "text-neutral-600"
              }`}>
                {formattedDate}
              </span>
              {dayAppointments.length > 0 && (
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                  {dayAppointments.length}
                </span>
              )}
            </div>
            <div className="space-y-1 mt-1 overflow-hidden">
               {dayAppointments.slice(0, 3).map((app, idx) => (
                 <div key={idx} onClick={(e) => {e.stopPropagation(); onSelectAppointment && onSelectAppointment(app); }} className="text-[8px] bg-white/5 text-neutral-400 px-1.5 py-0.5 rounded truncate font-medium border border-white/5 cursor-pointer hover:bg-white/10 hover:text-white transition-colors">
                   {app.clientName?.split(' ')[0] || "Cliente"}
                 </div>
               ))}
               {dayAppointments.length > 3 && (
                 <div className="text-[8px] text-neutral-600 font-bold pl-1 uppercase">+{dayAppointments.length - 3} mais</div>
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
      <div className="bg-neutral-900 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden mt-4">
        <div className="grid grid-cols-7 bg-black border-b border-white/5">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-neutral-600">
              {d}
            </div>
          ))}
        </div>
        <div>{rows}</div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const endDate = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-8">
        {days.map((day, idx) => {
          const dayApps = getAppointmentsForDay(day);
          const isTodayDate = isToday(day);
          return (
            <div key={idx} className="flex flex-col gap-3">
               <div className={`p-4 rounded-2xl flex flex-col items-center transition-all ${
                 isTodayDate ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-neutral-900 border border-white/5 text-white"
               }`}>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${isTodayDate ? "text-black/50" : "text-neutral-500"}`}>
                   {format(day, 'eee', { locale: ptBR })}
                 </span>
                 <span className="text-2xl font-black italic">{format(day, 'd')}</span>
               </div>
               <div className="space-y-2">
                 {dayApps.map((app, appIdx) => (
                   <div key={appIdx} onClick={() => onSelectAppointment && onSelectAppointment(app)} className="cursor-pointer bg-neutral-900 p-3 rounded-2xl border border-white/5 shadow-lg flex flex-col gap-1 group hover:border-amber-500/30 transition-all">
                      <div className="flex items-center justify-between mb-1">
                         <span className="text-[10px] font-black text-amber-500 uppercase">{app.time || format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), 'HH:mm')}</span>
                         <div className={`w-2 h-2 rounded-full ${app.status === 'completed' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {app.clientPhoto ? (
                          <img src={app.clientPhoto} alt={app.clientName} className="w-6 h-6 rounded-md object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-[10px] font-black text-white">
                            {app.clientName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{app.clientName}</p>
                          <p className="text-[8px] text-neutral-500 uppercase font-black truncate">{app.serviceName}</p>
                        </div>
                      </div>
                   </div>
                 ))}
                 {dayApps.length === 0 && (
                   <div className="py-8 flex flex-col items-center justify-center opacity-10 bg-white/5 rounded-2xl border-2 border-dashed border-white/10">
                     <Clock className="w-4 h-4 mb-1 text-neutral-400" />
                   </div>
                 )}
                </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayApps = getAppointmentsForDay(currentDate);
    const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
    
    // Calculate overlapping for events
    const calculateOverlaps = (events: any[]) => {
      const validEvents = events.filter(e => e && e.date);
      const getEventTime = (evt: any) => {
        if (typeof evt.time === 'string') return evt.time;
        const d = evt.date instanceof Timestamp ? evt.date.toDate() : (typeof evt.date === 'string' ? parseISO(evt.date) : evt.date);
        return format(d, 'HH:mm');
      };

      const sorted = [...validEvents].sort((a, b) => {
        const timeA = getEventTime(a).split(':').map(Number);
        const timeB = getEventTime(b).split(':').map(Number);
        return (timeA[0]*60 + timeA[1]) - (timeB[0]*60 + timeB[1]);
      });

      let clusters: any[][] = [];
      let currentCluster: any[] = [];
      let currentClusterEnd = 0;

      sorted.forEach(evt => {
        const timeStr = getEventTime(evt);
        const [h, m] = timeStr.split(':').map(Number);
        const start = h * 60 + m;
        const duration = evt.serviceDuration || 50;
        const end = start + duration;

        if (currentCluster.length > 0 && start >= currentClusterEnd) {
          clusters.push(currentCluster);
          currentCluster = [];
          currentClusterEnd = 0;
        }

        currentCluster.push({ ...evt, start, end });
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

    const positionedApps = calculateOverlaps(dayApps);

    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-[#1C1C1E] p-1 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
           {/* Header */}
           <div className="flex items-center justify-between p-6 bg-neutral-900 border-b border-black rounded-[2rem] z-20 relative">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white leading-none mb-1 capitalize">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</h3>
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{dayApps.length} Agendamentos</p>
                 </div>
              </div>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                 <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-neutral-500 hover:text-amber-500 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                 <button onClick={() => navigate(1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-neutral-500 hover:text-amber-500 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
              </div>
           </div>

           {/* Timeline */}
           <div className="p-4 overflow-y-auto max-h-[600px] no-scrollbar">
             <div className="relative mt-4" style={{ height: `${hours.length * 80}px` }}>
                {/* Horizontal lines and time labels */}
                {hours.map((hour, i) => (
                  <div key={hour} className="absolute w-full flex" style={{ top: `${i * 80}px`, height: '80px' }}>
                     <div className="w-14 flex-shrink-0 text-right pr-4 relative -top-2">
                        <span className="text-[10px] font-bold text-neutral-500">{hour.toString().padStart(2, '0')}:00</span>
                     </div>
                     <div className="flex-1 border-t border-white/5 relative">
                        {/* Half hour line (dashed) */}
                        <div className="absolute w-full border-t border-dashed border-white/5" style={{ top: '40px' }}></div>
                     </div>
                  </div>
                ))}
                
                {/* Appointments Container */}
                <div className="absolute top-0 bottom-0 right-4 left-14">
                  {positionedApps.map((app, idx) => {
                     const startOffset = ((app.start - (8 * 60)) / 60) * 80;
                     const duration = app.serviceDuration || 50;
                     const heightPixels = (duration / 60) * 80;

                     return (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         key={idx} 
                         onClick={() => onSelectAppointment && onSelectAppointment(app)}
                         className="absolute cursor-pointer rounded-xl p-2.5 overflow-hidden group hover:z-50 transition-all flex flex-col shadow-lg backdrop-blur-sm"
                         style={{ 
                           top: `${startOffset}px`, 
                           height: `${heightPixels}px`,
                           left: `calc(${app.left}% + 4px)`,
                           width: `calc(${app.width}% - 8px)`,
                           backgroundColor: app.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : (app.status === 'confirmed' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                           borderColor: app.status === 'completed' ? 'rgba(16, 185, 129, 0.4)' : (app.status === 'confirmed' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'),
                           borderWidth: '1px',
                           borderLeftWidth: '4px',
                           borderLeftColor: app.status === 'completed' ? '#10b981' : (app.status === 'confirmed' ? '#f59e0b' : '#ef4444')
                         }}
                       >
                          <div className="flex items-start justify-between">
                             <div className="flex gap-2">
                               {app.clientPhoto ? (
                                  <img src={app.clientPhoto} alt={app.clientName} className="w-8 h-8 rounded-lg object-cover" />
                               ) : (
                                  <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-xs font-black text-amber-500">
                                    {app.clientName?.charAt(0) || '?'}
                                  </div>
                               )}
                               <div className="pt-0.5 truncate">
                                 <p className="text-xs font-black text-white truncate">{app.clientName}</p>
                                 <p className="text-[9px] text-white/70 font-bold uppercase truncate">{app.time || format(app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date), 'HH:mm')} - {app.serviceName}</p>
                               </div>
                             </div>
                             {(role === 'manager' || role === 'barber') && app.status === 'pending' && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); updateStatus(app, 'confirmed'); }}
                                 className="bg-black/40 shadow border border-white/10 p-1.5 rounded-lg text-amber-500 hover:text-white hover:bg-amber-500 transition-colors shrink-0"
                               >
                                 <CheckCircle2 className="w-4 h-4" />
                               </button>
                             )}
                          </div>
                       </motion.div>
                     );
                  })}
                </div>
             </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full pb-20">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 px-4 gap-4">
         <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
               Meu <span className="text-amber-500">Fluxo</span>
            </h2>
            {(role === 'manager' || role === 'barber') && onNewBooking && (
                <button
                   onClick={onNewBooking}
                   className="flex items-center gap-2 bg-amber-500 px-4 py-2 rounded-xl text-black font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shrink-0"
                >
                   + Nova Reserva
                </button>
            )}
         </div>
         <div className="flex bg-neutral-900 p-1 rounded-2xl border border-white/5 shadow-xl overflow-x-auto max-w-full">
           {[
             { id: 'day', label: 'Dia' },
             { id: 'week', label: 'Semana' },
             { id: 'month', label: 'Mês' }
           ].map((m) => (
             <button
               key={m.id}
               onClick={() => onModeChange && onModeChange(m.id as any)}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 mode === m.id ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-white"
               }`}
             >
               {m.label}
             </button>
           ))}
         </div>
      </div>

      <div className="flex items-center justify-center gap-6 mb-8 bg-neutral-900 py-4 rounded-[2rem] border border-white/5 shadow-2xl max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 hover:bg-amber-500 hover:text-black rounded-xl transition-all shadow-sm active:scale-95"><ChevronLeft className="w-5 h-5 text-neutral-500 group-hover:text-black" /></button>
        <div className="text-center min-w-[160px]">
          <h3 className="text-lg font-bold text-white leading-none mb-1">
            {format(currentDate, mode === 'month' ? 'MMMM yyyy' : mode === 'week' ? "MMM d" : "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest">Navegação</p>
        </div>
        <button onClick={() => navigate(1)} className="p-2 bg-white/5 hover:bg-amber-500 hover:text-black rounded-xl transition-all shadow-sm active:scale-95"><ChevronRight className="w-5 h-5 text-neutral-500 group-hover:text-black" /></button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {mode === "month" && renderMonthView()}
          {mode === "week" && renderWeekView()}
          {mode === "day" && renderDayView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
