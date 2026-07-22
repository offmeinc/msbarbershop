import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Bell, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronLeft, 
  Send, 
  HelpCircle, 
  Info, 
  Share, 
  Plus, 
  ArrowUp,
  Settings,
  RefreshCw,
  Lock
} from "lucide-react";
import { setupPushSubscription, getNotificationPermissionState, queryNotificationSupport } from "../../lib/pushRegister";
import { toast } from "react-hot-toast";

interface PWANotificationsScreenProps {
  user: any;
  role: string;
  onBack: () => void;
}

export function PWANotificationsScreen({ user, role, onBack }: PWANotificationsScreenProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [registrationLogs, setRegistrationLogs] = useState<string[]>([]);

  useEffect(() => {
    // Basic checks
    setPermission(getNotificationPermissionState());
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    setIsAndroid(/android/i.test(navigator.userAgent));
  }, []);

  const refreshStatus = () => {
    setPermission(getNotificationPermissionState());
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    toast.success("Status atualizado!");
  };

  const handleRegister = async () => {
    if (isIOS && !isStandalone) {
      toast.error("Instalação obrigatória: Notificações no iPhone só funcionam após adicionar o aplicativo à Tela de Início!");
      return;
    }

    setIsRegistering(true);
    setRegistrationLogs(["Iniciando registro do dispositivo..."]);

    const userId = user?.uid || user?.id;
    if (!userId) {
      toast.error("Erro: Usuário não identificado.");
      setIsRegistering(false);
      return;
    }

    try {
      const success = await setupPushSubscription(userId, role, (stepMsg) => {
        setRegistrationLogs(prev => [...prev, stepMsg]);
      });

      if (success) {
        setPermission(getNotificationPermissionState());
        toast.success("Notificações ativadas e registradas com sucesso! 🎉");
        setRegistrationLogs(prev => [...prev, "✓ Concluído: Token registrado com sucesso no banco de dados!"]);
      } else {
        toast.error("Falha no registro das notificações.");
        setRegistrationLogs(prev => [...prev, "✗ Erro: Não foi possível obter permissão ou token."]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao registrar: ${err.message || String(err)}`);
      setRegistrationLogs(prev => [...prev, `✗ Falha: ${err.message || "Erro desconhecido"}`]);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSendTestNotification = async () => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      toast.error("Erro: Faça login para enviar teste.");
      return;
    }

    setIsTesting(true);
    const toastId = toast.loading("Enviando notificação de teste para a nuvem...");

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: userId,
          title: "Teste de Notificação 💈",
          body: `Olá, ${user?.name || "Profissional"}! Seu sistema de alertas em segundo plano está 100% ativo.`
        })
      });

      if (response.ok) {
        toast.success("Notificação enviada! Aguarde alguns segundos. Se não receber, verifique se o app está fechado e tente novamente.", { 
          id: toastId,
          duration: 6000 
        });
      } else {
        const data = await response.json();
        toast.error(`Falha no envio do teste: ${data.error || "Erro no servidor"}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Falha de rede: ${err.message || String(err)}`, { id: toastId });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto py-8 px-5 min-h-[100dvh] pb-32 text-left space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack} 
          className="p-2.5 liquid-glass rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-amber-500" />
        </button>
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Notificações Push (PWA)</h2>
          <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Diagnóstico, Ativação e Testes</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Diagnostics Card */}
        <div className="bg-neutral-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider italic flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500 animate-pulse" /> Diagnóstico do Dispositivo
            </h3>
            <button 
              onClick={refreshStatus}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-all cursor-pointer"
              title="Recarregar Diagnóstico"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            
            {/* Row 1: Platform */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Sistema Operacional</span>
              <span className="text-xs text-white font-black uppercase">
                {isIOS ? " iPhone / iOS" : isAndroid ? "🤖 Android" : "🖥️ Desktop / Computador"}
              </span>
            </div>

            {/* Row 2: Standalone status */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Instalado como App (PWA)</span>
              <div className="flex items-center gap-1.5">
                {isStandalone ? (
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sim (Tela de Início)
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" /> Não (Navegador)
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: Notification permission status */}
            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Permissão de Notificação</span>
              <div className="flex items-center gap-1.5">
                {permission === "granted" ? (
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Permitido (✓)
                  </span>
                ) : permission === "denied" ? (
                  <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    Negado (⚠️)
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Não Solicitado (?)
                  </span>
                )}
              </div>
            </div>

            {/* Support message for iOS */}
            {isIOS && !isStandalone && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                  No <strong className="text-white">iPhone</strong>, as notificações push de segundo plano são restritas pela Apple e <strong className="text-amber-500">SÓ FUNCIONAM</strong> após você adicionar o app à sua Tela de Início. Siga o guia passo a passo ao lado!
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-black uppercase py-3.5 rounded-xl text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              {isRegistering ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  REGISTRANDO DISPOSITIVO...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  ATIVAR / REATIVAR NOTIFICAÇÕES NESTE CELULAR
                </>
              )}
            </button>

            {permission === "granted" && (
              <button
                onClick={handleSendTestNotification}
                disabled={isTesting}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-black uppercase border border-white/10 py-3.5 rounded-xl text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-500" />
                ENVIAR NOTIFICAÇÃO DE TESTE AGORA
              </button>
            )}
          </div>

          {/* Action Logs block if registering */}
          {registrationLogs.length > 0 && (
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1 font-mono text-[9px] text-neutral-400 max-h-32 overflow-y-auto">
              <span className="text-[8px] text-neutral-500 uppercase font-black block mb-1">Logs de Conexão:</span>
              {registrationLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">{log}</div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Instructional / Guidance Card */}
        <div className="bg-neutral-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-wider italic flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-sky-400" /> {isIOS ? "Instalação & Configuração iPhone" : "Dicas para Android e Computador"}
          </h3>

          {isIOS ? (
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-black text-white uppercase">Abra obrigatoriamente no Safari</h4>
                  <p className="text-[9.5px] text-neutral-400 leading-relaxed">No iPhone, notificações não funcionam em navegadores internos (ex. se você clicou no link pelo Instagram ou WhatsApp) ou Chrome. Abra direto no Safari.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-black text-white uppercase flex items-center gap-1">
                    Toque no Ícone Compartilhar <ArrowUp className="w-3.5 h-3.5 text-neutral-400 bg-neutral-800 p-0.5 rounded" />
                  </h4>
                  <p className="text-[9.5px] text-neutral-400 leading-relaxed">Na barra de navegação inferior do Safari, toque no ícone de quadrado com uma seta para cima.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-black text-white uppercase flex items-center gap-1">
                    Toque em "Adicionar à Tela de Início" <Plus className="w-3.5 h-3.5 text-neutral-400 bg-neutral-800 p-0.5 rounded" />
                  </h4>
                  <p className="text-[9.5px] text-neutral-400 leading-relaxed">Role a folha de opções para baixo e clique em "Adicionar à Tela de Início" e confirme.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-black shrink-0">4</div>
                <div className="space-y-0.5">
                  <h4 className="text-[10px] font-black text-white uppercase">Abra o App na Tela Inicial & Ative</h4>
                  <p className="text-[9.5px] text-neutral-400 leading-relaxed">Feche o Safari, abra o novo ícone criado na tela inicial do celular. Faça login e entre nesta mesma tela para clicar em <strong className="text-amber-500">Ativar Notificações</strong>.</p>
                </div>
              </div>

              <div className="bg-sky-500/5 border border-sky-500/10 p-3.5 rounded-xl space-y-1.5">
                <span className="text-[9px] font-black uppercase text-sky-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Importante!
                </span>
                <p className="text-[9px] text-neutral-400 leading-relaxed">
                  As permissões dadas no navegador Safari **NÃO** se aplicam ao aplicativo da Tela Inicial. Você precisa re-permitir as notificações clicando no botão ao abrir o app da tela inicial.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-neutral-400 text-xs">
              <p className="leading-relaxed">
                No Android e Desktop (Computador), as notificações funcionam em segundo plano mesmo sem instalar o app, bastando conceder permissão na barra superior do navegador quando solicitado.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed"><strong>Verifique os Bloqueadores:</strong> Certifique-se de que não há bloqueador de anúncios ou modo de economia de energia restringindo a execução em segundo plano do navegador.</p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed"><strong>Sinal da Operadora/Wi-Fi:</strong> Dispositivos móveis adiam a recepção de mensagens push em conexões fracas ou instáveis para economizar bateria.</p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed"><strong>Permissão Manual:</strong> Se negado anteriormente, clique no ícone de "Cadeado" ao lado da URL no topo do navegador e marque "Permitir Notificações".</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
