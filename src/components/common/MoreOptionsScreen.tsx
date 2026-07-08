import { useState } from "react";
import { motion } from "motion/react";
import { 
  UserCircle, 
  MonitorSmartphone, 
  Bell, 
  WalletCards, 
  Calendar, 
  Lock, 
  CheckCircle2, 
  RefreshCw, 
  Tag, 
  Smartphone, 
  Moon, 
  LogOut, 
  ChevronLeft,
  Star,
  Package,
  Gift,
  Presentation
} from "lucide-react";
import { BlockScreen } from "../manager/BlockScreen";
import { HelpScreen, ShareScreen, RecurrenceScreen } from "../manager/OtherScreens";
import { ReconScreen } from "../manager/UtilityScreens";
import { PromotionsManager } from "../manager/PromotionsManager";
import { InventoryScreen } from "../manager/InventoryScreen";
import { ClientDashboardScreen } from "../client/ClientDashboardScreen";
import { ProfileEditScreen } from "./ProfileEditScreen";
import { NotificationsScreen } from "../NotificationsScreen";
import { EarningsScreen } from "../manager/EarningsScreen";
import { StaffChatScreen, ChatScreen } from "../ChatScreens";
import { GOOGLE_REVIEW_URL } from "../../constants";
import { MyWeekScreen } from "../manager/MyWeekScreen";
import { toast } from "../ui/Toast";

// Dummy components
const DarkScreen = ({ onBack }: { onBack: () => void }) => <div className="p-4">Dark Screen <button onClick={onBack}>Voltar</button></div>;

