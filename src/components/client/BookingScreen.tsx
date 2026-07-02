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
  Star,
  Mic,
  MicOff,
} from "lucide-react";
import { db, handleFirestoreError, OperationType, safeStringify } from "../../lib/firebase";
import { signInWithGoogleCalendar, addEventToCalendar, getCalendarAccessToken } from "../../lib/calendar";
import { setupPushSubscription, getNotificationPermissionState, queryNotificationSupport, getBackendUrl } from "../../lib/pushRegister";
import { toast } from "../ui/Toast";
import { triggerSuccessHaptic, triggerLightHaptic } from "../../lib/haptics";

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
  if (userRole !== "barber" && userRole !== "manager" && userRole !== "developer") return null;
  return (
    <div className=" liquid-glass/50  rounded-[2rem] p-6 space-y-4">
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
            type="button"
            onClick={() => setRecurrence(r)}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              recurrence === r
                ? "bg-amber-500 text-black"
                : "bg-white/5 text-neutral-600 hover:text-white"
            }`}
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

interface ConfirmationModalProps {
  service: any;
  barber: any;
  date: string;
  onConfirm: () => void;
  userId: string;
  userRole: string;
  duration: number;
  appointmentId: string;
  user: any;
}

function ConfirmationModal({
  service,
  barber,
  date,
  onConfirm,
  userId,
  userRole,
  duration,
  appointmentId,
  user,
}: ConfirmationModalProps) {
  const [permission, setPermission] = useState(getNotificationPermissionState());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [mpPixActive, setMpPixActive] = useState<boolean | null>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [mpData, setMpData] = useState<any | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [cutsBalance, setCutsBalance] = useState(0);

  const [walletDeducted, setWalletDeducted] = useState(false);
  const [cutsDeducted, setCutsDeducted] = useState(false);

  useEffect(() => {
    if (userId && userId !== "guest") {
      const userRef = doc(db, "users", userId);
      getDoc(userRef).then((snap) => {
        if (snap.exists()) {
          const uData = snap.data();
          setWalletBalance(Number(uData.walletBalance || 0));
          setCutsBalance(Number(uData.cutsBalance || 0));
        }
      });
    }
  }, [userId]);

  const Q = service?.price ? Number(service.price) : 0;
  const hasWalletBalance = walletBalance > 0 && Q > 0;
  const hasCutsCredit = cutsBalance > 0;
  const walletDeductable = Math.min(walletBalance, Q);
  const remainder = cutsDeducted ? 0 : Math.max(0, Q - (walletDeducted ? walletDeductable : 0));

  const handlePayWithCuts = async () => {
    if (!mpLoading) {
      setMpLoading(true);
      try {
        const firestore = db || getFirestore();
        await runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, "users", userId);
          const appointmentRef = doc(firestore, "appointments", appointmentId);
          const userSnap = await transaction.get(userRef);
          const appSnap = await transaction.get(appointmentRef);

          if (!userSnap.exists()) throw new Error("Usuário não encontrado.");
          if (!appSnap.exists()) throw new Error("Agendamento não encontrado.");

          const userData = userSnap.data();
          if (appSnap.data().paymentStatus === "paid") {
            throw new Error("Agendamento já está pago.");
          }

          const currentCuts = Number(userData.cutsBalance || 0);
          if (currentCuts <= 0) throw new Error("Você não possui cortes disponíveis.");

          transaction.update(userRef, {
            cutsBalance: currentCuts - 1,
            updatedAt: serverTimestamp(),
          });
          transaction.update(appointmentRef, {
            status: "confirmed",
            paymentStatus: "paid",
            paidVia: "cuts_balance",
            totalPrice: 0,
            updatedAt: serverTimestamp(),
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
    }
  };

  const handlePayWithWallet = async () => {
    if (!mpLoading) {
      setMpLoading(true);
      try {
        const firestore = db || getFirestore();
        await runTransaction(firestore, async (transaction) => {
          const userRef = doc(firestore, "users", userId);
          const appointmentRef = doc(firestore, "appointments", appointmentId);
          const userSnap = await transaction.get(userRef);
          const appSnap = await transaction.get(appointmentRef);

          if (!userSnap.exists()) throw new Error("Usuário não encontrado.");
          if (!appSnap.exists()) throw new Error("Agendamento não encontrado.");

          const userData = userSnap.data();
          if (appSnap.data().paymentStatus === "paid") {
            throw new Error("Agendamento já está pago.");
          }

          const currentBalance = Number(userData.walletBalance || 0);
          if (currentBalance < Q) throw new Error("Saldo insuficiente na carteira.");

          transaction.update(userRef, {
            walletBalance: currentBalance - Q,
            updatedAt: serverTimestamp(),
          });
          transaction.update(appointmentRef, {
            status: "confirmed",
            paymentStatus: "paid",
            paidVia: "wallet",
            updatedAt: serverTimestamp(),
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
    }
  };

  const handleCopyPix = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
    toast.success("Código Copia e Cola copiado!");
  };

  const handleGenerateMpPix = async () => {
    setMpLoading(true);
    setMpError(null);
    try {
      const res = await fetch(getBackendUrl("/api/payments/mercado-pago/create-payment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: safeStringify({
          transaction_amount: remainder,
          description: `Serviço: ${service?.name}${walletDeducted ? " (Parcial Carteira)" : ""}`,
          email: user?.email || "automatico@msbarbaria.com.br",
          name: user?.displayName || user?.name || "Cliente",
          appointmentId: appointmentId || "temp-" + Date.now(),
          walletAmountToDeduct: walletDeducted ? walletDeductable : 0,
          userId: userId !== "guest" ? userId : null,
        }),
      });
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error("Payment API Error:", errText);
        throw new Error(`Erro de processamento da API de Pagamentos: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setMpData(data);
      } else {
        throw new Error(data.error || "Falha desconhecida");
      }
    } catch (e: any) {
      console.error(e);
      setMpError(e.message || "Erro desconhecido ao processar pagamento.");
    } finally {
      setMpLoading(false);
    }
  };

  const handleAddToCalendar = async () => {
    setCalendarLoading(true);
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
        setCalendarAdded(true);
      }
    } catch (err: any) {
      console.error(err?.message || err);
      const msg = err?.message || String(err);
      if (
        msg.includes("popup-closed-by-user") ||
        msg.includes("popup_closed_by_user") ||
        msg.includes("cancelled-popup-request") ||
        msg.includes("closed by user") ||
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        setCalendarError("popblock");
      } else {
        toast.error("Não foi possível adicionar ao calendário.");
      }
    } finally {
      setCalendarLoading(false);
    }
  };

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
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error("Erro ao verificar status do pagamento:", err);
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [mpData?.payment_id, paymentSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto"
    >
      <div className="max-w-sm w-full text-center space-y-6 my-auto py-4">
        {/* Top Icon */}
        <div className="w-16 h-16 bg-green-500 rounded-[1.8rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-black" strokeWidth={3} />
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Tudo Pronto!
          </h2>
          <p className="text-neutral-500 font-bold uppercase text-[9px] tracking-[0.2em]">
            Seu agendamento foi confirmado
          </p>
        </div>

        {/* Summary Info Box */}
        <div className=" liquid-glass/50 p-6 rounded-[2.5rem]  space-y-3">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
              Procedimento
            </p>
            <p className="text-lg font-black text-white uppercase italic">
              {service?.name}
            </p>
          </div>
          <div className="liquid-glass h-[1px]" />
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

        {/* Paying Section */}
        {mpPixActive === null ? (
          <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">
              Deseja deixar pago pelo App?
            </h4>
            <div className="space-y-4">
              {/* Use Cut Balance */}
              {hasCutsCredit && (
                <button
                  type="button"
                  onClick={() => {
                    setCutsDeducted(!cutsDeducted);
                    if (!cutsDeducted) setWalletDeducted(false);
                  }}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
                    cutsDeducted
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-500"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✂️</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                        Usar 1 Crédito de Corte
                      </p>
                      <p className="text-[9px] font-bold opacity-70">
                        Disponível: {cutsBalance}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      cutsDeducted ? "bg-amber-500" : "bg-neutral-800"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                        cutsDeducted ? "right-1" : "left-1"
                      }`}
                    />
                  </div>
                </button>
              )}

              {/* Use Wallet Balance */}
              {hasWalletBalance && !cutsDeducted && (
                <button
                  type="button"
                  onClick={() => setWalletDeducted(!walletDeducted)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
                    walletDeducted
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-500"
                      : "bg-white/5 border-white/10 text-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                        Usar Saldo Carteira
                      </p>
                      <p className="text-[9px] font-bold opacity-70">
                        Disponível: R$ {walletBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full relative transition-colors ${
                      walletDeducted ? "bg-amber-500" : "bg-neutral-800"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
                        walletDeducted ? "right-1" : "left-1"
                      }`}
                    />
                  </div>
                </button>
              )}
            </div>

            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-4">
              {cutsDeducted
                ? "Seu crédito de corte cobre o valor total! Confirmar agora?"
                : walletDeducted
                  ? remainder <= 0
                    ? "Seu saldo cobre o valor total! Deseja confirmar o pagamento agora?"
                    : `Seu saldo abate R$ ${walletDeductable.toFixed(2)}. Restante: R$ ${remainder.toFixed(2)} via Pix.`
                  : "Você pode pagar agora via Pix ou deixar para pagar na barbearia. É opcional!"}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (cutsDeducted) {
                    handlePayWithCuts();
                  } else if (walletDeducted && remainder <= 0) {
                    handlePayWithWallet();
                  } else {
                    setMpPixActive(true);
                    handleGenerateMpPix();
                  }
                }}
                className="w-full py-4 rounded-[1.5rem] bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all text-center block font-sans"
              >
                {cutsDeducted
                  ? "CONFIRMAR USANDO CORTE"
                  : walletDeducted && remainder <= 0
                    ? "CONFIRMAR PAGAMENTO TOTAL"
                    : "SIM, QUERO PAGAR AGORA"}
              </button>
              <button
                type="button"
                onClick={() => setMpPixActive(false)}
                className="liquid-glass w-full py-4 rounded-[1.5rem] text-white text-[10px] font-black uppercase tracking-widest  active:scale-95 transition-all text-center block font-sans"
              >
                NÃO, PAGAREI NA BARBEARIA
              </button>
            </div>
          </div>
        ) : mpPixActive === true ? (
          <div className=" liquid-glass  p-6 rounded-[2.5rem] space-y-4 text-center">
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-auto flex items-center justify-center text-amber-500">
                <span className="text-xl">⚡</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Pagamento via Pix
                </h4>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">
                  Baixa automática instantânea
                </p>
              </div>

              {paymentSuccess ? (
                <div className="py-6 space-y-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-black mb-2 animate-bounce">
                    <CheckCircle2 strokeWidth={3} size={32} />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">
                    Pagamento Aprovado!
                  </h3>
                  <p className="text-xs text-neutral-400 font-medium">
                    Seu agendamento foi pago com sucesso.
                  </p>
                </div>
              ) : mpLoading ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <span className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                  <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest animate-pulse">
                    Gerando Pix...
                  </p>
                </div>
              ) : mpError ? (
                <div className="py-6 space-y-4">
                  <p className="text-xs text-red-400 font-medium">{mpError}</p>
                  <button
                    type="button"
                    onClick={handleGenerateMpPix}
                    className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : mpData?.qr_code_base64 && mpData?.qr_code ? (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-3xl mx-auto w-fit shadow-xl shadow-amber-500/10">
                    <img
                      src={`data:image/png;base64,${mpData.qr_code_base64}`}
                      alt="QR Code Pix"
                      className="w-[180px] h-[180px] rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPix(mpData.qr_code)}
                    className="liquid-glass w-full py-4 rounded-[1.2rem] text-[10px] font-black uppercase text-white  transition-colors flex items-center justify-center gap-2"
                  >
                    {copiedPix ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
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
        ) : null}
        <div className="space-y-3">
          {/* Web Push Notification subscription if permission not granted */}
          {permission !== "granted" && queryNotificationSupport() && (
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
                type="button"
                onClick={async () => {
                  const cleanId = userId || "anonymous";
                  const success = await setupPushSubscription(cleanId, userRole || "client");
                  if (success) {
                    setPermission("granted");
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

          <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest leading-relaxed">
            Enviamos um resumo no seu WhatsApp e e-mail.
          </p>

          <button
            type="button"
            onClick={handleAddToCalendar}
            disabled={calendarLoading || calendarAdded}
            className={`w-full py-4 rounded-[1.8rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${
              calendarAdded
                ? "bg-green-500/10 border-green-500/30 text-green-500"
                : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white hover:border-white/10"
            }`}
          >
            {calendarLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ADICIONANDO...
              </>
            ) : calendarAdded ? (
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
              <div className="liquid-glass h-[1px] my-1" />
              <p className="text-[10px] text-amber-500 font-black uppercase tracking-wide leading-normal">
                👉 Como resolver: Clique no botão <span className="text-white">"Abrir em nova aba" ↗</span> no topo do painel à direita e faça login por lá!
              </p>
            </motion.div>
          )}

          <button
            type="button"
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

interface PortfolioModalProps {
  barber: any;
  onClose: () => void;
}

function PortfolioModal({ barber, onClose }: PortfolioModalProps) {
  const [ratingsStats, setRatingsStats] = useState<{ average: number; count: number } | null>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!barber?.id) return;
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "appointments"),
      where("barberId", "==", barber.id),
      where("status", "==", "completed")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sum = 0;
      let count = 0;
      const reviewsList: any[] = [];
      
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.rating && typeof data.rating === "number" && data.rating >= 1 && data.rating <= 5) {
          sum += data.rating;
          count++;
          if (data.review?.comment) {
            reviewsList.push({
              id: d.id,
              clientName: data.clientName || "Cliente",
              rating: data.rating,
              comment: data.review.comment,
              date: data.review.createdAt || data.date
            });
          }
        }
      });
      
      reviewsList.sort((a, b) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Timestamp ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      });

      setRecentReviews(reviewsList.slice(0, 3));
      setRatingsStats({
        average: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
        count
      });
      setLoadingStats(false);
    }, (err) => {
      console.error("Error loading ratings statistics for barber:", err);
      setLoadingStats(false);
    });

    return () => unsubscribe();
  }, [barber?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="liquid-glass fixed inset-0 z-[110] backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className=" liquid-glass  rounded-[2.5rem] max-w-lg w-full p-6 relative overflow-hidden space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="liquid-glass absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-full  transition-all"
        >
          <XCircle className="w-5 h-5" />
        </button>

        {/* Barber Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[1.2rem] liquid-glass  overflow-hidden">
            {barber.profilePic ? (
              <img src={barber.profilePic} alt={barber.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-amber-500/10 text-amber-500 animate-pulse">
                <User className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="text-left flex-1">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">
              {barber.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                Portfólio & Cortes
              </p>
              {!loadingStats && ratingsStats && ratingsStats.count > 0 && (
                <>
                  <span className="liquid-glass w-1 h-1 rounded-full" />
                  <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md text-amber-500 text-[10px] font-black">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{ratingsStats.average} ({ratingsStats.count})</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {barber.portfolio && barber.portfolio.length > 0 ? (
            barber.portfolio.map((imgUrl: string, idx: number) => (
              <div key={idx} className="aspect-square liquid-glass rounded-2xl overflow-hidden  group relative">
                <img src={imgUrl} alt={`Corte ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
              </div>
            ))
          ) : (
            <div className="liquid-glass col-span-2 py-12 text-center text-neutral-500 text-[10px] uppercase font-black tracking-widest -dashed rounded-2xl">
              Nenhum corte no portfólio ainda
            </div>
          )}
        </div>

        {/* Recent Client Reviews */}
        {!loadingStats && recentReviews.length > 0 && (
          <div className="space-y-2.5 text-left border-t border-white/5 pt-4">
            <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest text-sans">Avaliações Recentes</p>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {recentReviews.map((rev) => (
                <div key={rev.id} className=" liquid-glass/40  rounded-2xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold text-white uppercase">{rev.clientName}</p>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400 italic font-medium leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          type="button"
          className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] hover:scale-105 transition-transform font-sans"
        >
          FECHAR PORTFÓLIO
        </button>
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
  initialStyle?: { title: string, imageUrl: string } | null;
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
  initialStyle,
}: BookingScreenProps) {
  const [step, setStep] = useState(
    editAppointment ? 3 : initialServiceId && initialBarberId ? 3 : initialServiceId ? 2 : 1,
  );
  const [selectedService, setSelectedService] = useState<string | null>(
    editAppointment?.serviceId || initialServiceId || null,
  );
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");

  const categories = useMemo(() => {
    const raw = services.filter(s => s.active !== false).map((s) => s.category || "Corte & Barba");
    return ["todos", ...Array.from(new Set(raw))];
  }, [services]);

  const filteredServicesList = useMemo(() => {
    return services.filter((s) => {
      if (s.active === false) return false;
      const matchesSearch = s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase());
      const serviceCat = s.category || "Corte & Barba";
      const matchesCategory = selectedCategory === "todos" || serviceCat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, serviceSearchQuery, selectedCategory]);
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
  const [forceEncaixe, setForceEncaixe] = useState(false);
  const [customTime, setCustomTime] = useState("");
  const [showCustomTimeForm, setShowCustomTimeForm] = useState(false);
  const [barberAppointments, setBarberAppointments] = useState<any[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [recurrence, setRecurrence] = useState<
    "none" | "weekly" | "biweekly" | "monthly"
  >(editAppointment?.recurrence || "none");
  const [isBooking, setIsBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedAlternativeTimes, setSuggestedAlternativeTimes] = useState<string[]>([]);
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
  const [promotions, setPromotions] = useState<any[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [pendingBarber, setPendingBarber] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const [voiceInput, setVoiceInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [voiceExplanation, setVoiceExplanation] = useState<string | null>(null);

  // Web Speech API initialization
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("O reconhecimento de voz não é suportado pelo seu navegador atual. Você pode digitar seu pedido!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceExplanation(null);
        toast.info("Ouvindo... Fale o serviço, barbeiro, dia e hora que deseja! 🎙️");
      };

      recognition.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
        toast.error("Erro na escuta. Tente falar um pouco mais alto ou digite seu agendamento!");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setVoiceInput(transcript);
          toast.success("Transcrito com sucesso! Carregando preenchimento...");
          handleVoiceBookingSubmit(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleVoiceBookingSubmit = async (promptToSend?: string) => {
    const textPrompt = promptToSend || voiceInput;
    if (!textPrompt.trim()) {
      toast.error("Por favor, digite ou fale algo antes de enviar! 🎯");
      return;
    }

    setProcessingVoice(true);
    setVoiceExplanation(null);

    try {
      const response = await fetch(getBackendUrl("/api/voice-booking"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: textPrompt,
          clientLocalDate: new Date().toISOString(),
          services: services.map(s => ({ id: s.id, name: s.name, price: s.price })),
          barbers: barbers.map(b => ({ id: b.id, name: b.name })),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na rede do processador");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Preencher o formulário baseado no retorno de IA
      if (data.serviceId) {
        setSelectedService(data.serviceId);
      }
      if (data.barberId) {
        setSelectedBarber(data.barberId);
      }
      if (data.date) {
        setSelectedDate(new Date(data.date));
      }
      if (data.time) {
        setSelectedTime(data.time);
      }

      // Auto-avance de etapas dependendo do que foi preenchido
      if (data.serviceId && data.barberId && data.date && data.time) {
        setStep(4);
      } else if (data.serviceId && data.barberId) {
        setStep(3);
      } else if (data.serviceId) {
        setStep(2);
      }

      setVoiceExplanation(data.explanation || "Agendamento pré-preenchido com sucesso pelo assistente de IA!");
      toast.success("Campos preenchidos pela IA! ✨");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao processar comando de voz. Tente preencher manualmente!");
    } finally {
      setProcessingVoice(false);
    }
  };

  const selectedServiceObj = useMemo(() => {
    return services.find((s) => s.id === selectedService);
  }, [services, selectedService]);

  const selectedBarberObj = useMemo(() => {
    return barbers.find((b) => b.id === selectedBarber);
  }, [barbers, selectedBarber]);

  const handleApplyCoupon = async (codeToApply: string) => {
    if (!codeToApply.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    setAppliedDiscount(0);

    try {
      const cleanCode = codeToApply.toUpperCase().replace(/\s+/g, "").trim();
      const querySnapshot = await getDocs(query(collection(db, "promotions"), where("code", "==", cleanCode)));

      if (querySnapshot.empty) {
        setCouponError("Cupom não encontrado ou inválido.");
        return;
      }

      const promoDoc = querySnapshot.docs[0];
      const promoData = promoDoc.data();
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      if (!promoData.active) {
        setCouponError("Este cupom está pausado ou inativo.");
        return;
      }

      if (todayStr < promoData.validFrom) {
        setCouponError("Este cupom de desconto ainda não é válido.");
        return;
      }

      if (todayStr > promoData.validUntil) {
        setCouponError("Este cupom de desconto já expirou.");
        return;
      }

      const discount = Number(promoData.discountPercentage || 0);
      setAppliedDiscount(discount);
      setCouponSuccess(`Ativo! Cupom "${cleanCode}" com ${discount}% de desconto! 🎉`);
    } catch (err) {
      console.error("Erro ao validar cupom:", err);
      setCouponError("Erro de comunicação ao validar.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  useEffect(() => {
    if (editAppointment?.couponCode) {
      handleApplyCoupon(editAppointment.couponCode);
    }
  }, [editAppointment]);

  useEffect(() => {
    const q = query(collection(db, "promotions"), where("active", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const promos: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPromotions(promos
        .filter((p: any) => !p.validFrom || p.validFrom <= todayStr)
        .filter((p: any) => !p.validUntil || p.validUntil >= todayStr)
      );
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "promotions");
    });
    return unsubscribe;
  }, []);
  const [customDuration, setCustomDuration] = useState<number>(
    editAppointment?.serviceDuration || 0,
  );

  useEffect(() => {
    if (selectedService && services.length > 0) {
      const service = services.find((s) => s.id === selectedService);
      if (service && (!customDuration || customDuration === 0 || (editAppointment ? false : customDuration !== service.duration))) {
        if (editAppointment && editAppointment.serviceId === selectedService && editAppointment.serviceDuration) {
          setCustomDuration(editAppointment.serviceDuration);
        } else {
          setCustomDuration(service.duration || 30);
        }
      }
    }
  }, [selectedService, services, editAppointment]);

  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(initialClient || null);
  const [viewingPortfolio, setViewingPortfolio] = useState<any | null>(null);

  useEffect(() => {
    const isStaff = role === "manager" || role === "barber" || role === "developer";
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
      where("role", "in", ["barber", "manager", "developer"]),
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

    const endHourDate = new Date(selectedDate);
    const endCloseInt = Math.floor(endHour);
    const endCloseMin = Math.round((endHour % 1) * 60);
    endHourDate.setHours(endCloseInt, endCloseMin, 0, 0);

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

        let blockedReason: string | undefined;

        // Verify if procedure exceeds closing time
        const exceedsClosing = slotEnd > endHourDate;
        if (exceedsClosing) {
          blockedReason = "Fechando";
        }

        const isAppBusy = barberAppointments.some((app) => {
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
          });

        const isBlocked = blockedTimes.some((b) => {
            const bDate =
              b.date instanceof Timestamp
                ? b.date.toDate()
                : typeof b.date === "string"
                  ? parseISO(b.date)
                  : typeof b.date.seconds === "number" 
                    ? new Date(b.date.seconds * 1000)
                    : new Date(b.date);
            
            // Check barber
            if (b.barberId !== "all" && b.barberId !== selectedBarber) return false;
            
            if (format(bDate, "yyyy-MM-dd") !== format(selectedDate, "yyyy-MM-dd")) {
              return false;
            }

            if (b.startTime && b.endTime) {
              const [bStartH, bStartM] = b.startTime.split(":").map(Number);
              const [bEndH, bEndM] = b.endTime.split(":").map(Number);
              const blockStart = new Date(selectedDate);
              blockStart.setHours(bStartH, bStartM, 0, 0);
              const blockEnd = new Date(selectedDate);
              blockEnd.setHours(bEndH, bEndM, 0, 0);

              if (slotDate < blockEnd && slotEnd > blockStart) {
                blockedReason = b.reason || "Bloqueado";
                return true;
              }
            } else {
              if (format(bDate, "HH:mm") === time) {
                blockedReason = b.reason || "Bloqueado";
                return true;
              }
            }
            return false;
          });

        const isBusy = isAppBusy || isBlocked || exceedsClosing;
        const isPast = slotDate < new Date();
        const isStaff = role === "barber" || role === "manager" || role === "developer";
        
        // Overrides available to true if forceEncaixe is enabled for staff members
        const isAvailable = (!isBusy && (!isPast || isStaff)) || (isStaff && forceEncaixe);

        slots.push({
          time,
          available: isAvailable,
          isBusy,
          blockedReason,
          isPast,
          originalAvailable: !isBusy && (!isPast || isStaff)
        });
      }
    }
    return slots;
  }, [selectedDate, barberAppointments, blockedTimes, customDuration, role, forceEncaixe]);

  const nearestEmptySlots = useMemo(() => {
    const isStaff = role === "barber" || role === "manager" || role === "developer";
    if (!isStaff || timeSlots.length === 0) return [];

    const now = new Date();
    const isToday = isSameDay(selectedDate, now);

    const candidates = timeSlots.filter(slot => {
      // Must be originally empty/available and not already past
      if (!slot.originalAvailable) return false;
      
      const [h, m] = slot.time.split(":").map(Number);
      const slotDate = new Date(selectedDate);
      slotDate.setHours(h, m, 0, 0);

      // If today, filter out past slots so we only recommend upcoming free ones
      if (isToday) {
        return slotDate >= now;
      }
      return true;
    });

    // Take the top 3 closest empty slots
    return candidates.slice(0, 3);
  }, [timeSlots, selectedDate, role]);

  const handleConfirmBooking = async () => {
    triggerSuccessHaptic();
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      setError("Todos os campos são obrigatórios.");
      return;
    }
    const isStaffBooking = role === "manager" || role === "barber" || role === "developer";

    if ((!user || isStaffBooking) && (!guestName || !guestPhone)) {
      setError("Nome e WhatsApp são obrigatórios para o cliente.");
      return;
    }
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours, minutes, 0, 0);
    const duration = customDuration || 30;
    const finalDateEnd = new Date(finalDate.getTime() + duration * 60000);

    // Business hours boundary on submission logic
    const closeDay = selectedDate.getDay();
    let dayEndHour = 0;
    if (closeDay >= 1 && closeDay <= 5) {
      dayEndHour = 20;
    } else if (closeDay === 6) {
      dayEndHour = 19.5;
    }
    if (dayEndHour > 0) {
      const endLimitDate = new Date(selectedDate);
      const closeLimitH = Math.floor(dayEndHour);
      const closeLimitM = Math.round((dayEndHour % 1) * 60);
      endLimitDate.setHours(closeLimitH, closeLimitM, 0, 0);
      if (finalDateEnd > endLimitDate && !isStaffBooking) {
        setError("Este horário ultrapassa o período de funcionamento da barbearia.");
        setIsBooking(false);
        return;
      }
    }

    // Final Overlap / Busy Check (Real-time data from snapshot)
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

    if (isStillBusy && !isStaffBooking) {
      setError(
        "Este horário foi reservado por outra pessoa enquanto você finalizava. Por favor, escolha outro horário.",
      );
      // Calculate suggested alternative free times
      const freeSlots = timeSlots.filter((s) => s.available);
      if (freeSlots.length > 0) {
        const [selH, selM] = selectedTime.split(":").map(Number);
        const selVal = selH * 60 + selM;
        const suggestions = [...freeSlots]
          .sort((a, b) => {
            const [aH, aM] = a.time.split(":").map(Number);
            const [bH, bM] = b.time.split(":").map(Number);
            const aVal = aH * 60 + aM;
            const bVal = bH * 60 + bM;
            return Math.abs(aVal - selVal) - Math.abs(bVal - selVal);
          })
          .slice(0, 3)
          .map((s) => s.time);
        setSuggestedAlternativeTimes(suggestions);
      } else {
        setSuggestedAlternativeTimes([]);
      }
      setIsBooking(false);
      return;
    }

    // Final Blocked Times Overlap Check
    const isStillBlocked = blockedTimes.some((b) => {
      const bDate =
        b.date instanceof Timestamp
          ? b.date.toDate()
          : typeof b.date === "string"
            ? parseISO(b.date)
            : typeof b.date.seconds === "number"
              ? new Date(b.date.seconds * 1000)
              : new Date(b.date);

      if (b.barberId !== "all" && b.barberId !== selectedBarber) return false;
      if (format(bDate, "yyyy-MM-dd") !== format(selectedDate, "yyyy-MM-dd")) return false;

      if (b.startTime && b.endTime) {
        const [sh, sm] = b.startTime.split(":").map(Number);
        const [eh, em] = b.endTime.split(":").map(Number);
        const blockStart = new Date(selectedDate);
        blockStart.setHours(sh, sm, 0, 0);
        const blockEnd = new Date(selectedDate);
        blockEnd.setHours(eh, em, 0, 0);
        return finalDate < blockEnd && finalDateEnd > blockStart;
      } else {
        const bHour = bDate.getHours();
        const bMin = bDate.getMinutes();
        const blockStart = new Date(selectedDate);
        blockStart.setHours(bHour, bMin, 0, 0);
        const blockEnd = new Date(blockStart.getTime() + 30 * 60000);
        return finalDate < blockEnd && finalDateEnd > blockStart;
      }
    });

    if (isStillBlocked && !isStaffBooking) {
      setError(
        "Este horário foi bloqueado ou reservado recentemente. Por favor, escolha outro horário.",
      );
      // Calculate suggested alternative free times
      const freeSlots = timeSlots.filter((s) => s.available);
      if (freeSlots.length > 0) {
        const [selH, selM] = selectedTime.split(":").map(Number);
        const selVal = selH * 60 + selM;
        const suggestions = [...freeSlots]
          .sort((a, b) => {
            const [aH, aM] = a.time.split(":").map(Number);
            const [bH, bM] = b.time.split(":").map(Number);
            const aVal = aH * 60 + aM;
            const bVal = bH * 60 + bM;
            return Math.abs(aVal - selVal) - Math.abs(bVal - selVal);
          })
          .slice(0, 3)
          .map((s) => s.time);
        setSuggestedAlternativeTimes(suggestions);
      } else {
        setSuggestedAlternativeTimes([]);
      }
      setIsBooking(false);
      return;
    }

    setError(null);
    setIsBooking(true);
    if (finalDate < new Date() && !isStaffBooking) {
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
        recurrence: recurrence || "none",
        selectedStyle: initialStyle || null,
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
              password: "1234",
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

      <div className="min-h-[100dvh] bg-black pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto py-8 px-6"
        >
          {/* Custom Sleek Step Indicator Navigation (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center justify-center gap-2 mb-10 liquid-glass/40 p-2.5 rounded-[1.75rem] ">
            {[
              { id: 1, label: "Serviço" },
              { id: 2, label: "Profissional" },
              { id: 3, label: "Data & Hora" },
              { id: 4, label: "Confirmar" }
            ].map((s) => (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={step < s.id && !selectedService}
                  onClick={() => {
                    if (s.id === 1) setStep(1);
                    if (s.id === 2 && selectedService) setStep(2);
                    if (s.id === 3 && selectedService && selectedBarber) setStep(3);
                    if (s.id === 4 && selectedService && selectedBarber && selectedTime) setStep(4);
                  }}
                  className={`px-5 py-2.5 rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                    step === s.id 
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10" 
                      : (step > s.id 
                          ? "text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer" 
                          : "text-neutral-600 cursor-not-allowed")
                  }`}
                >
                  <span className={`w-4 h-4 rounded-lg flex items-center justify-center text-[7.5px] font-black ${step === s.id ? 'bg-black text-amber-500' : 'bg-neutral-900 text-neutral-500'}`}>
                    {s.id}
                  </span>
                  {s.label}
                </button>
                {s.id < 4 && <ChevronRight className="w-3.5 h-3.5 text-neutral-800 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center justify-between mb-8 sm:mb-6">
            <button
              onClick={step === 1 ? onBack : () => setStep(step - 1)}
              className="w-11 h-11 rounded-2xl bg-neutral-900  liquid-glass flex items-center justify-center text-neutral-400 hover:text-amber-500  active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="text-center sm:hidden">
              <span className="text-[7.5px] font-black text-amber-500/90 uppercase tracking-[0.25em] block mb-1">
                Passo {step} de 4
              </span>
              <h2 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">
                {getStepTitle()}
              </h2>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-[8.5px] text-neutral-500 font-extrabold uppercase tracking-[0.2em]">Agendamento Exclusivo</span>
            </div>
          </div>

          {initialStyle && (
            <motion.div 
              id="selected-lookbook-banner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="liquid-glass -amber-500/10 p-4 rounded-[1.75rem] mb-8 flex items-center justify-between gap-4 relative overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3.5">
                <img src={initialStyle.imageUrl} className="w-10 h-10 object-cover rounded-xl border border-white/10 shrink-0" alt="Referência" />
                <div className="text-left">
                  <span className="text-[8px] font-black uppercase text-amber-500 tracking-wider block">Estilo Selecionado no Lookbook</span>
                  <p className="text-xs font-black uppercase text-white truncate max-w-[170px] sm:max-w-xs leading-none mt-1">{initialStyle.title}</p>
                </div>
              </div>
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tight flex items-center gap-1.5 shrink-0 select-none">
                <Sparkles className="w-2.5 h-2.5" /> Vinculado
              </span>
            </motion.div>
          )}

          {/* Real-time Summary Badges for Mobile */}
          {(selectedServiceObj || selectedBarberObj || selectedTime) && (
            <div className="flex sm:hidden flex-wrap gap-2 mb-6 liquid-glass/40 p-3 rounded-2xl  items-center justify-start text-left">
              <span className="text-[7.5px] font-black uppercase text-neutral-500 tracking-wider mr-1">RESUMO:</span>
              {selectedServiceObj && (
                <div className="bg-amber-500/15 border border-amber-500/10 rounded-lg px-2.5 py-1 text-[8.5px] font-bold text-amber-500 flex items-center gap-1">
                  <span>✂️</span> {selectedServiceObj.name}
                </div>
              )}
              {selectedBarberObj && (
                <div className="liquid-glass rounded-lg px-2.5 py-1 text-[8.5px] font-bold text-neutral-300 flex items-center gap-1">
                  <span>💈</span> {selectedBarberObj.name}
                </div>
              )}
              {selectedTime && (
                <div className="liquid-glass rounded-lg px-2.5 py-1 text-[8.5px] font-bold text-neutral-300 flex items-center gap-1">
                  <span>📅</span> {format(selectedDate, "dd/MM")} às {selectedTime}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6 text-left">
            {/* Form Steps Block */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                {/* Search & Category Filter Section */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-amber-500 z-10" />
                    <input
                      type="text"
                      placeholder="Pesquisar serviço (ex: Degradê, Barba, Combo...)"
                      className="w-full pl-12 pr-4 py-4 bg-neutral-900/40  liquid-glass/60 transition-all  rounded-2xl text-white text-xs placeholder-neutral-600 focus:border-amber-500/30 outline-none font-medium"
                      value={serviceSearchQuery}
                      onChange={(e) => setServiceSearchQuery(e.target.value)}
                    />
                  </div>

                  {categories.length > 2 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all border ${
                            selectedCategory === cat
                              ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10"
                              : "bg-neutral-900/50 border-white/5 text-neutral-500 hover:text-white hover:border-neutral-800"
                          }`}
                        >
                          {cat === "todos" ? "✨ Ver Todos" : cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredServicesList.length === 0 ? (
                  <div className="liquid-glass py-20 text-center space-y-4 rounded-[2.5rem] -dashed">
                    <div className="liquid-glass w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-neutral-600">
                      <Search className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-1 px-4">
                      <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Nenhum serviço encontrado</p>
                      <p className="text-[9px] text-neutral-600 uppercase font-bold">Por favor ajuste seus filtros ou digite outro termo</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredServicesList.map((s) => {
                      const isSelected = selectedService === s.id;
                      return (
                        <motion.button
                          key={s.id}
                          whileHover={{ y: -3, scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            triggerLightHaptic();
                            setSelectedService(s.id);
                            setCustomDuration(s.duration || 30);
                            setStep(2);
                          }}
                          className={`group p-6 rounded-[2.2rem] border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[140px] ${
                            isSelected 
                              ? "border-amber-500 bg-neutral-900/90 shadow-2xl shadow-amber-500/10" 
                              : "border-white/5 bg-neutral-900/40 hover:border-white/10 hover:bg-neutral-900/60"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                          )}
                          
                          <div className="flex justify-between items-start w-full relative z-10 mb-5">
                            <div className="space-y-1 max-w-[70%]">
                              <span className="text-[7.5px] font-black uppercase text-amber-500/95 tracking-[0.22em] block">
                                {s.category || "Corte & Estilo"}
                              </span>
                              <h4 className="font-sans font-black text-white text-base sm:text-lg uppercase italic tracking-tight group-hover:text-amber-400 transition-colors leading-snug">
                                {s.name}
                              </h4>
                            </div>
                            
                            <div className={`px-4 py-2 rounded-2xl transition-all border shrink-0 ${
                              isSelected 
                                ? "bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/5" 
                                : "bg-amber-500/5 border-amber-500/10 text-amber-500"
                            }`}>
                              <span className="text-sm font-black italic">
                                R${s.price}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between w-full mt-auto text-neutral-500 text-[10px] font-extrabold uppercase pt-2 border-t border-white/5">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-neutral-600" /> {s.duration} min</span>
                            <span className="text-[8px] text-neutral-600 group-hover:text-amber-500/80 transition-colors flex items-center gap-1">SELECIONAR &rarr;</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
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
                    <div className="liquid-glass py-20 text-center space-y-4 rounded-[2.5rem] -dashed col-span-1 md:col-span-2">
                      <div className="liquid-glass w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-neutral-600">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">
                          Buscando profissionais...
                        </p>
                        <p className="text-[9px] text-neutral-600 px-6 uppercase font-bold">
                          Por favor, aguarde alguns instantes
                        </p>
                      </div>
                    </div>
                  ) : (
                    barbers.map((b) => {
                      const isSelected = selectedBarber === b.id;
                      return (
                        <motion.div
                          key={b.id}
                          whileHover={{ y: -3, scale: 1.01 }}
                          className="relative"
                        >
                          <button
                            onClick={() => {
                              triggerLightHaptic();
                              if (b.role === 'developer') {
                                setPendingBarber(b.id);
                                setShowDevModal(true);
                              } else {
                                setSelectedBarber(b.id);
                                setStep(3);
                              }
                            }}
                            className={`w-full p-6 py-7 rounded-[2.2rem] border flex items-center justify-between transition-all group text-left ${
                              isSelected 
                                ? "border-amber-500 bg-neutral-900/90 shadow-2xl shadow-amber-500/10" 
                                : "border-white/5 bg-neutral-900/40 hover:border-white/10 hover:bg-neutral-900/60"
                            }`}
                          >
                            <div className="flex items-center gap-5">
                              <div className="relative shrink-0">
                                <img
                                  src={b.photoURL || `https://ui-avatars.com/api/?name=${b.name}`}
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] object-cover border-2 border-white/10 group-hover:border-amber-500/30 transition-all"
                                  alt={b.name}
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
                              </div>
                              
                              <div className="text-left space-y-1">
                                <span className={`text-[7.5px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded leading-none inline-block ${b.role === 'developer' ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-amber-500 bg-amber-500/10'}`}>
                                  {b.role === 'developer' ? 'DESENVOLVEDOR' : (b.role === "manager" ? "Barbeiro" : "Especialista")}
                                </span>
                                <h4 className="font-sans font-black text-white text-base sm:text-lg uppercase italic tracking-tight group-hover:text-amber-400 transition-colors leading-none">
                                  {b.name}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <p className="text-[9.5px] text-neutral-500 font-extrabold uppercase">Atendimento Premium</p>
                                  {b.portfolio && b.portfolio.length > 0 && (
                                    <>
                                      <span className="liquid-glass w-1 h-1 rounded-full" />
                                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-tight flex items-center gap-1">
                                        📸 {b.portfolio.length} Trabalhos
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="w-5 h-5 text-neutral-700 group-hover:text-amber-500 group-hover:translate-x-1 transition-all shrink-0" />
                          </button>

                          {b.portfolio && b.portfolio.length > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingPortfolio(b);
                              }}
                              className="absolute right-14 top-1/2 -translate-y-1/2 p-3 liquid-glass  rounded-2xl text-neutral-400 hover:text-amber-500 hover:border-amber-500/30 active:scale-95 transition-all shadow-inner cursor-pointer"
                              title="Ver Portfólio de Trabalhos"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (() => {
              // Group times into categorized time periods
              const morning: any[] = [];
              const afternoon: any[] = [];
              const evening: any[] = [];
              
              timeSlots.forEach(slot => {
                const hour = parseInt(slot.time.split(":")[0], 10);
                if (hour < 12) {
                  morning.push(slot);
                } else if (hour < 18) {
                  afternoon.push(slot);
                } else {
                  evening.push(slot);
                }
              });

              return (
                <motion.div
                  key="step3"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-8"
                >
                  {(role === "manager" || role === "barber" || role === "developer") && (
                    <div className="space-y-4">
                      {/* Service Duration Selection */}
                      <div className="liquid-glass/60 p-5 rounded-[2.2rem] flex flex-col gap-2 text-left">
                        <span className="text-[8.5px] font-black uppercase text-amber-500 tracking-[0.2em] pl-1">
                          Duração Personalizada do Serviço (Minutos)
                        </span>
                        <input
                          type="number"
                          step="10"
                          min="10"
                          className="w-full liquid-glass focus:border-amber-500/50 outline-none rounded-2xl p-4 text-white text-xs font-bold transition-all"
                          value={customDuration}
                          onChange={(e) => {
                            setCustomDuration(Number(e.target.value));
                            setSelectedTime(null);
                          }}
                        />
                      </div>

                      {/* Staff Overbooking Panel */}
                      <div className="liquid-glass/65 p-6 rounded-[2.2rem] space-y-4 text-left border border-amber-500/20 shadow-lg shadow-black/40">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <span className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">
                            Painel de Controle do Barbeiro
                          </span>
                          <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase">
                            ADMIN
                          </span>
                        </div>

                        <div className="flex flex-col gap-4">
                          {/* Force Encaixe Mode Toggle */}
                          <div className="flex items-center justify-between cursor-pointer group">
                            <div className="space-y-0.5 pr-2">
                              <span className="text-xs font-bold text-white group-hover:text-amber-500 transition-colors">
                                🔧 Permitir Encaixe (Horários Ocupados/Passados)
                              </span>
                              <p className="text-[10px] text-neutral-400">
                                Ative para liberar a seleção de horários já reservados ou passados.
                              </p>
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setForceEncaixe(!forceEncaixe)}
                                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${forceEncaixe ? 'bg-amber-500' : 'bg-neutral-800'}`}
                              >
                                <span className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${forceEncaixe ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          </div>

                          {/* Custom Slot (Type Custom Time) */}
                          <div className="border-t border-white/5 pt-4 space-y-2">
                            <button
                              type="button"
                              onClick={() => setShowCustomTimeForm(!showCustomTimeForm)}
                              className="text-xs font-black text-amber-500 flex items-center gap-1.5 hover:underline uppercase tracking-wider"
                            >
                              {showCustomTimeForm ? "✕ Fechar Horário Personalizado" : "➕ Inserir Novo Slot (Horário Customizado)"}
                            </button>

                            {showCustomTimeForm && (
                              <div className="space-y-3 pt-1 animate-in slide-in-from-top-1 duration-200">
                                <p className="text-[10px] text-neutral-400">
                                  Insira um horário específico para criar um novo slot na agenda (ex: 14:15, 17:45).
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="time"
                                    className="bg-black border border-white/10 rounded-2xl p-4 text-white text-sm font-bold outline-none focus:border-amber-500 transition-colors grow"
                                    value={customTime}
                                    onChange={(e) => setCustomTime(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!customTime) {
                                        toast.error("Insira um horário válido.");
                                        return;
                                      }
                                      setSelectedTime(customTime);
                                      toast.success(`Horário customizado definido para ${customTime}!`);
                                      setStep(4);
                                    }}
                                    className="bg-amber-500 hover:bg-amber-600 text-black px-5 py-4 rounded-2xl font-black uppercase text-xs transition-colors"
                                  >
                                    Definir e Avançar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Horizontal Elegant Date Slider */}
                  <div className="space-y-3 text-left">
                    <span className="text-[8.5px] font-black uppercase text-neutral-500 tracking-[0.2em] pl-1">
                      Selecione um Dia
                    </span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const day = addDays(new Date(), i);
                        const active = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const isWeekend = day.getDay() === 6; // Sábado
                        
                        return (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => {
                              setSelectedDate(day);
                              setSelectedTime(null);
                            }}
                            className={`flex flex-col items-center min-w-[70px] py-4 rounded-3xl transition-all border relative overflow-hidden select-none shrink-0 cursor-pointer ${
                              active 
                                ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/15" 
                                : "bg-neutral-900/60 border-white/5 text-neutral-400 hover:border-neutral-500/20 hover:bg-neutral-900"
                            }`}
                          >
                            {isToday && (
                              <span className={`absolute top-1 text-[6.5px] font-black uppercase tracking-widest ${active ? 'text-black/80' : 'text-amber-500'}`}>
                                Hoje
                              </span>
                            )}
                            <span className={`text-[8.5px] font-black uppercase ${isToday ? 'mt-1.5' : ''} ${isWeekend && !active ? 'text-neutral-500 font-extrabold' : ''}`}>
                              {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                            </span>
                            <span className="text-lg font-black tracking-tight leading-none mt-1">
                              {format(day, "d")}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nearest empty slots highlight helper for staff */}
                  {nearestEmptySlots.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-500/5 border border-amber-500/15 p-5 rounded-[2rem] space-y-3 text-left shadow-lg shadow-black/20"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                          Slots Vazios Próximos (Sugestão de Preenchimento)
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-bold">
                        Estes são os horários livres mais próximos para evitar buracos na grade da barbearia:
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {nearestEmptySlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => {
                                triggerLightHaptic();
                                setSelectedTime(slot.time);
                                setStep(4);
                              }}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer ${
                                isSelected
                                  ? "bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20"
                                  : "bg-neutral-900 hover:bg-neutral-800 text-white border-white/5 hover:border-amber-500/40"
                              }`}
                            >
                              <span>✨ {slot.time}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Categorized Slots Grid */}
                  {selectedDate.getDay() === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] text-center space-y-4"
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
                    <div className="space-y-6 text-left">
                      {[
                        { key: "morning", label: "Período da Manhã", icon: "🌅", list: morning },
                        { key: "afternoon", label: "Período da Tarde", icon: "☀️", list: afternoon },
                        { key: "evening", label: "Período da Noite", icon: "🌆", list: evening }
                      ].map(period => {
                        if (period.list.length === 0) return null;
                        return (
                          <div key={period.key} className="space-y-3">
                            <h4 className="text-[8.5px] font-black uppercase tracking-[0.22em] text-neutral-500 flex items-center gap-1.5 pl-1">
                              <span className="text-sm">{period.icon}</span> {period.label}
                            </h4>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {period.list.map(({ time, available, blockedReason, isPast, isBusy, originalAvailable }: any) => {
                                const isSelected = selectedTime === time;
                                const isStaff = role === "barber" || role === "manager" || role === "developer";
                                const isEncaixe = isStaff && forceEncaixe && !originalAvailable;
                                const isRecommended = nearestEmptySlots.some((s: any) => s.time === time);

                                return (
                                  <motion.button
                                    key={time}
                                    disabled={!available}
                                    whileHover={available ? { scale: 1.05 } : {}}
                                    whileTap={available ? { scale: 0.95 } : {}}
                                    onClick={() => {
                                      triggerLightHaptic();
                                      setSelectedTime(time);
                                      setStep(4);
                                    }}
                                    className={`relative py-3 px-2 flex flex-col items-center justify-center rounded-2xl text-[10px] font-black transition-all border group ${
                                      isSelected 
                                        ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10" 
                                        : available 
                                          ? isEncaixe
                                            ? "bg-red-950/20 border-red-500/40 hover:border-red-500 hover:bg-red-950/40 text-red-400 cursor-pointer"
                                            : isRecommended
                                              ? "bg-neutral-900 border-amber-500/40 hover:border-amber-500 hover:bg-neutral-900/80 text-white cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.06)]"
                                              : "bg-neutral-900 border-white/5 hover:border-white/20 hover:bg-neutral-900/80 text-white cursor-pointer" 
                                          : "bg-neutral-900/10 border-transparent text-neutral-600 opacity-60 cursor-not-allowed overflow-hidden"
                                    }`}
                                  >
                                    <span className={available ? "text-xs" : ""}>{time}</span>
                                    {isRecommended && available && !isSelected && (
                                      <span className="text-[7px] text-amber-500 font-extrabold uppercase mt-1 tracking-widest flex items-center gap-0.5">
                                        ✨ Livre
                                      </span>
                                    )}
                                    {isEncaixe && (
                                      <span className="text-[7px] text-red-400 mt-1 uppercase tracking-widest text-center font-bold">
                                        Encaixe
                                      </span>
                                    )}
                                    {!isEncaixe && blockedReason && !available && (
                                      <span className="text-[7px] text-red-400 mt-1 uppercase tracking-widest text-center truncate max-w-[80px]">
                                        {blockedReason}
                                      </span>
                                    )}
                                    {!isEncaixe && !available && !blockedReason && isPast && (
                                      <span className="text-[7px] text-neutral-700 mt-1 uppercase tracking-widest text-center">
                                        Passou
                                      </span>
                                    )}
                                    {!isEncaixe && !available && !blockedReason && !isPast && (
                                      <span className="text-[7px] text-neutral-700 mt-1 uppercase tracking-widest text-center">
                                        Ocupado
                                      </span>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
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
                      className="liquid-glass w-full   disabled:text-neutral-700 hover:scale-[1.01] active:scale-95 text-black py-4.5 rounded-2xl font-black uppercase italic tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/5 disabled:shadow-none"
                    >
                      Próximo Passo <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                {(!user || role === "manager" || role === "barber") && (
                  <div className=" liquid-glass p-6 rounded-[2rem]  space-y-4">
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
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 z-10" />
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
                          <div className=" liquid-glass/80  rounded-2xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-white/5">
                            {filteredClients.map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                className="liquid-glass w-full px-4 py-3 text-left  transition-all flex items-center justify-between group"
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
                                  <div className="liquid-glass w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-neutral-400 overflow-hidden shrink-0">
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
                            <div className="py-3 px-4 liquid-glass/50 rounded-2xl  text-center">
                              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                                {role === "manager" || role === "barber"
                                  ? "Nenhum cliente cadastrado encontrado"
                                  : "Nenhum cadastro encontrado com esses dados"}
                              </p>
                            </div>
                          )}

                        <div className="liquid-glass h-[1px] my-2" />
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
                {/* Visual Coupon Code Selector Input */}
                <div className=" liquid-glass p-6 rounded-[2rem]  space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                      Possui Cupom de Desconto?
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="EX: MSBARBER15"
                      className="flex-1 p-4 bg-black rounded-2xl border border-white/5 text-white text-xs focus:border-amber-500 outline-none transition-all uppercase placeholder-neutral-700 font-mono tracking-wider"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError(null);
                        setCouponSuccess(null);
                        if (!e.target.value.trim()) {
                          setAppliedDiscount(0);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={validatingCoupon}
                      onClick={() => handleApplyCoupon(couponCode)}
                      className="px-5 bg-amber-500 text-black rounded-2xl font-black text-[9.5px] uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all flex items-center gap-1 shrink-0"
                    >
                      {validatingCoupon ? (
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        "Aplicar"
                      )}
                    </button>
                  </div>
                  {/* Available Coupons */}
                  {promotions && promotions.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Cupons Ativos:</p>
                      <div className="flex flex-wrap gap-2">
                        {promotions.map(promo => (
                          <button
                            key={promo.id}
                            type="button"
                            onClick={() => {
                              setCouponCode(promo.code);
                              handleApplyCoupon(promo.code);
                            }}
                            className="bg-white/5 border border-white/10 hover:border-amber-500/50 rounded-xl px-3 py-1.5 text-[9px] font-black text-amber-500 uppercase tracking-widest transition-all"
                          >
                            {promo.code} ({promo.discountPercentage}%)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-[10.5px] font-black text-rose-500 uppercase tracking-wide px-1">
                      ⚠️ {couponError}
                    </p>
                  )}
                  {couponSuccess && (
                    <p className="text-[10.5px] font-black text-emerald-400 uppercase tracking-wide px-1">
                      ✅ {couponSuccess}
                    </p>
                  )}
                </div>

                <div className=" liquid-glass p-8 rounded-[2.5rem]  space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-neutral-500 font-bold uppercase text-[10px]">
                      Procedimento
                    </span>
                    <span className="font-black text-white italic uppercase">
                      {services.find((s) => s.id === selectedService)?.name}
                    </span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <span className="text-neutral-500 font-bold uppercase text-[10px]">
                        Desconto Cupom
                      </span>
                      <span className="font-black text-emerald-400 uppercase text-[10px] tracking-wider animate-pulse">
                        -{appliedDiscount}% OFF
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-neutral-500 font-black uppercase text-base">
                      Total
                    </span>
                    <div className="text-right">
                      {appliedDiscount > 0 && (
                        <span className="text-xs text-neutral-500 line-through mr-2 font-bold select-none">
                          R$ {Number(services.find((s) => s.id === selectedService)?.price || 0).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                      <span className="text-3xl font-black text-white">
                        R$ {((Number(services.find((s) => s.id === selectedService)?.price) || 0) * (1 - appliedDiscount / 100)).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </div>
                {error && (
                  <div className="space-y-4 my-2">
                    <p className="text-red-500 text-center font-bold px-4">{error}</p>
                    {suggestedAlternativeTimes.length > 0 && (
                      <div className="bg-neutral-900/60 p-4 rounded-2xl border border-amber-500/10 space-y-2">
                        <p className="text-[10px] text-amber-400 font-bold text-center uppercase tracking-wider">
                          💡 Sugestão: Selecione um destes horários livres para hoje:
                        </p>
                        <div className="flex gap-2 justify-center flex-wrap">
                          {suggestedAlternativeTimes.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setSelectedTime(t);
                                setSuggestedAlternativeTimes([]);
                                setError(null);
                              }}
                              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500 text-neutral-300 hover:text-black font-semibold text-xs rounded-xl border border-amber-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
            </div>

            {/* Sidebar Ticket Summary Block (hidden on mobile, styled gorgeously on large screens) */}
            <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-6 space-y-5">
              <div className=" liquid-glass  rounded-[2.5rem] p-6 text-left relative overflow-hidden shadow-2xl shadow-black/80">
                {/* Decorative Ticket Circles (tear lines) */}
                <div className="absolute top-1/2 -left-3.5 w-7 h-7 bg-black rounded-full border border-white/5" />
                <div className="absolute top-1/2 -right-3.5 w-7 h-7 bg-black rounded-full border border-white/5" />
                
                <div className="text-center space-y-1 mb-6">
                  <span className="text-[8.5px] text-amber-500 font-black uppercase tracking-[0.25em] bg-amber-500/10 px-3 py-1 rounded-full">
                    🎫 TICKET VIP EXCLUSIVO
                  </span>
                  <h3 className="font-sans font-black text-white text-base uppercase tracking-tight mt-3">
                    AGENDAMENTO ONLINE
                  </h3>
                  <p className="text-[8.5px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                    MENSBARBER OFFICIAL LOG
                  </p>
                </div>

                {/* Content */}
                <div className="space-y-4 text-xs font-bold uppercase tracking-wide text-neutral-400">
                  {/* Service Info */}
                  <div className=" liquid-glass/60 p-4 rounded-3xl  space-y-2">
                    <span className="text-[7.5px] font-black uppercase text-neutral-500 tracking-wider">SERVIÇO</span>
                    {selectedServiceObj ? (
                      <div>
                        <p className="text-neutral-200 text-sm font-black uppercase tracking-wide normal-case first-letter:uppercase">{selectedServiceObj.name}</p>
                        <div className="flex items-center justify-between text-[9px] text-neutral-500 font-extrabold mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {customDuration || selectedServiceObj.duration} MIN</span>
                          <span className="text-amber-500 font-black">R$ {selectedServiceObj.price}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-600 text-[10px] font-bold leading-normal italic">SELECIONE NO PASSO 1...</p>
                    )}
                  </div>

                  {/* Barber Info */}
                  <div className=" liquid-glass/60 p-4 rounded-3xl  space-y-2">
                    <span className="text-[7.5px] font-black uppercase text-neutral-500 tracking-wider">PROFISSIONAL</span>
                    {selectedBarberObj ? (
                      <div className="flex items-center gap-3">
                        <img 
                          src={selectedBarberObj.photoURL || `https://ui-avatars.com/api/?name=${selectedBarberObj.name}`} 
                          className="w-8 h-8 rounded-xl object-cover border border-white/10 shrink-0" 
                          alt={selectedBarberObj.name}
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-neutral-200 text-xs font-black tracking-wide leading-none">{selectedBarberObj.name}</p>
                          <span className="text-[7.5px] text-amber-500/80 font-black tracking-widest leading-none mt-1 inline-block">ATENDIMENTO PREMIUM</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-600 text-[10px] font-bold leading-normal italic">SELECIONE NO PASSO 2...</p>
                    )}
                  </div>

                  {/* Date & Time Info */}
                  <div className=" liquid-glass/60 p-4 rounded-3xl  space-y-2">
                    <span className="text-[7.5px] font-black uppercase text-neutral-500 tracking-wider">DATA & HORÁRIO</span>
                    {selectedTime ? (
                      <div>
                        <p className="text-neutral-200 text-xs font-black tracking-wide">
                          {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase().replace(".", "")}
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded-md">
                          🕒 {selectedTime}
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-600 text-[10px] font-bold leading-normal italic">SELECIONE NO PASSO 3...</p>
                    )}
                  </div>
                </div>

                {/* Dotted Tear Line */}
                <div className="border-t border-dashed border-neutral-800/85 my-5 relative">
                  <div className="absolute -left-[30px] -top-1.5 w-3 h-3 bg-black rounded-full" />
                  <div className="absolute -right-[30px] -top-1.5 w-3 h-3 bg-black rounded-full" />
                </div>

                {/* Calculation */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] uppercase font-black text-neutral-500">
                    <span>SUBTOTAL PROCEDIMENTO</span>
                    <span className="text-neutral-300">R$ {Number(selectedServiceObj?.price || 0).toFixed(2).replace(".", ",")}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between items-center text-[10px] uppercase font-black text-emerald-500">
                      <span>CUPOM APLICADO ({appliedDiscount}%)</span>
                      <span>-R$ {((Number(selectedServiceObj?.price || 0) * appliedDiscount) / 100).toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                    <span className="text-[11px] font-black uppercase text-neutral-300">TOTAL ESTIMADO</span>
                    <span className="text-lg font-black text-amber-500">
                      R$ {((Number(selectedServiceObj?.price || 0) * (1 - appliedDiscount / 100))).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                {/* Barcode line mock */}
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-col items-center justify-center space-y-1.5">
                  <div className="flex items-center justify-center gap-[1.5px] opacity-25 select-none">
                    {[2, 1, 3, 1, 4, 1, 2, 3, 1, 1, 2, 4, 1, 3, 2, 1, 3, 4, 1, 2, 1, 3, 1, 4].map((w, idx) => (
                      <div key={idx} className="bg-neutral-400 h-6.5" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="text-[7.5px] font-mono text-neutral-600 uppercase tracking-[0.25em] select-none">
                    MENSBARBER-VERIFY-TKT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {showDevModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm space-y-4">
            <div className="text-amber-500 font-black">Atenção</div>
            <p className="text-white text-sm">Este perfil é de desenvolvedor e está em modo de testes. Agendamentos aqui não são atendimentos profissionais reais.</p>
            <div className="flex gap-2">
              <button
                  onClick={() => {
                     setShowDevModal(false);
                     setSelectedBarber(pendingBarber);
                     setStep(3);
                  }}
                  className="flex-1 bg-amber-500 text-black py-2 rounded-xl text-sm font-black uppercase"
              >Entendi</button>
              <button
                  onClick={() => setShowDevModal(false)}
                  className="flex-1 bg-neutral-800 text-white py-2 rounded-xl text-sm font-black uppercase"
              >Trocar Profissional</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
