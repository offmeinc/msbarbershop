import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Ban, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  CalendarX, 
  MessageCircle, 
  CheckCircle2, 
  UserX, 
  FileText, 
  Loader2, 
  Phone,
  Unlock,
  AlertCircle
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { toast } from "../ui/Toast";
import { triggerLightHaptic, triggerSuccessHaptic, triggerWarningHaptic } from "../../lib/haptics";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BARBERSHOP_NAME } from "../../constants";

export interface BlockClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  onSuccess?: (isBlocked: boolean, reason?: string) => void;
}

const COMMON_REASONS = [
  {
    id: "no_show",
    label: "Faltas recorrentes (No-Show)",
    desc: "Cliente marca horários e não comparece sem avisar com antecedência.",
    icon: UserX,
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20"
  },
  {
    id: "delay",
    label: "Atrasos frequentes e excessivos",
    desc: "Atrasos constantes que comprometem os horários dos outros clientes.",
    icon: Clock,
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20"
  },
  {
    id: "late_cancellation",
    label: "Cancelamentos em cima da hora",
    desc: "Desmarca repetidamente poucos minutos antes do corte.",
    icon: CalendarX,
    badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20"
  },
  {
    id: "inappropriate",
    label: "Comportamento ou desrespeito",
    desc: "Violação das diretrizes de convivência ou desrespeito aos profissionais.",
    icon: AlertTriangle,
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20"
  },
  {
    id: "financial",
    label: "Pendência financeira em aberto",
    desc: "Serviço ou produto pendente de acerto com a barbearia.",
    icon: AlertCircle,
    badgeColor: "text-red-400 bg-red-500/10 border-red-500/20"
  },
  {
    id: "custom",
    label: "Outro motivo personalizado",
    desc: "Especificar motivo individualizado.",
    icon: FileText,
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
  }
];

