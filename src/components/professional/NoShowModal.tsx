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
  CheckCircle2
} from "lucide-react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

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

  if (!isOpen || !appointment) return null;

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
          className="bg-neutral-950 border border-rose-500/30 rounded-[2rem] max-w-md w-full p-6 shadow-2xl space-y-5 text-left"
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
              <span>Controle de Assiduidade</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              O agendamento será marcado como <strong>Não Compareceu</strong>. Ele não será somado nos ganhos de hoje e ajudará a manter o índice de presença dos clientes atualizado.
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

          {/* Optional No-Show Fee */}
          <div className="bg-neutral-900/60 border border-white/5 p-3.5 rounded-2xl space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-neutral-300">Cobrar Taxa de No-Show</span>
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
