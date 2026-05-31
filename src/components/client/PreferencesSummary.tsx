import React, { useMemo } from "react";
import { Sparkles, Scissors, Clock } from "lucide-react";

export function PreferencesSummary({ appointments }: { appointments: any[] }) {
  const preferredServices = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    const serviceCounts: Record<string, number> = {};
    appointments.forEach(app => {
      if (app.status === 'completed') {
        const sName = app.serviceName;
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      }
    });
    
    return Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [appointments]);

  if (preferredServices.length === 0) return null;

  return (
    <div className="bg-neutral-900 border border-white/5 rounded-[2.5rem] p-6 space-y-4">
      <div className="flex items-center gap-2 text-amber-500">
        <Sparkles className="w-5 h-5" />
        <h3 className="text-sm font-black uppercase tracking-widest text-white">Suas Preferências</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {preferredServices.map((pref, i) => (
          <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <Scissors className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-bold text-white">{pref.name}</span>
            </div>
            <span className="text-xs font-black text-neutral-500">{pref.count} visitas</span>
          </div>
        ))}
      </div>
    </div>
  );
}
