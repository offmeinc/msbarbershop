import { RefreshCw } from "lucide-react";

export function RecurrenceUI({ userRole, recurrence, setRecurrence }: { userRole: string, recurrence: any, setRecurrence: any }) {
  if (userRole !== 'barber' && userRole !== 'manager') return null;
  return (
    <div className=" liquid-glass/50  rounded-[2rem] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-black uppercase text-neutral-400 tracking-widest">Deseja tornar recorrente?</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['none', 'weekly', 'biweekly', 'monthly'] as const).map(r => (
          <button 
            key={r}
            onClick={() => setRecurrence(r)}
            className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${recurrence === r ? "bg-amber-500 text-black" : "bg-white/5 text-neutral-600 hover:text-white"}`}
          >
            {r === 'none' ? 'Único' : r === 'weekly' ? 'Semanal' : r === 'biweekly' ? 'Quinzenal' : 'Mensal'}
          </button>
        ))}
      </div>
    </div>
  );
}
