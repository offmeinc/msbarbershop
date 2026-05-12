import React from "react";
import { ChevronLeft } from "lucide-react";

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           <ChevronLeft className="w-5 h-5" /> Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
            <h2 className="text-xl font-bold text-white">Central de Ajuda</h2>
            <p className="text-neutral-500">Dúvidas? Entre em contato com nosso suporte.</p>
        </div>
    </div>
  );
}

export function ShareScreen({ onBack }: { onBack: () => void }) {
  return (
      <div className="max-w-md mx-auto py-8 px-6">
          <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
             <ChevronLeft className="w-5 h-5" /> Voltar
          </button>
          <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
              <h2 className="text-xl font-bold text-white">Divulgar Horários</h2>
              <p className="text-neutral-500">Compartilhe sua agenda nas redes sociais.</p>
          </div>
      </div>
  );
}

export function RecurrenceScreen({ onBack }: { onBack: () => void }) {
  return (
      <div className="max-w-md mx-auto py-8 px-6">
          <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
             <ChevronLeft className="w-5 h-5" /> Voltar
          </button>
          <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6 text-center">
              <h2 className="text-xl font-bold text-white">Configurações de Recorrência</h2>
              <p className="text-neutral-500">Gerencie regras de agendamentos recorrentes.</p>
          </div>
      </div>
  );
}
