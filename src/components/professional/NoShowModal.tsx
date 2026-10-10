import React, { useState } from "react";
import { 
  X, 
  UserX, 
  AlertTriangle, 
  CalendarX, 
  DollarSign, 
  FileText, 
  Loader2, 
  ShieldAlert,
  CheckCircle2,
  Ban,
  MessageCircle,
  Phone
} from "lucide-react";
import { doc, updateDoc, serverTimestamp, addDoc, collection, setDoc, getDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { BARBERSHOP_NAME } from "../../constants";

interface NoShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSuccess?: () => void;
}

export function NoShowModal({
  isOpen,
  onClose,
  appointment,
  onSuccess
}: NoShowModalProps) {
  const [loading, setLoading] = useState(false);
  const [chargeFee, setChargeFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState("15.00");
  const [reason, setReason] = useState("Cliente não compareceu e não justificou com antecedência.");
  const [blockFromBooking, setBlockFromBooking] = useState(false);

  if (!isOpen || !appointment) return null;

  const rawPhone = (appointment.clientPhone || appointment.clientWhatsapp || "").replace(/\D/g, "");
  const waPhone = rawPhone.length >= 12 && rawPhone.startsWith("55") ? rawPhone : (rawPhone ? `55${rawPhone}` : "");
  const politeWhatsAppMsg = `Olá ${appointment.clientName || "Cliente"}! Sentimos sua falta hoje no horário das ${appointment.time || ""} para ${appointment.serviceName || "seu corte"} na ${BARBERSHOP_NAME}. Aconteceu algum imprevisto? Se desejar, estamos à disposição para reagendar para outro dia que fique melhor para você! 💈`;
  const politeWhatsAppUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(politeWhatsAppMsg)}` : "";

  const handleConfirmNoShow = async () => {
    setLoading(true);
    try {
      const appRef = doc(db, "appointments", appointment.id);
      const feeNum = chargeFee ? (parseFloat(feeAmount.replace(",", ".")) || 0) : 0;

      const updateData: any = {
        status: "no_show",
        noShowRecordedAt: serverTimestamp(),
        noShowReason: reason,
        noShowFee: feeNum,
        paymentStatus: feeNum > 0 ? "pending_no_show_fee" : "cancelled",
        updatedAt: serverTimestamp()
      };

      await updateDoc(appRef, updateData);

      // Update client no-show record in users collection if ID or phone available
      const targetUserId = appointment.clientId && appointment.clientId !== "guest" ? appointment.clientId : null;
      if (targetUserId) {
        try {
          const userRef = doc(db, "users", targetUserId);
          const userSnap = await getDoc(userRef);
          const currentNoShows = userSnap.exists() ? (userSnap.data().noShowCount || 0) : 0;
          const nextCount = currentNoShows + 1;

          await setDoc(userRef, {
            noShowCount: increment(1),
            lastNoShowAt: serverTimestamp(),
            ...(blockFromBooking ? {
              blockedFromBooking: true,
              blockedReason: `Bloqueado após registrar falta (No-Show). Histórico: ${nextCount} falta(s).`,
              blockedAt: serverTimestamp()
            } : {})
          }, { merge: true });
        } catch (uErr) {
          console.warn("Could not update user noShowCount:", uErr);
        }
      } else if (rawPhone) {
        try {
          const userRef = doc(db, "users", rawPhone);
          await setDoc(userRef, {
            noShowCount: increment(1),
            lastNoShowAt: serverTimestamp(),
            ...(blockFromBooking ? {
              blockedFromBooking: true,
              blockedReason: `Bloqueado após registrar falta (No-Show).`,
              blockedAt: serverTimestamp()
            } : {})
          }, { merge: true });
        } catch (uErr) {
          console.warn("Could not update user by phone noShowCount:", uErr);
        }
      }

      // Notify customer if registered
      if (appointment.clientId && appointment.clientId !== "guest") {
        try {
          await addDoc(collection(db, "notifications"), {
            clientId: appointment.clientId,
            clientEmail: appointment.clientEmail || "",
            type: "no_show",
            message: `Registramos que você não pôde comparecer ao agendamento de ${appointment.serviceName || "serviço"}. Caso queira reagendar, escolha um novo horário pelo app! ✂️`,
            timestamp: serverTimestamp(),
            read: false,
            appointmentId: appointment.id
          });
        } catch (nErr) {
          console.warn("Notification error:", nErr);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error setting no_show:", err);
      handleFirestoreError(err, OperationType.UPDATE, "appointments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-neutral-950 border border-rose-500/30 rounded-[2rem] max-w-md w-full p-6 shadow-2xl space-y-4 text-left my-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Registrar Falta (No-Show)
                </h3>
                <p className="text-xs text-neutral-400">
                  {appointment.clientName} • {appointment.time || "Horário agendado"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-full text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-2xl text-xs text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Controle Anti-No-Show e Assiduidade</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              O agendamento será marcado como <strong>Não Compareceu</strong>. A falta será contabilizada na ficha do cliente para controle de assiduidade da barbearia.
            </p>
          </div>

          {/* Reason input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              Motivo / Observação
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-rose-500/50 resize-none"
            />
          </div>

          {/* Block Client Option */}
          <div className="bg-neutral-900/70 border border-white/5 p-3.5 rounded-2xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={blockFromBooking}
                onChange={(e) => setBlockFromBooking(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-rose-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  Impedir cliente de novos agendamentos online
                </span>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  Se marcado, o cliente precisará entrar em contato pelo WhatsApp para agendar horários futuros.
                </p>
              </div>
            </label>
          </div>

          {/* Optional No-Show Fee */}
          <div className="bg-neutral-900/60 border border-white/5 p-3 rounded-2xl space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Cobrar Taxa de No-Show
              </span>
              <input
                type="checkbox"
                checked={chargeFee}
                onChange={(e) => setChargeFee(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
            </label>

            {chargeFee && (
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-xs text-neutral-400">Valor da Taxa</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-400 font-bold">R$</span>
                  <input
                    type="number"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="w-20 bg-neutral-950 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-rose-400 font-black text-right focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Friendly WhatsApp Contact Button */}
          {politeWhatsAppUrl && (
            <a
              href={politeWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Enviar WhatsApp de Reagendamento Amigável
            </a>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirmNoShow}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  <span>Confirmar Falta</span>
                </>
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
