import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, ChevronRight, User, Phone, Mail, MessageSquare, CalendarPlus, Users, Award, Zap, CalendarCheck } from "lucide-react";
import { collection, query, where, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ClientsScreen({ onBack, onScheduleClient, onClientClick, user, role }: { onBack: () => void, onScheduleClient?: (client: any) => void, onClientClick?: (client: any) => void, key?: any, user: any, role: string }) {
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (role === 'developer') {
      setClients([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "users"), where("role", "==", "client"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, [role]);

  useEffect(() => {
    let qApps;
    if (role === 'barber' || role === 'developer') {
      qApps = query(collection(db, "appointments"), where("barberId", "==", user.uid));
    } else {
      qApps = query(collection(db, "appointments"));
    }
    const unsubscribeApps = onSnapshot(qApps, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Failed to fetch appointments in ClientsScreen:", error);
    });
    return () => unsubscribeApps();
  }, [user, role]);

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

  const filteredClients = clients.filter(client => 
    (client.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.whatsapp || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-5xl mx-auto py-8 px-4"
    >
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500">
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Administração</span>
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
            Clientes
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black italic px-3 py-1 rounded-full uppercase tracking-widest">
              {filteredClients.length} Ativos
            </span>
          </h2>
        </div>

        {/* Real-time search with glass styling */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder="BUSCAR CLIENTE NO BANCO..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full liquid-glass  rounded-full pl-12 pr-4 py-3 text-xs text-white uppercase font-black tracking-widest placeholder:text-neutral-600 outline-none focus:border-amber-500 focus:bg-white/[0.04] transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredClients.length === 0 ? (
              <div className="col-span-full text-center py-20 liquid-glass rounded-[2.5rem]  space-y-2">
                <p className="text-neutral-500 text-sm font-black uppercase tracking-widest">Nenhum cliente cadastrado correspondente</p>
                <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Os dados de usuários estão sincronizados em tempo real com o Firestore</p>
              </div>
            ) : (
              filteredClients.map((client, index) => {
                // Strip non-digits from phone for WhatsApp redirect
                const cleanedPhone = (client.whatsapp || "").replace(/\D/g, "");
                const waUrl = cleanedPhone ? `https://wa.me/55${cleanedPhone}` : null;

                // Find client's appointments
                const clientApps = appointments.filter(app => {
                  const cleanPhoneApp = (app.clientPhone || "").replace(/\D/g, "");
                  const cleanPhoneCli = (client.whatsapp || "").replace(/\D/g, "");
                  
                  const isIdMatch = app.clientId && (app.clientId === client.id || app.clientId === client.uid);
                  const isPhoneMatch = cleanPhoneCli && cleanPhoneApp && (cleanPhoneCli === cleanPhoneApp || cleanPhoneCli.endsWith(cleanPhoneApp) || cleanPhoneApp.endsWith(cleanPhoneCli));
                  const isEmailMatch = client.email && app.clientEmail && (client.email.toLowerCase() === app.clientEmail.toLowerCase());

                  return isIdMatch || isPhoneMatch || isEmailMatch;
                });

                // Completed cuts
                const completedCount = clientApps.filter(app => app.status === "completed").length;

                // CRM Client Ranks
                let rank = { name: "Bronze Inicial 🥉", color: "bg-neutral-800 text-neutral-300 border border-white/10" };
                if (completedCount >= 15) {
                  rank = { name: "Diamante Negro 💎", color: "bg-red-500/10 text-red-400 border border-red-500/20" };
                } else if (completedCount >= 9) {
                  rank = { name: "Ouro VIP 🏆", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
                } else if (completedCount >= 4) {
                  rank = { name: "Prata Premium ⚔️", color: "bg-neutral-300/10 text-neutral-300 border border-white/10" };
                }

                // Sort client appointments by date (most recent first)
                const now = new Date();
                const pastApps = clientApps.filter(app => getAppDate(app) < now);
                const sortedPast = [...pastApps].sort((a, b) => getAppDate(b).getTime() - getAppDate(a).getTime());
                const lastApp = sortedPast[0];

                // Upcoming appointment calculation
                const upcomingApp = clientApps.find(app => getAppDate(app) >= now && app.status !== "cancelled");

                // Return recommender prediction (25 day frequency cycle since last completed visit)
                const lastCompletedApp = sortedPast.find(app => app.status === "completed");
                let revisitRecommendation = null;
                if (lastCompletedApp) {
                  const lastDate = getAppDate(lastCompletedApp);
                  const recDate = new Date(lastDate);
                  recDate.setDate(recDate.getDate() + 25);
                  const diffDays = differenceInDays(recDate, now);
                  revisitRecommendation = {
                    date: recDate,
                    daysLeft: diffDays,
                    isOverdue: diffDays < 0
                  };
                }

                return (
                  <motion.div 
                    id={`client-card-${client.id}`}
                    key={client.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    onClick={() => onClientClick?.(client)} 
                    className="group relative overflow-hidden liquid-glass backdrop-blur-md p-5 rounded-[2.5rem]  flex flex-col justify-between hover:border-amber-500/30 hover:bg-white/[0.06] transition-all duration-300 cursor-pointer shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] animate-fade-in"
                  >
                    {/* Visual Card Accents */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />

                    <div className="space-y-4">
                      {/* Avatar + Basic Data */}
                      <div className="flex items-center gap-4">
                        <div className="liquid-glass relative w-14 h-14 rounded-2xl flex items-center justify-center text-neutral-500 font-bold overflow-hidden shrink-0 group-hover:-amber-500/30 transition-colors">
                          {client.photoURL ? (
                            <img 
                              src={client.photoURL} 
                              alt={client.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="w-6 h-6 text-neutral-600" />
                          )}
                        </div>

                        <div className="text-left space-y-1">
                          <div className="flex flex-col gap-0.5">
                            <h4 className="font-black text-sm text-white uppercase italic tracking-tight group-hover:text-amber-500 transition-colors leading-tight">
                              {client.name || "Sem Nome"}
                            </h4>
                            <div className="flex">
                              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider ${rank.color}`}>
                                {rank.name}
                              </span>
                            </div>
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-neutral-500 text-[10px]">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[140px] font-medium">{client.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact Badges Info */}
                      <div className="space-y-1.5">
                        {client.whatsapp && (
                          <div className="flex items-center justify-between liquid-glass  py-1.5 pl-3 pr-2.5 rounded-xl">
                            <span className="text-[10px] text-neutral-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-500" /> WhatsApp
                            </span>
                            <span className="text-white text-[10px] font-black tracking-tight">{client.whatsapp}</span>
                          </div>
                        )}
                        
                        {/* Optional balance or loyalty placeholder */}
                        <div className="flex flex-col gap-1.5 liquid-glass  py-2 px-3 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-neutral-500 uppercase font-black tracking-widest">Saldo Fidelidade</span>
                            <span className="text-amber-500 text-[10px] font-black">
                              R$ {(client.loyaltyBalance !== undefined) ? client.loyaltyBalance.toFixed(2) : "0,00"}
                            </span>
                          </div>
                          {client.walletBalance !== undefined && Number(client.walletBalance) > 0 && (
                            <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                              <span className="text-[9px] text-emerald-500 uppercase font-black tracking-widest">Saldo Resgate (Carteira)</span>
                              <span className="text-emerald-400 text-[10px] font-black">
                                R$ {Number(client.walletBalance).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Recent appointment details */}
                        <div className=" liquid-glass  py-2 px-3 rounded-xl flex flex-col gap-1 text-left">
                          <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block">Última Visita</span>
                          {lastApp ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-white text-[10px] font-black uppercase tracking-tight">
                                  {format(getAppDate(lastApp), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  lastApp.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                                  lastApp.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                                  "bg-amber-500/10 text-amber-500"
                                }`}>
                                  {lastApp.status === "completed" ? "Concluído" :
                                   lastApp.status === "cancelled" ? "Cancelado" : "Pendente/Agendado"}
                                </span>
                              </div>
                              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-tight truncate leading-tight">
                                {lastApp.serviceName || "Serviço"} com {lastApp.barberName || "Profissional"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-neutral-600 text-[9px] font-extrabold uppercase italic tracking-wider py-0.5 block">
                              Nenhum histórico no sistema
                            </span>
                          )}
                        </div>

                        {/* Smart CRM upcoming actions / dynamic recomender */}
                        {upcomingApp ? (
                          <div className="bg-amber-500/10 border border-amber-500/20 py-2.5 px-3 rounded-xl flex items-center justify-between text-left">
                            <div className="space-y-0.5">
                              <span className="text-[7.5px] text-amber-500 uppercase font-black tracking-widest block flex items-center gap-1">
                                <CalendarCheck className="w-3 h-3 text-amber-500" /> CORTE AGENDADO
                              </span>
                              <span className="text-white text-[10px] font-black uppercase">
                                {format(getAppDate(upcomingApp), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <span className="bg-amber-500 text-black text-[7px] font-black uppercase px-2 py-0.5 rounded-md">
                              RESERVADO
                            </span>
                          </div>
                        ) : revisitRecommendation ? (
                          <div className=" liquid-glass  py-2.5 px-3 rounded-xl flex items-center justify-between text-left">
                            <div className="space-y-0.5">
                              <span className="text-[7px] text-neutral-500 uppercase font-black tracking-widest block flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500" /> RETORNO INDICADO
                              </span>
                              <span className="text-neutral-300 text-[9px] font-extrabold uppercase">
                                {format(revisitRecommendation.date, "dd 'de' MMMM", { locale: ptBR })}
                              </span>
                            </div>
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                              revisitRecommendation.isOverdue 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" 
                                : "bg-neutral-800 text-neutral-400 border border-white/5"
                            }`}>
                              {revisitRecommendation.isOverdue 
                                ? `Atrasado ${Math.abs(revisitRecommendation.daysLeft)}d` 
                                : `Faltam ${revisitRecommendation.daysLeft}d`}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-white/5">
                      {/* WhatsApp redirect button if phone exists */}
                      {waUrl ? (
                        <a 
                          id={`btn-wa-${client.id}`}
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl transition-all"
                          title="Conversar no WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <div className="w-9" />
                      )}

                      <div className="flex items-center gap-1.5">
                        {onScheduleClient && (
                          <button 
                            id={`btn-schedule-${client.id}`}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onScheduleClient(client); 
                            }}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-[9px] uppercase tracking-wider rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1.5"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            Agendar
                          </button>
                        )}
                        <button 
                          id={`btn-details-${client.id}`}
                          className="liquid-glass p-2 text-neutral-500 hover:text-white   transition-all rounded-xl cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

