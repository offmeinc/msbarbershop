import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Timestamp, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { 
  Calendar, 
  CalendarCheck, 
  CalendarX, 
  BellOff, 
  ChevronLeft, 
  BellRing, 
  Wallet, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Loader2, 
  Trash2, 
  Ban, 
  Coins, 
  Bell, 
  Info,
  ListFilter
} from "lucide-react";
import { setupPushSubscription, getNotificationPermissionState } from "../lib/pushRegister";
import { db } from "../lib/firebase";
import { toast } from "./ui/Toast";

interface NotificationsScreenProps {
  notifications: any[];
  appointments: any[];
  onBack: () => void;
  onClear: () => void;
  user?: any;
}

type FilterType = "all" | "unread" | "bookings" | "financial";

export const NotificationsScreen = ({ notifications, appointments, onBack, onClear, user }: NotificationsScreenProps) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'history'>('recent');
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [pushState, setPushState] = useState<NotificationPermission | "unsupported">("default");
  const [markingIds, setMarkingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  useEffect(() => {
    if (pushState === "default") {
      setPushState(getNotificationPermissionState());
    }
  }, [pushState]);

  const history = useMemo(() => {
    return appointments
      .sort((a,b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 15);
  }, [appointments]);

  // Mark a single notification as read
  const handleMarkAsRead = async (id: string) => {
    setMarkingIds(prev => [...prev, id]);
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Erro ao atualizar status da notificação.");
    } finally {
      setMarkingIds(prev => prev.filter(mid => mid !== id));
    }
  };

  // Delete a single notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card-level actions
    setDeletingIds(prev => [...prev, id]);
    try {
      await deleteDoc(doc(db, "notifications", id));
      toast.success("Notificação removida.");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Erro ao excluir notificação.");
    } finally {
      setDeletingIds(prev => prev.filter(did => did !== id));
    }
  };

  // Mark all listed/filtered recent notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
      toast.info("Não há notificações não lidas.");
      return;
    }

    try {
      const batch = unreadNotifications.map(n => 
        updateDoc(doc(db, "notifications", n.id), { read: true })
      );
      await Promise.all(batch);
      toast.success("Todas as notificações marcadas como lidas! ✨");
    } catch (error) {
      console.error("Error marking all read:", error);
      toast.error("Erro ao limpar e atualizar notificações.");
    }
  };

  // Apply visual category filtering to the dynamic feed list
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filterType === "unread") return !n.read;
      if (filterType === "bookings") return n.type === 'booking' || n.type === 'status_update' || n.type === 'cancellation';
      if (filterType === "financial") return n.type === 'recharge';
      return true; // "all"
    });
  }, [notifications, filterType]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md mx-auto py-8 px-5 min-h-screen pb-32"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-neutral-900 border border-white/5 rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-amber-500" />
          </button>
          <div className="text-left">
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Notificações</h2>
            <span className="text-[8px] text-neutral-500 font-black uppercase tracking-widest leading-none">Central de Avisos</span>
          </div>
        </div>

        {activeTab === 'recent' && notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[9px] text-neutral-400 hover:text-white font-extrabold uppercase tracking-widest bg-neutral-900 hover:bg-neutral-800 px-3 py-2 rounded-xl border border-white/5 hover:border-white/10 transition-all flex items-center gap-1.5"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-3.5 h-3.5 text-amber-500" />
                Lidas
              </button>
            )}
            <button 
              onClick={onClear}
              className="text-[9px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-widest bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/10 hover:border-red-500/20 transition-all"
            >
              Limpar Feed
            </button>
          </div>
        )}
      </div>

      {/* Tabs Selector: Recent (Push-feed notifications) vs History (Historic appointments) */}
      <div className="flex gap-1.5 p-1 bg-neutral-950 rounded-2xl mb-6 border border-white/5 shadow-inner">
        <button 
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'recent' 
              ? 'bg-amber-500 text-black shadow font-black' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5 shrink-0" />
          Mural de Avisos
          {unreadCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black border transition-all ${
              activeTab === 'recent' 
                ? 'bg-black text-amber-400 border-black' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
            }`}>
              {unreadCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history' 
              ? 'bg-amber-500 text-black shadow font-black' 
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          Ciclo de Atendimento
        </button>
      </div>

      {/* Web Push Invitation System Promo */}
      {pushState !== "granted" && pushState !== "unsupported" && activeTab === 'recent' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-[2rem] bg-gradient-to-r from-amber-500/10 to-amber-600/[0.02] border border-amber-500/20 text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500 shrink-0 text-black shadow-lg shadow-amber-500/20">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest block flex items-center gap-1.5 leading-none">
                <Sparkles className="w-3 h-3 text-amber-400" /> ALERTAS DIRETOS ATIVADOS
              </span>
              <h3 className="text-xs font-black text-white uppercase tracking-tight">Ative Alertas Push no Dispositivo</h3>
              <p className="text-[10px] text-neutral-400 font-semibold leading-relaxed">
                Receba lembretes automáticos de horários de corte e créditos em carteira instantaneamente.
              </p>
              
              <div className="pt-2">
                <button 
                  onClick={async () => {
                     const cleanId = user?.uid || user?.id || "anonymous";
                     const success = await setupPushSubscription(cleanId, "client");
                     if (success) {
                       setPushState("granted");
                       toast.success("Notificações em tempo real ativadas!");
                     } else {
                       toast.error("Não foi possível habilitar. Verifique se as permissões estão bloqueadas no navegador.");
                     }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow cursor-pointer"
                  disabled={pushState === "denied"}
                >
                  {pushState === "denied" ? "Bloqueado Compartilhamento" : "Habilitar Alertas Push"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter list options sub-banner - ONLY for modern updates */}
      {activeTab === 'recent' && notifications.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar scroll-smooth">
          <ListFilter className="w-3.5 h-3.5 text-neutral-500 shrink-0 mr-1" />
          
          <button
            onClick={() => setFilterType("all")}
            className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all shrink-0 ${
              filterType === "all"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Todas ({notifications.length})
          </button>
          
          <button
            onClick={() => setFilterType("unread")}
            className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all shrink-0 ${
              filterType === "unread"
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Não lidas ({unreadCount})
          </button>

          <button
            onClick={() => setFilterType("bookings")}
            className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all shrink-0 ${
              filterType === "bookings"
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Agendamentos
          </button>

          <button
            onClick={() => setFilterType("financial")}
            className={`text-[8.5px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all shrink-0 ${
              filterType === "financial"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Financeiro (Carteira)
          </button>
        </div>
      )}

      {/* Main Stream Area */}
      <div className="space-y-3">
        {activeTab === 'recent' ? (
          <div className="space-y-3.5">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((n, idx) => {
                const isUnread = !n.read;
                const isMarking = markingIds.includes(n.id);
                const isDeleting = deletingIds.includes(n.id);

                return (
                  <motion.div 
                    key={n.id} 
                    initial={{ opacity: 0, scale: 0.94, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -12 }}
                    whileHover={{ scale: 1.01, y: -2, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 220,
                      damping: 18,
                      delay: Math.min(idx * 0.025, 0.2) 
                    }}
                    onClick={() => isUnread && !isMarking && handleMarkAsRead(n.id)}
                    className={`text-left p-4 rounded-[2rem] border transition-all relative overflow-hidden group cursor-pointer ${
                      isUnread 
                        ? 'bg-neutral-900/90 border-amber-500/20 hover:border-amber-500/40 shadow-xl shadow-amber-500/[0.02]' 
                        : 'bg-neutral-900/30 border-white/5 opacity-65 hover:opacity-100 hover:border-white/10'
                    }`}
                  >
                    {/* Glowing highlight point on unread status */}
                    {isUnread && (
                      <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500 animate-pulse pointer-events-none" />
                    )}

                    <div className="flex gap-3.5">
                      {/* Interactive Visual Left Badge representing notification entity */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                        n.type === 'booking' ? 'bg-green-500/10 text-green-400 border-green-500/25' : 
                        n.type === 'status_update' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 
                        n.type === 'recharge' ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' :
                        n.type === 'cancellation' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                        'bg-neutral-505/10 text-neutral-400 border-white/10'
                      }`}>
                        {n.type === 'booking' ? <CalendarCheck className="w-5 h-5 font-bold" /> : 
                         n.type === 'status_update' ? <Calendar className="w-5 h-5" /> : 
                         n.type === 'recharge' ? <Coins className="w-5 h-5 text-emerald-400" /> :
                         n.type === 'cancellation' ? <CalendarX className="w-5 h-5" /> :
                         <Info className="w-5 h-5" />}
                      </div>

                      {/* Content side */}
                      <div className="flex-1 min-w-0 pr-4 space-y-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            n.type === 'booking' ? 'text-green-500' : 
                            n.type === 'status_update' ? 'text-amber-500' : 
                            n.type === 'recharge' ? 'text-blue-500' :
                            n.type === 'cancellation' ? 'text-rose-400' :
                            'text-neutral-400'
                          }`}>
                            {n.type === 'booking' ? '⚡ Novo Agendamento' : 
                             n.type === 'status_update' ? '🔄 Atualização' : 
                             n.type === 'recharge' ? '💰 Carteira Digital' :
                             n.type === 'cancellation' ? '🚫 Cancelamento' :
                             '📢 Alerta'}
                          </span>
                          
                          <span className="text-[8.5px] text-neutral-500 font-bold whitespace-nowrap">
                            {n.timestamp?.toDate ? format(n.timestamp.toDate(), "HH:mm • dd MMM", { locale: ptBR }) : "Agora"}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-neutral-200 leading-relaxed font-bold tracking-tight">
                          {n.message}
                        </p>

                        {/* Interactive footer details for read marking */}
                        {isUnread && (
                          <div className="pt-1.5 flex items-center gap-1 text-[8.5px] text-amber-500 font-black uppercase tracking-widest leading-none">
                            {isMarking ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3 h-3" />
                            )}
                            Toque para marcar como lida
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick remove trigger inside hover layout */}
                    <button
                      onClick={(e) => handleDeleteNotification(n.id, e)}
                      disabled={isDeleting}
                      className="absolute bottom-2.5 right-2 w-7 h-7 bg-black/40 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-neutral-500 hover:text-red-400 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
                      title="Excluir notificação permanently"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredNotifications.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-black/10 rounded-[2.5rem] border border-dashed border-white/5">
                <BellOff className="w-12 h-12 text-neutral-800 mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">Nenhuma notificação filtrada.</p>
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest leading-normal max-w-xs mx-auto">
                    Seu feed de novidades e confirmados está completamente livre de pendências.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {history.map((app, idx) => {
              const appDateObj = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
              
              return (
                <motion.div 
                  key={app.id} 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 220,
                    damping: 18,
                    delay: Math.min(idx * 0.03, 0.2) 
                  }}
                  className="p-4 rounded-[2rem] bg-neutral-950/40 border border-white/5 hover:border-white/10 flex items-center justify-between group transition-all text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${
                      app.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/15' : 
                      app.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/15' : 
                      'bg-amber-500/10 text-amber-400 border-amber-500/15 animate-pulse'
                    }`}>
                      {app.status === 'completed' ? <CheckCheck className="w-5 h-5" /> : 
                       app.status === 'cancelled' ? <Ban className="w-5 h-5" /> :
                       <Calendar className="w-5 h-5" />}
                    </div>
                    
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-white uppercase italic tracking-tight">{app.clientName || 'Cliente'}</h4>
                      <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest flex items-center gap-1">
                        <span className="text-amber-500">{app.serviceName}</span>
                        <span>•</span>
                        <span>{app.time}</span>
                        <span>•</span>
                        <span>{format(appDateObj, "dd 'de' MMM", { locale: ptBR })}</span>
                      </p>
                    </div>
                  </div>

                  <div className={`px-2.5 py-1.5 rounded-xl text-[7.5px] font-black uppercase tracking-widest shrink-0 ${
                    app.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                    app.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/10' : 
                    'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                  }`}>
                    {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                  </div>
                </motion.div>
              );
            })}

            {history.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-black/10 rounded-[2.5rem] border border-dashed border-white/5">
                <CalendarX className="w-12 h-12 text-neutral-800 mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">Nenhum histórico ativo.</p>
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">Nenhum atendimento processado no sistema até o momento.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
