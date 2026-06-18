import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Terminal, 
  RefreshCw, 
  Send, 
  AlertTriangle, 
  Loader2, 
  Trash2, 
  Settings, 
  Activity, 
  Database, 
  UserCheck,
  Bug,
  Ghost,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'react-hot-toast';

type Tab = 'logs' | 'database' | 'simulate' | 'diagnostics' | 'pwa' | 'health' | 'ui' | 'performance' | 'navigation' | 'settings';

export function DevPanel() {
  const [activeTab, setActiveTab ] = useState<Tab>('logs');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('Teste de funcionalidade - Sistema Estável');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetMsg, setTargetMsg] = useState('Sua notificação de teste individual chegou!');
  const [debugMode, setDebugMode] = useState(() => localStorage.getItem('ais_debug_mode') === 'true');
  const [dbStats, setDbStats] = useState<Record<string, number>>({});
  const [roleOverride, setRoleOverride] = useState(() => localStorage.getItem('ais_role_override') || '');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [healthStatus, setHealthStatus] = useState<any[]>([]);
  const [systemBanner, setSystemBanner] = useState(() => localStorage.getItem('ais_system_banner') || '');
  const [swInfo, setSwInfo] = useState<any>(null);
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('ais_custom_color') || '#f59e0b');
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'database') fetchDatabaseStats();
    if (activeTab === 'health') runHealthCheck();
    if (activeTab === 'pwa') checkPWAStatus();
    
    let frameId: number;
    if (activeTab === 'performance') {
      let lastTime = performance.now();
      let frames = 0;
      const checkFps = () => {
        frames++;
        const now = performance.now();
        if (now >= lastTime + 1000) {
          setFps(Math.round((frames * 1000) / (now - lastTime)));
          frames = 0;
          lastTime = now;
        }
        frameId = requestAnimationFrame(checkFps);
      };
      frameId = requestAnimationFrame(checkFps);
    }
    return () => cancelAnimationFrame(frameId);
  }, [activeTab]);

  const updatePrimaryColor = (color: string) => {
    setPrimaryColor(color);
    localStorage.setItem('ais_custom_color', color);
    document.documentElement.style.setProperty('--primary-color', color);
    toast.success("Cor aplicada!");
  };

  const navigateTo = (screen: string) => {
    localStorage.setItem('ais_nav_teleport', screen);
    toast.success(`Teleportando para ${screen}...`);
    setTimeout(() => window.location.reload(), 500);
  };

  const checkPWAStatus = async () => {
    setLoading(true);
    const info: any = {
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      hasNotification: 'Notification' in window,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'N/A',
    };

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      info.registrations = regs.map(r => ({
        scriptURL: r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL,
        state: r.active ? 'active' : r.installing ? 'installing' : 'waiting',
        scope: r.scope
      }));
    }
    setSwInfo(info);
    setLoading(false);
  };

  const updateSystemBanner = () => {
    if (systemBanner) {
      localStorage.setItem('ais_system_banner', systemBanner);
      toast.success("Banner global ativado localmente!");
    } else {
      localStorage.removeItem('ais_system_banner');
      toast.success("Banner removido");
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    const checks = [
      { name: 'Firestore Auth', collection: 'users', type: 'read' },
      { name: 'Agenda Core', collection: 'appointments', type: 'write-test' },
      { name: 'Serviços', collection: 'services', type: 'read' },
      { name: 'Logs System', collection: 'app_logs', type: 'write' },
    ];

    const results = [];
    for (const check of checks) {
      const start = performance.now();
      try {
        if (check.type === 'read') {
          await getDocs(query(collection(db, check.collection), limit(1)));
        } else if (check.type === 'write-test') {
          // just check if reachable
          await getDocs(query(collection(db, check.collection), limit(1)));
        }
        const latency = Math.round(performance.now() - start);
        results.push({ ...check, status: 'ok', latency });
      } catch (e) {
        results.push({ ...check, status: 'error', error: 'Permission Denied' });
      }
    }
    setHealthStatus(results);
    setLoading(false);
  };

  const toggleDebugMode = () => {
    const newVal = !debugMode;
    setDebugMode(newVal);
    localStorage.setItem('ais_debug_mode', String(newVal));
    toast.success(`Modo Debug ${newVal ? 'Ativado' : 'Desativado'}`);
    window.location.reload(); 
  };

  const handleRoleOverride = (role: string) => {
    if (role === roleOverride) {
      localStorage.removeItem('ais_role_override');
      setRoleOverride('');
      toast('Override removido', { icon: '🔄' });
    } else {
      localStorage.setItem('ais_role_override', role);
      setRoleOverride(role);
      toast.success(`Pretendendo ser: ${role}`);
    }
    setTimeout(() => window.location.reload(), 1000);
  };

  const fetchDatabaseStats = async () => {
    setLoading(true);
    try {
      const collections = ['users', 'appointments', 'services', 'reviews', 'app_logs', 'staff_notifications'];
      const stats: Record<string, number> = {};
      
      await Promise.all(collections.map(async (col) => {
        const snap = await getDocs(query(collection(db, col), limit(1)));
        // Note: Firestore counts involve getCountFromServer for real accuracy but limit(1) is a placeholder for 'exists'
        // For 'all' counts in AI Studio demo we might just getDocs if they are small or use a generic number
        const fullSnap = await getDocs(collection(db, col));
        stats[col] = fullSnap.size;
      }));
      
      setDbStats(stats);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao ler estatísticas do banco");
    } finally {
      setLoading(false);
    }
  };

  const simulateError = async () => {
    try {
      throw new Error("Simulação de Erro Crítico: " + new Date().toISOString());
    } catch (e: any) {
      await addDoc(collection(db, "app_logs"), {
        level: 'error',
        message: e.message,
        timestamp: serverTimestamp(),
        context: { simulate: true, stack: e.stack }
      });
      toast.error("Erro simulado com sucesso!");
    }
  };

  const sendTargetedNotification = async () => {
    if (!targetUserId || !targetMsg) {
      toast.error("Preencha o ID do usuário e a mensagem");
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, "notifications"), {
        clientId: targetUserId,
        message: targetMsg,
        timestamp: serverTimestamp(),
        type: 'system_debug',
        read: false
      });
      toast.success(`Enviado para ${targetUserId}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "app_logs"), orderBy("timestamp", "desc"), limit(100));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error("Falha ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const clearAllLogs = async () => {
    if (!confirm('Deseja apagar TODOS os logs permanentemente?')) return;
    setLoading(true);
    try {
      const q = query(collection(db, "app_logs"), limit(500));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(doc(db, "app_logs", d.id)));
      await batch.commit();
      setLogs([]);
      toast.success("Logs limpos!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao limpar logs");
    } finally {
      setLoading(false);
    }
  };

  const createDummyAppointment = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "appointments"), {
        clientName: "🤖 Teste Automação",
        serviceId: "dummy",
        serviceName: "Corte Teste",
        barberId: "all",
        barberName: "Sistema",
        date: serverTimestamp(),
        time: "10:00",
        status: "confirmed",
        price: 0,
        temp: true
      });
      toast.success("Agendamento de teste criado!");
    } catch (e) {
      toast.error("Erro na simulação");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(l => (l.level || 'info') === logFilter);
  }, [logs, logFilter]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.timestamp) {
        const date = log.timestamp.toDate().toLocaleDateString('pt-BR');
        counts[date] = (counts[date] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).slice(-7);
  }, [logs]);

  const stats = useMemo(() => {
    const errors = logs.filter(l => l.level === 'error').length;
    const warns = logs.filter(l => l.level === 'warn').length;
    return { errors, warns, total: logs.length };
  }, [logs]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black text-red-500 flex items-center gap-2 uppercase italic tracking-tighter">
          <Terminal className="w-6 h-6" /> Debug Terminal <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded text-red-400 not-italic tracking-widest font-mono">V2.4.0</span>
        </h2>
        
        <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-white/5 flex-wrap">
          {(['logs', 'database', 'simulate', 'diagnostics', 'pwa', 'health', 'navigation', 'ui', 'performance', 'settings'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
                activeTab === t ? 'bg-red-500/20 text-red-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t === 'simulate' ? 'Simular' : 
               t === 'diagnostics' ? 'Diagnóstico' : 
               t === 'settings' ? 'Config' : 
               t === 'database' ? 'Dados' : 
               t === 'health' ? 'Saúde' : 
               t === 'pwa' ? 'PWA' : 
               t === 'navigation' ? 'Nav' : 
               t === 'ui' ? 'UI' : 
               t === 'performance' ? 'Perf' : t}
            </button>
          ))}
        </div>
      </div>
      
      {activeTab === 'navigation' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
           <div className="liquid-glass p-5 rounded-2xl border border-white/5 space-y-6">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                 <Ghost className="w-3 h-3" /> Teleportador de Telas
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 {[
                   { id: 'home', name: 'Home Client' },
                   { id: 'agendamento', name: 'Agendamento' },
                   { id: 'checkin', name: 'Check-in' },
                   { id: 'barber-dashboard', name: 'Barber Dashboard' },
                   { id: 'manager-dashboard', name: 'Admin Dashboard' },
                   { id: 'financial', name: 'Financeiro' },
                   { id: 'profile', name: 'Pefil' },
                   { id: 'notifications', name: 'Notificações' },
                 ].map(screen => (
                   <button 
                     key={screen.id}
                     onClick={() => navigateTo(screen.id)}
                     className="p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all text-left"
                   >
                     <div className="text-[10px] font-black text-white">{screen.name}</div>
                     <div className="text-[8px] text-neutral-500 font-mono mt-1 uppercase tracking-tighter">ID: {screen.id}</div>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'ui' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
           <div className="liquid-glass p-5 rounded-2xl border border-white/5 space-y-6">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                 <Sparkles className="w-3 h-3" /> Customizador de Interface (Live)
              </h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-[9px] font-black text-neutral-500 uppercase block mb-2">Cor Primária Global</label>
                    <div className="flex flex-wrap gap-2">
                       {['#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#a855f7', '#ec4899', '#ffffff'].map(c => (
                         <button 
                           key={c}
                           onClick={() => updatePrimaryColor(c)}
                           className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-95 ${
                             primaryColor === c ? 'border-white scale-110' : 'border-white/10'
                           }`}
                           style={{ backgroundColor: c }}
                         />
                       ))}
                       <input 
                         type="color" 
                         value={primaryColor} 
                         onChange={(e) => updatePrimaryColor(e.target.value)}
                         className="w-8 h-8 rounded-full bg-transparent border-none cursor-pointer"
                       />
                    </div>
                 </div>

                 <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-neutral-400 italic">
                      As cores alteradas serão aplicadas via CSS Variables e persistidas no LocalStorage deste dispositivo.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
           <div className="liquid-glass p-5 rounded-2xl border border-white/5 space-y-6">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                 <Activity className="w-3 h-3" /> Métricas em Tempo Real
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className={`text-3xl font-black ${fps < 30 ? 'text-red-500' : 'text-green-500'}`}>{fps}</span>
                    <span className="text-[8px] font-black text-neutral-500 uppercase mt-1">FPS</span>
                 </div>
                 <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center">
                    <span className="text-3xl font-black text-blue-500">
                       {(performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) : '--'}
                    </span>
                    <span className="text-[8px] font-black text-neutral-500 uppercase mt-1">Memory (MB)</span>
                 </div>
              </div>

              <div className="space-y-2">
                 {[
                   { label: 'Hardware Concurrency', value: navigator.hardwareConcurrency || 'N/A' },
                   { label: 'Device Pixel Ratio', value: window.devicePixelRatio },
                   { label: 'Screen Resolution', value: `${window.screen.width}x${window.screen.height}` },
                   { label: 'Viewport Size', value: `${window.innerWidth}x${window.innerHeight}` },
                 ].map(item => (
                   <div key={item.label} className="flex justify-between items-center p-2 bg-white/[0.02] rounded-lg border border-white/5">
                      <span className="text-[9px] font-black text-neutral-500 uppercase">{item.label}</span>
                      <span className="text-[10px] font-black text-white">{item.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
      {activeTab === 'logs' && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: stats.total, color: 'text-blue-400', icon: Activity },
              { label: 'Erros', value: stats.errors, color: 'text-red-400', icon: AlertTriangle },
              { label: 'Alertas', value: stats.warns, color: 'text-amber-400', icon: Zap },
            ].map((s) => (
              <div key={s.label} className="liquid-glass p-3 rounded-xl border border-white/5 flex flex-col items-center">
                <s.icon className={`w-4 h-4 mb-1 ${s.color}`} />
                <span className="text-xl font-black text-white leading-none">{s.value}</span>
                <span className="text-[8px] uppercase font-bold text-neutral-500 mt-1">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-white/5 h-64">
            <h3 className="text-[10px] font-black text-neutral-400 mb-4 uppercase tracking-[0.2em]">Ocorrências (7 dias)</h3>
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                 <XAxis dataKey="date" stroke="#444" fontSize={8} tickLine={false} axisLine={false} />
                 <YAxis stroke="#444" fontSize={8} tickLine={false} axisLine={false} />
                 <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }} />
                 <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#ef4444' : '#333'} />
                   ))}
                 </Bar>
               </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="liquid-glass p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Live Stream</h3>
              <div className="flex gap-1 bg-black/30 p-0.5 rounded-lg border border-white/5 mr-2">
                {(['all', 'error', 'warn', 'info'] as const).map(lvl => (
                  <button 
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${
                      logFilter === lvl ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-400'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={fetchLogs} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={clearAllLogs} className="p-1.5 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="py-10 text-center text-neutral-600 text-xs italic">Nenhum log correspondente...</div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className={`group p-2 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all flex flex-col gap-1`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                        log.level === 'error' ? 'bg-red-500/20 text-red-500' : 
                        log.level === 'warn' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {log.level || 'INFO'}
                      </span>
                      <span className="text-[8px] font-mono text-neutral-600">
                        {log.timestamp?.toDate().toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-300 leading-relaxed font-medium break-all">
                      {log.message}
                    </div>
                    {log.context && debugMode && (
                      <pre className="text-[8px] bg-black/40 p-1 rounded font-mono text-neutral-500 overflow-x-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pwa' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
           <div className="liquid-glass p-5 rounded-2xl border border-white/5 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                   <Zap className="w-3 h-3" /> Estado do PWA & Push
                 </h3>
                 <button onClick={checkPWAStatus} className={`p-1.5 bg-white/5 rounded-lg ${loading ? 'animate-spin' : ''}`}>
                   <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Standalone (PWA)', value: swInfo?.isStandalone ? 'Sim' : 'Não', color: swInfo?.isStandalone ? 'text-green-500' : 'text-amber-500' },
                   { label: 'Modo Browser', value: swInfo?.isStandalone ? 'PWA' : 'Web', color: 'text-blue-500' },
                   { label: 'Permissão Notif.', value: swInfo?.permission, color: swInfo?.permission === 'granted' ? 'text-green-500' : 'text-red-500' },
                   { label: 'Push Manager', value: swInfo?.hasPushManager ? 'Sim' : 'Não', color: swInfo?.hasPushManager ? 'text-green-500' : 'text-red-500' },
                 ].map(item => (
                   <div key={item.label} className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="text-[8px] text-neutral-500 font-black uppercase mb-1">{item.label}</div>
                      <div className={`text-xs font-black ${item.color}`}>{item.value}</div>
                   </div>
                 ))}
              </div>

              <div className="space-y-3">
                 <label className="text-[9px] font-black text-neutral-500 uppercase">Service Workers Ativos</label>
                 {swInfo?.registrations?.length === 0 ? (
                   <div className="text-[10px] text-neutral-600 italic">Nenhum Service Worker registrado.</div>
                 ) : (
                   swInfo?.registrations?.map((r: any, i: number) => (
                     <div key={i} className="p-3 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-white truncate max-w-[200px]">{r.scriptURL?.split('/').pop()}</span>
                           <span className="text-[8px] font-black uppercase bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">{r.state}</span>
                        </div>
                        <div className="text-[8px] text-neutral-500 font-mono truncate">{r.scope}</div>
                     </div>
                   ))
                 )}
              </div>

              <div className="flex gap-2">
                 <button 
                   onClick={async () => {
                     setLoading(true);
                     try {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for(let reg of regs) await reg.unregister();
                        toast.success("Todos os SW removidos. Recarregando...");
                        setTimeout(() => window.location.reload(), 1000);
                     } catch(e) {
                        toast.error("Erro ao remover SW");
                     } finally {
                        setLoading(false);
                     }
                   }}
                   className="text-[10px] font-black bg-red-500/10 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                 >
                   Remover todos SW
                 </button>
                 <button 
                   onClick={async () => {
                      toast.promise(
                        (async () => {
                          const regs = await navigator.serviceWorker.getRegistrations();
                          for(let reg of regs) await reg.update();
                        })(),
                        { loading: 'Atualizando...', success: 'SW Atualizados!', error: 'Falha na atualização' }
                      );
                   }}
                   className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-4 py-2 rounded-lg hover:bg-blue-500/20 transition-colors"
                 >
                   Forçar Update SW
                 </button>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-3">
                 <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                 <div className="space-y-1">
                    <p className="text-[10px] text-blue-400 font-bold">Dica iOS PWA:</p>
                    <p className="text-[9px] text-blue-500/70 leading-relaxed font-medium">
                      Para notificações em segundo plano no iOS, o app DEVE ser adicionado à tela de início (Compartilhar → Adicionar à Tela de Início) e as permissões devem ser aceitas DENTRO do app standalone.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="liquid-glass p-5 rounded-2xl border border-white/5 space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Verificação de Integridade</h3>
                <button onClick={runHealthCheck} className={`p-1.5 bg-white/5 rounded-lg ${loading ? 'animate-spin' : ''}`}>
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                </button>
             </div>
             <div className="space-y-2">
               {healthStatus.map((h, i) => (
                 <div key={i} className="flex justify-between items-center p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${h.status === 'ok' ? 'bg-green-500' : 'bg-red-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} />
                       <span className="text-xs font-bold text-white">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {h.latency && <span className="text-[8px] font-mono text-neutral-500 uppercase">{h.latency}ms</span>}
                       {h.status === 'ok' ? (
                         <ShieldCheck className="w-4 h-4 text-green-500/50" />
                       ) : (
                         <AlertTriangle className="w-4 h-4 text-red-500/50" />
                       )}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(dbStats).map(([col, count]) => (
                <div key={col} className="liquid-glass p-4 rounded-xl border border-white/5 flex flex-col items-center">
                   <Database className="w-4 h-4 text-blue-400 mb-2" />
                   <span className="text-xl font-black text-white">{count}</span>
                   <span className="text-[8px] font-bold text-neutral-500 uppercase mt-1">{col.replace('_', ' ')}</span>
                </div>
              ))}
           </div>
           
           <div className="liquid-glass p-5 rounded-2xl border border-white/5">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">Ações de Limpeza (Perigoso)</h3>
              <div className="flex gap-2">
                 <button 
                   onClick={async () => {
                     if(!confirm("Limpar cache local?")) return;
                     localStorage.clear();
                     toast.success("Cache limpo!");
                     window.location.reload();
                   }}
                   className="text-[10px] font-black bg-white/5 px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors"
                 >
                   Limpar LocalStorage
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'simulate' && (
        <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="liquid-glass p-6 rounded-2xl border border-white/5 space-y-6">
            <div>
              <label className="text-[10px] font-black text-neutral-500 uppercase block mb-3 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Banner do Sistema (Marquee)
              </label>
              <div className="flex gap-2">
                <input 
                  value={systemBanner} 
                  onChange={e => setSystemBanner(e.target.value)}
                  placeholder="Ex: Manutenção agendada para 23h..."
                  className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl text-xs text-white placeholder:text-neutral-700 outline-none focus:border-red-500/50 transition-all font-medium"
                />
                <button 
                  onClick={updateSystemBanner}
                  className="bg-red-500 text-white px-4 rounded-xl font-black flex items-center gap-2 hover:bg-red-600 transition-colors"
                >
                  Set
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-neutral-500 uppercase block mb-3">Notificações Push (Simuladas)</label>
              <div className="flex gap-2">
                <input 
                  value={testMsg} 
                  onChange={e => setTestMsg(e.target.value)}
                  placeholder="Mensagem do sistema..."
                  className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl text-xs text-white placeholder:text-neutral-700 outline-none focus:border-red-500/50 transition-all font-medium"
                />
                <button 
                  onClick={async () => {
                    toast.promise(
                      (async () => {
                        const snap = await getDocs(collection(db, "users"));
                        const batch = writeBatch(db);
                        snap.docs.slice(0, 10).forEach(u => {
                          batch.set(doc(collection(db, "notifications")), {
                            clientId: u.id,
                            message: testMsg,
                            timestamp: serverTimestamp(),
                            type: 'system',
                            read: false
                          });
                        });
                        await batch.commit();
                      })(),
                      { 
                        loading: 'Disparando...', 
                        success: 'Broadcasting enviado!', 
                        error: 'Falha no broadcast'
                      }
                    );
                  }}
                  className="bg-red-500 text-white px-4 rounded-xl font-black flex items-center gap-2 hover:bg-red-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="text-[10px] font-black text-neutral-500 uppercase block mb-3 flex items-center gap-2">
                 <UserCheck className="w-3 h-3" /> Notificação Direta (FCM / Push Test)
              </label>
              <div className="space-y-3">
                <input 
                  value={targetUserId} 
                  onChange={e => setTargetUserId(e.target.value)}
                  placeholder="ID do Usuário (UID Firestore)"
                  className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-[11px] text-white placeholder:text-neutral-700 outline-none focus:border-blue-500/50 transition-all font-mono"
                />
                <div className="flex gap-2">
                  <input 
                    value={targetMsg} 
                    onChange={e => setTargetMsg(e.target.value)}
                    placeholder="Conteúdo da mensagem..."
                    className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl text-[11px] text-white placeholder:text-neutral-700 outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button 
                    onClick={sendTargetedNotification}
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 rounded-xl font-black flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={createDummyAppointment}
                className="liquid-glass p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-all text-left flex items-start gap-4"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Novo Agendamento</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Gera agendamento fictício</div>
                </div>
              </button>

              <button 
                onClick={simulateError}
                className="liquid-glass p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-all text-left flex items-start gap-4"
              >
                <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Simular Erro Fatal</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Força um log de erro 500</div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => toast.success("Simulação de Pagamento Concluída")}
                className="liquid-glass p-4 rounded-xl border border-white/5 hover:bg-white/5 transition-all text-left flex items-start gap-4"
              >
                <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white">Trigger Financeiro</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Mock de Webhook Pix/Card</div>
                </div>
              </button>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-500/70 leading-relaxed font-medium">
                <span className="font-black">AVISO:</span> Estas ações criam dados reais no banco de dados do Firestore. Use apenas para validação de fluxos e interface.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="grid gap-4 animate-in fade-in duration-300">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="liquid-glass p-5 rounded-2xl border border-white/5">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase mb-4 flex items-center gap-2">
                <UserCheck className="w-3 h-3" /> Estado da Sessão
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Role Context', value: 'DEVELOPER', color: 'text-red-400' },
                  { label: 'Conexão DB', value: 'ONLINE', color: 'text-green-400' },
                  { label: 'OAuth Scopes', value: 'READ_WRITE_LOGS', color: 'text-blue-400' },
                  { label: 'HMR Status', value: 'DISABLED', color: 'text-neutral-500' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-neutral-500 font-bold">{item.label}</span>
                    <span className={`text-[10px] font-black uppercase ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="liquid-glass p-5 rounded-2xl border border-white/5">
              <h3 className="text-[10px] font-black text-neutral-400 uppercase mb-4 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Integridade Firestore
              </h3>
              <div className="flex flex-col items-center justify-center py-4">
                <ShieldCheck className="w-12 h-12 text-green-500/30 mb-2" />
                <span className="text-xs font-black text-green-500 uppercase tracking-widest">Ativo & Seguro</span>
                <span className="text-[8px] text-neutral-600 mt-1 uppercase font-bold text-center italic px-4">
                  Regras de segurança validadas para o contexto de Desenvolvedor
                </span>
              </div>
            </div>
          </div>

          <div className="liquid-glass p-5 rounded-2xl border border-white/5">
             <div className="flex items-center gap-2 text-red-500 mb-4">
                <Ghost className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hardware Trace</span>
             </div>
             <p className="font-mono text-[8.5px] text-neutral-500 leading-normal bg-black/30 p-3 rounded-lg border border-white/5 break-all">
                UA: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}<br/>
                PL: {typeof navigator !== 'undefined' ? (navigator as any).platform : 'N/A'}<br/>
                SC: {typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'N/A'}<br/>
                MEM: {typeof (performance as any).memory !== 'undefined' ? `${Math.round((performance as any).memory.usedJSHeapSize / 1048576)} MB used` : 'N/A'}
             </p>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
           <div className="liquid-glass p-6 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${debugMode ? 'bg-red-500/20 text-red-400' : 'bg-neutral-500/20 text-neutral-500'}`}>
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Modo Debug Global</h4>
                    <p className="text-[10px] text-neutral-500 font-medium leading-none mt-1">Exibe IDs de documentos e metadados técnicos na UI</p>
                  </div>
                </div>
                <button 
                  onClick={toggleDebugMode}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${debugMode ? 'bg-red-500' : 'bg-neutral-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${debugMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="mt-8 space-y-4">
                 <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                   <UserCheck className="w-3 h-3" /> Role Overrides (Visual Only)
                 </h5>
                 <div className="flex gap-2">
                    {['client', 'barber', 'manager', 'developer'].map(r => (
                      <button 
                        key={r}
                        onClick={() => handleRoleOverride(r)}
                        className={`text-[9px] font-black uppercase px-3 py-2 rounded-lg border transition-all ${
                          roleOverride === r ? 'bg-red-500 border-red-500 text-white' : 'border-white/10 text-neutral-500 hover:border-white/20'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="mt-8 space-y-4">
                 <h5 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                   <Settings className="w-3 h-3" /> Flags de Interface
                 </h5>
                 <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Animações Reduzidas', active: false },
                      { label: 'Cache Persistente', active: true },
                      { label: 'Modo Offline Forçado', active: false },
                      { label: 'Logs de Rede Browser', active: true },
                    ].map(f => (
                      <div key={f.label} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between opacity-50 cursor-not-allowed">
                        <span className="text-[10px] font-bold text-neutral-400">{f.label}</span>
                        <div className={`w-8 h-4 rounded-full ${f.active ? 'bg-blue-500/30' : 'bg-neutral-800'}`} />
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
