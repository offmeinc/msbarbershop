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

export function AppointmentModal({ appointment, onClose, onUpdate }: { appointment: any, onClose: () => void, onUpdate: (app: any, status: string) => void }) {
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
        
        <div className="w-20 h-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/20">
          <User className="w-10 h-10 text-black outline-none" />
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
                <span className="text-sm font-bold text-white/90">{appointment.time}</span>
            </div>
            <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-neutral-500" />
                <span className="text-sm font-bold text-white/90">Profissional: {appointment.barberName}</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <button onClick={() => onUpdate(appointment, 'confirmed')} className="py-4 bg-amber-500 text-black rounded-2xl font-black uppercase italic text-xs">CONFIRMAR</button>
           <button onClick={() => onUpdate(appointment, 'cancelled')} className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase italic text-xs">CANCELAR</button>
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
  updateStatus 
}: { 
  appointments: any[], 
  mode: "day" | "week" | "month", 
  onModeChange?: (mode: "day" | "week" | "month") => void,
  currentDate: Date, 
  onDateChange: (date: Date) => void,
  role: string,
  updateStatus: (app: any, status: string) => void
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
                 <div key={idx} className="text-[8px] bg-white/5 text-neutral-400 px-1.5 py-0.5 rounded truncate font-medium border border-white/5">
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
                   <div key={appIdx} className="bg-neutral-900 p-3 rounded-2xl border border-white/5 shadow-lg flex flex-col gap-1 group hover:border-amber-500/30 transition-all">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-amber-500 uppercase">{app.time}</span>
                         <div className={`w-2 h-2 rounded-full ${app.status === 'completed' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      </div>
                      <p className="text-xs font-bold text-white truncate">{app.clientName}</p>
                      <p className="text-[9px] text-neutral-500 uppercase font-black">{app.serviceName}</p>
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
    const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <div className="bg-neutral-900 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
           <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white leading-none mb-1">{format(currentDate, "eeee, d 'de' MMMM", { locale: ptBR })}</h3>
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">{dayApps.length} Agendamentos</p>
                 </div>
              </div>
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                 <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-neutral-500 hover:text-amber-500 shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                 <button onClick={() => navigate(1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-neutral-500 hover:text-amber-500 shadow-sm"><ChevronRight className="w-4 h-4" /></button>
              </div>
           </div>

           <div className="space-y-2">
              {hours.map(hour => {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const hourApps = dayApps.filter(a => a.time.startsWith(hour.toString().padStart(2, '0')));
                
                return (
                  <div key={hour} className="group flex gap-4 min-h-[50px] border-b border-white/5 last:border-none">
                     <div className="w-12 pt-0.5 text-right">
                        <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-tight">{timeStr}</span>
                     </div>
                     <div className="flex-1 flex flex-col gap-1 pb-2">
                          {hourApps.map((app, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="bg-black border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-amber-500/30 transition-all group/card"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-1 h-8 rounded-full ${
                                  app.status === 'completed' ? 'bg-amber-500' : 
                                  app.status === 'confirmed' ? 'bg-amber-500' : 'bg-red-500'
                                }`} />
                                <div>
                                  <p className="text-xs font-black text-white">{app.clientName}</p>
                                  <p className="text-[9px] text-neutral-500 font-bold uppercase">{app.serviceName}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                 {(role === 'manager' || role === 'barber') && app.status === 'pending' && (
                                   <div className="flex gap-1">
                                      <button 
                                        onClick={() => updateStatus(app, 'confirmed')}
                                        className="bg-amber-500 text-black p-1.5 rounded-lg hover:bg-amber-400"
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                      </button>
                                   </div>
                                 )}
                              </div>
                            </motion.div>
                          ))}
                     </div>
                   </div>
                );
              })}
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
            <p className="hidden sm:block text-[10px] text-neutral-500 uppercase tracking-widest font-black pt-1">Calendário de Atendimentos</p>
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
