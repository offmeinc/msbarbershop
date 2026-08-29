import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  CheckCircle2, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Wallet, 
  Gift, 
  Clock, 
  Plus, 
  Trash2, 
  Package, 
  Scissors, 
  Sparkles, 
  Percent, 
  AlertCircle, 
  Receipt, 
  User, 
  Calendar, 
  Layers, 
  Loader2,
  FileText,
  ShieldCheck,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  increment,
  getDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CheckoutItem {
  id: string;
  name: string;
  type: "service" | "product" | "extra";
  price: number;
  quantity: number;
  inventoryId?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  services?: any[];
  onSuccess?: () => void;
  barberCommissionPercent?: number; // e.g. 50
}

export type PaymentMethod = 
  | "pix" 
  | "credit_card" 
  | "debit_card" 
  | "cash" 
  | "wallet_balance" 
  | "package_courtesy" 
  | "pending_bill";

export function CheckoutModal({
  isOpen,
  onClose,
  appointment,
  services = [],
  onSuccess,
  barberCommissionPercent = 50
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Items in checkout
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [surcharge, setSurcharge] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [commissionRate, setCommissionRate] = useState<number>(barberCommissionPercent);
  const [notes, setNotes] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [clientWalletBalance, setClientWalletBalance] = useState<number | null>(null);

  // Load Inventory and Client data when modal opens
  useEffect(() => {
    if (!isOpen || !appointment) return;

    // 1. Initial base service item
    const baseServicePrice = Number(appointment.totalPrice ?? appointment.price ?? 0) || 0;
    const initialItems: CheckoutItem[] = [
      {
        id: appointment.serviceId || "main-service",
        name: appointment.serviceName || "Serviço Principal",
        type: "service",
        price: baseServicePrice > 0 ? baseServicePrice : 35,
        quantity: 1
      }
    ];

    // If appointment had an addon attached
    if (appointment.addon && appointment.addon.name) {
      initialItems.push({
        id: `addon-${Date.now()}`,
        name: appointment.addon.name,
        type: "extra",
        price: Number(appointment.addon.price || 0),
        quantity: 1
      });
    }

    setItems(initialItems);
    setDiscount(0);
    setSurcharge(0);
    setPaymentMethod("pix");
    setPaymentStatus("paid");
    setCommissionRate(barberCommissionPercent || 50);
    setNotes(appointment.notes || "");

    // 2. Fetch inventory products for quick selection
    async function loadInventory() {
      try {
        setLoadingInventory(true);
        const q = query(collection(db, "inventory"));
        const snap = await getDocs(q);
        const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInventoryProducts(prods.filter((p: any) => (p.quantity ?? 1) > 0));
      } catch (err) {
        console.warn("Could not load inventory:", err);
      } finally {
        setLoadingInventory(false);
      }
    }

    // 3. Fetch client wallet balance if client is registered
    async function loadClientWallet() {
      if (!appointment.clientId || appointment.clientId === "guest") {
        setClientWalletBalance(null);
        return;
      }
      try {
        const uSnap = await getDoc(doc(db, "users", appointment.clientId));
        if (uSnap.exists()) {
          setClientWalletBalance(Number(uSnap.data().walletBalance || 0));
        }
      } catch {
        setClientWalletBalance(null);
      }
    }

    loadInventory();
    loadClientWallet();
  }, [isOpen, appointment, barberCommissionPercent]);

  // Adjust payment status automatically if pending_bill selected
  useEffect(() => {
    if (paymentMethod === "pending_bill") {
      setPaymentStatus("unpaid");
    } else {
      setPaymentStatus("paid");
    }
  }, [paymentMethod]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  const finalTotal = useMemo(() => {
    const total = subtotal - discount + surcharge;
    return Math.max(0, total);
  }, [subtotal, discount, surcharge]);

  const barberCommissionValue = useMemo(() => {
    return (finalTotal * (commissionRate / 100));
  }, [finalTotal, commissionRate]);

  const shopEarnings = useMemo(() => {
    return Math.max(0, finalTotal - barberCommissionValue);
  }, [finalTotal, barberCommissionValue]);

  // Handlers for Items
  const handleAddItem = (item: CheckoutItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, item];
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, delta: number) => {
    setItems(prev => {
      return prev.map((item, i) => {
        if (i === index) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setItems(prev => {
      return prev.map((item, i) => {
        if (i === index) {
          return { ...item, price: Math.max(0, newPrice) };
        }
        return item;
      });
    });
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const priceNum = parseFloat(customItemPrice.replace(",", ".")) || 0;
    handleAddItem({
      id: `custom-${Date.now()}`,
      name: customItemName.trim(),
      type: "extra",
      price: priceNum,
      quantity: 1
    });
    setCustomItemName("");
    setCustomItemPrice("");
    setShowAddCustom(false);
  };

  // Submit / Dar Baixa no Pagamento
  const handleCompleteCheckout = async () => {
    if (!appointment?.id) return;
    setLoading(true);

    try {
      const isPaid = paymentStatus === "paid";

      // 1. Update appointment in Firestore
      const appointmentRef = doc(db, "appointments", appointment.id);
      const updateData: any = {
        status: "completed",
        paymentStatus: isPaid ? "paid" : "unpaid",
        paymentMethod: paymentMethod,
        totalPrice: finalTotal,
        paidAmount: isPaid ? finalTotal : 0,
        subtotal: subtotal,
        discount: discount,
        surcharge: surcharge,
        commissionRate: commissionRate,
        commissionValue: barberCommissionValue,
        shopEarnings: shopEarnings,
        items: items,
        completedAt: serverTimestamp(),
        paidAt: isPaid ? serverTimestamp() : null,
        checkoutNotes: notes || ""
      };

      await updateDoc(appointmentRef, updateData);

      // 2. Decrement inventory stock for any physical products sold
      const productItems = items.filter(i => i.type === "product" && i.inventoryId);
      for (const p of productItems) {
        if (p.inventoryId) {
          try {
            const invRef = doc(db, "inventory", p.inventoryId);
            await updateDoc(invRef, {
              quantity: increment(-p.quantity),
              updatedAt: serverTimestamp()
            });
          } catch (invErr) {
            console.warn("Error updating product inventory stock:", invErr);
          }
        }
      }

      // 3. Deduct client wallet balance if payment method is wallet_balance
      if (paymentMethod === "wallet_balance" && appointment.clientId && appointment.clientId !== "guest") {
        try {
          const userRef = doc(db, "users", appointment.clientId);
          await updateDoc(userRef, {
            walletBalance: increment(-finalTotal),
            updatedAt: serverTimestamp()
          });
        } catch (wErr) {
          console.warn("Error updating client wallet balance:", wErr);
        }
      }

      // 4. Send customer notification / receipt
      try {
        await addDoc(collection(db, "notifications"), {
          clientId: appointment.clientId || "",
          clientEmail: appointment.clientEmail || "",
          type: "payment",
          message: `Atendimento Concluído! O pagamento de R$ ${finalTotal.toFixed(2)} foi recebido com sucesso via ${getPaymentMethodLabel(paymentMethod)}. Obrigado pela preferência! 💈`,
          timestamp: serverTimestamp(),
          read: false,
          appointmentId: appointment.id
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error during checkout:", err);
      handleFirestoreError(err, OperationType.UPDATE, "appointments");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case "pix": return "PIX";
      case "credit_card": return "Cartão de Crédito";
      case "debit_card": return "Cartão de Débito";
      case "cash": return "Dinheiro";
      case "wallet_balance": return "Saldo da Carteira";
      case "package_courtesy": return "Pacote / Cortesia";
      case "pending_bill": return "Fiado / A Receber";
      default: return method;
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <AnimatePresence>
      <div 
        id="checkout-modal-overlay"
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="checkout-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-neutral-950/95 border border-emerald-500/20 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left"
        >
          {/* 1. Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-neutral-900/80 to-neutral-950 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                    Concluir & Dar Baixa no Pagamento
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Checkout Rápido
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">
                  Ajuste serviços, adicione produtos e registre o faturamento realizado.
                </p>
              </div>
            </div>

            <button
              id="close-checkout-modal-btn"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. Scrollable Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar">

            {/* Client & Booking Summary Banner */}
            <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    {appointment.clientName || "Cliente"}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span>Profissional: <strong className="text-neutral-200">{appointment.barberName || "Barbeiro"}</strong></span>
                    {appointment.time && (
                      <span>• Horário: <strong className="text-neutral-200">{appointment.time}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {clientWalletBalance !== null && clientWalletBalance > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-right">
                  <span className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider block">
                    Saldo Cashback
                  </span>
                  <span className="text-xs font-black text-emerald-400">
                    R$ {clientWalletBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Section A: Items & Adjustments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Itens Cobrados no Atendimento</span>
                </h4>
                <span className="text-[10px] text-neutral-500">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Items List Table */}
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                {items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === "service" ? "bg-amber-500/10 text-amber-400" :
                        item.type === "product" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                      }`}>
                        {item.type === "service" && <Scissors className="w-4 h-4" />}
                        {item.type === "product" && <Package className="w-4 h-4" />}
                        {item.type === "extra" && <Sparkles className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {item.name}
                        </p>
                        <span className="text-[9px] uppercase font-bold text-neutral-500">
                          {item.type === "service" ? "Serviço" : item.type === "product" ? "Produto" : "Adicional"}
                        </span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-neutral-950 px-2 py-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => handleUpdateItemQuantity(idx, -1)}
                        className="w-5 h-5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center text-xs font-black cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-neutral-200 px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateItemQuantity(idx, 1)}
                        className="w-5 h-5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center text-xs font-black cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Price Input & Total */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 block">Valor Unit.</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-neutral-400">R$</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.price}
                            onChange={(e) => handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-neutral-950 border border-white/10 rounded-lg px-2 py-0.5 text-xs font-black text-emerald-400 text-right focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Add Buttons Bar */}
              <div className="flex flex-wrap gap-2 pt-1">
                
                {/* Add Service Quick Dropdown/Button */}
                {services && services.length > 0 && (
                  <div className="relative group">
                    <button
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>+ Serviço Extra</span>
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </button>
                    
                    {/* Popover list */}
                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-56 bg-neutral-900 border border-white/10 rounded-xl p-1.5 shadow-2xl z-20 space-y-1">
                      {services.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleAddItem({
                            id: s.id,
                            name: s.name,
                            type: "service",
                            price: Number(s.price || 0),
                            quantity: 1
                          })}
                          className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-white/5 text-xs text-neutral-300 hover:text-white flex justify-between items-center transition-colors"
                        >
                          <span className="truncate">{s.name}</span>
                          <strong className="text-emerald-400 font-bold ml-2">R$ {Number(s.price || 0).toFixed(2)}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Inventory Product Quick Dropdown/Button */}
                {inventoryProducts && inventoryProducts.length > 0 && (
                  <div className="relative group">
                    <button
                      className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>+ Produto (Pomada/Óleo)</span>
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    </button>

                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-neutral-900 border border-white/10 rounded-xl p-1.5 shadow-2xl z-20 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {inventoryProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAddItem({
                            id: `prod-${p.id}`,
                            inventoryId: p.id,
                            name: p.name,
                            type: "product",
                            price: Number(p.price || 0),
                            quantity: 1
                          })}
                          className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-white/5 text-xs text-neutral-300 hover:text-white flex justify-between items-center transition-colors"
                        >
                          <span className="truncate">{p.name} ({p.quantity} un)</span>
                          <strong className="text-emerald-400 font-bold ml-2">R$ {Number(p.price || 0).toFixed(2)}</strong>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Extra Button */}
                <button
                  onClick={() => setShowAddCustom(!showAddCustom)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Item Manual</span>
                </button>
              </div>

              {/* Custom Item Form */}
              {showAddCustom && (
                <div className="p-3 bg-neutral-900 border border-purple-500/30 rounded-2xl flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Nome do item (ex: Bebida, Taxa)"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1 min-w-[140px] bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center gap-1 w-28">
                    <span className="text-xs text-neutral-400 font-bold">R$</span>
                    <input
                      type="number"
                      placeholder="Valor"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      className="w-full bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    onClick={handleAddCustomItem}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowAddCustom(false)}
                    className="p-1.5 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Section B: Discounts & Surcharges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-neutral-900/40 border border-white/5 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-neutral-300">Desconto (R$)</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-500 font-bold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={discount || ""}
                    placeholder="0.00"
                    onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs font-black text-rose-400 text-right focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              </div>

              <div className="bg-neutral-900/40 border border-white/5 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-neutral-300">Acréscimo (R$)</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-500 font-bold">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={surcharge || ""}
                    placeholder="0.00"
                    onChange={(e) => setSurcharge(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 bg-neutral-950 border border-white/10 rounded-xl px-2.5 py-1 text-xs font-black text-emerald-400 text-right focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Payment Method Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Forma de Pagamento</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                
                {/* PIX */}
                <button
                  id="pay-pix-btn"
                  onClick={() => setPaymentMethod("pix")}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === "pix"
                      ? "bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80"
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider">PIX</span>
                </button>

                {/* Cartão de Crédito */}
                <button
                  id="pay-credit-btn"
                  onClick={() => setPaymentMethod("credit_card")}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === "credit_card"
                      ? "bg-blue-500/20 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Crédito</span>
                </button>

                {/* Cartão de Débito */}
                <button
                  id="pay-debit-btn"
                  onClick={() => setPaymentMethod("debit_card")}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === "debit_card"
                      ? "bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80"
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Débito</span>
                </button>

                {/* Dinheiro */}
                <button
                  id="pay-cash-btn"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === "cash"
                      ? "bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80"
                  }`}
                >
                  <Banknote className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Dinheiro</span>
                </button>

                {/* Saldo Carteira */}
                <button
                  id="pay-wallet-btn"
                  onClick={() => setPaymentMethod("wallet_balance")}
                  disabled={clientWalletBalance !== null && clientWalletBalance < finalTotal}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === "wallet_balance"
                      ? "bg-purple-500/20 border-purple-500 text-white shadow-lg shadow-purple-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  <Wallet className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Carteira</span>
                </button>

                {/* Pacote / Cortesia */}
                <button
                  id="pay-package-btn"
                  onClick={() => setPaymentMethod("package_courtesy")}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === "package_courtesy"
                      ? "bg-pink-500/20 border-pink-500 text-white shadow-lg shadow-pink-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80"
                  }`}
                >
                  <Gift className="w-5 h-5 text-pink-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Cortesia</span>
                </button>

                {/* Fiado / A Receber */}
                <button
                  id="pay-pending-btn"
                  onClick={() => setPaymentMethod("pending_bill")}
                  className={`p-3 rounded-2xl border col-span-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === "pending_bill"
                      ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/10"
                      : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/80"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Fiado / Pendente a Receber
                  </span>
                </button>

              </div>
            </div>

            {/* Section D: Commission Split & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Commission Calculator */}
              <div className="bg-neutral-900/40 border border-white/5 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    Comissão do Profissional
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-14 bg-neutral-950 border border-white/10 rounded-lg px-2 py-0.5 text-xs font-black text-amber-400 text-right focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-neutral-500 font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Profissional ({commissionRate}%):</span>
                    <strong className="text-amber-400 font-black">
                      R$ {barberCommissionValue.toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Barbearia ({100 - commissionRate}%):</span>
                    <strong className="text-emerald-400 font-black">
                      R$ {shopEarnings.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-neutral-900/40 border border-white/5 p-4 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  Observações do Atendimento
                </span>
                <textarea
                  rows={2}
                  placeholder="Ex: Pagamento parcelado, cliente gostou do degradê..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

            </div>

            {/* Total Highlight Card */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-500/30 p-5 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 block">
                  Valor Final a Receber
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    paymentStatus === "paid" 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                  }`}>
                    {paymentStatus === "paid" ? `Pago via ${getPaymentMethodLabel(paymentMethod)}` : "A Receber (Fiado)"}
                  </span>
                </div>
              </div>

              <button
                id="submit-checkout-btn"
                onClick={handleCompleteCheckout}
                disabled={loading}
                className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-neutral-950" />
                    <span>Concluir & Dar Baixa</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* 3. Footer */}
          <div className="p-4 border-t border-white/10 bg-neutral-950 flex items-center justify-between text-xs text-neutral-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Atualização instantânea no painel financeiro e estoque
            </span>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white font-bold cursor-pointer"
            >
              Cancelar
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
