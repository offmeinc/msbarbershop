import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { updateDoc, doc, Timestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { Scissors, Calendar, Clock, CheckCircle, XCircle, Star, ArrowLeft, Camera, Image as ImageIcon, X, Loader2, User, CalendarCheck, Heart, Sparkles, Maximize2, Trash2, Eye, Award, ThumbsUp, Check } from "lucide-react";
import { GOOGLE_REVIEW_URL } from "../../constants";
import { toast } from "../ui/Toast";

interface MyCutsScreenProps {
  user: any;
  appointments: any[];
  onBack: () => void;
  onBookAgain?: (serviceId: string, barberId: string) => void;
  onReschedule?: (app: any) => void;
  onCancel?: (app: any, reason?: string) => void;
}

export function MyCutsScreen({ user, appointments, onBack, onBookAgain, onReschedule, onCancel }: MyCutsScreenProps) {
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [portfolioCuts, setPortfolioCuts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [appToCancel, setAppToCancel] = useState<any | null>(null);
  const [cancelReasonTxt, setCancelReasonTxt] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [filterFavsOnly, setFilterFavsOnly] = useState<boolean>(false);
  const now = new Date();

  useEffect(() => {
    if (user?.favorites) {
      setFavorites(user.favorites);
    }
  }, [user]);

  const toggleFavorite = async (itemId: string) => {
    const userId = user?.uid || user?.id;
    if (!userId) return;

    const isFav = favorites.includes(itemId);
    const newFavs = isFav ? favorites.filter(id => id !== itemId) : [...favorites, itemId];
    
    setFavorites(newFavs);
    try {
      await updateDoc(doc(db, "users", userId), { favorites: newFavs });
    } catch (e) {
      console.error("Error updating favorites:", e);
    }
  };

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) return;

    const q = query(
      collection(db, "portfolio"),
      where("clientId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to make index creation optional
      const sorted = fetched.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      setPortfolioCuts(sorted);
    }, (err) => {
      console.error("[MyCutsScreen] Error fetching client portfolio cuts:", err);
    });

    return () => unsubscribe();
  }, [user]);
  
  const futureAppointments = appointments
    .filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate > now && app.status !== 'cancelled' && app.status !== 'completed';
    })
    .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateA.getTime() - dateB.getTime();
    });

  const pastAppointments = appointments
    .filter(app => {
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      return appDate <= now || app.status === 'cancelled' || app.status === 'completed';
    })
    .sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate() : (typeof a.date === 'string' ? parseISO(a.date) : a.date);
        const dateB = b.date instanceof Timestamp ? b.date.toDate() : (typeof b.date === 'string' ? parseISO(b.date) : b.date);
        return dateB.getTime() - dateA.getTime();
    });

  const handleRate = async (appointmentId: string, rating: number) => {
    setRatingLoading(appointmentId);
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { rating });
      toast.success("Avaliação enviada!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "appointments");
    } finally {
      setRatingLoading(null);
    }
  };

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, appointmentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFor(appointmentId);
    try {
      const { uploadImage } = await import('../../lib/uploadService');
      const data = await uploadImage(file);
      
      if (data.success) {
        await updateDoc(doc(db, "appointments", appointmentId), { 
          reviewPhotoUrl: data.data.url 
        });
        toast.success("Foto adicionada à avaliação!");
      } else {
        toast.error("Erro ao fazer upload.");
      }
    } catch (error) {
      toast.error("Erro na conexão.");
    } finally {
      setUploadingFor(null);
    }
  };

  const removeReviewPhoto = async (appointmentId: string) => {
    try {
      await updateDoc(doc(db, "appointments", appointmentId), { 
        reviewPhotoUrl: null 
      });
      toast.success("Foto removida.");
    } catch (error) {
      toast.error("Erro ao remover foto.");
    }
  };
  const totalCutsCount = useMemo(() => {
    return pastAppointments.filter(app => app.status === 'completed').length;
  }, [pastAppointments]);

  const favoriteCutsCount = useMemo(() => {
    return portfolioCuts.filter(item => favorites.includes(item.id)).length;
  }, [portfolioCuts, favorites]);

  const nextBookingInfo = useMemo(() => {
    if (futureAppointments.length === 0) return null;
    const nextApp = futureAppointments[0];
    const appDate = nextApp.date instanceof Timestamp ? nextApp.date.toDate() : (typeof nextApp.date === 'string' ? parseISO(nextApp.date) : nextApp.date);
    return {
      date: format(appDate, "dd/MM", { locale: ptBR }),
      time: nextApp.time,
      serviceName: nextApp.serviceName
    };
  }, [futureAppointments]);

  const filteredCuts = useMemo(() => {
    return filterFavsOnly 
      ? portfolioCuts.filter(item => favorites.includes(item.id))
      : portfolioCuts;
  }, [portfolioCuts, filterFavsOnly, favorites]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-black text-white p-4 sm:p-8 pt-10 pb-36"
    >
      {/* Premium Top Bar Dashboard Header */}
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 liquid-glass/40 p-6 rounded-[2.5rem]  backdrop-blur-md">
          <div className="flex items-center gap-4 text-left">
            <button 
              onClick={onBack}
              className="p-3.5 bg-neutral-950  liquid-glass rounded-2xl text-neutral-400 hover:text-amber-500  transition-all hover:scale-105 active:scale-95"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-500">
                SUITE MENSBARBER CLIENTE
              </span>
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight leading-none">
                Meus Cortes
              </h2>
              <p className="text-[10px] text-neutral-500 font-medium">
                Confira seu histórico de estilo, agendamentos futuros e portfólio pessoal.
              </p>
            </div>
          </div>

          {/* Core Personal Statistics row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            {/* Total Completed */}
            <div className=" liquid-glass  py-2.5 px-3 sm:px-4 rounded-2xl text-center flex flex-col justify-center items-center">
              <Award className="w-4 h-4 text-amber-500 mb-1" />
              <span className="text-xs font-black tracking-tight leading-none text-white">{totalCutsCount}</span>
              <span className="text-[7px] text-neutral-500 uppercase font-bold tracking-wider mt-0.5 whitespace-nowrap">Cortes Feitos</span>
            </div>
            {/* Favorites */}
            <div className=" liquid-glass  py-2.5 px-3 sm:px-4 rounded-2xl text-center flex flex-col justify-center items-center">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 mb-1" />
              <span className="text-xs font-black tracking-tight leading-none text-white">{favoriteCutsCount}</span>
              <span className="text-[7px] text-neutral-500 uppercase font-bold tracking-wider mt-0.5 whitespace-nowrap">Favoritos</span>
            </div>
            {/* Next Booking Info */}
            <div className=" liquid-glass  py-2.5 px-3 sm:px-4 rounded-2xl text-center flex flex-col justify-center items-center">
              {nextBookingInfo ? (
                <>
                  <CalendarCheck className="w-4 h-4 text-teal-400 mb-1 animate-pulse" />
                  <span className="text-[10px] font-black tracking-tight leading-none text-teal-400">{nextBookingInfo.date}</span>
                  <span className="text-[7px] text-neutral-500 uppercase font-bold tracking-wider mt-0.5 whitespace-nowrap">Próximo às {nextBookingInfo.time}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-neutral-600 mb-1" />
                  <span className="text-xs font-black tracking-tight leading-none text-neutral-500">—</span>
                  <span className="text-[7px] text-neutral-500 uppercase font-bold tracking-wider mt-0.5 whitespace-nowrap">Tudo em dia</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* PRÓXIMOS AGENDAMENTOS */}
          {futureAppointments.length > 0 && (
            <section className="text-left">
              <div className="flex items-center gap-2 mb-4 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-neutral-500">Próximos Agendamentos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {futureAppointments.map(app => (
                  <div 
                    key={app.id} 
                    className="p-6 bg-gradient-to-br from-amber-500/10 to-neutral-900/40 border border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group shadow-xl transition-all hover:border-amber-500/35"
                  >
                    {/* Visual Ticket Tear-lines */}
                    <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-black rounded-full border border-white/5" />
                    <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-black rounded-full border border-white/5" />

                    <div className="absolute -right-8 -top-8 text-amber-500/5 group-hover:scale-110 transition-transform duration-1000 rotate-12">
                      <CalendarCheck size={160} />
                    </div>

                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-amber-500" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">Atendimento Marcado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {app.status === 'confirmed' ? (
                            <span className="bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight">CONFIRMADO</span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black px-2.5 py-1 rounded-lg animate-pulse uppercase tracking-tight">Pendente</span>
                          )}
                        </div>
                      </div>

                      <div className="text-left">
                        <h4 className="text-xl font-black uppercase italic tracking-tighter mb-1 leading-none text-white block">
                          {app.serviceName}
                        </h4>
                        {app.barberName && (
                          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <span className="text-xs">💈</span> Barbeiro: <strong className="text-white font-extrabold">{app.barberName}</strong>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-400">
                        <div className="flex items-center gap-1.5 liquid-glass px-3 py-1.5 rounded-xl  font-bold">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 liquid-glass px-3 py-1.5 rounded-xl  font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{app.time}</span>
                        </div>
                        {app.totalPrice && (
                          <div className="flex items-center gap-1.5 liquid-glass px-3 py-1.5 rounded-xl  font-mono text-white text-xs">
                            <span className="text-[10px] text-neutral-500 mr-0.5">R$</span>
                            <span>{Number(app.totalPrice).toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2.5 pt-2">
                        <button 
                          onClick={() => {
                            if (onReschedule) {
                              onReschedule(app);
                            } else if (onBookAgain && app.serviceId && app.barberId) {
                              onBookAgain(app.serviceId, app.barberId);
                            }
                          }} 
                          className="flex-1 bg-white hover:bg-amber-500 text-black py-3 rounded-2xl text-[9px] font-black uppercase italic tracking-widest transition-all duration-300 hover:scale-[1.01] hover:text-black cursor-pointer shadow-lg active:scale-95"
                        >
                          REAGENDAR CORTE
                        </button>
                        {onCancel && (
                          <button 
                            onClick={() => setAppToCancel(app)} 
                            className="px-5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/10 font-black uppercase italic py-3 rounded-2xl text-[9px] tracking-widest transition-all duration-300 cursor-pointer active:scale-95"
                          >
                            CANCELAR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* GALERIA DOS MEUS CORTES */}
          {portfolioCuts.length > 0 && (
            <section className="animate-in fade-in duration-500 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pl-2 pr-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-neutral-500">Minha Galeria de Cortes</h3>
                  <span className="text-[8.5px] font-black px-2 py-0.5 liquid-glass text-amber-500 rounded-md ">{portfolioCuts.length} FOTOS</span>
                </div>

                {/* Aesthetic Filter Tabs */}
                <div className="flex liquid-glass/60 p-1 rounded-2xl  self-start sm:self-auto select-none">
                  <button
                    onClick={() => setFilterFavsOnly(false)}
                    className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      !filterFavsOnly 
                        ? "bg-amber-500 text-black" 
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    ✨ Todos
                  </button>
                  <button
                    onClick={() => setFilterFavsOnly(true)}
                    className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                      filterFavsOnly 
                        ? "bg-amber-500 text-black animate-none" 
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${filterFavsOnly ? 'fill-black text-black' : 'text-rose-500 fill-rose-500'}`} />
                    Favoritos ({favoriteCutsCount})
                  </button>
                </div>
              </div>
              
              <AnimatePresence mode="popLayout">
                {filteredCuts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="liquid-glass py-16 text-center space-y-3 rounded-[2.5rem] -dashed"
                  >
                    <Heart className="w-10 h-10 text-neutral-700 mx-auto" />
                    <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Nenhum favorito selecionado</p>
                    <p className="text-[9px] text-neutral-600 px-6 uppercase font-bold">Toque no ícone de estrela/coração de um corte para guardar aqui</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    layout
                    className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {filteredCuts.map((item, idx) => {
                      const isFavorite = favorites.includes(item.id);
                      return (
                        <motion.div 
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          transition={{ duration: 0.3 }}
                          whileHover={{ y: -4 }}
                          className="liquid-glass relative aspect-square rounded-[2.2rem] overflow-hidden group cursor-pointer"
                        >
                          {/* Image */}
                          <img 
                            src={item.imageUrl} 
                            alt={item.caption} 
                            onClick={() => setSelectedPhoto(item)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            referrerPolicy="no-referrer"
                          />

                          {/* Gradient Vignette overlay */}
                          <div 
                            onClick={() => setSelectedPhoto(item)}
                            className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-4 flex flex-col justify-end"
                          />

                          {/* Overlay Buttons & Information */}
                          <div className="absolute inset-x-0 bottom-0 p-4.5 flex flex-col gap-2 pointer-events-none z-10">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="overflow-hidden text-left" onClick={() => setSelectedPhoto(item)}>
                                <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded leading-none inline-block mb-1">
                                  ✂️ ESTILO
                                </span>
                                <p className="text-[10px] font-black uppercase text-white truncate drop-shadow">
                                  {item.caption || "Corte Premium"}
                                </p>
                                {item.createdAt && (
                                  <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                                    {format(item.createdAt instanceof Timestamp ? item.createdAt.toDate() : parseISO(item.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                )}
                              </div>

                              {/* Favorite Heart trigger */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item.id);
                                }}
                                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all pointer-events-auto cursor-pointer active:scale-95 ${
                                  isFavorite 
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/10' 
                                    : 'bg-black/60 text-white border-white/5 hover:text-amber-500 hover:border-amber-500/30'
                                }`}
                                title={isFavorite ? "Remover dos favoritos" : "Favoritar corte"}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                            
                            {/* Hover Interactive Button - "Repetir" */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-3 group-hover:translate-y-0 duration-300 pointer-events-auto">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookAgain?.(item.serviceId || '', item.barberId || '');
                                }}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black py-2 rounded-xl font-black uppercase italic text-[8px] tracking-wider transition-colors cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1 active:scale-95"
                              >
                                ⏳ REPETIR ESTE CORTE
                              </button>
                            </div>
                          </div>

                          {/* Quick details magnifier icon when hovered */}
                          <div 
                            onClick={() => setSelectedPhoto(item)}
                            className="absolute top-4 left-4 p-2.5 liquid-glass backdrop-blur-md rounded-xl  text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer hover:text-white"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* HISTÓRICO & AVALIAÇÕES */}
          <section className="text-left">
            <div className="flex items-center gap-2 mb-4 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-neutral-500">Histórico de Visitas & Avaliações</h3>
            </div>
            
            {/* Google Review Premium Call-to-action */}
            <div className="bg-gradient-to-br from-amber-500/10 to-neutral-900/40 border border-amber-500/20 rounded-[2.5rem] p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-10 text-amber-500/5 rotate-45 select-none pointer-events-none">
                <Scissors size={200} />
              </div>

              <div className="text-center md:text-left space-y-1 relative z-10">
                <span className="text-[7.5px] font-black uppercase text-amber-500 tracking-[0.2em] bg-amber-500/25 px-2.5 py-0.5 rounded-md leading-none inline-block">
                  AJUDE NOSSA EQUIPE 💈
                </span>
                <h4 className="text-base font-black uppercase tracking-tight text-white italic">Ficou satisfeito com nosso trabalho?</h4>
                <p className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wider leading-relaxed">
                  Avalie seu barbeiro preferido no Google com 5 estrelas e ganhe nosso eterno respeito e prioridade!
                </p>
                <div className="flex gap-1 justify-center md:justify-start pt-1.5">
                  {[1,2,3,4,5].map(st => <Star key={st} className="w-3 h-3 text-amber-500 fill-amber-500" />)}
                </div>
              </div>
              <a 
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shrink-0 text-center hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer relative z-10 italic"
              >
                Escrever Avaliação ⭐⭐⭐⭐⭐
              </a>
            </div>

            {/* List of past cut operations */}
            {pastAppointments.length === 0 ? (
              <div className="py-14 text-center space-y-2 liquid-glass/20 rounded-[2.5rem] ">
                <CalendarCheck className="w-8 h-8 text-neutral-700 mx-auto" />
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Nenhum atendimento anterior registrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastAppointments.map(app => {
                  const isCompleted = app.status === 'completed';
                  return (
                    <div 
                      key={app.id} 
                      className={`p-6 bg-[#090909] rounded-[2.5rem] border border-white/5 space-y-4 transition-all relative ${
                        !isCompleted ? 'opacity-55' : 'hover:border-white/10'
                      }`}
                    >
                      {/* Flex status header layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className={`p-3.5 rounded-2xl shrink-0 ${app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {app.status === 'cancelled' ? <XCircle className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
                          </div>
                          <div className="text-left space-y-1">
                            <span className="text-[7.5px] font-extrabold uppercase text-neutral-500 tracking-widest">VISITA REALIZADA</span>
                            <h4 className="text-base font-black uppercase italic text-white tracking-tight leading-none">
                              {app.serviceName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9.5px] text-neutral-400 font-extrabold">
                              <span className="flex items-center gap-1 tracking-wider">
                                📅 {format(app.date instanceof Timestamp ? app.date.toDate() : parseISO(app.date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {app.barberName && (
                                <>
                                  <span className="liquid-glass w-1 h-1 rounded-full" />
                                  <span className="text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                    💈 {app.barberName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {app.totalPrice && (
                          <p className="text-base font-black text-white italic text-left sm:text-right font-mono self-start sm:self-auto">
                            R$ {Number(app.totalPrice).toFixed(2).replace('.', ',')}
                          </p>
                        )}
                      </div>

                      {/* Interactive Client Rating star selectors & uploaded photo frame */}
                      {isCompleted && (
                        <div className="pt-4 border-t border-white/5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 liquid-glass/30 p-3.5 rounded-2xl  text-left">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-black uppercase text-neutral-500 tracking-wider">Avaliação da Experiência</span>
                              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">
                                {app.rating ? "Obrigado pela sua nota!" : "Toque sobre as estrelas para nos classificar:"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const activeStar = star <= (app.rating || 0);
                                return (
                                  <button 
                                    key={star}
                                    disabled={ratingLoading === app.id}
                                    onClick={() => handleRate(app.id, star)}
                                    className="p-1 transition-transform active:scale-130 hover:scale-110 cursor-pointer disabled:cursor-not-allowed"
                                    title={`Avaliar com ${star} estrela(s)`}
                                  >
                                    <Star 
                                      className={`w-5 h-5 transition-all ${
                                        activeStar 
                                          ? 'fill-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                                          : 'text-neutral-800 hover:text-amber-500/60'
                                      }`} 
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Snapshot rating image box */}
                          <div className="space-y-3 text-left">
                            <span className="text-[8px] font-black uppercase text-neutral-500 tracking-widest pl-1">Visual do Corte Registrado</span>
                            
                            {app.reviewPhotoUrl ? (
                              <div className="liquid-glass relative aspect-square sm:aspect-[4/3] w-full max-w-md rounded-3xl overflow-hidden group">
                                <img src={app.reviewPhotoUrl} className="w-full h-full object-cover" alt="Sua foto de corte" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                                  <span className="text-[9px] font-black uppercase text-white tracking-widest liquid-glass px-2.5 py-1.5 rounded-xl ">
                                    📸 FOTO DA VISITA
                                  </span>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setSelectedPhoto({ imageUrl: app.reviewPhotoUrl, caption: `${app.serviceName} (${app.barberName})`, createdAt: app.date, serviceId: app.serviceId, barberId: app.barberId })}
                                      className="p-2.5 liquid-glass backdrop-blur-sm rounded-xl text-white hover:text-amber-500 transition-colors  cursor-pointer hover:border-amber-500/20"
                                      title="Ver ampliada"
                                    >
                                      <Maximize2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => removeReviewPhoto(app.id)}
                                      className="p-2.5 liquid-glass backdrop-blur-sm rounded-xl text-red-500 hover:text-red-400 hover:bg-red-950/35 transition-colors  cursor-pointer"
                                      title="Remover foto"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <label className="liquid-glass flex flex-col items-center justify-center p-8 -dashed rounded-3xl gap-3 cursor-pointer hover:-amber-500/30 hover:] transition-all group max-w-md select-none">
                                <div className="liquid-glass w-12 h-12 rounded-2xl flex items-center justify-center text-neutral-500 group-hover:text-amber-500  transition-colors">
                                  {uploadingFor === app.id ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <Camera className="w-5 h-5" />}
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                                    {uploadingFor === app.id ? "Enviando arquivo..." : "Adicionar Foto Deste Corte"}
                                  </p>
                                  <p className="text-[8px] text-neutral-600 font-bold uppercase mt-1">
                                    Guardar lembrança na sua galeria
                                  </p>
                                </div>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleReviewPhotoUpload(e, app.id)} 
                                  className="hidden" 
                                  disabled={!!uploadingFor}
                                />
                              </label>
                            )}
                          </div>

                          {onBookAgain && (
                            <button
                              onClick={() => onBookAgain(app.serviceId, app.barberId)}
                              className="liquid-glass w-full  hover:text-white text-neutral-300 font-black uppercase tracking-wider text-[10px] py-4 rounded-2xl transition-colors cursor-pointer italic"
                            >
                              Agendar Novamente Este Procedimento
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* FULLSCREEN IMMERSIVE LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className=" liquid-glass  rounded-[3rem] overflow-hidden max-w-xl w-full relative z-10 shadow-2xl flex flex-col text-left"
            >
              {/* Image window frame */}
              <div className="liquid-glass relative aspect-square w-full">
                <img 
                  src={selectedPhoto.imageUrl} 
                  className="w-full h-full object-cover" 
                  alt={selectedPhoto.caption || "Detalhes do corte"} 
                />
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-5 right-5 p-3 liquid-glass backdrop-blur-md rounded-2xl text-neutral-400 hover:text-white hover:bg-black transition-colors  cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detail Caption Section */}
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <span className="text-[7.5px] font-black uppercase text-amber-500 tracking-[0.25em] bg-amber-500/10 px-2.5 py-1 rounded inline-block">
                    MENSBARBER STYLE ARCHIVE
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white">
                    {selectedPhoto.caption || "Corte Estilo"}
                  </h3>
                  {selectedPhoto.createdAt && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        Registrado em {format(selectedPhoto.createdAt instanceof Timestamp ? selectedPhoto.createdAt.toDate() : (typeof selectedPhoto.createdAt === 'string' ? parseISO(selectedPhoto.createdAt) : selectedPhoto.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Alert info badge */}
                <div className=" liquid-glass  p-4 rounded-2xl flex items-start gap-3">
                  <span className="text-xl leading-none">🧠</span>
                  <div className="space-y-0.5">
                    <h5 className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Anotação do Estilo</h5>
                    <p className="text-[10px] text-neutral-400 font-medium">
                      Este corte está associado à sua conta. Você pode repetir a parceria com o mesmo especialista clicando no botão abaixo para garantir idêntica maestria e excelência.
                    </p>
                  </div>
                </div>

                {/* Booking call-to-action */}
                <div className="flex gap-2.5 pt-2">
                  <button 
                    onClick={() => {
                      const serviceId = selectedPhoto.serviceId || '';
                      const barberId = selectedPhoto.barberId || '';
                      setSelectedPhoto(null);
                      onBookAgain?.(serviceId, barberId);
                    }}
                    className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase italic tracking-widest rounded-2xl transition-all cursor-pointer shadow-lg shadow-amber-500/5 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    🚀 AGENDAR ESTE ESTILO DE CORTE
                  </button>
                  <button 
                    onClick={() => setSelectedPhoto(null)}
                    className="px-6 py-4 bg-neutral-900  liquid-glass text-neutral-400 hover:text-white text-[10px] font-black uppercase italic tracking-widest rounded-2xl transition-colors cursor-pointer "
                  >
                    FECHAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL AGENDAMENTO CONFIRM DIALOG */}
      <AnimatePresence>
        {appToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCancelling) {
                  setAppToCancel(null);
                  setCancelReasonTxt("");
                }
              }}
              className="liquid-glass absolute inset-0 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className=" liquid-glass  rounded-[2.5rem] p-8 max-w-sm w-full text-center relative z-10 shadow-2xl space-y-6 text-left"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/25 rounded-3xl mx-auto flex items-center justify-center text-red-500">
                <XCircle className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2 text-center">
                <h3 className="text-lg font-black uppercase italic tracking-wider text-white">Cancelar Agendamento?</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">
                  Deseja realmente cancelar seu agendamento de <span className="text-white font-black">{appToCancel.serviceName}</span> para:
                </p>
              </div>

              <div className=" liquid-glass rounded-2xl p-4  space-y-2 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                  <Calendar className="w-3 h-3" />
                  {format(appToCancel.date instanceof Timestamp ? appToCancel.date.toDate() : parseISO(appToCancel.date), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 leading-none">
                  <Clock className="w-3 h-3" />
                  às {appToCancel.time}
                </p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">
                  Motivo do Cancelamento
                </label>
                <textarea
                  value={cancelReasonTxt}
                  onChange={(e) => setCancelReasonTxt(e.target.value)}
                  placeholder="Por que você está cancelando? (ex: Tive um imprevisto)"
                  maxLength={150}
                  className="w-full liquid-glass  rounded-2xl p-4 text-xs text-white placeholder-neutral-700 focus:border-red-500/50 outline-none resize-none h-20 transition-all font-medium"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={async () => {
                    setIsCancelling(true);
                    try {
                      await onCancel?.(appToCancel, cancelReasonTxt);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsCancelling(false);
                      setAppToCancel(null);
                      setCancelReasonTxt("");
                    }
                  }}
                  disabled={isCancelling}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg shadow-red-500/5 disabled:cursor-not-allowed"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      CANCELANDO...
                    </>
                  ) : (
                    "SIM, CANCELAR AGENDAMENTO"
                  )}
                </button>
                <button 
                  onClick={() => { setAppToCancel(null); setCancelReasonTxt(""); }}
                  disabled={isCancelling}
                  className="w-full bg-neutral-900  liquid-glass text-neutral-300 py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all cursor-pointer  disabled:cursor-not-allowed"
                >
                  MANTER AGENDAMENTO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
