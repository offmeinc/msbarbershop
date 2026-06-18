import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Terminal, RefreshCw, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function DevPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('Teste de notificação administrativa');

  useEffect(() => {
    fetchLogs();
  }, []);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.timestamp) {
        const date = log.timestamp.toDate().toLocaleDateString('pt-BR');
        counts[date] = (counts[date] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }, [logs]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!confirm('Deseja enviar este teste para todos os usuários?')) return;
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      const promises = usersSnap.docs.map(u => 
        addDoc(collection(db, "notifications"), {
          clientId: u.id,
          message: testMsg,
          timestamp: serverTimestamp(),
          read: false,
          type: 'info'
        })
      );
      await Promise.all(promises);
      alert('Notificações enviadas com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar notificações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-black text-red-400 flex items-center gap-2">
        <Terminal className="w-5 h-5" /> Painel de Desenvolvedor
      </h2>
      
      <div className="grid gap-4">
        <div className="liquid-glass p-4 rounded-xl">
          <h3 className="text-sm font-bold text-white mb-2">Notificações</h3>
          <input 
            value={testMsg} 
            onChange={e => setTestMsg(e.target.value)}
            className="w-full bg-black/50 border border-white/10 p-2 rounded-lg text-white mb-2"
          />
          <button 
            onClick={sendTestNotification}
            disabled={loading}
            className="bg-red-500 text-white p-2 rounded-lg font-black flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Disparar Teste
          </button>
        </div>

        <div className="liquid-glass p-4 rounded-xl h-72">
          <h3 className="text-sm font-bold text-white mb-2">Frequência de Erros</h3>
          <ResponsiveContainer width="100%" height="80%">
             <BarChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#333" />
               <XAxis dataKey="date" stroke="#666" fontSize={10} />
               <YAxis stroke="#666" fontSize={10} />
               <Tooltip contentStyle={{ backgroundColor: '#111', fontSize: '10px' }} />
               <Bar dataKey="count" fill="#f87171" />
             </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="liquid-glass p-4 rounded-xl">
          <h3 className="text-sm font-bold text-white mb-2 flex justify-between">
            Logs de Erros <button onClick={fetchLogs}><RefreshCw className="w-4 h-4" /></button>
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="text-[10px] text-neutral-400 font-mono border-b border-white/5 pb-1">
                {log.timestamp?.toDate().toLocaleString()} - {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
