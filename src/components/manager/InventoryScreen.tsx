import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { 
  ArrowLeft, 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Minus,
  PlusCircle,
  X,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  ShieldAlert,
  Archive,
  ArrowRight,
  RefreshCw,
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "../ui/Toast";

type StockFilter = "all" | "low" | "excess" | "high_value";

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 0,
    price: 0,
    minQuantity: 5
  });

  useEffect(() => {
    const q = query(collection(db, "inventory"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "inventory");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Por favor, preencha o nome do produto.");
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        quantity: Number(formData.quantity) || 0,
        price: Number(formData.price) || 0,
        minQuantity: Number(formData.minQuantity) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, "inventory", editingProduct.id), {
          ...itemData,
          createdAt: editingProduct.createdAt || serverTimestamp()
        });
        toast.success("Produto editado e sincronizado no estoque! 📦✨");
      } else {
        await addDoc(collection(db, "inventory"), {
          ...itemData,
          createdAt: serverTimestamp()
        });
        toast.success("Novo produto adicionado com sucesso ao estoque! 🔥🛒");
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, "inventory");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    setFormData({ name: "", description: "", quantity: 0, price: 0, minQuantity: 5 });
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      quantity: product.quantity || 0,
      price: product.price || 0,
      minQuantity: product.minQuantity || 5
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir item "${name}" permanentemente? Esta ação removerá o registro do estoque.`)) return;
    setActionInProgress(id + "-delete");
    try {
      await deleteDoc(doc(db, "inventory", id));
      toast.success("Item removido do estoque.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "inventory");
    } finally {
      setActionInProgress(null);
    }
  };

  // Action: 1-Click inline increment quantity
  const handleInlineQuantityChange = async (product: any, delta: number) => {
    const currentQty = Number(product.quantity || 0);
    const newQty = Math.max(0, currentQty + delta);
    if (currentQty === newQty) return;

    setActionInProgress(product.id + "-qty");
    try {
      await updateDoc(doc(db, "inventory", product.id), {
        quantity: newQty,
        updatedAt: serverTimestamp()
      });
      // Contextual feedback toast
      if (delta > 0) {
        toast.success(`Estoque incrementado para "${product.name}" (+${delta}) 📦`);
      } else {
        toast.success(`Estoque reduzido para "${product.name}" (${delta}) 📉`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar quantidade.");
    } finally {
      setActionInProgress(null);
    }
  };

  // 1. Calculate Intel KPIs from whole stock
  const metrics = useMemo(() => {
    const totalRecords = products.length;
    let totalItemsSum = 0;
    let totalEstimatedValue = 0;
    let criticalItemsCount = 0;

    products.forEach(p => {
      const q = Number(p.quantity || 0);
      const pr = Number(p.price || 0);
      const minVal = Number(p.minQuantity || 0);

      totalItemsSum += q;
      totalEstimatedValue += (q * pr);
      if (q <= minVal) {
        criticalItemsCount++;
      }
    });

    return {
      totalRecords,
      totalItemsSum,
      totalEstimatedValue,
      criticalItemsCount
    };
  }, [products]);

  // 2. Perform search matcher + category pill filtering
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Keyword matcher filter
      if (searchQuery.trim()) {
        const queryClean = searchQuery.toLowerCase().trim();
        const mainMatch = p.name.toLowerCase().includes(queryClean);
        const descMatch = (p.description || "").toLowerCase().includes(queryClean);
        if (!mainMatch && !descMatch) return false;
      }

      // 2. Advanced Status pill options
      if (stockFilter === "low") {
        return Number(p.quantity || 0) <= Number(p.minQuantity || 0);
      } else if (stockFilter === "excess") {
        return Number(p.quantity || 0) > Number(p.minQuantity || 0) * 3;
      } else if (stockFilter === "high_value") {
        return Number(p.price || 0) >= 49.90;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize putting low/critical stock items at the top
      const isCriticalA = Number(a.quantity || 0) <= Number(a.minQuantity || 0);
      const isCriticalB = Number(b.quantity || 0) <= Number(b.minQuantity || 0);
      if (isCriticalA && !isCriticalB) return -1;
      if (!isCriticalA && isCriticalB) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery, stockFilter]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md mx-auto py-8 px-5 min-h-[100dvh] pb-32 text-left"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 liquid-glass  rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-amber-500" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Estoque</h2>
            <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Controle e Reposição</span>
          </div>
        </div>
        {!showAddForm && (
          <button 
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: "", description: "", quantity: 0, price: 0, minQuantity: 5 });
              setShowAddForm(true);
            }}
            className="px-4 py-3 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
          >
            <Plus className="w-4 h-4 text-black" />
            Adicionar
          </button>
        )}
      </div>

      {/* Advanced metrics & value estimator KPIs */}
      {!showAddForm && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-left space-y-0.5">
              <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest block">Patrimônio em Gôndolas</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white tracking-tight">
                  R$ {metrics.totalEstimatedValue.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-[9px] text-neutral-400 font-extrabold uppercase">Estoque Estimado</span>
              </div>
            </div>

            <div className="w-14 h-14 rounded-full border border-amber-500/20 text-amber-500 bg-amber-500/5 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-left pt-3 border-t border-white/5 divide-x divide-white/5">
            <div className="pl-1">
              <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Qtd Total</span>
              <span className="text-sm font-black text-white">{metrics.totalItemsSum} itens</span>
            </div>
            <div className="pl-3">
              <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block">Em Alerta</span>
              <span className={`text-sm font-black ${metrics.criticalItemsCount > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {metrics.criticalItemsCount} itens
              </span>
            </div>
            <div className="pl-3">
              <span className="text-[7.5px] font-black text-neutral-500 uppercase tracking-widest block font-sans">Cadastrados</span>
              <span className="text-sm font-black text-amber-500">{metrics.totalRecords} prod.</span>
            </div>
          </div>
        </div>
      )}

      {/* Critial status / missing warning dashboard notice */}
      {!showAddForm && metrics.criticalItemsCount > 0 && (
        <div className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-2xl flex gap-3 text-left mb-6">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Estoque Crítico Detectado ⚠️</span>
            <p className="text-[8.5px] text-neutral-400 font-semibold leading-relaxed">
              Você possui <strong>{metrics.criticalItemsCount} produtos</strong> no limite mínimo ideal de prateleira. Clique no botão de filtro "Críticos" logo abaixo para identificar as falhas e planejar pedidos com seus fornecedores.
            </p>
          </div>
        </div>
      )}

      {/* Adding / Saving products form workflow */}
      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className=" liquid-glass rounded-[2.5rem] p-6  space-y-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/[0.02] rounded-full blur-xl" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-2">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-[0.2em] italic">
                {editingProduct ? "Configurar Item" : "Cadastrar Item"}
              </h3>
              <span className="text-[8px] font-mono text-neutral-500">INVENTORY-DESK</span>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Nome do Produto</label>
                <div className="relative">
                  <Package className="absolute left-4 top-4 w-4 h-4 text-neutral-500" />
                  <input 
                    value={formData.name} 
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Pomada Efeito Matte Premium" 
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 pl-11 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Descrição do Produto</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhamento opcional do fornecedor ou do uso em bancada..." 
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-amber-500 focus:outline-none transition-all h-20 resize-none font-semibold leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Disponível</label>
                  <input 
                    type="number"
                    value={formData.quantity} 
                    onChange={e => setFormData(prev => ({ ...prev, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-black text-center"
                    required
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Valor Venda (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={formData.price} 
                    onChange={e => setFormData(prev => ({ ...prev, price: Math.max(0, parseFloat(e.target.value) || 0) }))}
                    placeholder="0.00"
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-black text-center"
                    required
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1 block">Limite Alerta</label>
                  <input 
                    type="number"
                    value={formData.minQuantity} 
                    onChange={e => setFormData(prev => ({ ...prev, minQuantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-black text-center"
                    required
                    min="0"
                  />
                </div>
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
                    editingProduct ? "Salvar" : "Ativar Item"
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
            {/* Action Bar Search + Filtering tabs layout row */}
            <div className="space-y-3 mb-2 animate-fade-in">
              {/* Custom Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Procurar mercadoria pelo nome ou marca..."
                  className="w-full liquid-glass/90 text-white placeholder-neutral-500 text-xs pl-10 pr-4 py-3 rounded-2xl  focus:border-amber-500 focus:outline-none transition-all font-semibold"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
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
                  onClick={() => setStockFilter("all")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
                    stockFilter === "all"
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Todos ({products.length})
                </button>

                <button
                  onClick={() => setStockFilter("low")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
                    stockFilter === "low"
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Críticos ({products.filter(p => Number(p.quantity || 0) <= Number(p.minQuantity || 5)).length})
                </button>

                <button
                  onClick={() => setStockFilter("high_value")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
                    stockFilter === "high_value"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Ticket Alto (R$49+)
                </button>

                <button
                  onClick={() => setStockFilter("excess")}
                  className={`text-[8px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full border shrink-0 transition-all ${
                    stockFilter === "excess"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : "bg-black/20 text-neutral-500 border-white/5 hover:border-white/10"
                  }`}
                >
                  Abundantes
                </button>
              </div>
            </div>

            {/* List Stream loop */}
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {filteredProducts.map((product, idx) => {
                  const qty = Number(product.quantity || 0);
                  const min = Number(product.minQuantity || 5);
                  const isLow = qty <= min;
                  const price = Number(product.price || 0);

                  return (
                    <motion.div
                      layout
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.97, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                      className={`bg-neutral-900 border transition-all p-5 rounded-[2.2rem] relative overflow-hidden group text-left ${
                        isLow ? 'border-rose-500/20 hover:border-rose-500/30 shadow-lg shadow-rose-500/[0.01]' : 'border-white/5 hover:border-amber-500/25 shadow-xl'
                      }`}
                    >
                      {/* Decorative internal card gradients */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/[0.01] pointer-events-none" />

                      <div className="flex gap-4 items-start pb-4 border-b border-white/5">
                        {/* Package Type visual icon indicator */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isLow 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                            : 'bg-amber-500/5 border-amber-500/10 text-amber-500'
                        }`}>
                          <Package className="w-5 h-5" />
                        </div>

                        {/* Product parameters details information columns */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              isLow ? "bg-rose-500/10 text-rose-400 border border-rose-500/15" : "bg-neutral-800 text-neutral-400 border border-neutral-700/30"
                            }`}>
                              {isLow ? "Reposição Crítica" : "Em Estoque"}
                            </span>
                            <span className="text-[8px] text-neutral-500 font-mono">
                              Mín: {min} unidades
                            </span>
                          </div>

                          <h3 className="text-sm font-black text-white uppercase italic tracking-tight truncate leading-tight mt-1">
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="text-[10px] text-neutral-500 font-medium line-clamp-1">
                              {product.description}
                            </p>
                          )}

                          <p className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-widest pt-1 flex items-center gap-1.5">
                            <span className="text-emerald-400 font-black italic">R$ {price.toFixed(2).replace(".", ",")}</span>
                            <span>•</span>
                            <span className="text-neutral-500">Total: R$ {(qty * price).toFixed(2).replace(".", ",")}</span>
                          </p>
                        </div>

                        {/* Traditional control Actions on right side */}
                        <div className="flex flex-col gap-1.5 shrink-0 select-none opacity-40 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          
                          {/* edit item properties configuration popup trigger */}
                          <button 
                            onClick={() => handleEdit(product)}
                            className="p-2 liquid-glass  hover:border-white/10 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center shadow-md"
                            title="Alterar metadados ou quantidade mínima"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete catalog item */}
                          <button 
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={actionInProgress === product.id + "-delete"}
                            className="p-2 liquid-glass hover:bg-rose-900/10  hover:border-rose-500/25 rounded-xl text-neutral-600 hover:text-rose-500 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center shadow-md"
                            title="Remover produto do estoque"
                          >
                            {actionInProgress === product.id + "-delete" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Inline ultra-fast quantity counter dashboard section */}
                      <div className="pt-3 flex items-center justify-between gap-4">
                        <span className="text-[8.5px] font-black uppercase text-neutral-500 tracking-wider">
                          Alteração rápida de estoque:
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Decrease inventory target */}
                          <button
                            onClick={() => handleInlineQuantityChange(product, -1)}
                            disabled={qty <= 0 || actionInProgress === product.id + "-qty"}
                            className="w-8 h-8 rounded-lg liquid-glass  flex items-center justify-center text-neutral-400 hover:text-rose-400 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-rose-500/5 hover:border-rose-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                            title="Remover 1 item do estoque"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="px-3 min-w-[3rem] text-center select-none py-1 bg-black rounded-lg border border-white/5">
                            <span className={`text-xs font-black tracking-tight ${isLow ? 'text-rose-500' : 'text-white'}`}>
                              {qty}
                            </span>
                            <span className="text-[6.5px] block font-black uppercase tracking-widest text-neutral-500 leading-none">
                              UNID
                            </span>
                          </div>

                          {/* Increase inventory target */}
                          <button
                            onClick={() => handleInlineQuantityChange(product, 1)}
                            disabled={actionInProgress === product.id + "-qty"}
                            className="w-8 h-8 rounded-lg liquid-glass  flex items-center justify-center text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                            title="Adicionar 1 item ao estoque"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredProducts.length === 0 && (
                <div className="liquid-glass py-20 text-center space-y-4 rounded-[2.5rem] -dashed">
                  <Archive className="w-12 h-12 text-neutral-800 mx-auto" />
                  <div>
                    <h3 className="text-xs font-black text-white uppercase italic tracking-widest">Nenhuma Mercadoria</h3>
                    <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest max-w-[200px] mx-auto mt-2 leading-relaxed">
                      Não localizamos produtos com a busca ou filtros selecionados. Redefina a busca ou adicione um novo produto.
                    </p>
                  </div>
                  {(stockFilter !== "all" || searchQuery) && (
                    <button
                      onClick={() => {
                        setStockFilter("all");
                        setSearchQuery("");
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