export function MoreOptionsScreen({ user, role, onLogout, onBack, staffNotifications, appointments, onClearNotifications, onToggleTheme, isDarkMode, onReferrals }: { user: any, role: string, onLogout: () => void, onBack: () => void, key?: any, staffNotifications: any[], appointments: any[], onClearNotifications: () => void, onToggleTheme: () => void, isDarkMode: boolean, onReferrals?: () => void }) {
  const [activeSubScreen, setActiveSubScreen] = useState<
    'main' | 'profile' | 'notif' | 'block' | 'share' | 'earnings' | 'week' | 'recon' | 'recurrence' | 'promotions' | 'inventory'
  >('main');

  const unreadCount = staffNotifications.filter(n => !n.read).length;

  const getRoleLabel = () => {
    if (role === 'manager') return 'Gestor';
    if (role === 'barber') return 'Profissional / Barbeiro';
    return 'Cliente VIP';
  };

  const getRoleBadgeClass = () => {
    if (role === 'manager') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    if (role === 'barber') return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    const parts = user.name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const sections = [
    {
      title: "Perfil e Identidade",
      items: [
        { 
          id: 'profile', 
          label: 'Meu Perfil', 
          desc: 'Alterar senha, nome e dados cadastrados',
          icon: <UserCircle className="w-5 h-5 text-amber-500" />, 
          onClick: () => setActiveSubScreen('profile') 
        },
        ...(role === 'client' && onReferrals ? [{
          id: 'referrals', 
          label: 'Indicações & Prêmios', 
          desc: 'Seu código promocional e acompanhamento de amigos indicados',
          icon: <Gift className="w-5 h-5 text-amber-500" />, 
          onClick: onReferrals 
        }] : []),
        ...(role === 'client' ? [] : []),
        { 
          id: 'notif', 
          label: 'Notificações', 
          desc: 'Ver atualizações, comunicados e recados',
          icon: <Bell className="w-5 h-5 text-emerald-400" />, 
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined, 
          onClick: () => setActiveSubScreen('notif') 
        },
        ...(role === 'barber' || role === 'manager' ? [{ 
          id: 'earnings', 
          label: 'Meus Ganhos', 
          desc: 'Relatório financeiro de atendimentos e comissões',
          icon: <WalletCards className="w-5 h-5 text-emerald-500" />, 
          onClick: () => setActiveSubScreen('earnings') 
        }] : []),
      ]
    },
    ...(role !== 'client' ? [{
      title: "Agenda e Operação",
      items: [
        { 
          id: 'week', 
          label: 'Minha Semana', 
          desc: 'Visão geral, escala do time e relatórios IA',
          icon: <Calendar className="w-5 h-5 text-sky-400" />, 
          onClick: () => setActiveSubScreen('week') 
        },
        { 
          id: 'block', 
          label: 'Bloquear Horário', 
          desc: 'Fechar janelas específicas e folgas na grade',
          icon: <Lock className="w-5 h-5 text-rose-400" />, 
          onClick: () => setActiveSubScreen('block') 
        },
        { 
          id: 'recon', 
          label: 'Reconciliação', 
          desc: 'Verificar pagamentos digitais pendentes',
          icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />, 
          onClick: () => setActiveSubScreen('recon') 
        },
        { 
          id: 'recurrence', 
          label: 'Recorrências', 
          desc: 'Atendimentos de ciclo contínuo e assinaturas',
          icon: <RefreshCw className="w-5 h-5 text-teal-400" />, 
          onClick: () => setActiveSubScreen('recurrence') 
        },
        ...(role === 'manager' ? [
          { 
            id: 'promotions', 
            label: 'Promoções', 
            desc: 'Gerenciar cupons de desconto inovadores',
            icon: <Tag className="w-5 h-5 text-pink-400" />, 
            onClick: () => setActiveSubScreen('promotions') 
          },
          { 
            id: 'inventory', 
            label: 'Estoque', 
            desc: 'Controle de mercadorias e alerta mínimo',
            icon: <Package className="w-5 h-5 text-amber-500" />, 
            onClick: () => setActiveSubScreen('inventory') 
          }
        ] : []),
        { 
          id: 'share', 
          label: 'Divulgar Vagas', 
          desc: 'Gerar artes personalizadas para Stories',
          icon: <Smartphone className="w-5 h-5 text-amber-400" />, 
          onClick: () => setActiveSubScreen('share') 
        },
      ]
    }] : []),
  ];

  if (activeSubScreen === 'block') return <BlockScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'share') return <ShareScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'recon') return <ReconScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'recurrence') return <RecurrenceScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'promotions') return <PromotionsManager onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'inventory') return <InventoryScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'profile') return <ProfileEditScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'notif') return <NotificationsScreen notifications={staffNotifications} appointments={appointments} onClear={onClearNotifications} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'earnings') return <EarningsScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'week') return <MyWeekScreen user={user} appointments={appointments} onBack={() => setActiveSubScreen('main')} />;


  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md md:max-w-4xl lg:max-w-5xl mx-auto py-8 px-5 min-h-[100dvh] pb-32 text-left"
    >
      {/* Navigation and Top title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 liquid-glass  rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-amber-500" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Mais Opções</h2>
            <span className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-widest leading-none">Configurações & Gestão</span>
          </div>
        </div>
      </div>

      {/* Profile Header Welcome Banner */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          {/* Avatar frame */}
          {user?.photoURL || user?.photoUrl ? (
            <img 
              src={user.photoURL || user.photoUrl} 
              alt={user?.name || "Usuário"} 
              className="w-16 h-16 rounded-[1.75rem] object-cover border border-amber-500/20 shadow-lg shadow-amber-500/10 pointer-events-none select-none"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-[1.75rem] bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-amber-500/10 pointer-events-none select-none">
              {getUserInitials()}
            </div>
          )}
          <div className="text-left space-y-1">
            <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest block leading-none">Identidade Confirmada</span>
            <h3 className="text-lg font-black text-white uppercase leading-none truncate max-w-[200px] sm:max-w-[300px]">
              {user?.name || user?.displayName || "Usuário"}
            </h3>
            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded inline-block ${getRoleBadgeClass()}`}>
              {getRoleLabel()}
            </span>
          </div>
        </div>

        {/* Short info layout with professional/user details */}
        {(user?.email || user?.whatsapp) && (
          <div className="pt-4 sm:pt-0 sm:pl-4 sm:border-l border-white/5 text-left flex flex-col justify-center space-y-2">
            {user?.email && (
              <div>
                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block leading-none">E-mail</span>
                <span className="text-[10px] text-neutral-300 font-bold block mt-0.5 max-w-[200px] truncate">{user.email}</span>
              </div>
            )}
            {user?.whatsapp && (
              <div>
                <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block leading-none">WhatsApp</span>
                <span className="text-[10px] text-neutral-300 font-bold block mt-0.5">{user.whatsapp}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bento-style Option Streams */}
      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest ml-1">
              • {section.title}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {section.items.map((item) => (
                <button 
                  key={item.id} 
                  onClick={item.onClick}
                  className="bg-neutral-900/40  liquid-glass/90  hover:border-amber-500/20 p-4 sm:p-5 rounded-[1.75rem] flex flex-col justify-between min-h-[140px] sm:min-h-[160px] transition-all group active:scale-95 text-left cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.01] pointer-events-none" />

                  {/* Icon section with ambient backdrop */}
                  <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0 border border-white/5 group-hover:border-amber-500/20 shadow-inner group-hover:bg-amber-500 group-hover:text-black transition-all relative">
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1.5 right-[calc(-0.25rem-1px)] bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-neutral-900 leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Content details side */}
                  <div className="space-y-0.5 mt-4">
                    <span className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider transition-colors block leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-neutral-500 group-hover:text-neutral-400 font-semibold leading-snug block line-clamp-2">
                      {item.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Temorary FCM Diagnostic Button */}
        <div className="pt-4">
          <button 
            type="button"
            onClick={async () => {
               const currentPermission = Notification.permission;
               console.log("Current Notification Permission before request:", currentPermission);
               const result = await Notification.requestPermission();
               console.log("Notification Request Result:", result);
               alert(`Permissão atualizada para: ${result}`);
            }}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500 hover:text-black border border-indigo-500/20 p-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all text-indigo-400 font-bold cursor-pointer"
          >
            <Bell className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">ATIVAR NOTIFICACOES NO DISPOSITIVO</span>
          </button>
        </div>

        {/* Exit Account button */}
        <div className="pt-4">
          <button 
            onClick={onLogout}
            className="w-full bg-rose-500/5 hover:bg-rose-500 hover:text-black border border-rose-500/10 p-5 rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all text-rose-400 font-bold cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Sair da Conta (Logout)</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
