import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { 
  query, 
  collection, 
  where, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

interface EarningsScreenProps {
  onBack: () => void;
}

export const EarningsScreen = ({ onBack }: EarningsScreenProps) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("status", "==", "completed")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "appointments");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const dailyEarnings = useMemo(() => {
    const data: Record<string, number> = {};
    appointments.forEach(app => {
      const date = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);
      const key = format(date, "dd/MM");
      data[key] = (data[key] || 0) + (parseFloat(app.price) || 0);
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const serviceDistribution = useMemo(() => {
    const data: Record<string, number> = {};
    appointments.forEach(app => {
        const key = app.serviceName || "Outros";
        data[key] = (data[key] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  if (loading) return <div className="p-12 text-center text-white">Carregando relatórios...</div>;

  return (
    <div className="max-w-md mx-auto py-8 px-6 space-y-6">
      <button onClick={onBack} className="text-neutral-500 mb-4 flex items-center gap-2 hover:text-amber-500">
        {"<"} Voltar
      </button>
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Relatórios de Ganhos</h2>

      <div className="bg-neutral-900 rounded-3xl p-6 border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white">Ganhos Diários</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyEarnings}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-neutral-900 rounded-3xl p-6 border border-white/5 space-y-4">
        <h3 className="text-lg font-bold text-white">Distribuição de Serviços</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={serviceDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#ef4444'][index % 4]} />
                ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
