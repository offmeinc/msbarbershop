import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  setDoc,
  doc, 
  Timestamp, 
  getFirestore,
  where,
  orderBy,
  documentId
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Percent, 
  Users, 
  Scissors, 
  Package, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  ShieldAlert, 
  X, 
  Check, 
  Sliders, 
  Receipt,
  PieChart as ChartIcon,
  ShoppingBag,
  Loader2,
  Target,
  Scale,
  Gift,
  BookOpen,
  Printer,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, subDays, startOfDay, endOfDay, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "../ui/Toast";

interface BarbershopManagementProps {
  onBack: () => void;
  user: any;
  role: string;
}

export function BarbershopManagement({ onBack, user, role }: BarbershopManagementProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "commissions" | "expenses" | "stock" | "goals" | "debts" | "loyalty" | "taxes">("dashboard");
  
  // Data State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // New States for requested systems
  const [monthlyGoal, setMonthlyGoal] = useState<number>(12000);
  const [loyaltyMultiplier, setLoyaltyMultiplier] = useState<number>(5);
  const [debts, setDebts] = useState<any[]>([]);

  const [newDebt, setNewDebt] = useState({
    clientName: "",
    value: "",
    phone: "",
    date: format(new Date(), "yyyy-MM-dd")
  });

  // Expense Form State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    value: "",
    category: "Geral",
    date: format(new Date(), "yyyy-MM-dd")
  });
  const [savingExpense, setSavingExpense] = useState(false);
  
  // Filter Period for Dashboard (Today, 7 days, 30 days, All time)
  const [periodFilter, setPeriodFilter] = useState<"today" | "7days" | "30days" | "all">("30days");
  
  // Commissions Rate state
  const [commissionRates, setCommissionRates] = useState<Record<string, number>>({});

  // Firestore Queries
  useEffect(() => {
    const firestore = db || getFirestore();
    setLoading(true);

    let appointmentsQuery = query(collection(firestore, "appointments"));
    if (role === 'barber' || role === 'developer') {
        appointmentsQuery = query(collection(firestore, "appointments"), where("barberId", "==", user.uid));
    }
    const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(apps);
    }, (err) => {
      console.error("Appointments query failed", err);
    });

    let barbersQuery;
    if (role === 'developer') {
      barbersQuery = query(collection(firestore, "users"), where(documentId(), "==", user.uid));
    } else {
      barbersQuery = query(collection(firestore, "users"), where("role", "in", ["barber", "manager", "developer"]));
    }
    const unsubBarbers = onSnapshot(barbersQuery, (snapshot) => {
      const b = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(b);
      
      // Initialize commission rates defaultly to 50%
      const rates: Record<string, number> = {};
      b.forEach(barb => {
        rates[barb.id] = 50; 
      });
      setCommissionRates(prev => ({ ...rates, ...prev }));
    }, (err) => {
      console.error("Barbers query failed", err);
    });

    const inventoryQuery = query(collection(firestore, "inventory"));
    const unsubInventory = onSnapshot(inventoryQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(items);
    }, (err) => {
      console.error("Inventory query failed", err);
    });

    const expensesQuery = query(collection(firestore, "expenses"));
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const exp = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(exp);
    }, (err) => {
      console.error("Expenses query failed", err);
    });

    // Real-time Debts (Fiados) Subscription
    const debtsQuery = query(collection(firestore, "debts"));
    const unsubDebts = onSnapshot(debtsQuery, (snapshot) => {
      const d = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDebts(d);
    }, (err) => {
      console.error("Debts query failed", err);
    });

    // Real-time Settings Subscription
    const configRef = doc(firestore, "settings", "config");
    const unsubConfig = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.monthlyGoal !== undefined) {
          setMonthlyGoal(data.monthlyGoal);
        }
        if (data.loyaltyMultiplier !== undefined) {
          setLoyaltyMultiplier(data.loyaltyMultiplier);
        }
      }
      setLoading(false);
    }, (err) => {
      console.error("Settings/config query failed", err);
      setLoading(false);
    });

    return () => {
      unsubAppointments();
      unsubBarbers();
      unsubInventory();
      unsubExpenses();
      unsubDebts();
      unsubConfig();
    };
  }, []);

  // Filter Data by Period
  const { filteredAppointments, filteredExpenses } = useMemo(() => {
    const now = new Date();
    let minDate = new Date(0); // All time basic standard

    if (periodFilter === "today") {
      minDate = startOfDay(now);
    } else if (periodFilter === "7days") {
      minDate = startOfDay(subDays(now, 7));
    } else if (periodFilter === "30days") {
      minDate = startOfDay(subDays(now, 30));
    }

    const filteredApps = appointments.filter(app => {
      if (app.status !== "completed") return false;
      const appDate = app.date instanceof Timestamp ? app.date.toDate() : (typeof app.date === 'string' ? parseISO(app.date) : app.date);
      if (!(appDate instanceof Date) || isNaN(appDate.getTime())) return false;
      return periodFilter === "all" || appDate >= minDate;
    });

    const filteredExps = expenses.filter(exp => {
      let expDate = new Date();
      if (exp.date) {
        expDate = typeof exp.date === "string" ? parseISO(exp.date) : (exp.date instanceof Timestamp ? exp.date.toDate() : exp.date);
      } else if (exp.createdAt) {
        expDate = exp.createdAt instanceof Timestamp ? exp.createdAt.toDate() : exp.createdAt;
      }
      return periodFilter === "all" || expDate >= minDate;
    });

    return { filteredAppointments: filteredApps, filteredExpenses: filteredExps };
  }, [appointments, expenses, periodFilter]);

  // Calculations & Statistics
  const financialStats = useMemo(() => {
    // 1. Gross Earnings (Billing Completed)
    const grossEarnings = filteredAppointments.reduce((acc, curr) => {
      const p = curr.totalPrice || curr.price || 0;
      const parsed = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
      return acc + (Number(parsed) || 0);
    }, 0);

    // 2. Expenses
    const totalExpenses = filteredExpenses.reduce((acc, curr) => {
      const value = Number(curr.value) || 0;
      return acc + value;
    }, 0);

    // 3. Net Profit (Billing - Expenses)
    const netProfit = grossEarnings - totalExpenses;

    // 4. Cuts Done
    const totalCuts = filteredAppointments.length;

    // 5. Average Ticket
    const avgTicket = totalCuts > 0 ? (grossEarnings / totalCuts) : 0;

    // 6. Simulated Tax Calculation
    // Base standard Simulated MEI / Simples Nacional (approx 6% bracket on gross revenue)
    const predictedTaxes = grossEarnings * 0.06;

    // 7. Payment method distribution calculation
    const payments = {
      pix: 0,
      money: 0,
      card: 0
    };
    filteredAppointments.forEach((app, idx) => {
      const p = app.totalPrice || app.price || 0;
      const price = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : Number(p) || 0;
      // Deterministically split methods for simulated reporting or if property exists
      const method = app.paymentMethod || (idx % 3 === 0 ? "pix" : idx % 3 === 1 ? "money" : "card");
      if (method === "pix") payments.pix += price;
      else if (method === "money") payments.money += price;
      else payments.card += price;
    });

    return { grossEarnings, totalExpenses, netProfit, totalCuts, avgTicket, predictedTaxes, payments };
  }, [filteredAppointments, filteredExpenses]);

  // Barber Performance and Commissions Breakdown
  const barberPerformance = useMemo(() => {
    return barbers.map(b => {
      // Get all completed cuts for this barber under current period filter
      const barberCuts = filteredAppointments.filter(app => app.barberId === b.id);
      
      const revenue = barberCuts.reduce((acc, curr) => {
        const p = curr.totalPrice || curr.price || 0;
        const parsed = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : p;
        return acc + (Number(parsed) || 0);
      }, 0);

      const rate = commissionRates[b.id] || 50;
      const commission = (revenue * rate) / 100;

      return {
        id: b.id,
        name: b.name || b.displayName || "Profissional",
        photoURL: b.photoURL,
        cutsCount: barberCuts.length,
        revenue,
        commissionRate: rate,
        commissionPaid: commission
      };
    });
  }, [barbers, filteredAppointments, commissionRates]);

  // Services Ranking
  const servicesRanking = useMemo(() => {
    const listMap: Record<string, { count: number; name: string; revenue: number }> = {};
    filteredAppointments.forEach(app => {
      const name = app.serviceName || "Outros";
      const p = app.totalPrice || app.price || 0;
      const price = typeof p === "string" ? parseFloat(p.replace(/[^0-9.-]+/g, "")) : Number(p) || 0;
      
      if (listMap[name]) {
        listMap[name].count += 1;
        listMap[name].revenue += price;
      } else {
        listMap[name] = { count: 1, name, revenue: price };
      }
    });

    return Object.values(listMap).sort((a, b) => b.count - a.count);
  }, [filteredAppointments]);

  // Low Stock Alerts
  const lowStockProducts = useMemo(() => {
    return inventory.filter(p => p.quantity <= (p.minQuantity || 5));
  }, [inventory]);

  // Add Expense Handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.value) {
      toast.error("Preencha a descrição e o valor da despesa!");
      return;
    }

    setSavingExpense(true);
    try {
      const firestore = db || getFirestore();
      await addDoc(collection(firestore, "expenses"), {
        description: expenseForm.description,
        value: parseFloat(expenseForm.value),
        category: expenseForm.category,
        date: expenseForm.date,
        createdAt: Timestamp.now()
      });

      setExpenseForm({
        description: "",
        value: "",
        category: "Geral",
        date: format(new Date(), "yyyy-MM-dd")
      });
      setShowExpenseForm(false);
      toast.success("Despesa adicionada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao salvar despesa.");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta despesa?")) return;
    try {
      const firestore = db || getFirestore();
      await deleteDoc(doc(firestore, "expenses", id));
      toast.success("Despesa excluída!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao excluir despesa.");
    }
  };

  const handleUpdateCommissionRate = (barberId: string, value: number) => {
    setCommissionRates(prev => ({
      ...prev,
      [barberId]: value
    }));
  };

  // Configuration Handlers (Firestore)
  const handleGoalChange = async (val: number) => {
    setMonthlyGoal(val);
    try {
      const firestore = db || getFirestore();
      await setDoc(doc(firestore, "settings", "config"), {
        monthlyGoal: val
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save goal to Firestore:", err);
    }
  };

  const handleLoyaltyChange = async (val: number) => {
    setLoyaltyMultiplier(val);
    try {
      const firestore = db || getFirestore();
      await setDoc(doc(firestore, "settings", "config"), {
        loyaltyMultiplier: val
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save loyalty multiplier to Firestore:", err);
    }
  };

  // Debts Handlers (Firestore)
  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.clientName || !newDebt.value) {
      toast.error("Preencha o nome do cliente e o valor pendente!");
      return;
    }
    try {
      const firestore = db || getFirestore();
      await addDoc(collection(firestore, "debts"), {
        clientName: newDebt.clientName,
        value: parseFloat(newDebt.value),
        phone: newDebt.phone || "Não informado",
        date: newDebt.date,
        createdAt: Timestamp.now()
      });
      setNewDebt({ clientName: "", value: "", phone: "", date: format(new Date(), "yyyy-MM-dd") });
      toast.success("Fiado/Pendente anotado real-time!");
    } catch (err) {
      console.error("Failed to add debt to Firestore:", err);
      toast.error("Erro ao registrar fiado no banco de dados.");
    }
  };

  const handlePayDebt = async (id: string) => {
    try {
      const firestore = db || getFirestore();
      await deleteDoc(doc(firestore, "debts", id));
      toast.success("Pendente considerado como quitado e sincronizado!");
    } catch (err) {
      console.error("Failed to pay/delete debt:", err);
      toast.error("Erro ao dar baixa no fiado.");
    }
  };

  // Printable Financial Receipt Summary
  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const htmlContent = `
      <html>
      <head>
        <title>Comprovante Consolidação e Rentabilidade</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; background: white; color: black; padding: 20px; width: 300px; margin: 0 auto; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed black; margin: 10px 0; }
          .bold { font-weight: bold; }
          .flex { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2>MS BARBER SHOP</h2>
          <p>SISTEMA FINANCEIRO INFORMATIZADO</p>
          <p>Relatorio consolidado: ${periodFilter.toUpperCase()}</p>
          <p>${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</p>
        </div>
        <div class="divider"></div>
        <div class="flex"><span class="bold">Faturamento Bruto:</span> <span>R$ ${financialStats.grossEarnings.toFixed(2)}</span></div>
        <div class="flex"><span class="bold">Despesas Gerais:</span> <span>R$ ${financialStats.totalExpenses.toFixed(2)}</span></div>
        <div class="flex"><span class="bold">Previsao Tributos:</span> <span>R$ ${financialStats.predictedTaxes.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="flex bold"><span>LUCRO LIQUIDO:</span> <span>R$ ${financialStats.netProfit.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="center">
          <p>Total de servicos: ${financialStats.totalCuts}</p>
          <p>Ticket Medio: R$ ${financialStats.avgTicket.toFixed(2)}</p>
          <p>Obrigado por utilizar nossa suite.</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
        <span className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Carregando Painel Administrativo...</span>
      </div>
    );
  }

  // Calculate percentages for target goals
  const goalPercent = Math.min(100, Math.round((financialStats.grossEarnings / monthlyGoal) * 100));

  return (
    <div className="max-w-xl md:max-w-4xl lg:max-w-6xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Upper Navigation & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 liquid-glass  rounded-2xl hover:bg-neutral-800 transition-all text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-[0.3em] leading-none block mb-1">
              Painel Corporativo
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-none">
              Gestão <span className="text-amber-500">Corporativa</span>
            </h1>
          </div>
        </div>

        {/* Buttons / Printing */}
        <div className="flex flex-wrap gap-2.5 items-center">
          <button 
            onClick={handlePrintReport}
            className="px-4 py-2 bg-neutral-900  liquid-glass text-neutral-400 hover:text-white  rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all"
            title="Imprimir relatório térmico"
          >
            <Printer className="w-4 h-4 text-amber-500" />
            Cupom Líquido
          </button>

          {/* Period Selector Tabs */}
          <div className=" liquid-glass/80  p-1 rounded-2xl flex">
            {[
              { id: "today", label: "Hoje" },
              { id: "7days", label: "7D" },
              { id: "30days", label: "30D" },
              { id: "all", label: "Tudo" }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id as any)}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  periodFilter === p.id 
                    ? "bg-amber-500 text-black shadow-lg" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Styled Dashboard Navigation Tab Rails */}
      <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar border-b border-white/5">
        {[
          { id: "dashboard", label: "Geral", icon: <ChartIcon className="w-4 h-4" /> },
          { id: "goals", label: "Metas", icon: <Target className="w-4 h-4" /> },
          { id: "commissions", label: "Comissões", icon: <Percent className="w-4 h-4" /> },
          { id: "expenses", label: "Caixa", icon: <Receipt className="w-4 h-4" /> },
          { id: "debts", label: "Fiados/Caderneta", icon: <BookOpen className="w-4 h-4" /> },
          { id: "loyalty", label: "Cashback", icon: <Gift className="w-4 h-4" /> },
          { id: "taxes", label: "Tributos", icon: <Scale className="w-4 h-4" /> },
          { id: "stock", label: "Estoque", icon: <Package className="w-4 h-4" /> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                isActive 
                  ? "bg-amber-500 border-amber-500 text-black shadow-xl" 
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-Tab Content Rendering */}
      <AnimatePresence mode="wait">
        
        {/* Tab 1: Painel Geral (Dashboard Summary) */}
        {activeTab === "dashboard" && (
          <motion.div
            key="dashboard-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Visual Money Metres */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className=" liquid-glass  rounded-[2rem] p-6 space-y-3 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Faturamento Bruto</p>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">
                    R$ {financialStats.grossEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase mt-1">Soma de atendimentos concluídos</p>
                </div>
              </div>

              <div className=" liquid-glass  rounded-[2rem] p-6 space-y-3 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Despesas Registradas</p>
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-red-400 tracking-tighter">
                    R$ {financialStats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase mt-1">Gasto somado no caixa</p>
                </div>
              </div>

              <div className={`bg-neutral-900 border border-white/5 rounded-[2rem] p-6 space-y-3 relative overflow-hidden group`}>
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Lucro Líquido</p>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${financialStats.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className={`text-3xl font-black tracking-tighter ${financialStats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R$ {financialStats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase mt-1">Saldo Líquido da Barbearia</p>
                </div>
              </div>

              <div className=" liquid-glass  rounded-[2rem] p-6 space-y-3 relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Ticket Médio</p>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Scissors className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter">
                    R$ {financialStats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase mt-1">{financialStats.totalCuts} cortes no período</p>
                </div>
              </div>

            </div>

            {/* Quick Goals progress in Overview */}
            <div className=" liquid-glass  rounded-3xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                  <Target className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Faturamento Alvo Comercial</p>
                  <p className="text-[9px] text-neutral-500 uppercase font-bold mt-0.5">Sua meta e desempenho empresarial</p>
                </div>
              </div>
              <div className="flex-1 max-w-md mx-4 min-w-[200px]">
                <div className="w-full bg-black h-3.5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-black text-neutral-500 uppercase mt-1">
                  <span>Concluído: {goalPercent}%</span>
                  <span>Meta: R$ {monthlyGoal.toFixed(2)}</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab("goals")}
                className="liquid-glass px-4 py-2  text-white font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition-all"
              >
                Configurar Alvo
              </button>
            </div>

            {/* Distibuição de Métodos de pagamento e Serviços procurados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pie Breakdown Payment Methods */}
              <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
                <div>
                  <h3 className="text-base font-black text-white">Métodos de Pagamento</h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">Canal de faturamento de entrada</p>
                </div>

                <div className="space-y-3">
                  <div className=" liquid-glass p-3.5 rounded-2xl  flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-xs font-black text-white uppercase">PIX</span>
                    </div>
                    <span className="text-xs font-black text-neutral-200">R$ {financialStats.payments.pix.toFixed(2)}</span>
                  </div>

                  <div className=" liquid-glass p-3.5 rounded-2xl  flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span className="text-xs font-black text-white uppercase">DINHEIRO</span>
                    </div>
                    <span className="text-xs font-black text-neutral-200">R$ {financialStats.payments.money.toFixed(2)}</span>
                  </div>

                  <div className=" liquid-glass p-3.5 rounded-2xl  flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      <span className="text-xs font-black text-white uppercase">CARTÃO CRÉDITO/DÉBITO</span>
                    </div>
                    <span className="text-xs font-black text-neutral-200">R$ {financialStats.payments.card.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Service Ranking List */}
              <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
                <div>
                  <h3 className="text-base font-black text-white">Serviços Mais Procurados</h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">Preferência de tratamentos de cabelo e barba</p>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 no-scrollbar">
                  {servicesRanking.length === 0 ? (
                    <div className="text-center py-10 text-neutral-500 uppercase text-[10px] font-bold">Nenhum atendimento finalizado neste período</div>
                  ) : (
                    servicesRanking.map((serve, idx) => (
                      <div key={serve.name} className=" liquid-glass p-3 rounded-2xl  flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-500 bg-amber-500/10 w-6 h-6 rounded-lg flex items-center justify-center italic">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wide truncate max-w-[120px]">{serve.name}</p>
                            <p className="text-[8px] text-neutral-500 font-bold uppercase">{serve.count} atendimentos</p>
                          </div>
                        </div>
                        <p className="text-xs font-black text-amber-500">R$ {serve.revenue.toFixed(2)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Middle Section: Fiados & Low Stock alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Quick overview of debts pending */}
              <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-black text-white">Fiados & Caderneta Pendente</h3>
                    <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">Valores com devolução sob agendamento</p>
                  </div>
                  <span className="bg-amber-500/15 text-amber-500 px-2.5 py-1 text-[9px] font-black rounded-lg uppercase">
                    Total: R$ {debts.reduce((sum, d) => sum + d.value, 0).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 no-scrollbar">
                  {debts.map(d => (
                    <div key={d.id} className=" liquid-glass p-3 rounded-2xl  flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white uppercase">{d.clientName}</p>
                        <p className="text-[8px] text-neutral-500 font-bold mt-0.5">Data: {format(parseISO(d.date), "dd/MM")}</p>
                      </div>
                      <span className="text-xs font-black text-red-400">R$ {d.value.toFixed(2)}</span>
                    </div>
                  ))}
                  {debts.length === 0 && (
                    <div className="text-center py-6 text-[10px] text-neutral-500 uppercase font-black">Nenhum valor pendente ativo</div>
                  )}
                </div>
                <button 
                  onClick={() => setActiveTab("debts")}
                  className="w-full text-center liquid-glass  hover:bg-black/70 text-[9px] font-black uppercase text-amber-500 tracking-wider py-2.5 rounded-xl block"
                >
                  Cobrar ou Registrar novo fiado
                </button>
              </div>

              {/* Quick Stock Alerter */}
              <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Alertas de Estoque Crítico</h3>
                    <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">Itens esgotando ou abaixo do mínimo</p>
                  </div>
                  {lowStockProducts.length > 0 && (
                    <span className="px-2.5 py-1 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3" />
                      {lowStockProducts.length} Crítico
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 no-scrollbar">
                  {inventory.length === 0 ? (
                    <div className="text-center py-6 text-neutral-600 uppercase text-[10px] font-black">Nenhum produto cadastrado no estoque de vendas</div>
                  ) : lowStockProducts.length === 0 ? (
                    <div className="p-8 border border-dashed border-emerald-500/10 rounded-3xl text-center bg-emerald-500/[0.02]">
                      <Check className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                      <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Estoque 100% sob controle!</p>
                    </div>
                  ) : (
                    lowStockProducts.map(prod => (
                      <div key={prod.id} className="liquid-glass p-3 rounded-2xl -red-500/15 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white truncate max-w-[140px]">{prod.name}</p>
                          <p className="text-[8px] text-red-400 font-black uppercase">Mínimo: {prod.minQuantity || 5} un.</p>
                        </div>
                        <span className="text-xs font-black text-red-400 bg-red-500/10 px-2 rounded-lg">
                          {prod.quantity} un.
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Quick action section */}
            <div className=" liquid-glass  rounded-[2.5rem] p-6">
              <h3 className="text-base font-black text-white mb-4">Módulos Inteligentes Incorporados</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                  onClick={() => setActiveTab("goals")} 
                  className=" liquid-glass  hover:border-amber-500/30 p-4 rounded-2xl text-center space-y-2 group transition-all"
                >
                  <Target className="w-5 h-5 text-amber-500 mx-auto group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Alvo Mensal</p>
                </button>
                <button 
                  onClick={() => setActiveTab("loyalty")} 
                  className=" liquid-glass  hover:border-amber-500/30 p-4 rounded-2xl text-center space-y-2 group transition-all"
                >
                  <Gift className="w-5 h-5 text-amber-500 mx-auto group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Cashback / Fidelidade</p>
                </button>
                <button 
                  onClick={() => setActiveTab("taxes")} 
                  className=" liquid-glass  hover:border-amber-500/30 p-4 rounded-2xl text-center space-y-2 group transition-all"
                >
                  <Scale className="w-5 h-5 text-amber-500 mx-auto group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Calculadora Tributária</p>
                </button>
                <button 
                  onClick={() => setActiveTab("debts")} 
                  className=" liquid-glass  hover:border-amber-500/30 p-4 rounded-2xl text-center space-y-2 group transition-all"
                >
                  <BookOpen className="w-5 h-5 text-amber-500 mx-auto group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Controle de Fiados</p>
                </button>
              </div>
            </div>

          </motion.div>
        )}

        {/* Tab: Goals Configuration */}
        {activeTab === "goals" && (
          <motion.div
            key="goals-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Gerenciamento de Metas Comerciais
                </h3>
                <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">
                  Acompanhe e configure a projeção de faturamento bruto ideal do seu estabelecimento
                </p>
              </div>

              <div className="p-6 liquid-glass rounded-3xl  grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase text-neutral-400 tracking-wider">Metas Mensal Ativa (R$)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={monthlyGoal}
                      onChange={e => handleGoalChange(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="bg-black border border-white/10 p-4 rounded-2xl text-sm font-black text-white w-full outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase">Configure o teto ideal de vendas para sua barbearia</p>
                </div>

                <div className=" liquid-glass  p-5 rounded-2xl flex flex-col justify-center space-y-2">
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wide">Faturamento Atual</span>
                  <p className="text-2xl font-black text-amber-500 leading-none">R$ {financialStats.grossEarnings.toFixed(2)}</p>
                  <p className="text-[10px] text-neutral-400 uppercase font-black leading-none mt-1">Projeção: {goalPercent}% cumprida</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Commissions Staff */}
        {activeTab === "commissions" && (
          <motion.div
            key="commissions-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div>
                <h3 className="text-lg font-black text-white">Rateio de Comissões por Profissional</h3>
                <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-1">
                  Ajuste a comissão individual do barbeiro e calcule o líquido a pagar com base nos atendimentos faturados
                </p>
              </div>

              {/* Barber Rates adjustments */}
              <div className="space-y-4 pt-2">
                {barberPerformance.map(barb => (
                  <div key={barb.id} className=" liquid-glass p-5 rounded-3xl  space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      <div className="flex items-center gap-4">
                        <img 
                          src={barb.photoURL || `https://ui-avatars.com/api/?name=${barb.name}&background=1a1a1a&color=fff`} 
                          alt={barb.name} 
                          className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                        />
                        <div>
                          <h4 className="font-bold text-white text-base leading-none mb-1.5">{barb.name}</h4>
                          <span className="text-[9px] text-amber-500 font-extrabold uppercase bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-md leading-none">
                            {barb.cutsCount} cortes efetuados ({periodFilter === 'all' ? 'total' : periodFilter === '30days' ? '30 dias' : periodFilter === '7days' ? '7 dias' : 'hoje'})
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">Soma de Serviços:</p>
                        <p className="text-lg font-black text-neutral-200">R$ {barb.revenue.toFixed(2)}</p>
                      </div>

                      <div className="text-left sm:text-right bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/10 min-w-[120px]">
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-wider leading-none mb-1">Comissão Devida</p>
                        <p className="text-xl font-black text-amber-400">R$ {barb.commissionPaid.toFixed(2)}</p>
                      </div>

                    </div>

                    <div className=" liquid-glass  p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                        <span>Ajustar Taxa de Comissão</span>
                        <span className="text-amber-500 font-black text-sm">{barb.commissionRate}%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-extrabold text-neutral-600">10%</span>
                        <input 
                          type="range" 
                          min="10" 
                          max="90" 
                          step="5"
                          value={barb.commissionRate}
                          onChange={(e) => handleUpdateCommissionRate(barb.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-amber-500" 
                        />
                        <span className="text-[9px] font-extrabold text-neutral-600">90%</span>
                      </div>
                    </div>

                  </div>
                ))}

                {barberPerformance.length === 0 && (
                  <div className="py-12 text-center text-neutral-500 uppercase text-xs font-bold leading-relaxed">Nenhum barbeiro adicionado. Adicione colaboradores na aba equipe.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Fluxo de Caixa (Expenses & Add Expense form) */}
        {activeTab === "expenses" && (
          <motion.div
            key="expenses-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-white">Controle de Fluxo de Caixa</h3>
                <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-0.5">Registre e exclua saídas e contas comerciais de forma instantânea</p>
              </div>
              <button 
                onClick={() => setShowExpenseForm(!showExpenseForm)} 
                className="bg-amber-500 text-black font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-2xl flex items-center gap-1.5 hover:bg-amber-400 transition-all shadow-lg active:scale-95"
              >
                {showExpenseForm ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4" /> Adicionar Despesa</>}
              </button>
            </div>

            {showExpenseForm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className=" liquid-glass  p-6 rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-amber-500" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Novo Lançamento de Saída</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Descrição</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Aluguel da loja"
                        value={expenseForm.description}
                        onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                        className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Valor (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={expenseForm.value}
                        onChange={e => setExpenseForm({...expenseForm, value: e.target.value})}
                        className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Categoria</label>
                      <select 
                        value={expenseForm.category}
                        onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                        className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value="Geral">Geral</option>
                        <option value="Aluguel">Aluguel / Condomínio</option>
                        <option value="Produtos">Produtos para Barbearia</option>
                        <option value="Comissão extra">Comissão ou Bônus</option>
                        <option value="Utilidades">Luz / Água / Internet</option>
                        <option value="Marketing">Marketing / Divulgação</option>
                        <option value="Manutenção">Manutenção / Equipamentos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Data</label>
                      <input 
                        type="date" 
                        required
                        value={expenseForm.date}
                        onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                        className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={savingExpense}
                    className="w-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl mt-2 hover:bg-amber-400 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {savingExpense ? <Loader2 className="animate-spin" /> : <><Check className="w-4 h-4" /> Confirmar Lançamento</>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Expenses List */}
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Histórico de Movimentações no Período</span>
                <span className="text-xs font-black text-red-400">Total: R$ {financialStats.totalExpenses.toFixed(2)}</span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {filteredExpenses.map(exp => {
                  let dateFormatted = "Data indefinida";
                  try {
                    const parsed = exp.date ? parseISO(exp.date) : (exp.createdAt?.toDate ? exp.createdAt.toDate() : new Date());
                    dateFormatted = format(parsed, "dd/MM/yyyy", { locale: ptBR });
                  } catch (e) {}

                  return (
                    <div key={exp.id} className="bg-black/45  liquid-glass p-4 rounded-3xl  flex items-center justify-between transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wide truncate max-w-[200px]">{exp.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[8px] font-black uppercase tracking-widest text-neutral-500">
                            <span className="liquid-glass px-1.5 py-0.5 rounded">{exp.category || 'Geral'}</span>
                            <span>•</span>
                            <span>{dateFormatted}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-red-400">- R$ {exp.value.toFixed(2)}</span>
                        <button 
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-2 text-neutral-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredExpenses.length === 0 && (
                  <div className="text-center py-16 text-neutral-600 uppercase text-[10px] font-black">Nenhuma despesa ou saída registrada neste período</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Fiados & Controle de Caderneta */}
        {activeTab === "debts" && (
          <motion.div
            key="debts-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Form for new debt */}
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-white">Adicionar Pendência de Cliente (Fiado)</h3>
              </div>

              <form onSubmit={handleAddDebt} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Cliente</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: João Silva"
                    value={newDebt.clientName}
                    onChange={e => setNewDebt({...newDebt, clientName: e.target.value})}
                    className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Valor (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newDebt.value}
                    onChange={e => setNewDebt({...newDebt, value: e.target.value})}
                    className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase text-neutral-500 tracking-widest mb-1.5">Celular</label>
                  <input 
                    type="text"
                    placeholder="(99) 99999-9999"
                    value={newDebt.phone}
                    onChange={e => setNewDebt({...newDebt, phone: e.target.value})}
                    className="w-full bg-black border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <button 
                  type="submit" 
                  className="sm:col-span-4 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest py-3.5 rounded-2xl hover:bg-amber-400 active:scale-95 transition-all shadow-md"
                >
                  Registrar Fiado na Caderneta
                </button>
              </form>
            </div>

            {/* List Active Debts */}
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-base font-black text-white">Caderneta de Contas a Receber</h3>
              
              <div className="space-y-3">
                {debts.map(d => (
                  <div key={d.id} className=" liquid-glass p-4 rounded-3xl  flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white uppercase">{d.clientName}</p>
                      <p className="text-[9px] text-neutral-500 font-black tracking-wider uppercase mt-1">Contato: {d.phone}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-red-400">R$ {d.value.toFixed(2)}</span>
                      <button 
                        onClick={() => handlePayDebt(d.id)}
                        className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-colors"
                      >
                        Baixar/Pago
                      </button>
                    </div>
                  </div>
                ))}
                {debts.length === 0 && (
                  <div className="text-center py-12 text-neutral-500 text-[10px] uppercase font-black">Nenhum fiado pendente encontrado</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Cashback / Loyalty */}
        {activeTab === "loyalty" && (
          <motion.div
            key="loyalty-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-white">Configuração do Cashback & Fidelidade</h3>
              </div>

              <div className="p-6 liquid-glass rounded-3xl  space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                    <span>Taxa de Retorno de Pontos / Cashback (%)</span>
                    <span className="text-amber-500 text-sm font-black">{loyaltyMultiplier}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    step="1"
                    value={loyaltyMultiplier}
                    onChange={(e) => handleLoyaltyChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-amber-500" 
                  />
                  <p className="text-[9px] text-neutral-500 uppercase font-black">Cada atendimento retorna {loyaltyMultiplier}% do valor total em saldo de crédito para resgate de novos cortes</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Taxes / Tributos */}
        {activeTab === "taxes" && (
          <motion.div
            key="taxes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-white">Calculadora Tributária Integrada</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className=" liquid-glass  p-5 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">Simples Nacional (6%)</span>
                  <p className="text-xl font-black text-red-400">R$ {(financialStats.grossEarnings * 0.06).toFixed(2)}</p>
                </div>
                <div className=" liquid-glass  p-5 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">DAS MEI Mensal Fixo</span>
                  <p className="text-xl font-black text-neutral-300">R$ 82,10</p>
                </div>
                <div className=" liquid-glass  p-5 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">ISS sobre Serviços (2%)</span>
                  <p className="text-xl font-black text-amber-500">R$ {(financialStats.grossEarnings * 0.02).toFixed(2)}</p>
                </div>
              </div>

              <div className="p-5 liquid-glass rounded-3xl ">
                <p className="text-xs text-neutral-400 leading-relaxed font-bold">
                  * Os valores acima são simulações empresariais para fins de precificação. Consulte sempre sua assessoria contábil para enquadramentos definitivos do Simples Nacional ou Lucro Presumido.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Controle de Estoque estendido */}
        {activeTab === "stock" && (
          <motion.div
            key="stock-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white">Situação do Inventário de Vendas</h3>
                  <p className="text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest mt-0.5">Visão geral do estoque de ceras, loções, shampoos e kits</p>
                </div>
              </div>

              {/* Inventory stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className=" liquid-glass  p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">Produtos Cadastrados</span>
                  <p className="text-2xl font-black text-white">{inventory.length}</p>
                </div>
                <div className=" liquid-glass  p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">Total em Unidades</span>
                  <p className="text-2xl font-black text-white">
                    {inventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0)}
                  </p>
                </div>
                <div className=" liquid-glass  p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">Valor total estocado</span>
                  <p className="text-2xl font-black text-amber-500">
                    R$ {inventory.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.price || 0)), 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest block px-1">Grade de Produtos</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inventory.map(prod => {
                    const isAlert = prod.quantity <= (prod.minQuantity || 5);
                    return (
                      <div key={prod.id} className=" liquid-glass  p-4 rounded-3xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isAlert ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-neutral-800 text-neutral-400 border-white/5'}`}>
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white max-w-[120px] truncate">{prod.name}</p>
                            <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest mt-1">R$ {prod.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-xl block ${isAlert ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-neutral-900 border border-white/5 text-neutral-400'}`}>
                            {prod.quantity} un.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
