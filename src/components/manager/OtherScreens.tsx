import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Download, Calendar, User, Clock, Share2, Loader2, Check, Sparkles } from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { BARBERSHOP_NAME, BARBERSHOP_ADDRESS } from "../../constants";
import { toPng } from 'html-to-image';

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500 transition-colors">
           <ChevronLeft className="w-5 h-5" /> Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
            <h2 className="text-xl font-bold text-white">Central de Ajuda</h2>
            <p className="text-neutral-500">Dúvidas? Entre em contato com nosso suporte.</p>
        </div>
    </div>
  );
}

export function ShareScreen({ onBack }: { onBack: () => void }) {
  const [selectedBarberId, setSelectedBarberId] = useState<string | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [barbers, setBarbers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBarbers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "users"));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    const q = query(
      collection(db, "appointments"),
      where("status", "in", ["pending", "confirmed", "completed"]),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "appointments"));
    return () => unsubscribe();
  }, [selectedDate]);

  useEffect(() => {
    const q = query(collection(db, "blocked_times"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlockedTimes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "blocked_times"));
    return () => unsubscribe();
  }, []);

  const getAvailableSlots = () => {
    const slots = [];
    const day = selectedDate.getDay();
    let startHour = 9;
    let endHour = 0;

    if (day >= 1 && day <= 5) { endHour = 20; }
    else if (day === 6) { endHour = 19.5; }
    else { endHour = 0; }

    if (endHour === 0) return [];

    const now = new Date();
    const isToday = isSameDay(selectedDate, now);

    for (let h = startHour; h < Math.ceil(endHour); h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotTimeInHours = h + (m / 60);
        if (slotTimeInHours >= endHour) break;

        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);

        if (isToday && slotDate < now) continue;

        const isBusy = appointments.some(app => {
          if (selectedBarberId !== 'all' && app.barberId !== selectedBarberId) return false;
          // Simple check: is this exact time slot taken?
          // More robust would check duration but for a "free slots" poster, 30m slots is standard
          return app.time === time && (selectedBarberId === 'all' ? true : app.barberId === selectedBarberId);
        });

        const isBlocked = blockedTimes.some(b => {
          const bDate = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
          return isSameDay(bDate, selectedDate) && format(bDate, "HH:mm") === time;
        });

        if (!isBusy && !isBlocked) {
          slots.push(time);
        }
      }
    }
    return slots;
  };

  const slots = getAvailableSlots();

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setIsGenerating(true);
    try {
      // Use a small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        backgroundColor: '#000',
        width: 1080,
        height: 1920,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      const link = document.createElement('a');
      link.download = `agenda-${format(selectedDate, "dd-MM-yyyy")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
      <div className="max-w-md mx-auto py-8 px-6 pb-24">
          <button onClick={onBack} className="text-neutral-500 mb-6 flex items-center gap-2 hover:text-amber-500 transition-colors">
             <ChevronLeft className="w-5 h-5" /> Voltar
          </button>
          
          <div className="space-y-6">
              <div className="bg-neutral-900 rounded-[2.5rem] p-8 border border-white/5">
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Divulgar Horários</h2>
                  <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest leading-relaxed">Gere uma imagem personalizada para postar no Instagram ou WhatsApp.</p>
              </div>

              {/* Controls */}
              <div className="bg-neutral-900 rounded-[2.5rem] p-6 border border-white/5 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-neutral-600 tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Selecionar Dia
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[new Date(), addDays(new Date(), 1)].map(date => (
                      <button 
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isSameDay(selectedDate, date) ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-black/20 text-neutral-500 hover:text-white"}`}
                      >
                        {isSameDay(date, new Date()) ? 'Hoje' : 'Amanhã'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-neutral-600 tracking-widest flex items-center gap-2">
                    <User className="w-3 h-3" /> Barbeiro
                  </label>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    <button 
                      onClick={() => setSelectedBarberId('all')}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedBarberId === 'all' ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-black/20 text-neutral-500 hover:text-white"}`}
                    >
                      Todos
                    </button>
                    {barbers.map(b => (
                      <button 
                        key={b.id}
                        onClick={() => setSelectedBarberId(b.id)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedBarberId === b.id ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-black/20 text-neutral-500 hover:text-white"}`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleDownload}
                    disabled={isGenerating || slots.length === 0}
                    className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-neutral-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <Download className="w-4 h-4 text-black" />
                    )}
                    Baixar Imagem para Story
                  </button>
                  {slots.length === 0 && (
                    <p className="text-center text-[10px] text-red-500 font-bold uppercase tracking-widest mt-4">
                      {selectedDate.getDay() === 0 ? "Não funcionamos aos domingos!" : "Nenhum horário disponível para este dia."}
                    </p>
                  )}
                </div>
              </div>
          </div>

          {/* Hidden Poster Target (Styled for 1080x1920) */}
          <div className="fixed left-[-2000px] top-[-2000px]">
            <div 
              ref={posterRef}
              style={{ width: '1080px', height: '1920px' }}
              className="bg-black flex flex-col items-center justify-between p-24 text-white relative overflow-hidden"
            >
              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />
              
              {/* Header */}
              <div className="w-full text-center space-y-12 relative z-10 pt-12">
                <div className="w-48 h-48 bg-white/5 rounded-[4rem] border border-white/10 flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden">
                    <img 
                      src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
                      alt="Logo"
                      className="w-full h-full object-cover opacity-90"
                    />
                </div>
                <div className="space-y-4">
                  <p className="text-amber-500 font-black uppercase tracking-[0.6em] text-2xl">Horários Disponíveis</p>
                  <h1 className="text-9xl font-black italic uppercase tracking-tighter leading-none animate-gradient-text">
                    {format(selectedDate, "EEEE", { locale: ptBR })}
                  </h1>
                  <p className="text-neutral-500 text-3xl font-bold uppercase tracking-[0.3em]">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Slots Grid */}
              <div className="w-full relative z-10 flex-1 flex items-center justify-center py-20">
                <div className="grid grid-cols-3 gap-8 w-full max-w-5xl">
                   {slots.slice(0, 15).map(time => (
                     <div key={time} className="bg-neutral-900/80 border-2 border-white/10 rounded-[3rem] py-10 flex flex-col items-center justify-center shadow-xl backdrop-blur-xl">
                        <Clock className="w-8 h-8 text-amber-500/30 mb-4" />
                        <span className="text-6xl font-black italic text-white">{time}</span>
                     </div>
                   ))}
                   {slots.length > 15 && (
                     <div className="col-span-3 text-center pt-8">
                       <p className="text-neutral-500 text-3xl font-black uppercase tracking-widest">+ {slots.length - 15} OUTROS HORÁRIOS</p>
                     </div>
                   )}
                </div>
              </div>

              {/* Footer */}
              <div className="w-full text-center space-y-12 relative z-10 pb-12">
                <div className="h-0.5 w-32 bg-amber-500/20 mx-auto rounded-full" />
                <div className="space-y-6">
                  <h3 className="text-5xl font-black italic uppercase text-white tracking-widest">{BARBERSHOP_NAME}</h3>
                  <p className="text-2xl text-neutral-500 font-bold uppercase tracking-[0.2em] max-w-2xl mx-auto px-4">{BARBERSHOP_ADDRESS}</p>
                </div>
                <div className="bg-amber-500 text-black py-8 px-16 rounded-[4rem] inline-block font-black uppercase italic tracking-[0.3em] text-3xl shadow-2xl shadow-amber-500/30">
                  AGENDE PELO LINK NA BIO
                </div>
              </div>
            </div>
          </div>
      </div>
  );
}

export function RecurrenceScreen({ onBack }: { onBack: () => void }) {
  return (
      <div className="max-w-md mx-auto py-8 px-6">
          <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500 transition-colors">
             <ChevronLeft className="w-5 h-5" /> Voltar
          </button>
          <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
              <h2 className="text-xl font-bold text-white">Configurações de Recorrência</h2>
              <p className="text-neutral-500">Gerencie regras de agendamentos recorrentes.</p>
          </div>
      </div>
  );
}
