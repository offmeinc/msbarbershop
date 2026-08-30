import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, Timestamp, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Plus, Trash2, ReceiptText, AlertTriangle, Filter, Calculator, TrendingDown } from "lucide-react";
import { toast } from "../ui/Toast";
import { motion, AnimatePresence } from "motion/react";
import { format, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const ExpensesManagement = ({ currentDate }: { currentDate: Date }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("variável");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "expenses");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const currentMonthExpenses = expenses.filter(e => {
    const expDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return isSameMonth(expDate, currentDate);
  });

  const totalCurrentMonth = currentMonthExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalFixed = currentMonthExpenses.filter(e => e.category === 'fixa').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalVariable = currentMonthExpenses.filter(e => e.category !== 'fixa').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !expenseDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      const parsedDate = parseISO(expenseDate);
      
      await addDoc(collection(db, "expenses"), {
        description,
        amount: parsedAmount,
        category,
        date: Timestamp.fromDate(parsedDate),
        createdAt: Timestamp.now()
      });
      
      toast.success("Despesa adicionada com sucesso!");
      setShowAddForm(false);
      setDescription("");
      setAmount("");
      setCategory("variável");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "expenses");
      toast.error("Erro ao adicionar despesa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Excluir permanentemente a despesa "${desc}"?`)) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast.success("Despesa removida.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "expenses");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500 font-bold uppercase text-xs animate-pulse">Carregando despesas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="liquid-glass p-6 rounded-[2rem] border border-rose-500/20 relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-3">
             <span className="text-[9px] font-black uppercase text-rose-400 tracking-[0.2em] flex items-center gap-1.5">
               <TrendingDown className="w-3.5 h-3.5" /> Total Despesas
             </span>
             <span className="text-[9px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-black uppercase">Mês Atual</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black italic text-rose-400 tracking-tight leading-none">
            R$ {totalCurrentMonth.toFixed(2)}
          </h3>
        </div>
        <div className="liquid-glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
          <h4 className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-1">Custos Fixos</h4>
          <p className="text-xl font-bold text-white">R$ {totalFixed.toFixed(2)}</p>
          <p className="text-[10px] text-neutral-500 mt-2 font-medium">Aluguel, luz, internet, etc.</p>
        </div>
        <div className="liquid-glass p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
          <h4 className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-1">Custos Variáveis</h4>
          <p className="text-xl font-bold text-white">R$ {totalVariable.toFixed(2)}</p>
          <p className="text-[10px] text-neutral-500 mt-2 font-medium">Insumos, comissões extra, manutenção.</p>
        </div>
      </div>

      {/* Add Button & List Header */}
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
        <div>
           <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Registro de Despesas</h3>
           <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Gerencie os custos da operação</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-rose-500 hover:bg-rose-600 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          {showAddForm ? <Filter className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddForm ? "Cancelar" : "Nova Despesa"}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddExpense} className="liquid-glass p-6 rounded-[2rem] space-y-4 border border-rose-500/20 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-neutral-400 font-black uppercase tracking-widest pl-1">Descrição</label>
                  <input 
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Conta de Luz - Ref. Maio"
                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-neutral-400 font-black uppercase tracking-widest pl-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-neutral-400 font-black uppercase tracking-widest pl-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors appearance-none"
                  >
                    <option value="fixa">Custo Fixo (Aluguel, Luz, etc)</option>
                    <option value="variável">Custo Variável (Produtos, Manutenção)</option>
                    <option value="impostos">Impostos & Taxas</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-neutral-400 font-black uppercase tracking-widest pl-1">Data da Despesa</label>
                  <input 
                    type="date" 
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-black py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  {isSubmitting ? "Registrando..." : "Registrar Despesa"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {currentMonthExpenses.length === 0 ? (
          <div className="liquid-glass p-8 rounded-[2rem] text-center border-dashed">
            <ReceiptText className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Nenhuma despesa registrada neste mês.</p>
          </div>
        ) : (
          currentMonthExpenses.map((expense) => {
            const expDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
            return (
              <div key={expense.id} className="liquid-glass p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">{expense.description}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                        {format(expDate, "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-neutral-700" />
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-neutral-400 bg-neutral-800`}>
                        {expense.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-0 border-white/5 pt-3 sm:pt-0">
                  <span className="text-lg font-black text-white italic tracking-tight">
                    R$ {expense.amount.toFixed(2)}
                  </span>
                  <button 
                    onClick={() => handleDelete(expense.id, expense.description)}
                    className="p-2 bg-neutral-900/50 hover:bg-rose-500/20 text-neutral-500 hover:text-rose-500 rounded-lg transition-colors"
                    title="Excluir despesa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
