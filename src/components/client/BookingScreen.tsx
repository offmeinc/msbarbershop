import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  format,
  addDays,
  isSameDay,
  startOfDay,
  endOfDay,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  getDoc,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  getDocs,
  getFirestore,
  increment,
  runTransaction
} from "firebase/firestore";
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  XCircle,
  RefreshCw,
  Search,
  User,
  Bell,
  Copy,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { setupPushSubscription, getNotificationPermissionState, queryNotificationSupport, getBackendUrl } from "../../lib/pushRegister";
import { db, handleFirestoreError, OperationType, safeStringify } from "../../lib/firebase";
import { signInWithGoogleCalendar, addEventToCalendar, getCalendarAccessToken } from "../../lib/calendar";
import { toast } from "../ui/Toast";

import { QRCodeCanvas } from "qrcode.react";
import { generatePixString } from "../../lib/pix";

function RecurrenceUI({
  userRole,
  recurrence,
  setRecurrence,
}: {
  userRole: string;
  recurrence: string;
  setRecurrence: (r: any) => void;
}) {
  if (userRole !== "barber" && userRole !== "manager") return null;
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-black uppercase text-neutral-400 tracking-widest">
          Deseja tornar recorrente?
        </h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["none", "weekly", "biweekly", "monthly"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRecurrence(r)}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${recurrence === r ? "bg-amber-500 text-black" : "bg-white/5 text-neutral-600 hover:text-white"}`}
          >
            {r === "none"
              ? "Único"
              : r === "weekly"
                ? "Semanal"
                : r === "biweekly"
                  ? "Quinzenal"
                  : "Mensal"}
          </button>
        ))}
      </div>
    </div>
  );
}

function PortfolioModal({ barber, onClose }: { barber: any, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={barber.photoURL || `https://ui-avatars.com/api/?name=${barber.name}`} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
            <div>
              <h3 className="text-sm font-black text-white uppercase italic">{barber.name}</h3>
              <p className="text-[9px] text-amber-500 font-black uppercase tracking-[0.2em]">Portfólio / Trabalhos</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-white transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
          {barber.portfolio && barber.portfolio.length > 0 ? (
            barber.portfolio.map((img: string, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="aspect-[4/5] rounded-3xl overflow-hidden border border-white/5 bg-neutral-900"
              >
                <img src={img} className="w-full h-full object-cover" alt={`Work ${idx}`} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-2 py-20 text-center space-y-4 bg-neutral-900/50 rounded-[2.5rem] border border-dashed border-white/10">
              <ImageIcon className="w-8 h-8 text-neutral-800 mx-auto" />
              <p className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">Nenhuma foto no portfólio ainda</p>
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-amber-500 text-black py-5 rounded-[1.8rem] font-black uppercase italic tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          FECHAR GALERIA
        </button>
      </div>
    </motion.div>
  );
}

function ConfirmationModal({ service, barber, date, onConfirm, userId, userRole, duration, appointmentId, user }: any) {
  const [pushState, setPushState] = useState(getNotificationPermissionState());
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  
  const [wantsToPayNow, setWantsToPayNow] = useState<boolean | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  
  const [mpLoading, setMpLoading] = useState(false);
  const [mpData, setMpData] = useState<any>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSimulatingCheck, setIsSimulatingCheck] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [cutsBalance, setCutsBalance] = useState(0);

  useEffect(() => {
    if (userId && userId !== "guest") {
      const userRef = doc(db, "users", userId);
      getDoc(userRef).then(snap => {
        if (snap.exists()) {
          setWalletBalance(Number(snap.data().walletBalance || 0));
          setCutsBalance(Number(snap.data().cutsBalance || 0));
        }
      });
    }
  }, [userId]);

  const servicePrice = service?.price ? Number(service.price) : 0;
  const canUseWallet = walletBalance > 0 && servicePrice > 0;
  const canUseCut = cutsBalance > 0;
  const [useCut, setUseCut] = useState(false);

  const walletCoverage = Math.min(walletBalance, servicePrice);
  const remainingPrice = useCut ? 0 : Math.max(0, servicePrice - (useWallet ? walletCoverage : 0));

  const handleWalletFullPayment = async () => {
    if (mpLoading) return;
    setMpLoading(true);
    try {
      const firestore = db || getFirestore();
      
      await runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, "users", userId);
        const appRef = doc(firestore, "appointments", appointmentId);
        
        const userSnap = await transaction.get(userRef);
        const appSnap = await transaction.get(appRef);
        
        if (!userSnap.exists()) throw new Error("Usuário não encontrado.");
        if (!appSnap.exists()) throw new Error("Agendamento não encontrado.");
        
        const userData = userSnap.data();
        const appData = appSnap.data();
        
        if (appData.paymentStatus === "paid") {
          throw new Error("Agendamento já está pago.");
        }
        
        const currentBalance = Number(userData.walletBalance || 0);
        if (currentBalance < servicePrice) {
          throw new Error("Saldo insuficiente na carteira.");
        }
        
        // Atomic deduction and confirmation
        transaction.update(userRef, {
          walletBalance: currentBalance - servicePrice,
          updatedAt: serverTimestamp()
        });
        
        transaction.update(appRef, {
          status: "confirmed",
          paymentStatus: "paid",
          paidVia: "wallet",
          updatedAt: serverTimestamp()
        });
      });

      setPaymentSuccess(true);
      toast.success("Pagamento realizado com saldo da carteira!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar pagamento com carteira.");
    } finally {
      setMpLoading(false);
    }
  };

  const handleCutPayment = async () => {
    if (mpLoading) return;
    setMpLoading(true);
    try {
      const firestore = db || getFirestore();
      
      await runTransaction(firestore, async (transaction) => {
        const userRef = doc(firestore, "users", userId);
        const appRef = doc(firestore, "appointments", appointmentId);
        
        const userSnap = await transaction.get(userRef);
        const appSnap = await transaction.get(appRef);
        
        if (!userSnap.exists()) throw new Error("Usuário não encontrado.");
        if (!appSnap.exists()) throw new Error("Agendamento não encontrado.");
        
        const userData = userSnap.data();
        const appData = appSnap.data();
        
        if (appData.paymentStatus === "paid") throw new Error("Referência já paga.");
        
        const currentCuts = Number(userData.cutsBalance || 0);
        if (currentCuts <= 0) throw new Error("Você não possui cortes disponíveis.");
        
        transaction.update(userRef, {
          cutsBalance: currentCuts - 1,
          updatedAt: serverTimestamp()
        });
        
        transaction.update(appRef, {
          status: "confirmed",
          paymentStatus: "paid",
          paidVia: "cuts_balance",
          totalPrice: 0,
          updatedAt: serverTimestamp()
        });
      });

      setPaymentSuccess(true);
      toast.success("Agendamento confirmado usando seus créditos de cortes!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao processar uso do corte.");
    } finally {
      setMpLoading(false);
    }
  };

  const handleCopyPix = (str: string) => {
    navigator.clipboard.writeText(str);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
    toast.success("Código Copia e Cola copiado!");
  };

  const hasPix = barber?.pixKey;
  const pixString = hasPix ? generatePixString(barber.pixKey, barber.name, "Brasil", remainingPrice) : "";

  useEffect(() => {
    if (mpData?.payment_id && !paymentSuccess) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(getBackendUrl(`/api/payments/mercado-pago/status/${mpData.payment_id}`));
          if (res.ok) {
            const data = await res.json();
            if (data.status === "approved" || data.status === "completed") {
              setPaymentSuccess(true);
              toast.success("Pagamento Mercado Pago aprovado!");
            }
          }
        } catch (e) {
          console.error("Erro ao verificar status do pagamento:", e);
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [mpData?.payment_id, paymentSuccess]);

  const handleGenerateMpPix = async () => {
    setMpLoading(true);
    setMpError(null);
    try {
      const amountToPay = remainingPrice;
      let requestBody = "";
      try {
        requestBody = safeStringify({
          transaction_amount: amountToPay,
          description: `Serviço: ${service?.name}${useWallet ? ' (Parcial Carteira)' : ''}`,
          email: user?.email || "automatico@msbarbaria.com.br",
          name: user?.displayName || user?.name || "Cliente",
          appointmentId: appointmentId || "temp-" + Date.now(),
          walletAmountToDeduct: useWallet ? walletCoverage : 0,
          userId: userId !== "guest" ? userId : null
        });
      } catch (stringifyErr) {
        console.error("Stringify error in handleGenerateMpPix:", stringifyErr);
        throw new Error("Erro ao preparar dados da transação.");
      }

      console.log("Attempting to generate MP Pix with URL:", getBackendUrl("/api/payments/mercado-pago/create-payment"));
      const res = await fetch(getBackendUrl("/api/payments/mercado-pago/create-payment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: requestBody
      });
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Payment API Error:", errorText);
        throw new Error(`Erro de processamento da API de Pagamentos: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setMpData(data);
      } else {
        throw new Error(data.error || "Falha desconhecida");
      }
    } catch (err: any) {
      console.error(err);
      setMpError(err.message || "Erro desconhecido ao processar pagamento.");
    } finally {
      setMpLoading(false);
    }
  };

  const handleAddToCalendar = async () => {
    setIsAddingToCalendar(true);
    setCalendarError(null);
    try {
      let token = await getCalendarAccessToken();
      if (!token) {
        const result = await signInWithGoogleCalendar();
        token = result?.accessToken || null;
      }

      if (token) {
        const start = new Date(date);
        const end = new Date(start.getTime() + (duration || 30) * 60000);
        await addEventToCalendar(
          `Corte: ${service?.name}`,
          `Agendamento de ${service?.name} na barbearia.`,
          start,
          end
        );
        setAddedToCalendar(true);
      }
    } catch (e: any) {
      console.error(e?.message || e);
      const errorMsg = e?.message || String(e);
      const isPopupClosed = errorMsg.includes("popup-closed-by-user") || 
                            errorMsg.includes("popup_closed_by_user") || 
                            errorMsg.includes("cancelled-popup-request") ||
                            errorMsg.includes("closed by user") ||
                            e?.code === "auth/popup-closed-by-user" ||
                            e?.code === "auth/cancelled-popup-request";
      if (isPopupClosed) {
        setCalendarError("popblock");
      } else {
        toast.error('Não foi possível adicionar ao calendário.');
      }
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto"
    >
      <div className="max-w-sm w-full text-center space-y-6 my-auto py-4">
        <div className="w-16 h-16 bg-green-500 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-black" strokeWidth={3} />
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Tudo Pronto!
          </h2>
          <p className="text-neutral-500 font-bold uppercase text-[9px] tracking-[0.2em]">
            Seu agendamento foi confirmado
          </p>
        </div>

        <div className="bg-neutral-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
              Procedimento
            </p>
            <p className="text-lg font-black text-white uppercase italic">
              {service?.name}
            </p>
          </div>
          <div className="h-[1px] bg-white/5" />
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
              Data e Hora
            </p>
            <p className="text-md font-black text-amber-500 italic uppercase">
              {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
              <br />
              às {format(new Date(date), "HH:mm")}
            </p>
          </div>
        </div>

        {/* Dynamic Payment Sector (Mercado Pago + Standard Pix) */}
        {(hasPix || true) && (
          wantsToPayNow === null ? (
            <div className="bg-neutral-900 border border-white/5 p-6 rounded-[2.5rem] space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Deseja deixar pago pelo App?</h4>
              
              <div className="space-y-4">
                {canUseCut && (
                  <button 
                    onClick={() => { setUseCut(!useCut); if (!useCut) setUseWallet(false); }}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${useCut ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-white/5 border-white/10 text-neutral-400'}`}
                  >
                    <div className="flex items-center gap-3">
                       <span className="text-xl">✂️</span>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Usar 1 Crédito de Corte</p>
                          <p className="text-[9px] font-bold opacity-70">Disponível: {cutsBalance}</p>
                       </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${useCut ? 'bg-amber-500' : 'bg-neutral-800'}`}>
                       <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useCut ? 'right-1' : 'left-1'}`} />
                    </div>
                  </button>
                )}

                {canUseWallet && !useCut && (
                  <button 
                    onClick={() => setUseWallet(!useWallet)}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${useWallet ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-white/5 border-white/10 text-neutral-400'}`}
                  >
                    <div className="flex items-center gap-3">
                       <span className="text-xl">💰</span>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Usar Saldo Carteira</p>
                          <p className="text-[9px] font-bold opacity-70">Disponível: R$ {walletBalance.toFixed(2)}</p>
                       </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${useWallet ? 'bg-amber-500' : 'bg-neutral-800'}`}>
                       <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useWallet ? 'right-1' : 'left-1'}`} />
                    </div>
                  </button>
                )}
              </div>

              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-4">
                {useCut 
                  ? "Seu crédito de corte cobre o valor total! Confirmar agora?"
                  : useWallet 
                    ? (remainingPrice <= 0 
                        ? "Seu saldo cobre o valor total! Deseja confirmar o pagamento agora?" 
                        : `Seu saldo abate R$ ${walletCoverage.toFixed(2)}. Restante: R$ ${remainingPrice.toFixed(2)} via Pix.`)
                    : "Você pode pagar agora via Pix ou deixar para pagar na barbearia. É opcional!"}
              </p>
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (useCut) {
                      handleCutPayment();
                    } else if (useWallet && remainingPrice <= 0) {
                      handleWalletFullPayment();
                    } else {
                      setWantsToPayNow(true);
                      handleGenerateMpPix();
                    }
                  }}
                  className="w-full py-4 rounded-[1.5rem] bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all text-center block"
                >
                  {useCut ? "CONFIRMAR USANDO CORTE" : (useWallet && remainingPrice <= 0 ? "CONFIRMAR PAGAMENTO TOTAL" : "SIM, QUERO PAGAR AGORA")}
                </button>
                <button
                  type="button"
                  onClick={() => setWantsToPayNow(false)}
                  className="w-full py-4 rounded-[1.5rem] bg-white/5 text-white border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all text-center block"
                >
                  NÃO, PAGAREI NA BARBEARIA
                </button>
              </div>
            </div>
          ) : wantsToPayNow === true ? (
            <div className="bg-neutral-900 border border-white/5 p-6 rounded-[2.5rem] space-y-4 text-center">
              {/* Mercado Pago Area */}
              <div className="space-y-4 py-4 text-center">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-auto flex items-center justify-center text-amber-500">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Pagamento via Pix</h4>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Baixa automática instantânea</p>
                </div>
                
                {paymentSuccess ? (
                   <div className="py-6 space-y-4">
                     <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-black mb-2 animate-bounce">
                        <CheckCircle2 strokeWidth={3} size={32} />
                     </div>
                     <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Pagamento Aprovado!</h3>
                     <p className="text-xs text-neutral-400 font-medium">Seu agendamento foi pago com sucesso.</p>
                   </div>
                ) : mpLoading ? (
                   <div className="py-8 flex flex-col items-center justify-center space-y-4">
                     <span className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                     <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest animate-pulse">Gerando Pix...</p>
                   </div>
                ) : mpError ? (
                   <div className="py-6 space-y-4">
                      <p className="text-xs text-red-400 font-medium">{mpError}</p>
                      <button 
                         onClick={handleGenerateMpPix}
                         className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase"
                      >
                         Tentar Novamente
                      </button>
                      <button
                         onClick={() => setPaymentSuccess(true)}
                         className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-[10px] font-black uppercase"
                      >
                         Simular Pagamento
                      </button>
                   </div>
                ) : mpData?.qr_code_base64 && mpData?.qr_code ? (
                  <div className="space-y-6">
                    <div className="bg-white p-4 rounded-3xl mx-auto w-fit shadow-xl shadow-amber-500/10">
                      <img src={`data:image/png;base64,${mpData.qr_code_base64}`} alt="QR Code Pix" className="w-[180px] h-[180px] rounded-xl" />
                    </div>
                    
                    <button
                      onClick={() => handleCopyPix(mpData.qr_code)}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-[1.2rem] text-[10px] font-black uppercase text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      {copiedPix ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copiedPix ? "Código Copiado!" : "Copiar Código Pix Copia e Cola"}
                    </button>
                  </div>
                ) : (
                  <div className="py-6 text-center text-neutral-500 text-[10px] uppercase font-bold tracking-wider">
                     Aguardando geração...
                  </div>
                )}
              </div>
            </div>
          ) : null
        )}

        {/* Dynamic Push Opt-in for instant user activation */}
        {pushState !== "granted" && queryNotificationSupport() && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-[2.5rem] space-y-3 text-left">
            <div className="flex items-start gap-2.5">
              <Bell className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Notificar no Celular? 🔔
                </h4>
                <p className="text-neutral-400 text-[10px] font-bold mt-1 leading-normal uppercase">
                  Ative as notificações para receber atualizações do status do seu agendamento em tempo real neste celular!
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                const cleanId = userId || "anonymous";
                const success = await setupPushSubscription(cleanId, userRole || "client");
                if (success) {
                  setPushState("granted");
                  toast.success("Tudo pronto! Você receberá atualizações do seu agendamento no seu celular.");
                } else {
                  toast.error("Não foi possível habilitar notificações. Por favor, libere a permissão no seu navegador.");
                }
              }}
              className="w-full bg-amber-500 text-black py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all text-center block"
            >
              ATIVAR NOTIFICAÇÕES
            </button>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest leading-relaxed">
            Enviamos um resumo no seu WhatsApp e e-mail.
          </p>

          <button
            onClick={handleAddToCalendar}
            disabled={isAddingToCalendar || addedToCalendar}
            className={`w-full py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${
              addedToCalendar 
                ? "bg-green-500/10 border-green-500/30 text-green-500" 
                : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white hover:border-white/10"
            }`}
          >
            {isAddingToCalendar ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ADICIONANDO...
              </>
            ) : addedToCalendar ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                ADICIONADO AO SEU GOOGLE AGENDA
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4" />
                ADICIONAR AO GOOGLE AGENDA
              </>
            )}
          </button>

          {calendarError === "popblock" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/20 rounded-[1.8rem] p-5 text-left space-y-2.5"
            >
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h5 className="text-[10px] font-black uppercase tracking-wider">Acesso ao Google Bloqueado</h5>
              </div>
              <p className="text-[10px] text-neutral-400 font-bold leading-normal uppercase">
                Seu navegador bloqueou o pop-up de login porque o aplicativo está sendo exibido dentro do painel do <span className="text-white">AI Studio (iframe)</span>.
              </p>
              <div className="h-[1px] bg-white/5 my-1" />
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-wide leading-normal">
                👉 Como resolver: Clique no botão <span className="text-white">"Abrir em nova aba" ↗</span> no topo do painel à direita e faça login por lá!
              </p>
            </motion.div>
          )}

          <button
            onClick={onConfirm}
            className={`w-full py-5 rounded-[1.8rem] font-black uppercase italic tracking-widest hover:scale-105 transition-transform ${paymentSuccess ? "bg-green-500 text-black shadow-xl shadow-green-500/20" : "bg-white text-black"}`}
          >
            {paymentSuccess ? "AGENDAMENTO CONCLUÍDO!" : "VOLTAR PARA O INÍCIO"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface BookingScreenProps {
  user: any;
  role?: string;
  services: any[];
  onBack: () => void;
  editAppointment?: any;
  initialClient?: any;
  initialServiceId?: string;
  initialBarberId?: string;
}

export function BookingScreen({
  user,
  role,
  services,
  onBack,
  editAppointment,
  initialClient,
  initialServiceId,
  initialBarberId,
}: BookingScreenProps) {
  const [step, setStep] = useState(
    editAppointment ? 3 : initialServiceId && initialBarberId ? 3 : initialServiceId ? 2 : 1,
  );
  const [selectedService, setSelectedService] = useState<string | null>(
    editAppointment?.serviceId || initialServiceId || null,
  );
  const [selectedBarber, setSelectedBarber] = useState<string | null>(
    editAppointment?.barberId || initialBarberId || null,
  );
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(
    editAppointment?.date
      ? editAppointment.date instanceof Timestamp
        ? editAppointment.date.toDate()
        : typeof editAppointment.date === "string"
          ? parseISO(editAppointment.date)
          : editAppointment.date
      : new Date(),
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(
    editAppointment?.time || null,
  );
  const [barberAppointments, setBarberAppointments] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [recurrence, setRecurrence] = useState<
    "none" | "weekly" | "biweekly" | "monthly"
  >("none");
  const [isBooking, setIsBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState(editAppointment?.clientName || initialClient?.name || "");
  const [guestEmail, setGuestEmail] = useState(
    editAppointment?.clientEmail || initialClient?.email || "",
  );
  const [guestPhone, setGuestPhone] = useState(
    editAppointment?.clientPhone || initialClient?.whatsapp || "",
  );
  const [guestReferralCode, setGuestReferralCode] = useState("");
  const [couponCode, setCouponCode] = useState(
    editAppointment?.couponCode || "",
  );
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [customDuration, setCustomDuration] = useState<number>(
    editAppointment?.serviceDuration || 0,
  );

  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(initialClient || null);
  const [viewingPortfolio, setViewingPortfolio] = useState<any | null>(null);

  useEffect(() => {
    const isStaff = role === "manager" || role === "barber";
    const isGuest = !user;
    if (!isStaff && !isGuest) return;

    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "users"),
      where("role", "==", "client"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setClients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      },
    );
    return () => unsubscribe();
  }, [role, user]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const queryLower = searchQuery.toLowerCase().trim();
    const queryDigits = queryLower.replace(/\D/g, "");

    return clients.filter((c) => {
      // Name match
      const nameMatch = c.name && c.name.toLowerCase().includes(queryLower);

      // Email match
      const emailMatch = c.email && c.email.toLowerCase().includes(queryLower);

      // WhatsApp match (digit-only normalized comparison)
      let phoneMatch = false;
      if (c.whatsapp && queryDigits) {
        const clientDigits = c.whatsapp.replace(/\D/g, "");
        phoneMatch =
          clientDigits.includes(queryDigits) ||
          queryDigits.includes(clientDigits);
      }

      return nameMatch || emailMatch || phoneMatch;
    });
  }, [clients, searchQuery]);

  // Real-time matching against direct input phone or exact name
  const currentClientMatch = useMemo(() => {
    if (selectedClient) return selectedClient;

    const cleanGuestPhone = guestPhone.replace(/\D/g, "");
    const cleanGuestName = guestName.trim().toLowerCase();

    if (!cleanGuestPhone && !cleanGuestName) return null;

    return clients.find((c) => {
      // 1. Match by phone digits
      if (cleanGuestPhone && c.whatsapp) {
        const clientPhoneDigits = c.whatsapp.replace(/\D/g, "");
        if (
          clientPhoneDigits === cleanGuestPhone ||
          (clientPhoneDigits.length >= 8 &&
            cleanGuestPhone.endsWith(clientPhoneDigits)) ||
          (cleanGuestPhone.length >= 8 &&
            clientPhoneDigits.endsWith(cleanGuestPhone))
        ) {
          return true;
        }
      }
      // 2. Exact match by name
      if (cleanGuestName && c.name) {
        if (c.name.toLowerCase().trim() === cleanGuestName) {
          return true;
        }
      }
      return false;
    });
  }, [clients, selectedClient, guestName, guestPhone]);

  useEffect(() => {
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "users"),
      where("role", "in", ["barber", "manager"]),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const barberData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBarbers(barberData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "blocked_times"),
      orderBy("date", "asc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBlockedTimes(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "blocked_times");
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedBarber) return;
    setLoadingSlots(true);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "appointments"),
      where("barberId", "==", selectedBarber),
      where("status", "in", ["pending", "confirmed", "completed"]),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBarberAppointments(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setLoadingSlots(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "appointments");
        setLoadingSlots(false);
      },
    );
    return () => unsubscribe();
  }, [selectedBarber, selectedDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    const day = selectedDate.getDay();
    let startHour = 9;
    let endHour = 0;

    if (day >= 1 && day <= 5) {
      // Seg-Sex
      endHour = 20;
    } else if (day === 6) {
      // Sáb
      endHour = 19.5; // Até 19:30
    } else {
      // Dom
      endHour = 0;
    }

    if (endHour === 0) return [];

    for (let h = startHour; h < Math.ceil(endHour); h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotTimeInHours = h + m / 60;
        if (slotTimeInHours >= endHour) break;

        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);
        const slotEnd = new Date(
          slotDate.getTime() + (customDuration || 30) * 60000,
        );

        const isBusy =
          barberAppointments.some((app) => {
            if (editAppointment && app.id === editAppointment.id) return false; // Ignore self when editing
            const appDate =
              app.date instanceof Timestamp
                ? app.date.toDate()
                : typeof app.date === "string"
                  ? parseISO(app.date)
                  : app.date;
            if (
              format(appDate, "yyyy-MM-dd") !==
              format(selectedDate, "yyyy-MM-dd")
            )
              return false;

            // Get duration from appointment or look it up in services list
            const serviceInfo = services.find((s) => s.id === app.serviceId);
            const appDuration =
              app.serviceDuration || serviceInfo?.duration || 30;

            const appEnd = new Date(appDate.getTime() + appDuration * 60000);
            return slotDate < appEnd && slotEnd > appDate;
          }) ||
          blockedTimes.some((b) => {
            const bDate =
              b.date instanceof Timestamp
                ? b.date.toDate()
                : typeof b.date === "string"
                  ? parseISO(b.date)
                  : b.date;
            return (
              format(bDate, "yyyy-MM-dd") ===
                format(selectedDate, "yyyy-MM-dd") &&
              format(bDate, "HH:mm") === time
            );
          });

        const isPast = slotDate < new Date();
        slots.push({ time, available: !isBusy && !isPast });
      }
    }
    return slots;
  }, [selectedDate, barberAppointments, blockedTimes, customDuration]);

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      setError("Todos os campos são obrigatórios.");
      return;
    }
    const isStaffBooking = role === "manager" || role === "barber";

    if ((!user || isStaffBooking) && (!guestName || !guestPhone)) {
      setError("Nome e WhatsApp são obrigatórios para o cliente.");
      return;
    }
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);
    const duration = customDuration || 30;
    const finalDateEnd = new Date(finalDate.getTime() + duration * 60000);

    // Final Availability Check (Real-time data from snapshot)
    const isStillBusy = barberAppointments.some((app) => {
      if (editAppointment && app.id === editAppointment.id) return false;
      const appDate =
        app.date instanceof Timestamp
          ? app.date.toDate()
          : typeof app.date === "string"
            ? parseISO(app.date)
            : app.date;

      const serviceInfo = services.find((s) => s.id === app.serviceId);
      const appDuration = app.serviceDuration || serviceInfo?.duration || 30;

      const appEnd = new Date(appDate.getTime() + appDuration * 60000);
      return finalDate < appEnd && finalDateEnd > appDate;
    });

    if (isStillBusy) {
      setError(
        "Este horário foi reservado por outra pessoa enquanto você finalizava. Por favor, escolha outro horário.",
      );
      setIsBooking(false);
      setStep(3); // Go back to calendar
      return;
    }

    setError(null);
    setIsBooking(true);
    if (finalDate < new Date()) {
      setError("Este horário já passou.");
      setIsBooking(false);
      return;
    }
    try {
      const service = services.find((s) => s.id === selectedService);
      const barber = barbers.find((b) => b.id === selectedBarber);
      const loginCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const linkedClient = currentClientMatch;
      const cleanPhone = (guestPhone || "").replace(/\D/g, "");
      let effectiveClientId =
        user && !isStaffBooking
          ? user.uid || user.id || "guest"
          : linkedClient
            ? linkedClient.uid || linkedClient.id || "guest"
            : cleanPhone || "guest";
      const clientNameData =
        user && !isStaffBooking ? user.displayName || user.name || "" : guestName || "";
      const clientEmailData = user && !isStaffBooking ? user.email || "" : guestEmail || "";
      const clientPhotoData =
        user && !isStaffBooking
          ? user.photoURL || user.photoUrl || null
          : linkedClient
            ? linkedClient.photoURL || linkedClient.photoUrl || null
            : null;

      const baseData = {
        clientId: effectiveClientId,
        clientName: clientNameData,
        clientEmail: clientEmailData,
        clientPhone: guestPhone || "",
        barberId: selectedBarber || "",
        barberName: barber?.name || "",
        serviceId: selectedService || "",
        serviceName: service?.name || "",
        serviceDuration: customDuration || service?.duration || 30,
        clientPhoto: clientPhotoData,
        status: "pending",
        totalPrice: (Number(service?.price) || 0) * (1 - appliedDiscount / 100),
        createdAt: serverTimestamp(),
        couponCode: couponCode || null,
        loginCode,
      };

      const firestore = db || getFirestore();
      const isEditing = !!editAppointment;
      let appDocId = "";
      if (isEditing) {
        appDocId = editAppointment.id;
        await updateDoc(doc(firestore, "appointments", appDocId), {
          ...baseData,
          date: Timestamp.fromDate(finalDate),
          time: selectedTime,
          updatedAt: serverTimestamp(),
          rescheduledBy: isStaffBooking ? "staff" : "client",
        });
      } else {
        const docRef = await addDoc(collection(firestore, "appointments"), {
          ...baseData,
          date: Timestamp.fromDate(finalDate),
          time: selectedTime,
        });
        appDocId = docRef.id;

        // Ensure user exists for later login with phone
        if ((!user || isStaffBooking) && cleanPhone) {
          const userRef = doc(firestore, "users", cleanPhone);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            let initialBalance = 0;
            let referrerDocId = null;

            if (guestReferralCode) {
               const referrerQuery = query(collection(firestore, "users"), where("referralCode", "==", guestReferralCode));
               const referrerSnap = await getDocs(referrerQuery);
               if (!referrerSnap.empty) {
                  referrerDocId = referrerSnap.docs[0].id;
                  initialBalance = 5; // Referree initial bonus still granted to make it attractive
               }
            }

            await setDoc(userRef, {
              uid: cleanPhone,
              name: guestName || "",
              whatsapp: cleanPhone,
              role: "client",
              password: "123456",
              referredBy: referrerDocId ? guestReferralCode : null,
              walletBalance: initialBalance,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      setCreatedAppointmentId(appDocId);
      setShowConfirmation(true);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, "appointments");
      setError(
        "Erro ao processar agendamento. Verifique sua conexão ou permissões.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Escolha o Serviço";
      case 2:
        return "Escolha o Barbeiro";
      case 3:
        return "Data e Horário";
      case 4:
        return "Confirmar Agendamento";
      default:
        return "Agendamento";
    }
  };

  return (
    <>
      <AnimatePresence>
        {showConfirmation && (
          <ConfirmationModal
            user={user}
            service={services.find((s) => s.id === selectedService)}
            barber={barbers.find((b) => b.id === selectedBarber)}
            date={(() => {
              const [h, m] = (selectedTime || "00:00").split(":").map(Number);
              const d = new Date(selectedDate);
              d.setHours(h, m, 0, 0);
              return d.toISOString();
            })()}
            duration={customDuration || services.find((s) => s.id === selectedService)?.duration || 30}
            userId={user ? user.uid || user.id || "guest" : (guestPhone || "").replace(/\D/g, "")}
            userRole={role || "client"}
            onConfirm={onBack}
            appointmentId={createdAppointmentId}
          />
        )}
        {viewingPortfolio && (
          <PortfolioModal 
            barber={viewingPortfolio} 
            onClose={() => setViewingPortfolio(null)} 
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-black pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto py-8 px-6"
        >
          <div className="flex items-center justify-between mb-10">
            <button
              onClick={step === 1 ? onBack : () => setStep(step - 1)}
              className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-amber-500 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                {getStepTitle()}
              </h2>
              <div className="flex justify-center gap-1.5 mt-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-500 ${step >= s ? "w-6 bg-amber-500" : "w-1.5 bg-neutral-800"}`}
                  />
                ))}
              </div>
            </div>
            <div className="w-10" />
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services
                    .filter((s) => s.active !== false)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedService(s.id);
                          setCustomDuration(s.duration || 30);
                          setStep(2);
                        }}
                        className={`group p-6 rounded-[2rem] border text-left transition-all relative overflow-hidden ${selectedService === s.id ? "border-amber-500 bg-neutral-900 shadow-2xl shadow-amber-500/20" : "border-white/5 bg-neutral-900/50 hover:border-white/10"}`}
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <div className="space-y-1">
                            <h4 className="font-black text-white text-lg uppercase italic tracking-tight">
                              {s.name}
                            </h4>
                            <div className="flex items-center gap-2 text-neutral-500 text-xs font-bold uppercase">
                              <Clock className="w-3.5 h-3.5" /> {s.duration} min
                            </div>
                          </div>
                          <div
                            className={`px-4 py-2 rounded-2xl transition-all ${selectedService === s.id ? "bg-amber-500 text-black" : "bg-white/5 text-amber-500 font-black"}`}
                          >
                            <span className="text-sm font-black italic">
                              R${s.price}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barbers.length === 0 ? (
                    <div className="py-20 text-center space-y-4 bg-neutral-900/50 rounded-[2.5rem] border border-dashed border-white/10">
                      <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-neutral-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">
                        Buscando profissionais...
                      </p>
                      <p className="text-[10px] text-amber-500 px-6">
                        Se demorar, verifique se há colaboradores cadastrados no
                        menu de gestão.
                      </p>
                    </div>
                  ) : (
                    barbers.map((b) => (
                      <div key={b.id} className="relative">
                        <button
                          onClick={() => {
                            setSelectedBarber(b.id);
                            setStep(3);
                          }}
                          className={`w-full p-5 rounded-[2rem] border flex items-center justify-between transition-all group ${selectedBarber === b.id ? "border-amber-500 bg-neutral-900 shadow-2xl shadow-amber-500/20" : "border-white/5 bg-neutral-900/50 hover:border-white/10"}`}
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={
                                b.photoURL ||
                                `https://ui-avatars.com/api/?name=${b.name}`
                              }
                              className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-white/10"
                              alt={b.name}
                            />
                            <div className="text-left">
                              <h4 className="font-black text-white text-lg tracking-tight">
                                {b.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">
                                  Especialista
                                </p>
                                {b.portfolio && b.portfolio.length > 0 && (
                                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                )}
                                {b.portfolio && b.portfolio.length > 0 && (
                                    <p className="text-[9px] text-neutral-500 font-bold uppercase">{b.portfolio.length} Fotos</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-neutral-700" />
                        </button>
                        
                        {b.portfolio && b.portfolio.length > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingPortfolio(b);
                            }}
                            className="absolute right-14 top-1/2 -translate-y-1/2 p-3 bg-neutral-800 rounded-xl text-neutral-400 hover:text-amber-500 transition-all border border-white/5 hover:border-amber-500/30"
                          >
                            <ImageIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                {(role === "manager" || role === "barber") && (
                  <div className="bg-neutral-900 border border-amber-500/30 p-4 rounded-[2rem] flex flex-col gap-2">
                    <span className="text-xs font-black uppercase text-amber-500 tracking-widest pl-2">
                      Duração do Serviço (Minutos)
                    </span>
                    <input
                      type="number"
                      step="10"
                      min="10"
                      className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white font-bold"
                      value={customDuration}
                      onChange={(e) => {
                        setCustomDuration(Number(e.target.value));
                        setSelectedTime(null);
                      }}
                    />
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const day = addDays(new Date(), i);
                      const active = isSameDay(day, selectedDate);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedDate(day);
                            setSelectedTime(null);
                          }}
                          className={`flex flex-col items-center min-w-[64px] py-4 rounded-3xl transition-all border ${active ? "bg-amber-500 border-amber-500 text-black" : "bg-neutral-900 border-white/5 text-neutral-500"}`}
                        >
                          <span className="text-[10px] font-black uppercase mb-1">
                            {format(day, "EEE", { locale: ptBR })}
                          </span>
                          <span className="text-base font-black">
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedDate.getDay() === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] text-center space-y-4"
                  >
                    <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto border border-amber-500/20">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase text-amber-500 tracking-wider">Barbearia Fechada</h4>
                      <p className="text-xs text-neutral-400 mt-2 font-bold leading-relaxed px-4">
                        Não temos funcionamento aos domingos. Que tal escolher outro dia maravilhoso para cuidar do seu estilo?
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {timeSlots.map(({ time, available }) => (
                      <button
                        key={time}
                        disabled={!available}
                        onClick={() => {
                          setSelectedTime(time);
                          setStep(4);
                        }}
                        className={`py-4 rounded-2xl text-sm font-black transition-all border ${selectedTime === time ? "bg-amber-500 border-amber-500 text-black" : available ? "bg-neutral-900 border-white/5 text-white" : "bg-neutral-900/30 border-transparent text-neutral-700 opacity-50"}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
                <RecurrenceUI
                  userRole={user?.role || "client"}
                  recurrence={recurrence}
                  setRecurrence={setRecurrence}
                />
                {selectedDate.getDay() !== 0 && (
                  <button
                    disabled={!selectedTime}
                    onClick={() => setStep(4)}
                    className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-2"
                  >
                    Próximo Passo <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                {(!user || role === "manager" || role === "barber") && (
                  <div className="bg-neutral-900 p-6 rounded-[2rem] border border-white/5 space-y-4">
                    {(!user || role === "manager" || role === "barber") && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Search className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-black uppercase text-neutral-400 tracking-widest">
                            {" "}
                            {role === "manager" || role === "barber"
                              ? "Buscar Cliente Cadastrado"
                              : "Pesquisar Meus Dados (Caso já tenha agendado antes)"}
                          </span>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                          <input
                            type="text"
                            placeholder={
                              role === "manager" || role === "barber"
                                ? "Digite nome ou WhatsApp do cliente..."
                                : "Digite seu nome ou WhatsApp cadastrado..."
                            }
                            className="w-full pl-11 pr-12 py-4 bg-black rounded-2xl border border-white/5 text-white text-sm focus:border-amber-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setShowDropdown(false);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs font-bold uppercase transition-colors"
                            >
                              Limpar
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        {showDropdown && filteredClients.length > 0 && (
                          <div className="bg-neutral-950/80 border border-white/5 rounded-2xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-white/5">
                            {filteredClients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-all flex items-center justify-between group"
                                onClick={() => {
                                  setGuestName(client.name || "");
                                  setGuestPhone(client.whatsapp || "");
                                  setGuestEmail(client.email || "");
                                  setSelectedClient(client);
                                  setSearchQuery("");
                                  setShowDropdown(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-neutral-400 border border-white/10 overflow-hidden shrink-0">
                                    {client.photoURL ? (
                                      <img
                                        src={client.photoURL}
                                        alt={client.name}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      client.name?.[0] || "C"
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-white text-xs truncate group-hover:text-amber-500 transition-colors">
                                      {client.name}
                                    </h4>
                                    <p className="text-[10px] text-neutral-500 truncate">
                                      {client.whatsapp ||
                                        client.email ||
                                        "Sem contato"}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest shrink-0 bg-amber-500/10 px-2 py-1 rounded">
                                  {role === "manager" || role === "barber" ? "Vincular" : "Selecionar"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {showDropdown &&
                          searchQuery.trim() &&
                          filteredClients.length === 0 && (
                            <div className="py-3 px-4 bg-neutral-950/50 rounded-2xl border border-white/5 text-center">
                              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                                {role === "manager" || role === "barber"
                                  ? "Nenhum cliente cadastrado encontrado"
                                  : "Nenhum cadastro encontrado com esses dados"}
                              </p>
                            </div>
                          )}

                        <div className="h-[1px] bg-white/5 my-2" />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                          Dados do Agendamento
                        </span>
                        {/* Visual Indicator of Connection */}
                        {currentClientMatch && (
                          <span className="text-[9px] text-green-500 font-black uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full">
                            Cliente Encontrado (Tempo Real)
                          </span>
                        )}
                      </div>
                      {currentClientMatch && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs my-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-neutral-300 font-medium">
                              Vinculado a{" "}
                              <strong className="text-amber-500 font-bold">
                                {currentClientMatch.name}
                              </strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(null);
                              setGuestName("");
                              setGuestPhone("");
                              setGuestEmail("");
                            }}
                            className="text-[9px] text-neutral-400 font-extrabold uppercase hover:text-white transition-colors"
                          >
                            Desvincular
                          </button>
                        </motion.div>
                      )}
                      <input
                        placeholder="Nome do Cliente"
                        className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white text-sm focus:border-amber-500 outline-none transition-all"
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value);
                          if (
                            selectedClient &&
                            selectedClient.name !== e.target.value
                          ) {
                            setSelectedClient(null);
                          }
                        }}
                      />
                      <input
                        placeholder="WhatsApp do Cliente"
                        className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white text-sm focus:border-amber-500 outline-none transition-all"
                        value={guestPhone}
                        onChange={(e) => {
                          setGuestPhone(e.target.value);
                          if (
                            selectedClient &&
                            selectedClient.whatsapp !== e.target.value
                          ) {
                            setSelectedClient(null);
                          }
                        }}
                      />
                      <input
                        placeholder="E-mail (opcional)"
                        className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white text-sm focus:border-amber-500 outline-none transition-all"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                      />
                      {(!user && !selectedClient) && (
                        <input
                          placeholder="Código de Indicação (opcional)"
                          className="w-full p-4 bg-black rounded-2xl border border-white/5 text-white text-sm focus:border-amber-500 outline-none transition-all uppercase placeholder-normal"
                          value={guestReferralCode}
                          onChange={(e) => setGuestReferralCode(e.target.value.toUpperCase())}
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="bg-neutral-900 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-neutral-500 font-bold uppercase text-[10px]">
                      Procedimento
                    </span>
                    <span className="font-black text-white italic uppercase">
                      {services.find((s) => s.id === selectedService)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500 font-black uppercase text-base">
                      Total
                    </span>
                    <span className="text-3xl font-black text-white">
                      R${services.find((s) => s.id === selectedService)?.price}
                    </span>
                  </div>
                </div>
                {error && (
                  <p className="text-red-500 text-center font-bold">{error}</p>
                )}
                <button
                  disabled={isBooking}
                  onClick={handleConfirmBooking}
                  className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest active:scale-95 disabled:opacity-50 text-xl"
                >
                  {isBooking ? "AGENDANDO..." : "FINALIZAR AGENDAMENTO"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
