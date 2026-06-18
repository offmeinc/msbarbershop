import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ChevronLeft, 
  Download, 
  Calendar, 
  User, 
  Clock, 
  Share2, 
  Loader2, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  CalendarPlus, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ChevronRight, 
  X, 
  SlidersHorizontal,
  Trash2,
  CalendarCheck2
} from "lucide-react";
import { format, addDays, startOfDay, endOfDay, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { BARBERSHOP_NAME, BARBERSHOP_ADDRESS } from "../../constants";
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from "motion/react";
import { toast } from "../ui/Toast";

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500 transition-colors">
           <ChevronLeft className="w-5 h-5" /> Voltar
        </button>
        <div className=" liquid-glass rounded-[2.5rem] p-8 shadow-2xl  space-y-6 text-center">
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
  const [services, setServices] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Advanced Custom Tuning State
  const [selectedThemeId, setSelectedThemeId] = useState<string>("midnight_gold");
  const [posterTitle, setPosterTitle] = useState<string>("HORÁRIOS DISPONÍVEIS");
  const [ctaText, setCtaText] = useState<string>("AGENDE PELO LINK NA BIO");
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [showAddress, setShowAddress] = useState<boolean>(true);

  // Themes configurations
  const POSTER_THEMES = useMemo(() => [
    {
      id: "midnight_gold",
      name: "Midnight Gold",
      tagline: "Luxo & Ouro Nobre",
      bgClass: "bg-gradient-to-b from-neutral-950 via-neutral-900 to-black",
      previewBg: "bg-gradient-to-b from-neutral-950 via-neutral-900 to-black border-amber-500/20",
      textClass: "text-amber-500",
      borderClass: "border-amber-500/10",
      slotClass: "bg-neutral-900/90 border-2 border-amber-500/10 text-white",
      btnClass: "bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400",
      accentBg: "bg-amber-500/5",
      accentText: "text-amber-500",
      accentBorder: "border-amber-500/20",
      primaryContrast: "#f59e0b", // amber-500
      glowColor: "rgba(217, 119, 6, 0.1)"
    },
    {
      id: "barber_legacy",
      name: "Barber Vintage",
      tagline: "Nostalgia Retrô",
      bgClass: "bg-gradient-to-b from-stone-950 via-stone-900 to-zinc-950",
      previewBg: "bg-gradient-to-b from-stone-950 via-stone-900 to-zinc-950 border-orange-700/20",
      textClass: "text-amber-600",
      borderClass: "border-orange-900/10",
      slotClass: "bg-stone-900/80 border-2 border-amber-800/25 text-amber-100",
      btnClass: "bg-amber-700 text-white shadow-amber-700/20 hover:bg-amber-600",
      accentBg: "bg-amber-800/10",
      accentText: "text-amber-600",
      accentBorder: "border-amber-800/10",
      primaryContrast: "#b45309", // amber-700
      glowColor: "rgba(180, 83, 9, 0.1)"
    },
    {
      id: "cyber_neon",
      name: "Cyber Neon",
      tagline: "Vaporwave Futurista",
      bgClass: "bg-gradient-to-b from-slate-950 via-zinc-900 to-black",
      previewBg: "bg-gradient-to-b from-slate-950 via-zinc-900 to-black border-orange-500/20",
      textClass: "text-orange-500",
      borderClass: "border-orange-500/15",
      slotClass: "bg-black/95 border-2 border-orange-500/20 text-white font-mono",
      btnClass: "bg-orange-500 text-black shadow-orange-500/20 hover:bg-orange-400",
      accentBg: "bg-orange-500/5",
      accentText: "text-orange-500",
      accentBorder: "border-orange-500/20",
      primaryContrast: "#f97316", // orange-500
      glowColor: "rgba(249, 115, 22, 0.1)"
    },
    {
      id: "nordic_frost",
      name: "Nordic Frost",
      tagline: "Minimalismo Gélido",
      bgClass: "bg-gradient-to-b from-zinc-900 via-neutral-850 to-zinc-950",
      previewBg: "bg-gradient-to-b from-zinc-900 via-neutral-850 to-zinc-950 border-zinc-700",
      textClass: "text-white",
      borderClass: "border-zinc-800",
      slotClass: "bg-white/5 border-2 border-white/5 text-zinc-200",
      btnClass: "bg-white text-black hover:bg-neutral-100",
      accentBg: "bg-white/5",
      accentText: "text-white",
      accentBorder: "border-white/10",
      primaryContrast: "#ffffff",
      glowColor: "rgba(255, 255, 255, 0.05)"
    }
  ], []);

  const activeTheme = useMemo(() => {
    return POSTER_THEMES.find(t => t.id === selectedThemeId) || POSTER_THEMES[0];
  }, [selectedThemeId, POSTER_THEMES]);

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

  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Error loading services for marketing stats:", err));
    return () => unsubscribe();
  }, []);

  // Compute average service price for idle opportunity forecasting
  const avgServicePrice = useMemo(() => {
    if (services.length === 0) return 55;
    const sum = services.reduce((acc, current) => acc + (Number(current.price) || 0), 0);
    return Math.round(sum / services.length);
  }, [services]);

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

    const endHourDate = new Date(selectedDate);
    const endCloseInt = Math.floor(endHour);
    const endCloseMin = Math.round((endHour % 1) * 60);
    endHourDate.setHours(endCloseInt, endCloseMin, 0, 0);

    for (let h = startHour; h < Math.ceil(endHour); h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotTimeInHours = h + (m / 60);
        if (slotTimeInHours >= endHour) break;

        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotDate.getTime() + 30 * 60000); // base slot represents 30min block

        if (isToday && slotDate < now) continue;

        // Verify if slot exceeds closing time
        if (slotEnd > endHourDate) continue;

        const isBusy = appointments.some(app => {
          if (selectedBarberId !== 'all' && app.barberId !== selectedBarberId) return false;
          
          const appDate = app.date instanceof Timestamp 
            ? app.date.toDate() 
            : typeof app.date === 'string' 
              ? parseISO(app.date) 
              : app.date;
          
          if (!isSameDay(appDate, selectedDate)) return false;

          const serviceInfo = services.find(s => s.id === app.serviceId);
          const appDuration = app.serviceDuration || serviceInfo?.duration || 30;
          const appEnd = new Date(appDate.getTime() + appDuration * 60000);

          return slotDate < appEnd && slotEnd > appDate;
        });

        const isBlocked = blockedTimes.some(b => {
          const bDate = b.date instanceof Timestamp 
            ? b.date.toDate() 
            : typeof b.date === 'string'
              ? parseISO(b.date)
              : typeof b.date.seconds === 'number'
                ? new Date(b.date.seconds * 1000)
                : new Date(b.date);
          
          if (b.barberId !== 'all' && selectedBarberId !== 'all' && b.barberId !== selectedBarberId) return false;
          if (!isSameDay(bDate, selectedDate)) return false;

          if (b.startTime && b.endTime) {
            const [bStartH, bStartM] = b.startTime.split(":").map(Number);
            const [bEndH, bEndM] = b.endTime.split(":").map(Number);
            const blockStart = new Date(selectedDate);
            blockStart.setHours(bStartH, bStartM, 0, 0);
            const blockEnd = new Date(selectedDate);
            blockEnd.setHours(bEndH, bEndM, 0, 0);

            return slotDate < blockEnd && slotEnd > blockStart;
          } else {
            return format(bDate, "HH:mm") === time;
          }
        });

        if (!isBusy && !isBlocked) {
          slots.push(time);
        }
      }
    }
    return slots;
  };

  const slots = getAvailableSlots();

  // Advanced financial indicator computation
  const totalSlotsCapacity = selectedDate.getDay() === 6 ? 21 : (selectedDate.getDay() > 0 ? 22 : 0);
  const potentialIdleValue = useMemo(() => {
    return slots.length * avgServicePrice;
  }, [slots, avgServicePrice]);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        backgroundColor: '#000000',
        width: 1080,
        height: 1920,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          display: 'flex'
        }
      });
      const link = document.createElement('a');
      link.download = `agenda-${format(selectedDate, "dd-MM-yyyy")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem gerada com sucesso! Postando no story do Instagram você atrai novos clientes! 🚀🎟️");
    } catch (err) {
      console.error('Error generating image:', err);
      toast.error("Erro ao gerar imagem de divulgação.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-4xl mx-auto py-8 px-4 pb-32 text-left"
    >
      {/* Back button and title */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack} 
          className="p-2.5 liquid-glass  rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-amber-500" />
        </button>
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Divulgar Horários</h2>
          <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Social media & Marketing</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-[2.5rem] p-7 border border-white/5 shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <h2 className="text-base font-black text-amber-500 uppercase italic tracking-widest mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500 animate-spin" /> Marketing de Resgate
        </h2>
        <p className="text-[10.5px] text-neutral-400 font-semibold leading-relaxed">
          Gere um story elegante em segundos e publique nas redes sociais. Atendimentos de minutos parados são transformados em faturamento rápido ao expor janelas livres no fluxo de mensagens de seus clientes.
        </p>
      </div>

      {/* Main Grid Wrapper - Configurações on left / Live view on right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls (Configurações) */}
        <div className="md:col-span-7 space-y-5">
          
          {/* Section 1: Data & Barber filters */}
          <div className=" liquid-glass p-6 rounded-[2.2rem]  space-y-4">
            <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">
              1. Selecionar Vagas da Agenda
            </h3>
            
            <div className="space-y-3">
              <label className="text-[8.5px] font-black uppercase text-neutral-500 tracking-widest block ml-0.5">
                Dia de Divulgação
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[new Date(), addDays(new Date(), 1)].map(date => (
                  <button 
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${isSameDay(selectedDate, date) ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-black/20 text-neutral-500 hover:text-white"}`}
                  >
                    {isSameDay(date, new Date()) ? 'Hoje' : 'Amanhã'}
                  </button>
                ))}
              </div>
              
              {/* Optional Custom Date Selector Input */}
              <div className="pt-1.5">
                <input 
                  type="date" 
                  value={format(selectedDate, "yyyy-MM-dd")} 
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(parseISO(e.target.value));
                    }
                  }}
                  className="w-full bg-black border border-white/5 text-center rounded-2xl p-3.5 text-[10px] text-zinc-300 focus:border-amber-500 focus:outline-none transition-all font-sans font-black uppercase tracking-wider"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8.5px] font-black uppercase text-neutral-500 tracking-widest block ml-0.5">
                Filtrar por Profissional
              </label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedBarberId('all')}
                  className={`px-5 py-3 rounded-2xl text-[8.5px] font-black uppercase tracking-widest whitespace-nowrap transition-all' ${selectedBarberId === 'all' ? "bg-amber-500 text-black shadow-md shadow-amber-500/10" : "bg-black/20 text-neutral-500 hover:text-white"}`}
                >
                  Todos os Barbeiros
                </button>
                {barbers.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => setSelectedBarberId(b.id)}
                    className={`px-5 py-3 rounded-2xl text-[8.5px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedBarberId === b.id ? "bg-amber-500 text-black shadow-md shadow-amber-500/10" : "bg-black/20 text-neutral-400 hover:text-white"}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Poster visual styles selection */}
          <div className=" liquid-glass p-6 rounded-[2.2rem]  space-y-4">
            <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">
              2. Escolher Identidade Visual
            </h3>
            
            <div className="grid grid-cols-2 gap-2.5">
              {POSTER_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedThemeId(theme.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedThemeId === theme.id 
                      ? "bg-neutral-850 border-amber-500/40 text-white" 
                      : "bg-black/20 border-white/5 text-neutral-500 hover:border-white/10"
                  }`}
                >
                  <span className={`text-[9.5px] font-black uppercase tracking-wider block ${
                    selectedThemeId === theme.id ? "text-amber-500" : "text-neutral-400"
                  }`}>
                    {theme.name}
                  </span>
                  <span className="text-[7.5px] text-neutral-500 font-semibold block uppercase tracking-widest mt-0.5">
                    {theme.tagline}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Text elements customization fields */}
          <div className=" liquid-glass p-6 rounded-[2.2rem]  space-y-4">
            <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">
              3. Personalizar Textos do Template
            </h3>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Título Principal</label>
                <input 
                  value={posterTitle} 
                  onChange={e => setPosterTitle(e.target.value.toUpperCase())}
                  placeholder="Ex: HORÁRIOS DISPONÍVEIS" 
                  maxLength={32}
                  className="w-full bg-black border border-white/10 rounded-2xl p-3 px-4 text-xs text-white focus:border-amber-500 focus:outline-none transition-all uppercase font-sans font-black tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Chamada para Ação (CTA)</label>
                <input 
                  value={ctaText} 
                  onChange={e => setCtaText(e.target.value.toUpperCase())}
                  placeholder="Ex: AGENDE PELO LINK NA BIO" 
                  maxLength={35}
                  className="w-full bg-black border border-white/10 rounded-2xl p-3 px-4 text-xs text-white focus:border-amber-500 focus:outline-none transition-all uppercase font-sans font-black tracking-wider"
                />
              </div>

              {/* Elements Toggles checks */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                <label className="flex items-center gap-2.5 p-3.5 liquid-glass rounded-2xl  cursor-pointer hover:bg-black/50 select-none">
                  <input 
                    type="checkbox" 
                    checked={showLogo}
                    onChange={e => setShowLogo(e.target.checked)}
                    className="accent-amber-500 transform scale-105"
                  />
                  <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Exibir Logo</span>
                </label>
                <label className="flex items-center gap-2.5 p-3.5 liquid-glass rounded-2xl  cursor-pointer hover:bg-black/50 select-none">
                  <input 
                    type="checkbox" 
                    checked={showAddress}
                    onChange={e => setShowAddress(e.target.checked)}
                    className="accent-amber-500 transform scale-105"
                  />
                  <span className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Exibir Endereço</span>
                </label>
              </div>
            </div>
          </div>

          {/* Business intelligence and revenue rescue KPI widget */}
          {slots.length > 0 && (
            <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/15 flex gap-3.5 items-start">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500 shrink-0">
                <TrendingUp className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Prejuízo Ocioso Potencial 🚨</span>
                  <span className="text-[8px] font-mono text-rose-400 font-black">R${avgServicePrice}/serviço</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-rose-500 tracking-tight">R$ {potentialIdleValue.toFixed(2).replace(".", ",")}</span>
                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider">em {slots.length} janelas desocupadas</span>
                </div>
                <p className="text-[8.5px] text-neutral-400 font-semibold leading-relaxed pt-0.5">
                  Esta data possui <strong>{slots.length} horários desocupados</strong>. Se não divulgada, a barbearia pode deixar de faturar até <strong>R$ {potentialIdleValue}</strong> nessa data. Divulgar é a de maior conversão de retorno rápido!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Story Live Mockup Preview & Action Button */}
        <div className="md:col-span-5 space-y-4">
          
          {/* Label Indicator */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[9.5px] font-black text-amber-500 uppercase tracking-[0.2em]">
              Preview do Story
            </span>
            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">
              Simulação Mobile (Escalado)
            </span>
          </div>

          {/* Interactive Screen Container mockup */}
          <div className="bg-black border border-white/10 rounded-[2.5rem] p-4 p-b-5 shadow-2xl relative overflow-hidden flex flex-col items-center">
            
            {/* Phone notch deco */}
            <div className="liquid-glass w-24 h-4.5 -x -b rounded-b-xl mb-3 absolute top-0 z-20" />

            {/* Beautiful aspect-ratio representation screen */}
            <div 
              style={{ minHeight: '430px' }}
              className={`w-full ${activeTheme.bgClass} flex flex-col justify-between p-6 text-white relative rounded-2xl overflow-hidden shadow-inner border border-white/5`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

              {/* Header inside mockup */}
              <div className="w-full text-center space-y-2.5 relative z-10 pt-4">
                {showLogo && (
                  <div className="liquid-glass w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md relative overflow-hidden">
                    <img 
                      src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className={`font-black uppercase tracking-[0.4em] text-[8px] ${activeTheme.textClass}`}>
                    {posterTitle || "HORÁRIOS DISPONÍVEIS"}
                  </p>
                  <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">
                    {format(selectedDate, "EEEE", { locale: ptBR })}
                  </h1>
                  <p className="text-neutral-400 text-[9px] font-bold uppercase tracking-[0.2em]">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Slots inside mockup */}
              <div className="my-5 w-full relative z-10 flex-1 flex flex-col items-center justify-center">
                {slots.length === 0 ? (
                  <div className="text-center py-8 space-y-1">
                    <Clock className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">
                      {selectedDate.getDay() === 0 ? "Não aberto aos domingos!" : "Sem horários livres..."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {slots.slice(0, 15).map(time => (
                      <div 
                        key={time} 
                        className={`rounded-xl py-2 flex flex-col items-center justify-center shadow-md transition-all ${activeTheme.slotClass}`}
                      >
                        <span className="text-[11.5px] font-black italic text-white font-mono">{time}</span>
                      </div>
                    ))}
                    {slots.length > 15 && (
                      <div className="col-span-3 text-center pt-2">
                        <p className="text-[7.5px] text-neutral-400 font-extrabold uppercase tracking-widest">
                          + {slots.length - 15} OUTROS HORÁRIOS LIVRES
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer mockup */}
              <div className="w-full text-center space-y-3.5 relative z-10 pb-2">
                <div className="h-0.5 w-10 bg-amber-500/20 mx-auto rounded-full" />
                
                <div className="space-y-0.5">
                  <h3 className="text-[9.5px] font-black italic uppercase text-white tracking-widest">
                    {BARBERSHOP_NAME}
                  </h3>
                  {showAddress && (
                    <p className="text-[6.5px] text-neutral-500 font-bold uppercase tracking-wider max-w-[190px] mx-auto truncate text-center">
                      {BARBERSHOP_ADDRESS}
                    </p>
                  )}
                </div>

                <div className={`py-1.5 px-4 rounded-xl inline-block font-black uppercase italic tracking-[0.2em] text-[8.5px] shadow-md ${activeTheme.btnClass}`}>
                  {ctaText || "AGENDE PELO LINK NA BIO"}
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="pt-2">
            <button 
              onClick={handleDownload}
              disabled={isGenerating || slots.length === 0}
              className="w-full bg-amber-500 text-black py-4.5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-amber-500/10 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Gerando Imagem High-DPI...
                </>
              ) : (
                <>
                  <Download className="w-4.5 h-4.5 text-black" />
                  Salvar Imagem de Story 🔥
                </>
              )}
            </button>
            {slots.length === 0 && (
              <p className="text-center text-[8.5px] text-rose-500 font-black uppercase tracking-widest mt-3.5 leading-relaxed bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                ⚠️ Não há horários ociosos para gerar divulgação! Parabéns pela agenda cheia ou selecione outro dia/profissional.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Hidden high-DPI poster target (Rendered absolute coordinates for canvas screenshot) */}
      <div className="fixed left-[-3000px] top-[-3000px] z-[-50] select-none pointer-events-none">
        <div 
          ref={posterRef}
          style={{ width: '1080px', height: '1920px' }}
          className={`${activeTheme.bgClass} flex flex-col justify-between p-24 text-white relative overflow-hidden`}
        >
          {/* Glowing gradient backdrops mapped to the specific active theme selection */}
          <div 
            style={{ backgroundColor: activeTheme.glowColor || 'rgba(217, 119, 6, 0.1)' }}
            className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" 
          />
          <div 
            style={{ backgroundColor: activeTheme.glowColor || 'rgba(217, 119, 6, 0.05)' }}
            className="absolute bottom-0 left-0 w-[600px] h-[600px] blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" 
          />
          
          {/* Header */}
          <div className="w-full text-center space-y-12 relative z-10 pt-16">
            {showLogo && (
              <div className="liquid-glass w-48 h-48 rounded-[4rem] flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden">
                <img 
                  src="https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg" 
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-4">
              <p className={`font-black uppercase tracking-[0.6em] text-2xl ${activeTheme.textClass}`}>
                {posterTitle || "HORÁRIOS DISPONÍVEIS"}
              </p>
              <h1 className="text-9xl font-black italic uppercase tracking-tighter leading-none">
                {format(selectedDate, "EEEE", { locale: ptBR })}
              </h1>
              <p className="text-neutral-400 text-3xl font-bold uppercase tracking-[0.3em]">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Slots Grid */}
          <div className="w-full relative z-10 flex-1 flex items-center justify-center py-20">
            {slots.length === 0 ? (
              <div className="text-center space-y-4">
                <Clock className="w-20 h-20 text-neutral-700 mx-auto" />
                <p className="text-[32px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">
                  Sem horários livres para este dia.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-8 w-full max-w-5xl">
                {slots.slice(0, 15).map(time => (
                  <div 
                    key={time} 
                    className={`rounded-[3rem] py-10 flex flex-col items-center justify-center shadow-2xl transition-all ${activeTheme.slotClass}`}
                  >
                    <Clock style={{ color: activeTheme.primaryContrast }} className="w-8 h-8 opacity-30 mb-4" />
                    <span className="text-6xl font-black italic text-white font-mono">{time}</span>
                  </div>
                ))}
                {slots.length > 15 && (
                  <div className="col-span-3 text-center pt-8">
                    <p className="text-neutral-500 text-3xl font-black uppercase tracking-widest">
                      + {slots.length - 15} OUTROS HORÁRIOS LIVRES
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="w-full text-center space-y-12 relative z-10 pb-16">
            <div className="h-0.5 w-32 bg-amber-500/10 mx-auto rounded-full" />
            
            <div className="space-y-6">
              <h3 className="text-5xl font-black italic uppercase text-white tracking-widest">
                {BARBERSHOP_NAME}
              </h3>
              {showAddress && (
                <p className="text-2xl text-neutral-500 font-semibold uppercase tracking-[0.2em] max-w-2xl mx-auto px-4 leading-relaxed/loose text-center">
                  {BARBERSHOP_ADDRESS}
                </p>
              )}
            </div>

            <div className={`py-8 px-16 rounded-[4rem] inline-block font-black uppercase italic tracking-[0.3em] text-3xl shadow-2xl ${activeTheme.btnClass}`}>
              {ctaText || "AGENDE PELO LINK NA BIO"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function RecurrenceScreen({ onBack }: { onBack: () => void }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [recurrenceFilter, setRecurrenceFilter] = useState<"all" | "weekly" | "biweekly" | "monthly">("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    // Listen to appointments to display recurrence setups
    const q = query(collection(db, "appointments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppointments(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getAppDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (dateVal instanceof Timestamp) return dateVal.toDate();
    if (dateVal.toDate && typeof dateVal.toDate === "function") return dateVal.toDate();
    if (typeof dateVal === "string") {
      try { return parseISO(dateVal); } catch { return null; }
    }
    return null;
  };

  // Get active recurring schedules (where status is not cancelled, and recurrence is set and is not "none")
  const recurringAppointments = useMemo(() => {
    return appointments.filter(app => 
      app.status !== "cancelled" && 
      app.recurrence && 
      app.recurrence !== "none"
    );
  }, [appointments]);

  // Compute stats metrics
  const stats = useMemo(() => {
    let totalCount = recurringAppointments.length;
    let weeklyCount = recurringAppointments.filter(a => a.recurrence === "weekly").length;
    let biweeklyCount = recurringAppointments.filter(a => a.recurrence === "biweekly").length;
    let monthlyCount = recurringAppointments.filter(a => a.recurrence === "monthly").length;

    // Monthly estimated projection based on prices and recurrence cadence
    let estimatedMonthlyRevenue = 0;
    recurringAppointments.forEach(app => {
      const price = Number(app.totalPrice || app.price || 0);
      if (app.recurrence === "weekly") {
        estimatedMonthlyRevenue += (price * 4);
      } else if (app.recurrence === "biweekly") {
        estimatedMonthlyRevenue += (price * 2);
      } else if (app.recurrence === "monthly") {
        estimatedMonthlyRevenue += price;
      }
    });

    return {
      totalCount,
      weeklyCount,
      biweeklyCount,
      monthlyCount,
      estimatedMonthlyRevenue
    };
  }, [recurringAppointments]);

  // Apply filters to list
  const filteredAppointments = useMemo(() => {
    return recurringAppointments.filter(app => {
      // Filter by Search term (client, barber or service name)
      const search = searchTerm.toLowerCase().trim();
      if (search) {
        const client = (app.clientName || "").toLowerCase();
        const barber = (app.barberName || "").toLowerCase();
        const service = (app.serviceName || "").toLowerCase();
        if (!client.includes(search) && !barber.includes(search) && !service.includes(search)) {
          return false;
        }
      }

      // Filter by Recurrence type
      if (recurrenceFilter !== "all" && app.recurrence !== recurrenceFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort chronologically by appointment date
      const dateA = getAppDate(a.date)?.getTime() || 0;
      const dateB = getAppDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [recurringAppointments, searchTerm, recurrenceFilter]);

  // Action: Toggle inline recurrence cadence or change to none to suspend recurrence
  const handleUpdateRecurrence = async (id: string, newType: "none" | "weekly" | "biweekly" | "monthly") => {
    setActionInProgress(id + "-type");
    try {
      await updateDoc(doc(db, "appointments", id), {
        recurrence: newType
      });
      if (newType === "none") {
        toast.success("Recorrência desativada para este agendamento.");
      } else {
        const descEng = newType === "weekly" ? "Semanal" : newType === "biweekly" ? "Quinzenal" : "Mensal";
        toast.success(`Modelo atualizado para recorrência ${descEng}! 🔄`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar ciclo de recorrência.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: 1-Click Speed Pre-book for next interval instance
  const handlePreBookNextInstance = async (app: any) => {
    const currentAppDate = getAppDate(app.date);
    if (!currentAppDate) {
      toast.error("Data do agendamento atual é inválida.");
      return;
    }

    setActionInProgress(app.id + "-prebook");

    // Calculate next date based on recurrence type
    let daysToAdd = 7;
    if (app.recurrence === "biweekly") daysToAdd = 14;
    else if (app.recurrence === "monthly") daysToAdd = 30;

    const nextDate = addDays(currentAppDate, daysToAdd);
    const dateStrFormatted = format(nextDate, "dd/MM/yyyy", { locale: ptBR });

    if (!window.confirm(`Deseja gerar a próxima sessão para ${app.clientName} pre-agendada para o dia ${dateStrFormatted} às ${app.time}?`)) {
      setActionInProgress(null);
      return;
    }

    try {
      // Same parameters but next period
      const nextAppObj = {
        clientId: app.clientId || "guest",
        clientName: app.clientName || "",
        clientEmail: app.clientEmail || "",
        clientPhone: app.clientPhone || "",
        clientPhoto: app.clientPhoto || null,
        barberId: app.barberId || "",
        barberName: app.barberName || "",
        serviceId: app.serviceId || "",
        serviceName: app.serviceName || "",
        serviceDuration: app.serviceDuration || 30,
        status: "pending", // Scheduled as pending to let staff confirm or adjust hours
        totalPrice: Number(app.totalPrice || app.price || 0),
        createdAt: serverTimestamp(),
        date: Timestamp.fromDate(nextDate),
        time: app.time || "09:00",
        recurrence: app.recurrence, // Preserve recurrence rule on the newly created slot!
        couponCode: app.couponCode || null,
        loginCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      };

      await addDoc(collection(db, "appointments"), nextAppObj);
      toast.success(`Sucesso! Sessão de ${dateStrFormatted} às ${app.time} gerada no Painel! 📅✨`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao tentar pre-agendar próxima sessão.");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md mx-auto py-8 px-5 min-h-[100dvh] pb-32 text-left"
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack} 
          className="p-2.5 liquid-glass  rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 animate-fade-in"
        >
          <ChevronLeft className="w-5 h-5 text-amber-500" />
        </button>
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Recorrências</h2>
          <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Sessões Periódicas e Retenção</span>
        </div>
      </div>

      {/* Recurrent intelligence KPIs */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        {/* KPI Core Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-left space-y-0.5">
            <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest block">Faturamento Técnico Projetado</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white tracking-tight">
                R$ {stats.estimatedMonthlyRevenue.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-[9px] text-neutral-400 font-extrabold uppercase">/ Mês</span>
            </div>
          </div>

          <div className="w-14 h-14 rounded-full border border-amber-500/20 text-amber-500 bg-amber-500/5 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* CADENCE DISTRIBUTION SUBMATRIX */}
        <div className="grid grid-cols-3 gap-2 text-left pt-3 border-t border-white/5 divide-x divide-white/5">
          <div className="pl-1">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Semanais</span>
            <span className="text-sm font-black text-white">{stats.weeklyCount} caps</span>
          </div>
          <div className="pl-3">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Quinzenais</span>
            <span className="text-sm font-black text-white">{stats.biweeklyCount} caps</span>
          </div>
          <div className="pl-3">
            <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Mensais</span>
            <span className="text-sm font-black text-white">{stats.monthlyCount} caps</span>
          </div>
        </div>
      </div>

      {/* Quick business tip */}
      <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 text-left mb-6">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">Super Retenção MS Barbearia</span>
          <p className="text-[8.5px] text-neutral-400 font-semibold leading-relaxed">
            Clientes com frequência definida faturam até <strong>3.7x mais</strong> e estabilizam seu fluxo de caixa mensal. Use o atalho <strong>Gerar Próximo</strong> no final desta lista para agendar automaticamente a próxima visita do cliente mantendo o mesmo horário estratégico!
          </p>
        </div>
      </div>

      {/* Advanced Filter options */}
      <div className="space-y-3 mb-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, barbeiro, serviço..."
            className="w-full liquid-glass/90 text-white placeholder-neutral-500 text-xs pl-10 pr-4 py-3 rounded-2xl  focus:border-amber-500 focus:outline-none transition-all font-semibold"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="liquid-glass absolute right-3 top-3 p-0.5 rounded-lg"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Tab switcher filters: all, weekly, biweekly, monthly */}
        <div className="flex gap-2 py-0.5 overflow-x-auto no-scrollbar scroll-smooth select-none">
          <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0 my-auto mr-1" />

          <button
            onClick={() => setRecurrenceFilter("all")}
            className={`text-[8.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
              recurrenceFilter === "all"
                ? "bg-amber-500 text-black border-amber-500"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Todos ({recurringAppointments.length})
          </button>

          <button
            onClick={() => setRecurrenceFilter("weekly")}
            className={`text-[8.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
              recurrenceFilter === "weekly"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Semanal ({recurringAppointments.filter(a => a.recurrence === "weekly").length})
          </button>

          <button
            onClick={() => setRecurrenceFilter("biweekly")}
            className={`text-[8.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
              recurrenceFilter === "biweekly"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Quinzenal ({recurringAppointments.filter(a => a.recurrence === "biweekly").length})
          </button>

          <button
            onClick={() => setRecurrenceFilter("monthly")}
            className={`text-[8.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
              recurrenceFilter === "monthly"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
            }`}
          >
            Mensal ({recurringAppointments.filter(a => a.recurrence === "monthly").length})
          </button>
        </div>
      </div>

      {/* Recurrences List stream */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filteredAppointments.map((app, idx) => {
            const dateObj = getAppDate(app.date);
            const rType = app.recurrence;
            const price = Number(app.totalPrice || app.price || 0);

            // Calculate human string for next date pre-booking preview
            let gapDays = 7;
            if (rType === "biweekly") gapDays = 14;
            else if (rType === "monthly") gapDays = 30;
            const previewNextDate = dateObj ? addDays(dateObj, gapDays) : null;

            return (
              <motion.div
                layout
                key={app.id}
                initial={{ opacity: 0, scale: 0.97, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                className=" liquid-glass/90 text-left p-5 rounded-[2rem]  shadow-xl hover:border-amber-500/20 transition-all relative overflow-hidden group"
              >
                {/* Glow accent decorative */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/[0.02] to-transparent pointer-events-none" />

                <div className="flex gap-4 items-start">
                  {/* Recurrence Circle Logo Icon */}
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/5 text-amber-500 border border-amber-500/10 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 animate-spin-slow text-amber-500" />
                  </div>

                  {/* Main Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[9px] text-neutral-400 font-extrabold uppercase">
                        {app.barberName || "Profissional"}
                      </span>
                      <span className="text-[8px] text-neutral-500 font-mono">
                        Último: {dateObj ? format(dateObj, "dd MMM • HH:mm", { locale: ptBR }) : (app.time || "")}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white uppercase italic tracking-tight truncate leading-tight">
                      {app.clientName || "Cliente Principal"}
                    </h4>

                    <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <span className="text-amber-500 font-black italic">{app.serviceName}</span>
                      <span>•</span>
                      <strong>R$ {price.toFixed(2).replace(".", ",")}</strong>
                    </p>

                    {/* Cadence switch dropdown buttons row */}
                    <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[7px] text-neutral-500 font-black uppercase tracking-wider mr-1">Ciclo:</span>
                      
                      <button
                        onClick={() => handleUpdateRecurrence(app.id, "weekly")}
                        disabled={actionInProgress === app.id + "-type"}
                        className={`text-[7.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all ${
                          rType === "weekly"
                            ? "bg-amber-500 text-black border-amber-500 font-black"
                            : "bg-black/40 text-neutral-500 border-white/5 hover:text-neutral-300"
                        }`}
                      >
                        Semanal
                      </button>

                      <button
                        onClick={() => handleUpdateRecurrence(app.id, "biweekly")}
                        disabled={actionInProgress === app.id + "-type"}
                        className={`text-[7.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all ${
                          rType === "biweekly"
                            ? "bg-amber-500 text-black border-amber-500 font-black"
                            : "bg-black/40 text-neutral-500 border-white/5 hover:text-neutral-300"
                        }`}
                      >
                        Quinzenal
                      </button>

                      <button
                        onClick={() => handleUpdateRecurrence(app.id, "monthly")}
                        disabled={actionInProgress === app.id + "-type"}
                        className={`text-[7.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all ${
                          rType === "monthly"
                            ? "bg-amber-500 text-black border-amber-500 font-black"
                            : "bg-black/40 text-neutral-500 border-white/5 hover:text-neutral-300"
                        }`}
                      >
                        Mensal
                      </button>

                      <button
                        onClick={() => handleUpdateRecurrence(app.id, "none")}
                        disabled={actionInProgress === app.id + "-type"}
                        className="text-[7.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-rose-500/10 border border-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-black hover:border-rose-500 rounded-lg transition-all"
                        title="Suspender modelo recorrente"
                      >
                        Parar
                      </button>
                    </div>

                    {/* Prebooking micro CTA action helper */}
                    {previewNextDate && (
                      <div className="pt-3.5 border-t border-white/5 mt-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <CalendarCheck2 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span className="text-[8px] text-neutral-400 font-medium">
                            Sugerir próxima: <strong className="text-amber-500 font-black">{format(previewNextDate, "dd/MM/yyyy")} às {app.time}</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => handlePreBookNextInstance(app)}
                          disabled={actionInProgress === app.id + "-prebook"}
                          className="px-3.5 py-2 bg-amber-500 text-black text-[8px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1"
                        >
                          {actionInProgress === app.id + "-prebook" ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <CalendarPlus className="w-3 h-3 text-black" />
                          )}
                          Gerar Próximo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cadence badge pill design */}
                <span className="absolute top-4 right-4 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/15">
                  {rType === "weekly" ? "Semanal" : rType === "biweekly" ? "Quinzenal" : "Mensal"}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredAppointments.length === 0 && (
          <div className="liquid-glass py-20 text-center space-y-4 rounded-[2.5rem] -dashed">
            <RefreshCw className="w-12 h-12 text-neutral-800 mx-auto" />
            <div className="space-y-0.5">
              <p className="text-xs text-neutral-500 uppercase font-black tracking-widest">Nenhuma Recorrência</p>
              <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest leading-normal max-w-xs mx-auto">
                Não localizamos nenhuma regra de agendamento recorrente ativa para os filtros atuais.
              </p>
            </div>
            {(recurrenceFilter !== "all" || searchTerm) && (
              <button
                onClick={() => {
                  setRecurrenceFilter("all");
                  setSearchTerm("");
                }}
                className="px-3.5 py-2 liquid-glass  hover:border-white/10 rounded-xl text-neutral-400 hover:text-white text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 mx-auto active:scale-95 transition-all"
              >
                Limpar Busca
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
