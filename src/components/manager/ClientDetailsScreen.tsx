import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Calendar, Scissors, Clock, Star, MessageSquare, Repeat, Phone, Mail, Gift, DollarSign, User, Award, Zap, CalendarCheck, Edit3, Save } from "lucide-react";
import { collection, query, onSnapshot, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ClientDetailsScreen({ client, onBack, onScheduleClient, onMessageClient }: { client: any, onBack: () => void, onScheduleClient?: (client: any) => void, onMessageClient?: (client: any) => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState(client?.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const handleSaveNotes = async () => {
    if (!client?.uid && !client?.id) return;
    const clientId = client.uid || client.id;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, "users", clientId), {
        notes: notes
      });
      toast.success("Observações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Erro ao salvar observações");
    } finally {
      setIsSavingNotes(false);
    }
  };

  useEffect(() => {
    // Listen to all appointments to filter details accurately by many fields
    const q = query(collection(db, "appointments"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const getAppDate = (app: any) => {
    if (!app.date) return new Date(0);
    if (app.date instanceof Timestamp) {
      return app.date.toDate();
    }
    if (app.date.toDate && typeof app.date.toDate === "function") {
      return app.date.toDate();
    }
    if (app.date instanceof Date) {
      return app.date;
    }
    if (typeof app.date === "string") {
      return parseISO(app.date);
    }
    return new Date(app.date);
  };

  const getClientCreatedDate = () => {
    if (!client?.createdAt) return null;
    if (client.createdAt instanceof Timestamp) return client.createdAt.toDate();
    if (client.createdAt.toDate && typeof client.createdAt.toDate === "function") return client.createdAt.toDate();
    return new Date(client.createdAt);
  };

  // Filter appointments of this client
  const clientAppointments = useMemo(() => {
    return appointments.filter(app => {
      const cleanPhoneApp = (app.clientPhone || "").replace(/\D/g, "");
      const cleanPhoneCli = (client.whatsapp || "").replace(/\D/g, "");
      
      const isIdMatch = app.clientId && (app.clientId === client.id || app.clientId === client.uid);
      const isPhoneMatch = cleanPhoneCli && cleanPhoneApp && (cleanPhoneCli === cleanPhoneApp || cleanPhoneCli.endsWith(cleanPhoneApp) || cleanPhoneApp.endsWith(cleanPhoneCli));
      const isEmailMatch = client.email && app.clientEmail && (client.email.toLowerCase() === app.clientEmail.toLowerCase());

      return isIdMatch || isPhoneMatch || isEmailMatch;
    });
  }, [appointments, client]);

  // Sort client appointments by date (newest first)
  const sortedClientApps = useMemo(() => {
    return [...clientAppointments].sort((a, b) => getAppDate(b).getTime() - getAppDate(a).getTime());
  }, [clientAppointments]);

  const completedAppointments = useMemo(() => {
    return sortedClientApps.filter(a => a.status === 'completed');
  }, [sortedClientApps]);

  // Total investment computed dynamically
  const totalSpent = useMemo(() => {
    return completedAppointments.reduce((sum, app) => {
      const priceStr = app.price || app.totalPrice || "0";
      const cleaned = parseFloat(String(priceStr).replace(",", "."));
      return sum + (isNaN(cleaned) ? 0 : cleaned);
    }, 0);
  }, [completedAppointments]);

  // Find last visit including pending and cancelled, or just completed
  const now = new Date();
  const pastApps = useMemo(() => {
    return sortedClientApps.filter(app => getAppDate(app) < now);
  }, [sortedClientApps, now]);

  const lastApp = pastApps[0];

  const createdDate = getClientCreatedDate();
  const yearsCustomerString = useMemo(() => {
    if (!createdDate) return "Cliente recém-chegado";
    const diffMs = new Date().getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `Cliente há ${diffDays} dias`;
    }
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `Cliente há ${diffMonths} ${diffMonths === 1 ? "mês" : "meses"}`;
    }
    const diffYears = Math.floor(diffMonths / 12);
    return `Cliente há ${diffYears} ${diffYears === 1 ? "ano" : "anos"}`;
  }, [createdDate]);

  const cleanedPhone = (client.whatsapp || "").replace(/\D/g, "");
  const waUrl = cleanedPhone ? `https://wa.me/55${cleanedPhone}` : null;

  // CRM client ranks
  const completedCount = completedAppointments.length;
  let rank = { name: "Bronze Inicial 🥉", color: "bg-neutral-800 text-neutral-300 border border-white/10" };
  if (completedCount >= 15) {
    rank = { name: "Diamante Negro 💎", color: "bg-red-500/10 text-red-400 border-red-500/20" };
  } else if (completedCount >= 9) {
    rank = { name: "Ouro VIP 🏆", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
  } else if (completedCount >= 4) {
    rank = { name: "Prata Premium ⚔️", color: "bg-neutral-300/10 text-neutral-300 border border-white/10" };
  }

  // Upcoming appointment
  const upcomingApp = useMemo(() => {
    return sortedClientApps.find(app => getAppDate(app) >= now && app.status !== "cancelled");
  }, [sortedClientApps, now]);

  // Return Recommendation estimation (25 days after last completed visitation)
  const revisitRecommendation = useMemo(() => {
    const lastCompleted = sortedClientApps.find(app => app.status === "completed");
    if (!lastCompleted) return null;
    const lastDate = getAppDate(lastCompleted);
    const recDate = new Date(lastDate);
    recDate.setDate(recDate.getDate() + 25);
    const diffDays = differenceInDays(recDate, now);
    return {
      date: recDate,
      daysLeft: diffDays,
      isOverdue: diffDays < 0
    };
  }, [sortedClientApps, now]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-4xl mx-auto py-8 px-4"
    >
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="liquid-glass flex items-center gap-2 text-neutral-500 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-2xl cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-amber-500" />
          Voltar
        </button>

        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2.5 rounded-2xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500 animate-pulse" /> WhatsApp Direto
          </a>
        )}
      </div>

      {/* Main Glass Profile Card */}
      <div className="relative overflow-hidden liquid-glass backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem]  mb-8 shadow-2xl">
         <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
         
         <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="liquid-glass w-24 h-24 rounded-3xl flex items-center justify-center text-neutral-500 font-bold overflow-hidden shrink-0 shadow-lg">
              {client.photoURL ? (
                <img src={client.photoURL} alt={client.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-10 h-10 text-neutral-600" />
              )}
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">{client.name || "Cliente Sem Nome"}</h2>
                <span className={`px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider ${rank.color} inline-block self-start sm:self-auto`}>
                  {rank.name}
                </span>
              </div>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-neutral-400 text-xs">
                {client.whatsapp && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide liquid-glass px-3 py-1.5 rounded-xl ">
                    <Phone className="w-3.5 h-3.5 text-amber-500" /> {client.whatsapp}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide liquid-glass px-3 py-1.5 rounded-xl ">
                    <Mail className="w-3.5 h-3.5 text-amber-500" /> {client.email}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full">
                  {yearsCustomerString} {createdDate && `• Desde ${format(createdDate, "dd/MM/yyyy")}`}
                </span>
              </div>
            </div>
         </div>

         {/* Client quick details section with statistics grids */}
         <div className={`grid grid-cols-2 ${(client.walletBalance !== undefined && Number(client.walletBalance) > 0) ? 'lg:grid-cols-5' : 'md:grid-cols-4'} gap-4 mt-8 pt-6 border-t border-white/5`}>
            <div className=" liquid-glass  p-4 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block">Saldo Fidelidade</span>
              <p className="text-xl font-black text-amber-500 flex items-center gap-1">
                <Gift className="w-4 h-4" />
                R$ {client.loyaltyBalance !== undefined ? client.loyaltyBalance.toFixed(2) : "0,00"}
              </p>
            </div>

            {client.walletBalance !== undefined && Number(client.walletBalance) > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-left space-y-1">
                <span className="text-[8px] text-emerald-400 uppercase font-black tracking-widest block">Saldo Resgate (Carteira)</span>
                <p className="text-xl font-black text-emerald-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  R$ {Number(client.walletBalance).toFixed(2)}
                </p>
              </div>
            )}

            <div className=" liquid-glass  p-4 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block">Total Gasto</span>
              <p className="text-xl font-black text-white flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                R$ {totalSpent.toFixed(2)}
              </p>
            </div>

            <div className=" liquid-glass  p-4 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block">Cortes Concluídos</span>
              <p className="text-xl font-black text-white flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-amber-500" />
                {completedAppointments.length}
              </p>
            </div>

            <div className=" liquid-glass  p-4 rounded-2xl text-left space-y-1 col-span-2 md:col-span-1">
              <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block">Última Visita</span>
              {lastApp ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-white uppercase tracking-tight truncate leading-tight">
                    {format(getAppDate(lastApp), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="text-[8px] text-neutral-500 font-extrabold uppercase truncate tracking-tight">
                    {lastApp.serviceName || "Corte"}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-black text-neutral-600 uppercase tracking-widest italic py-0.5">Sem Visitas</p>
              )}
            </div>
         </div>

         {/* CRM Notifications and alert bars */}
         {(upcomingApp || revisitRecommendation) && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
              {upcomingApp && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between text-left">
                  <div className="space-y-1">
                    <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest block flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5" /> AGENDAMENTO FUTURO DETECTADO
                    </span>
                    <p className="text-sm font-black text-white uppercase">
                      {format(getAppDate(upcomingApp), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase">
                      Serviço: {upcomingApp.serviceName} com {upcomingApp.barberName}
                    </p>
                  </div>
                  <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-wider shrink-0 self-start">
                    Confirmado
                  </span>
                </div>
              )}

              {revisitRecommendation && (
                <div className=" liquid-glass  p-4 rounded-2xl flex items-center justify-between text-left">
                  <div className="space-y-1">
                    <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> PREVISÃO DE PRÓXIMO RETORNO
                    </span>
                    <p className="text-sm font-black text-white uppercase">
                      {format(revisitRecommendation.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase">
                      Estimado em um ciclo recomendado de 25 dias pós-corte
                    </p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl tracking-wider text-center shrink-0 self-start ${
                    revisitRecommendation.isOverdue 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" 
                      : "bg-neutral-800 text-neutral-400 border border-white/5"
                  }`}>
                    {revisitRecommendation.isOverdue 
                      ? `Atrasado ${Math.abs(revisitRecommendation.daysLeft)}d` 
                      : `Falta ${revisitRecommendation.daysLeft}d`}
                  </span>
                </div>
              )}
           </div>
         )}

         {/* Interative Buttons of profile */}
         <div className="flex flex-wrap gap-3 mt-6">
              <button 
                onClick={() => onMessageClient?.(client)}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                  <MessageSquare className="w-4 h-4 shrink-0" /> Chat do Portal
              </button>
              {onScheduleClient && (
                <button 
                  onClick={() => onScheduleClient(client)}
                  className="liquid-glass flex items-center gap-2  text-white  px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                >
                    <Repeat className="w-4 h-4 text-amber-500 shrink-0" /> Agendar Novo Corte
                </button>
              )}
         </div>
      </div>

      {/* Client Notes Section */}
      <div className="relative overflow-hidden liquid-glass backdrop-blur-md p-6 sm:p-8 rounded-[2.5rem] mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Observações Internas</h3>
          </div>
          <button
            onClick={handleSaveNotes}
            disabled={isSavingNotes || notes === (client?.notes || "")}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-4">
          Adicione preferências, histórico de química ou detalhes importantes (visível apenas para a equipe)
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: Prefere degradê navalhado, alergia a gilete..."
          className="w-full bg-neutral-900/50 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 min-h-[120px] resize-y"
        />
      </div>

      {/* History and details segment */}
      <div className="text-left space-y-1 mb-4">
        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Histórico de Cortes no Sistema</h3>
        <p className="text-neutral-500 text-[9px] font-black uppercase tracking-widest">Acompanhe todos os agendamentos anteriores e feedbacks realizados no app</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {sortedClientApps.map(app => {
            const dateVal = getAppDate(app);
            return (
              <div key={app.id} className=" liquid-glass p-5 rounded-[2rem]  flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-amber-500/20 transition-all">
                 <div className="flex items-start sm:items-center gap-4 text-left">
                    <div className="relative">
                      <div className="liquid-glass p-4 rounded-2xl text-neutral-400  group-hover:text-amber-500 transition-colors shrink-0">
                        <Scissors className="w-5 h-5" />
                      </div>
                      {app.reviewPhotoUrl && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-amber-500 border-2 border-neutral-900 flex items-center justify-center shadow">
                          <Star className="w-3 h-3 text-black fill-black" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-extrabold text-white text-sm uppercase italic tracking-tight">{app.serviceName}</p>
                        {app.rating && (
                            <div className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span className="text-[8px] font-black text-amber-400">{app.rating}</span>
                            </div>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${
                          app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          app.status === 'confirmed' ? 'bg-amber-500/10 text-amber-400' :
                          app.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {app.status === "completed" ? "Concluido" :
                           app.status === "confirmed" ? "Agendado" :
                           app.status === "cancelled" ? "Cancelado" : "Status Especial"}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5 label">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        {format(dateVal, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-wider mt-0.5">
                        Profissional: <span className="text-white font-black capitalize">{app.barberName || "Profissional"}</span>
                      </p>
                      {app.notes && (
                        <p className="text-[10px] text-neutral-500 liquid-glass  px-2.5 py-1.5 rounded-xl mt-1.5 italic font-medium">
                          Obs: {app.notes}
                        </p>
                      )}
                    </div>
                 </div>
                 
                 {app.reviewPhotoUrl && (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 hover:scale-110 transition-transform shrink-0 self-start sm:self-center shadow">
                      <img src={app.reviewPhotoUrl} className="w-full h-full object-cover" alt="Review Photo" />
                  </div>
                 )}
              </div>
            );
          })}
          {sortedClientApps.length === 0 && (
            <div className="text-center py-20 liquid-glass rounded-[2rem]  space-y-1">
              <p className="text-neutral-500 text-sm font-black uppercase tracking-widest">Nenhum atendimento realizado ainda</p>
              <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">O histórico de agendamentos está sincronizado em tempo real</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
