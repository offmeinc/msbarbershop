import React, { useState, useEffect, FormEvent, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO, isAfter, isBefore, isWithinInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  query, 
  collection, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  addDoc, 
  deleteDoc 
} from "firebase/firestore";
import { 
  ChevronLeft, 
  Plus, 
  Tag, 
  Calendar, 
  Pencil, 
  BellOff, 
  CheckCircle2, 
  Trash2,
  Search,
  SlidersHorizontal,
  X,
  Copy,
  Info,
  CalendarCheck,
  Percent,
  Clock,
  Sparkles,
  TrendingUp,
  Flame,
  Check,
  AlertTriangle,
  FileMinus,
  Loader2
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { toast } from "../ui/Toast";

interface PromotionsManagerProps {
  onBack: () => void;
}

type PromoStatusFilter = "all" | "active" | "expired" | "upcoming";

export const PromotionsManager = ({ onBack }: PromotionsManagerProps) => {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromoStatusFilter>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    discountPercentage: "",
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    active: true
  });

  useEffect(() => {
    const q = query(collection(db, "promotions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "promotions");
    });
    return unsubscribe;
  }, []);

  const resetForm = () => {
    setFormData({
      code: "",
      discountPercentage: "",
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      active: true
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discountPercentage) {
      toast.error("Por favor, preencha o código e a porcentagem de desconto.");
      return;
    }

    const discountVal = Number(formData.discountPercentage);
    if (isNaN(discountVal) || discountVal < 1 || discountVal > 100) {
      toast.error("Por favor, insira um desconto entre 1% e 100%.");
      return;
    }

    if (isAfter(parseISO(formData.validFrom), parseISO(formData.validUntil))) {
      toast.error("A data de término deve ser após a data de início.");
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        code: formData.code.toUpperCase().replace(/\s+/g, "").trim(),
        discountPercentage: discountVal,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        active: formData.active,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "promotions", editingId), data);
        toast.success("Promoção atualizada de forma impecável! 🏷️✨");
      } else {
        // Enforce uniqueness constraints locally before adding if needed
        const alreadyExists = promotions.some(p => p.code === data.code);
        if (alreadyExists) {
          toast.error("Já existe um cupom cadastrado com este mesmo código.");
          setLoading(false);
          return;
        }

        await addDoc(collection(db, "promotions"), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast.success("Novo cupom promocional ativado! Boas vendas! 🔥🎟️");
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.WRITE : OperationType.WRITE, "promotions");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo: any) => {
    setEditingId(promo.id);
    setFormData({
      code: promo.code,
      discountPercentage: promo.discountPercentage.toString(),
      validFrom: promo.validFrom || format(new Date(), 'yyyy-MM-dd'),
      validUntil: promo.validUntil || format(new Date(), 'yyyy-MM-dd'),
      active: promo.active ?? true
    });
    setIsAdding(true);
  };

  const toggleActive = async (promo: any) => {
    setActionInProgress(promo.id);
    try {
      const nextState = !promo.active;
      await updateDoc(doc(db, "promotions", promo.id), {
         nextState,
        updatedAt: serverTimestamp()
      });
      toast.success(nextState ? `Cupom ${promo.code} desbloqueado com sucesso!` : `Cupom ${promo.code} pausado temporariamente.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "promotions");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Excluir cupom ${code}? Esta ação removerá a promoção permanentemente.`)) return;
    setActionInProgress(id + "-delete");
    try {
      await deleteDoc(doc(db, "promotions", id));
      toast.success("Código promocional removido com sucesso.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "promotions");
    } finally {
      setActionInProgress(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Código "${text}" copiado! Divulgue no WhatsApp 🚀`);
  };

  // Helper date status calculator
  const getPromoTimeStatus = (promo: any): { label: string; style: string; badge: string; color: string } => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const start = promo.validFrom;
    const end = promo.validUntil;

    if (!promo.active) {
      return { 
        label: "Pausado", 
        style: "bg-neutral-800 text-neutral-400 border-neutral-700/30", 
        badge: "Inativo",
        color: "text-neutral-500"
      };
    }

    if (todayStr > end) {
      return { 
        label: "Expirado", 
        style: "bg-rose-500/10 text-rose-400 border-rose-500/15", 
        badge: "Expirado",
        color: "text-rose-500"
      };
    }

    if (todayStr < start) {
      return { 
        label: "Agendado", 
        style: "bg-blue-500/10 text-blue-400 border-blue-500/15", 
        badge: "Futuro",
        color: "text-blue-500"
      };
    }

    return { 
      label: "Em vigor", 
      style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15", 
      badge: "Ativo",
      color: "text-emerald-500"
    };
  };

  // 1. Compute advanced promotions intelligence KPIs
  const metrics = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const activePromos = promotions.filter(p => p.active && todayStr >= p.validFrom && todayStr <= p.validUntil);
    const totalCount = promotions.length;
    const activeCount = activePromos.length;

    // Highest discount percentage
    let maxOff = 0;
    activePromos.forEach(p => {
      const discount = Number(p.discountPercentage || 0);
      if (discount > maxOff) maxOff = discount;
    });

    // Average discount factor
    const sumOff = activePromos.reduce((acc, curr) => acc + Number(curr.discountPercentage || 0), 0);
    const avgOff = activeCount > 0 ? Math.round(sumOff / activeCount) : 0;

    return {
      totalCount,
      activeCount,
      maxOff,
      avgOff
    };
  }, [promotions]);

  // 2. Perform search + status pills filtering
  const filteredPromotions = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    return promotions.filter(promo => {
      // Direct text search matching code
      const search = searchTerm.toLowerCase().trim();
      if (search && !(promo.code || "").toLowerCase().includes(search)) {
        return false;
      }

      // Filter by timeline state status
      if (statusFilter === "active") {
        const isActive = promo.active && todayStr >= promo.validFrom && todayStr <= promo.validUntil;
        if (!isActive) return false;
      } else if (statusFilter === "expired") {
        const isExpired = todayStr > promo.validUntil || !promo.active;
        if (!isExpired) return false;
      } else if (statusFilter === "upcoming") {
        const isUpcoming = promo.active && todayStr < promo.validFrom;
        if (!isUpcoming) return false;
      }

      return true;
    });
  }, [promotions, searchTerm, statusFilter]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md mx-auto py-8 px-5 min-h-screen pb-32 text-left"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 liquid-glass  rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-amber-500" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Promoções</h2>
            <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Cupons e Fidelidade</span>
          </div>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-3 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4 text-black" />
            Novo Cupom
          </button>
        )}
      </div>

      {/* KPI Stats intelligence summary matrix */}
      {!isAdding && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-left space-y-0.5">
              <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest block">Cupons em Vigor</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white tracking-tight">{metrics.activeCount}</span>
                <span className="text-[9px] text-neutral-400 font-extrabold uppercase">Ativos</span>
              </div>
            </div>

            <div className="w-14 h-14 rounded-full border border-amber-500/20 text-amber-500 bg-amber-500/5 flex items-center justify-center">
              <Flame className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-left pt-3 border-t border-white/5 divide-x divide-white/5">
            <div className="pl-1">
              <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Soma Cupons</span>
              <span className="text-sm font-black text-white">{metrics.totalCount} criados</span>
            </div>
            <div className="pl-3">
              <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Super Desconto</span>
              <span className="text-sm font-black text-emerald-400">{metrics.maxOff}% OFF</span>
            </div>
            <div className="pl-3">
              <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Desconto Médio</span>
              <span className="text-sm font-black text-amber-500">{metrics.avgOff}% OFF</span>
            </div>
          </div>
        </div>
      )}

      {/* Adding / Editing promotions forms layout */}
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className=" liquid-glass rounded-[2.5rem] p-6  space-y-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/[0.02] rounded-full blur-xl" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-[0.2em] italic">
                {editingId ? "Ajustar Código" : "Cadastrar Promoção"}
              </h3>
              <span className="text-[8px] font-mono text-neutral-500">PROMO-REGULATOR</span>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Código Promocional</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-4 w-4 h-4 text-neutral-500" />
                  <input 
                    value={formData.code} 
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Ex: CUPOMDEVOLTA20" 
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 pl-11 text-xs text-white focus:border-amber-500 focus:outline-none transition-all uppercase font-mono tracking-wider"
                    required
                  />
                </div>
                <span className="text-[7.5px] text-neutral-600 font-medium block pl-1">Apenas letras e números. Espaços serão removidos de forma automática.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Desconto (%)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-4 w-4 h-4 text-neutral-500" />
                  <input 
                    type="number"
                    value={formData.discountPercentage} 
                    onChange={e => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                    placeholder="Ex: 15" 
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 pl-11 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-black"
                    required
                    min="1"
                    max="100"
                  />
                  <span className="absolute right-4 top-4 text-neutral-500 font-extrabold text-xs">% OFF</span>
                </div>
              </div>

              {/* Validity boundaries inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Válido De</label>
                  <input 
                    type="date"
                    value={formData.validFrom} 
                    onChange={e => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-[10.5px] text-white focus:border-amber-500 focus:outline-none transition-all [color-scheme:dark]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Até (Exclusivo)</label>
                  <input 
                    type="date"
                    value={formData.validUntil} 
                    onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-[10.5px] text-white focus:border-amber-500 focus:outline-none transition-all [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              {/* Status activator toggle */}
              <div className="flex items-center justify-between p-4 liquid-glass rounded-2xl  mt-2 select-none">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Status Inicial</span>
                  <span className="text-[7.5px] text-neutral-600 block">Diz se o cupom já entra valendo.</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                    formData.active ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-250 ${
                    formData.active ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button 
                  type="button"
                  onClick={resetForm}
                  className="liquid-glass flex-1 text-neutral-400 hover:text-white py-3.5 rounded-2xl font-black uppercase italic text-[8.5px] tracking-widest  transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-500 text-black py-3.5 rounded-2xl font-black uppercase italic text-[8.5px] tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-black" />
                  ) : (
                    editingId ? "Atualizar" : "Ativar Cupom"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Advanced Filters block for listing */}
            <div className="space-y-3 mb-2 animate-fade-in">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome de código..."
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

              {/* Status pills selector filter */}
              <div className="flex gap-2 py-0.5 overflow-x-auto no-scrollbar scroll-smooth select-none">
                <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0 my-auto mr-1" />

                <button
                  onClick={() => setStatusFilter("all")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                    statusFilter === "all"
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Todos ({promotions.length})
                </button>

                <button
                  onClick={() => setStatusFilter("active")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                    statusFilter === "active"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Vigentes
                </button>

                <button
                  onClick={() => setStatusFilter("upcoming")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                    statusFilter === "upcoming"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Futuros
                </button>

                <button
                  onClick={() => setStatusFilter("expired")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shrink-0 transition-all ${
                    statusFilter === "expired"
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Pausados/Expirados
                </button>
              </div>
            </div>

            {/* List Stream */}
            <AnimatePresence initial={false}>
              {filteredPromotions.map((promo, idx) => {
                const clockStatus = getPromoTimeStatus(promo);
                const discount = Number(promo.discountPercentage || 0);
                const todayStr = format(new Date(), 'yyyy-MM-dd');

                // Compute expiration timeline remaining days proportion
                let validityProgressPercent = 100;
                let daysRemainingString = "";
                if (promo.validUntil && promo.validFrom) {
                  const startMs = parseISO(promo.validFrom).getTime();
                  const endMs = parseISO(promo.validUntil).getTime();
                  const nowMs = Math.min(Math.max(Date.now(), startMs), endMs);
                  
                  const totalDiff = endMs - startMs;
                  const currentDiff = endMs - nowMs;
                  validityProgressPercent = totalDiff > 0 ? (currentDiff / totalDiff) * 100 : 100;

                  // Friendly human remaining count
                  const diffDays = Math.ceil(currentDiff / (1000 * 60 * 60 * 24));
                  if (todayStr > promo.validUntil) {
                    daysRemainingString = "Cupom já expirou";
                  } else if (todayStr < promo.validFrom) {
                    daysRemainingString = "Iniciará em breve";
                  } else {
                    daysRemainingString = diffDays === 1 ? "Expira hoje!" : `Expira em ${diffDays} dias`;
                  }
                }

                return (
                  <motion.div 
                    layout
                    key={promo.id} 
                    initial={{ opacity: 0, scale: 0.97, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                    className={`bg-neutral-900 border transition-all p-5 rounded-[2.2rem] relative overflow-hidden group text-left ${
                      promo.active && todayStr <= promo.validUntil 
                        ? 'border-white/5 hover:border-amber-500/25 shadow-xl' 
                        : 'border-white/5 opacity-65 hover:opacity-100'
                    }`}
                  >
                    {/* Glowing structural background element depending of state */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/[0.01] pointer-events-none" />

                    {/* Timeline Expiration Progress micro visual Bar */}
                    {promo.active && todayStr <= promo.validUntil && (
                      <div className="liquid-glass absolute bottom-0 left-0 w-full h-[3px]">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            validityProgressPercent < 20 
                              ? 'bg-rose-500' 
                              : validityProgressPercent < 50 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${validityProgressPercent}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-4 flex-1 min-w-0">
                        
                        {/* Key tags line header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Code icon tag indicator */}
                          <div className="w-10 h-10 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                            <Tag className="w-5 h-5 text-amber-500" />
                          </div>
                          
                          <div>
                            {/* Copy button inline click wrap */}
                            <button
                              onClick={() => copyToClipboard(promo.code)}
                              className="group/code flex items-center gap-1.5 text-lg font-black italic uppercase tracking-tight text-white mb-0.5 hover:text-amber-500 transition-colors text-left font-mono active:scale-95"
                              title="Clique de alta velocidade para copiar código"
                            >
                              <span>{promo.code}</span>
                              <Copy className="w-3.5 h-3.5 text-neutral-500 group-hover/code:text-amber-500 transition-colors" />
                            </button>
                            <span className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest block">
                              🏷️ {discount}% DE RECORTE EXTRA
                            </span>
                          </div>
                        </div>
                        
                        {/* Validity dates labels matrix */}
                        <div className="flex items-center gap-4 text-[9px] font-extrabold text-neutral-500 uppercase tracking-widest flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-neutral-600" />
                            De: {promo.validFrom ? format(parseISO(promo.validFrom), "dd/MM/yyyy", { locale: ptBR }) : "--"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-neutral-600" />
                            Até: {promo.validUntil ? format(parseISO(promo.validUntil), "dd/MM/yyyy", { locale: ptBR }) : "--"}
                          </div>
                        </div>

                        {/* Diagnostics timeline remaining days pill */}
                        {daysRemainingString && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-[8px] font-extrabold text-neutral-400 uppercase tracking-wider">
                              {daysRemainingString}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Control buttons dashboard sidebar */}
                      <div className="flex flex-col gap-1.5 shrink-0 select-none">
                        {/* Active toggle button */}
                        <button 
                          onClick={() => toggleActive(promo)}
                          disabled={actionInProgress === promo.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
                            promo.active 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/15 hover:bg-rose-500 hover:text-black' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15 hover:bg-emerald-500 hover:text-black'
                          }`}
                          title={promo.active ? "Bloquear ou Pausar Cupom" : "Ativar Cupom"}
                        >
                          {actionInProgress === promo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          ) : promo.active ? (
                            <BellOff className="w-4 h-4 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                          )}
                        </button>

                        {/* Edit properties button */}
                        <button 
                          onClick={() => handleEdit(promo)}
                          className="p-2.5 liquid-glass  hover:border-white/10 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center shadow-md"
                          title="Fazer ajustes no código ou validade"
                        >
                          <Pencil className="w-4 h-4 text-neutral-400" />
                        </button>

                        {/* Super Trash permanent delete button */}
                        <button 
                          onClick={() => handleDelete(promo.id, promo.code)}
                          disabled={actionInProgress === promo.id + "-delete"}
                          className="p-2.5 liquid-glass hover:bg-rose-900/10  hover:border-rose-500/25 rounded-xl text-neutral-600 hover:text-rose-500 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center shadow-md"
                          title="Excluir cupom永久mente"
                        >
                          {actionInProgress === promo.id + "-delete" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status Badge Tag */}
                    <div className="absolute top-4 right-4 pointer-events-none select-none">
                      <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${clockStatus.style} border`}>
                        {clockStatus.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty list template scenario */}
            {filteredPromotions.length === 0 && (
              <div className="liquid-glass py-20 text-center space-y-4 rounded-[2.5rem] -dashed">
                <FileMinus className="w-12 h-12 text-neutral-800 mx-auto" />
                <div>
                  <h3 className="text-xs font-black text-white uppercase italic tracking-widest">Nenhum Registro</h3>
                  <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest max-w-[200px] mx-auto mt-2 leading-relaxed">
                    Não encontramos cupons com os parâmetros selecionados. Modifique filtros de busca ou crie um regulador novo.
                  </p>
                </div>
                {(statusFilter !== "all" || searchTerm) && (
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setSearchTerm("");
                    }}
                    className="px-3.5 py-2 liquid-glass  hover:border-white/10 rounded-xl text-neutral-400 hover:text-white text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 mx-auto active:scale-95"
                  >
                    Zerar Filtros
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
