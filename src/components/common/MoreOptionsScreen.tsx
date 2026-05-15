import { useState } from "react";
import { motion } from "motion/react";
import { 
  User, 
  CreditCard, 
  Bell, 
  Wallet, 
  Calendar, 
  Lock, 
  CheckCircle2, 
  RefreshCw, 
  Tag, 
  Smartphone, 
  MessageSquare, 
  MessageCircle, 
  HelpCircle, 
  Moon, 
  LogOut, 
  ChevronLeft 
} from "lucide-react";
import { BlockScreen } from "../manager/BlockScreen";
import { HelpScreen, ShareScreen, RecurrenceScreen } from "../manager/OtherScreens";
import { ReconScreen } from "../manager/UtilityScreens";
import { PromotionsManager } from "../manager/PromotionsManager";
import { ClientDashboardScreen } from "../client/ClientDashboardScreen";
import { ProfileEditScreen } from "./ProfileEditScreen";
import { NotificationsScreen } from "../NotificationsScreen";
import { EarningsScreen } from "../manager/EarningsScreen";
import { StaffChatScreen, ChatScreen } from "../ChatScreens";

// Dummy components
const DarkScreen = ({ onBack }: { onBack: () => void }) => <div className="p-4">Dark Screen <button onClick={onBack}>Voltar</button></div>;
const MyWeekScreen = ({ user, onBack }: { user: any, onBack: () => void }) => <div className="p-4">My Week Screen <button onClick={onBack}>Voltar</button></div>;

export function MoreOptionsScreen({ user, role, onLogout, onBack, staffNotifications, appointments, onClearNotifications }: { user: any, role: string, onLogout: () => void, onBack: () => void, key?: any, staffNotifications: any[], appointments: any[], onClearNotifications: () => void }) {
  const [activeSubScreen, setActiveSubScreen] = useState<
    'main' | 'profile' | 'dashboard' | 'notif' | 'block' | 'help' | 'share' | 'earnings' | 'week' | 'recon' | 'recurrence' | 'support' | 'staff-chat' | 'dark' | 'promotions'
  >('main');

  const unreadCount = staffNotifications.filter(n => !n.read).length;

  const sections = [
    {
      title: "Perfil e Conta",
      items: [
        { id: 'profile', label: 'Meu Perfil', icon: <User className="w-5 h-5" />, onClick: () => setActiveSubScreen('profile') },
        { id: 'dashboard', label: 'Painel Cliente', icon: <CreditCard className="w-5 h-5" />, onClick: () => setActiveSubScreen('dashboard') },
        { 
          id: 'notif', 
          label: 'Notificações', 
          icon: <Bell className="w-5 h-5" />, 
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined, 
          onClick: () => setActiveSubScreen('notif') 
        },
        ...(role === 'barber' || role === 'manager' ? [{ id: 'earnings', label: 'Meus Ganhos', icon: <Wallet className="w-5 h-5" />, onClick: () => setActiveSubScreen('earnings') }] : []),
      ]
    },
    {
      title: "Agenda e Gestão",
      items: [
        { id: 'week', label: 'Minha Semana', icon: <Calendar className="w-5 h-5" />, onClick: () => setActiveSubScreen('week') },
        { id: 'block', label: 'Bloqueios', icon: <Lock className="w-5 h-5" />, onClick: () => setActiveSubScreen('block') },
        { id: 'recon', label: 'Reconciliação', icon: <CheckCircle2 className="w-5 h-5" />, onClick: () => setActiveSubScreen('recon') },
        { id: 'recurrence', label: 'Recorrências', icon: <RefreshCw className="w-5 h-5" />, onClick: () => setActiveSubScreen('recurrence') },
        ...(role === 'manager' ? [{ id: 'promotions', label: 'Promoções', icon: <Tag className="w-5 h-5" />, onClick: () => setActiveSubScreen('promotions') }] : []),
        { id: 'share', label: 'Divulgar', icon: <Smartphone className="w-5 h-5" />, onClick: () => setActiveSubScreen('share') },
      ]
    },
    {
      title: "Aplicativo",
      items: [
        { id: 'install', label: 'Instalar App', icon: <Smartphone className="w-5 h-5" />, onClick: () => {
          if ('serviceWorker' in navigator && window.matchMedia('(display-mode: standalone)').matches) {
            alert("O aplicativo já está instalado!");
          } else {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            if (isIOS) {
               alert("No iOS: Toque no botão 'Compartilhar' e depois em 'Adicionar à Tela de Início'.");
            } else {
               alert("No Android/Chrome: Clique nos três pontinhos (menu) e selecione 'Instalar aplicativo'.");
            }
          }
        }},
      ]
    },
    {
      title: "Suporte e Outros",
      items: [
        ...(role === 'barber' || role === 'manager' ? [{ id: 'staff-chat', label: 'Chat Equipe', icon: <MessageSquare className="w-5 h-5" />, onClick: () => setActiveSubScreen('staff-chat') }] : []),
        { id: 'support', label: 'Suporte', icon: <MessageCircle className="w-5 h-5" />, onClick: () => setActiveSubScreen('support') },
        { id: 'help', label: 'Ajuda', icon: <HelpCircle className="w-5 h-5" />, onClick: () => setActiveSubScreen('help') },
        { id: 'dark', label: 'Tema Escuro', icon: <Moon className="w-5 h-5" />, onClick: () => setActiveSubScreen('dark') },
      ]
    }
  ];

  if (activeSubScreen === 'block') return <BlockScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'help') return <HelpScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'share') return <ShareScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'recon') return <ReconScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'recurrence') return <RecurrenceScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'promotions') return <PromotionsManager onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'dashboard') return <ClientDashboardScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'dark') return <DarkScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'profile') return <ProfileEditScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'notif') return <NotificationsScreen notifications={staffNotifications} appointments={appointments} onClear={onClearNotifications} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'earnings') return <EarningsScreen onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'week') return <MyWeekScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'staff-chat') return <StaffChatScreen user={user} onBack={() => setActiveSubScreen('main')} />;
  if (activeSubScreen === 'support') return <ChatScreen user={user} onBack={() => setActiveSubScreen('main')} />;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-md mx-auto py-8 px-6 min-h-screen pb-32"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Mais Opções</h2>
        <button onClick={onBack} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/5 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{section.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              {section.items.map((item) => (
                <button 
                  key={item.id} 
                  onClick={item.onClick}
                  className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex items-center gap-3 hover:bg-neutral-800 transition-all group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-400 group-hover:bg-amber-500 group-hover:text-black transition-all relative">
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-neutral-900">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4">
          <button 
            onClick={onLogout}
            className="w-full bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex items-center justify-center gap-3 active:scale-95 transition-all text-red-500 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Sair da Conta</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
