import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  format, 
  addDays, 
  isSameDay, 
  startOfDay, 
  endOfDay, 
  parseISO 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  getDocs 
} from "firebase/firestore";
import { 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Loader2, 
  XCircle, 
  RefreshCw, 
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

function RecurrenceUI({ userRole, recurrence, setRecurrence }: { userRole: string, recurrence: string, setRecurrence: (r: any) => void }) {
  if (userRole !== 'barber' && userRole !== 'manager') return null;
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-black uppercase text-neutral-400 tracking-widest">Deseja tornar recorrente?</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(r => (
          <button 
            key={r}
            onClick={() => setRecurrence(r)}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${recurrence === r ? "bg-amber-500 text-black" : "bg-white/5 text-neutral-600 hover:text-white"}`}
          >
            {r === 'none' ? 'Único' : r === 'weekly' ? 'Semanal' : r === 'biweekly' ? 'Quinzenal' : 'Mensal'}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmationModal({ service, date, onConfirm }: any) {
    return (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
        >
            <div className="max-w-sm w-full text-center space-y-8">
                <div className="w-24 h-24 bg-green-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
                    <CheckCircle2 className="w-12 h-12 text-black" strokeWidth={3} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Tudo Pronto!</h2>
                    <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-[0.2em]">Seu agendamento foi confirmado</p>
                </div>
                
                <div className="bg-neutral-900/50 p-8 rounded-[3rem] border border-white/5 space-y-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Procedimento</p>
                        <p className="text-xl font-black text-white uppercase italic">{service?.name}</p>
                    </div>
                    <div className="h-[1px] bg-white/5" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Data e Hora</p>
                        <p className="text-xl font-black text-amber-500 italic uppercase">
                           {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}<br/>
                           às {format(new Date(date), "HH:mm")}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest leading-relaxed">
                        Enviamos um resumo no seu WhatsApp e e-mail.
                    </p>
                    <button 
                      onClick={onConfirm}
                      className="w-full bg-white text-black py-6 rounded-[2rem] font-black uppercase italic tracking-widest hover:scale-105 transition-transform"
                    >
                      VOLTAR PARA O INÍCIO
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

interface BookingScreenProps {
  user: any;
  role?: string;
  services: any[];
  onBack: () => void;
  editAppointment?: any;
}

export function BookingScreen({ user, role, services, onBack, editAppointment }: BookingScreenProps) {
  const [step, setStep] = useState(editAppointment ? 3 : 1);
  const [selectedService, setSelectedService] = useState<string | null>(editAppointment?.serviceId || null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(editAppointment?.barberId || null);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(
    editAppointment?.date 
      ? (editAppointment.date instanceof Timestamp ? editAppointment.date.toDate() : (typeof editAppointment.date === 'string' ? parseISO(editAppointment.date) : editAppointment.date))
      : new Date()
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(editAppointment?.time || null);
  const [barberAppointments, setBarberAppointments] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [isBooking, setIsBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [guestName, setGuestName] = useState(editAppointment?.clientName || "");
  const [guestEmail, setGuestEmail] = useState(editAppointment?.clientEmail || "");
  const [guestPhone, setGuestPhone] = useState(editAppointment?.clientPhone || "");
  const [couponCode, setCouponCode] = useState(editAppointment?.couponCode || "");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [customDuration, setCustomDuration] = useState<number>(editAppointment?.serviceDuration || 0);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barberData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(barberData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "blocked_times"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlockedTimes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "blocked_times");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedBarber) return;
    setLoadingSlots(true);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    const q = query(
      collection(db, "appointments"),
      where("barberId", "==", selectedBarber),
      where("status", "in", ["pending", "confirmed", "completed"]),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBarberAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingSlots(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoadingSlots(false);
    });
    return () => unsubscribe();
  }, [selectedBarber, selectedDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    const day = selectedDate.getDay();
    let startHour = 9;
    let endHour = 0;

    if (day >= 1 && day <= 5) { // Seg-Sex
      endHour = 20;
    } else if (day === 6) { // Sáb
      endHour = 19.5; // Até 19:30
    } else { // Dom
      endHour = 0;
    }

    if (endHour === 0) return [];

    for (let h = startHour; h < Math.ceil(endHour); h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotTimeInHours = h + (m / 60);
        if (slotTimeInHours >= endHour) break;

        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotDate.getTime() + (customDuration || 30) * 60000);

        const isBusy = barberAppointments.some(app => {
          if (editAppointment && app.id === editAppointment.id) return false; // Ignore self when editing
          const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
          if (format(appDate, "yyyy-MM-dd") !== format(selectedDate, "yyyy-MM-dd")) return false;
          
          // Get duration from appointment or look it up in services list
          const serviceInfo = services.find(s => s.id === app.serviceId);
          const appDuration = app.serviceDuration || (serviceInfo?.duration) || 30;
          
          const appEnd = new Date(appDate.getTime() + appDuration * 60000);
          return slotDate < appEnd && slotEnd > appDate;
        }) || blockedTimes.some(b => {
          const bDate = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
          return format(bDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && format(bDate, "HH:mm") === time;
        });

        const isPast = slotDate < new Date();
        slots.push({ time, available: !isBusy && !isPast });
      }
    }
    return slots;
  }, [selectedDate, barberAppointments, blockedTimes, customDuration]);

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
        setError("Todos os campos são obrigatórios.");
        return;
    }
    const isStaffBooking = role === 'manager' || role === 'barber';

    if ((!user || isStaffBooking) && (!guestName || !guestPhone)) {
        setError("Nome e WhatsApp são obrigatórios para o cliente.");
        return;
    }
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);
    const duration = customDuration || 30;
    const finalDateEnd = new Date(finalDate.getTime() + duration * 60000);
    
    // Final Availability Check (Real-time data from snapshot)
    const isStillBusy = barberAppointments.some(app => {
        if (editAppointment && app.id === editAppointment.id) return false;
        const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
        
        const serviceInfo = services.find(s => s.id === app.serviceId);
        const appDuration = app.serviceDuration || (serviceInfo?.duration) || 30;
        
        const appEnd = new Date(appDate.getTime() + appDuration * 60000);
        return finalDate < appEnd && finalDateEnd > appDate;
    });

    if (isStillBusy) {
        setError("Este horário foi reservado por outra pessoa enquanto você finalizava. Por favor, escolha outro horário.");
        setIsBooking(false);
        setStep(3); // Go back to calendar
        return;
    }

    setError(null);
    setIsBooking(true);
    if (finalDate < new Date()) {
        setError("Este horário já passou.");
        setIsBooking(false);
        return;
    }
    try {
      const service = services.find(s => s.id === selectedService);
      const barber = barbers.find(b => b.id === selectedBarber);
      const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const cleanPhone = guestPhone.replace(/\D/g, '');
      let effectiveClientId = user && !isStaffBooking ? (user.uid || user.id) : (cleanPhone || "guest");
      const clientNameData = user && !isStaffBooking ? (user.displayName || user.name) : guestName;
      const clientEmailData = user && !isStaffBooking ? user.email : guestEmail;
      const clientPhotoData = user && !isStaffBooking ? (user.photoURL || user.photoUrl) : null;

      const baseData = {
        clientId: effectiveClientId,
        clientName: clientNameData,
        clientEmail: clientEmailData,
        clientPhone: guestPhone,
        barberId: selectedBarber,
        barberName: barber?.name,
        serviceId: selectedService,
        serviceName: service?.name,
        serviceDuration: customDuration || service?.duration || 30,
        clientPhoto: clientPhotoData,
        status: "pending",
        totalPrice: (Number(service?.price) || 0) * (1 - appliedDiscount / 100),
        createdAt: serverTimestamp(),
        couponCode: couponCode || null,
        loginCode
      };
      
      const isEditing = !!editAppointment;
      if (isEditing) {
        await updateDoc(doc(db, "appointments", editAppointment.id), {
          ...baseData,
          date: Timestamp.fromDate(finalDate),
          time: selectedTime,
          updatedAt: serverTimestamp(),
          rescheduledBy: isStaffBooking ? 'staff' : 'client'
        });
      } else {
        await addDoc(collection(db, "appointments"), {
          ...baseData,
          date: Timestamp.fromDate(finalDate),
          time: selectedTime
        });

        // Ensure user exists for later login with phone
        if ((!user || isStaffBooking) && guestPhone) {
          const userRef = doc(db, "users", cleanPhone);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
             await setDoc(userRef, {
               uid: cleanPhone,
               name: guestName,
               whatsapp: cleanPhone,
               role: "client",
               password: "123456",
               createdAt: serverTimestamp()
             });
          }
        }
      }

      // WhatsApp notification (Optional: might fail if popup blocked)
      try {
        const dateFormatted = format(finalDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const text = `Agendamento realizado! Serviço: ${service?.name}, Data: ${dateFormatted}. Código: ${loginCode}`;
        const url = `https://wa.me/${guestPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      } catch (e) {
        console.warn("Could not open WhatsApp popup", e);
      }

      setShowConfirmation(true);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, "appointments");
      setError("Erro ao processar agendamento. Verifique sua conexão ou permissões.");
    } finally {
      setIsBooking(false);
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return "Escolha o Serviço";
      case 2: return "Escolha o Barbeiro";
      case 3: return "Data e Horário";
      case 4: return "Confirmar Agendamento";
      default: return "Agendamento";
    }
  };

  return (
    <>
    <AnimatePresence>
      {showConfirmation && (
        <ConfirmationModal 
          service={services.find(s => s.id === selectedService)}
          date={(() => {
            const [h, m] = (selectedTime || "00:00").split(':').map(Number);
            const d = new Date(selectedDate);
            d.setHours(h, m, 0, 0);
            return d.toISOString();
          })()}
          onConfirm={onBack}
        />
      )}
    </AnimatePresence>
    
    <div className="min-h-screen bg-black pb-20">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto py-8 px-6"
      >
        <div className="flex items-center justify-between mb-10">
          <button onClick={step === 1 ? onBack : () => setStep(step - 1)} className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-amber-500 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">{getStepTitle()}</h2>
            <div className="flex justify-center gap-1.5 mt-2">
              {[1,2,3,4].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step >= s ? "w-6 bg-amber-500" : "w-1.5 bg-neutral-800"}`} />
              ))}
            </div>
          </div>
          <div className="w-10" />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="grid gap-3">
                  {services.filter(s => s.active !== false).map(s => (
                    <button key={s.id} onClick={() => { setSelectedService(s.id); setCustomDuration(s.duration || 30); setStep(2); }} className={`group p-6 rounded-[2rem] border text-left transition-all relative overflow-hidden ${selectedService === s.id ? 'border-amber-500 bg-neutral-900 shadow-2xl shadow-amber-500/20' : 'border-white/5 bg-neutral-900/50 hover:border-white/10'}`}>
                      <div className="flex justify-between items-center relative z-10">
                        <div className="space-y-1">
                          <h4 className="font-black text-white text-lg uppercase italic tracking-tight">{s.name}</h4>
                          <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase">
                            <Clock className="w-3.5 h-3.5" /> {s.duration} min
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl transition-all ${selectedService === s.id ? 'bg-amber-500 text-black' : 'bg-white/5 text-amber-500 font-black'}`}>
                            <span className="text-sm font-black italic">R${s.price}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                <div className="grid gap-4">
                    {barbers.length === 0 ? (
                      <div className="py-20 text-center space-y-4 bg-neutral-900/50 rounded-[2.5rem] border border-dashed border-white/10">
                        <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-neutral-600">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Buscando profissionais...</p>
                        <p className="text-[10px] text-amber-500 px-6">Se demorar, verifique se há colaboradores cadastrados no menu de gestão.</p>
                      </div>
                    ) : (
                      barbers.map(b => (
                          <button key={b.id} onClick={() => { setSelectedBarber(b.id); setStep(3); }} className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all group ${selectedBarber === b.id ? 'border-amber-500 bg-neutral-900 shadow-2xl shadow-amber-500/20' : 'border-white/5 bg-neutral-900/50 hover:border-white/10'}`}>
                              <div className="flex items-center gap-4">
                                <img src={b.photoURL || `https://ui-avatars.com/api/?name=${b.name}`} className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-white/10" alt={b.name} />
                                <div className="text-left">
                                  <h4 className="font-black text-white text-lg tracking-tight">{b.name}</h4>
                                  <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Especialista</p>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-neutral-700" />
                          </button>
                      ))
                    )}
                </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                {(role === 'manager' || role === 'barber') && (
                    <div className="bg-neutral-900 border border-amber-500/30 p-4 rounded-[2rem] flex flex-col gap-2">
                        <span className="text-xs font-black uppercase text-amber-500 tracking-widest pl-2">Duração do Serviço (Minutos)</span>
                        <input type="number" step="10" min="10" className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold" value={customDuration} onChange={e => {setCustomDuration(Number(e.target.value)); setSelectedTime(null);}} />
                    </div>
                )}
                <div className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const day = addDays(new Date(), i);
                      const active = isSameDay(day, selectedDate);
                      return (
                        <button key={i} onClick={() => { setSelectedDate(day); setSelectedTime(null); }} className={`flex flex-col items-center min-w-[64px] py-4 rounded-3xl transition-all border ${active ? "bg-amber-500 border-amber-500 text-black" : "bg-neutral-900 border-white/5 text-neutral-500"}`}>
                          <span className="text-[10px] font-black uppercase mb-1">{format(day, "EEE", { locale: ptBR })}</span>
                          <span className="text-base font-black">{format(day, "d")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map(({ time, available }) => (
                    <button key={time} disabled={!available} onClick={() => setSelectedTime(time)} className={`py-4 rounded-2xl text-sm font-black transition-all border ${selectedTime === time ? "bg-amber-500 border-amber-500 text-black" : available ? "bg-neutral-900 border-white/5 text-white" : "bg-neutral-900/30 border-transparent text-neutral-700 opacity-50"}`}>
                      {time}
                    </button>
                  ))}
                </div>
                <RecurrenceUI userRole={user?.role || 'client'} recurrence={recurrence} setRecurrence={setRecurrence} />
                <button disabled={!selectedTime} onClick={() => setStep(4)} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-2">Próximo Passo <ChevronRight className="w-4 h-4" /></button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
                 {(!user || role === 'manager' || role === 'barber') && (
                    <div className="bg-neutral-900 p-6 rounded-[2rem] border border-white/5 space-y-3">
                       <input placeholder="Nome do Cliente" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white" value={guestName} onChange={e => setGuestName(e.target.value)} />
                       <input placeholder="WhatsApp do Cliente" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
                       <input placeholder="E-mail (opcional)" className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
                    </div>
                )}
                <div className="bg-neutral-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                   <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-neutral-500 font-bold uppercase text-[10px]">Procedimento</span>
                      <span className="font-black text-white italic uppercase">{services.find(s => s.id === selectedService)?.name}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                      <span className="text-neutral-500 font-black uppercase text-base">Total</span>
                      <span className="text-3xl font-black text-white">R${services.find(s => s.id === selectedService)?.price}</span>
                   </div>
                </div>
                {error && <p className="text-red-500 text-center font-bold">{error}</p>}
                <button disabled={isBooking} onClick={handleConfirmBooking} className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest active:scale-95 disabled:opacity-50 text-xl">{isBooking ? "AGENDANDO..." : 'FINALIZAR AGENDAMENTO'}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
    </>
  );
}
