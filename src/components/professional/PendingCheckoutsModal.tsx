import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, User, Scissors, Check, XCircle, AlertTriangle, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingCheckoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingApps: any[];
  onSelectCheckout: (app: any) => void;
  onSelectNoShow: (app: any) => void;
  onSelectCancel: (app: any) => void;
  onSelectStart: (app: any) => void;
}

export function PendingCheckoutsModal({
  isOpen,
  onClose,
  pendingApps,
  onSelectCheckout,
  onSelectNoShow,
  onSelectCancel,
  onSelectStart
}: PendingCheckoutsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-[#111111] w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111111]/90 backdrop-blur-md z-10">
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter">Dar Baixa</h2>
              <p className="text-xs text-neutral-400 font-medium mt-0.5">Atendimentos pendentes hoje</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pendingApps.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Tudo em dia!</h3>
                <p className="text-neutral-400 text-sm">Não há atendimentos pendentes de baixa para hoje.</p>
              </div>
            ) : (
              pendingApps.map(app => {
                const dateObj = typeof app.parsedDate === 'object' ? app.parsedDate : (app.date?.toDate ? app.date.toDate() : new Date(app.date));
                const timeStr = app.time || (dateObj ? format(dateObj, 'HH:mm') : '--:--');
                
                return (
                  <div key={app.id} className="bg-neutral-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${app.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-400 animate-pulse' : 'bg-neutral-800 text-neutral-400'}`}>
                          {app.status === 'in_progress' ? <Play className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm">{app.clientName || 'Cliente'}</h4>
                          <p className="text-neutral-400 text-xs flex items-center gap-1 mt-0.5">
                            {timeStr} • {app.serviceName || 'Serviço'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-black text-sm">
                          R$ {(app.totalPrice || app.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                      {(app.status === 'confirmed' || app.status === 'pending' || app.status === 'scheduled') && (
                        <button
                          onClick={() => onSelectStart(app)}
                          className="flex-1 min-w-[100px] bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition-all flex justify-center items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" /> Iniciar
                        </button>
                      )}
                      <button
                        onClick={() => onSelectCheckout(app)}
                        className="flex-1 min-w-[100px] bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition-all flex justify-center items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Baixa
                      </button>
                      <button
                        onClick={() => onSelectNoShow(app)}
                        className="flex-1 min-w-[80px] bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition-all"
                      >
                        Faltou
                      </button>
                      <button
                        onClick={() => onSelectCancel(app)}
                        className="flex-1 min-w-[80px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider py-2 rounded-xl transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
