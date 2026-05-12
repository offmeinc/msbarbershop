import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function BlockScreen({ onBack }: { onBack: () => void }) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!date) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "blocked_times"), {
        date: Timestamp.fromDate(new Date(date)),
        createdAt: Timestamp.now()
      });
      alert("Período bloqueado!");
      setDate("");
    } catch(e) { console.error(e); alert("Erro ao bloquear."); }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto py-8 px-6">
        <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
           {"<"} Voltar
        </button>
        <div className="bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl border border-white/5 space-y-6">
            <h2 className="text-xl font-bold text-center text-white">Gerenciamento de Bloqueios</h2>
            <p className="text-neutral-500 text-sm text-center">Defina períodos em que a agenda estará indisponível.</p>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white" />
            <button onClick={handleBlock} disabled={loading} className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold">{loading ? "Bloqueando..." : "Bloquear Horário"}</button>
        </div>
    </div>
  );
}