export function BlockClientModal({
  isOpen,
  onClose,
  client,
  onSuccess
}: BlockClientModalProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>("no_show");
  const [customReasonText, setCustomReasonText] = useState("");
  const [detailsText, setDetailsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditingReason, setIsEditingReason] = useState(false);

  const isCurrentlyBlocked = Boolean(client?.blockedFromBooking);

  useEffect(() => {
    if (client) {
      if (client.blockedReason) {
        const found = COMMON_REASONS.find(r => r.label === client.blockedReason);
        if (found) {
          setSelectedReasonId(found.id);
        } else {
          setSelectedReasonId("custom");
          setCustomReasonText(client.blockedReason);
        }
      } else {
        setSelectedReasonId("no_show");
      }
      setDetailsText(client.blockedDetails || "");
      setIsEditingReason(false);
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const clientId = client.uid || client.id;
  const rawPhone = (client.whatsapp || client.phone || "").replace(/\D/g, "");
  const waPhone = rawPhone.length >= 12 && rawPhone.startsWith("55") ? rawPhone : (rawPhone ? `55${rawPhone}` : "");

  const handleConfirmBlock = async () => {
    if (!clientId) {
      toast.error("Identificador do cliente não encontrado.");
      return;
    }

    let finalReason = "";
    if (selectedReasonId === "custom") {
      finalReason = customReasonText.trim() || "Bloqueado pelo barbeiro por motivo personalizado";
    } else {
      const found = COMMON_REASONS.find(r => r.id === selectedReasonId);
      finalReason = found ? found.label : "Restrição de agendamento online";
    }

    setLoading(true);
    triggerWarningHaptic();

    try {
      await setDoc(doc(db, "users", clientId), {
        blockedFromBooking: true,
        blockedReason: finalReason,
        blockedDetails: detailsText.trim() || null,
        blockedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success("Cliente bloqueado para agendamentos online!");
      triggerSuccessHaptic();
      if (onSuccess) onSuccess(true, finalReason);
      onClose();
    } catch (err) {
      console.error("Error blocking client:", err);
      toast.error("Erro ao bloquear agendamentos do cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!clientId) {
      toast.error("Identificador do cliente não encontrado.");
      return;
    }

    setLoading(true);
    triggerLightHaptic();

    try {
      await setDoc(doc(db, "users", clientId), {
        blockedFromBooking: false,
        blockedReason: null,
        blockedDetails: null,
        unblockedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast.success("Cliente liberado para agendar horários online!");
      triggerSuccessHaptic();
      if (onSuccess) onSuccess(false);
      onClose();
    } catch (err) {
      console.error("Error unblocking client:", err);
      toast.error("Erro ao liberar agendamentos do cliente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-neutral-950 border border-rose-500/30 rounded-[2.5rem] max-w-lg w-full p-6 sm:p-7 shadow-2xl text-left space-y-5 my-auto max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isCurrentlyBlocked 
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}>
                {isCurrentlyBlocked ? <Ban className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight">
                  {isCurrentlyBlocked && !isEditingReason ? "Cliente Impedido de Agendar" : "Impedir Agendamentos Online"}
                </h3>
                <p className="text-xs text-neutral-400">
                  {client.name || "Cliente"} {client.whatsapp ? `• ${client.whatsapp}` : ""}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* If already blocked and not currently editing reason, show summary and options */}
          {isCurrentlyBlocked && !isEditingReason ? (
            <div className="space-y-4">
              <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-md">
                    Bloqueado Atualmente
                  </span>
                  {client.blockedAt && (
                    <span className="text-[10px] text-neutral-400">
                      Desde {(() => {
                        try {
                          return format(parseISO(client.blockedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                        } catch {
                          return client.blockedAt;
                        }
                      })()}
                    </span>
                  )}
                </div>

                <div className="pt-1">
                  <p className="text-xs font-black uppercase text-white tracking-wide">
                    Motivo: <span className="text-rose-300 font-bold">{client.blockedReason || "Motivo não especificado"}</span>
                  </p>
                  {client.blockedDetails && (
                    <p className="text-[11px] text-neutral-300 mt-1 italic bg-black/40 p-2 rounded-xl border border-white/5">
                      &quot;{client.blockedDetails}&quot;
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-white/5 space-y-2">
                <p className="text-xs font-bold text-neutral-300">Como funciona para o cliente:</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Ao tentar agendar pelo app ou portal web, o cliente receberá uma mensagem orientando-o a entrar em contato via WhatsApp com a barbearia para marcar seu horário.
                </p>
              </div>

              {/* Actions for currently blocked */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleUnblock}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      LIBERAR CLIENTE PARA AGENDAR ONLINE
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingReason(true)}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs transition-colors cursor-pointer border border-white/5"
                  >
                    Alterar Motivo
                  </button>

                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Olá ${client.name || "Cliente"}! Tudo bem? Aqui é da ${BARBERSHOP_NAME}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 border border-emerald-500/20"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Falar no WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Reason Selection & Input Form */
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Escolha o motivo do impedimento:</span>
                </div>
                <p className="text-[10px] text-neutral-300 leading-snug">
                  Este registro fica salvo na ficha do cliente para controle da equipe. Ao tentar agendar, o cliente será orientado a contatar via WhatsApp.
                </p>
              </div>

              {/* Predefined Reasons Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                  Motivo Principal
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMMON_REASONS.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedReasonId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedReasonId(r.id);
                          triggerLightHaptic();
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? "bg-rose-500/20 border-rose-500 text-white shadow-md shadow-rose-500/10"
                            : "bg-neutral-900/60 border-white/5 hover:border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl border mt-0.5 shrink-0 ${r.badgeColor}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black uppercase tracking-tight leading-tight">
                            {r.label}
                          </p>
                          <p className="text-[9.5px] text-neutral-400 leading-tight">
                            {r.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom reason input if "custom" selected */}
              {selectedReasonId === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    Descreva o motivo personalizado:
                  </label>
                  <input
                    type="text"
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Ex: Bloqueado a pedido do próprio cliente..."
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-rose-500/50"
                  />
                </div>
              )}

              {/* Optional internal note / details */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  Observações internas / Detalhes (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={detailsText}
                  onChange={(e) => setDetailsText(e.target.value)}
                  placeholder="Ex: Faltou nos dias 12/03 e 20/03 sem justificativa prévia..."
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-rose-500/50 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    if (isCurrentlyBlocked) {
                      setIsEditingReason(false);
                    } else {
                      onClose();
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmBlock}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/25 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>{isCurrentlyBlocked ? "Atualizar Bloqueio" : "Confirmar Bloqueio"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
