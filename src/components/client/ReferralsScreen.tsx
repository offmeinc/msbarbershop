import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc
} from "firebase/firestore";
import { 
  ChevronLeft, 
  Gift, 
  Share2, 
  Copy, 
  UserCheck, 
  Clock, 
  Sparkles, 
  Info, 
  Lock, 
  Coins, 
  HelpCircle,
  Users2,
  CalendarDays,
  CheckCircle2,
  Trophy,
  Crown
} from "lucide-react";
import { db } from "../../lib/firebase";
import { toast } from "../ui/Toast";
import { triggerLightHaptic, triggerSuccessHaptic } from "../../lib/haptics";

interface ReferralsScreenProps {
  user: any;
  onBack: () => void;
  stats: {
    completedCount: number;
  };
  appointments: any[];
}

export function ReferralsScreen({ user, onBack, stats, appointments }: ReferralsScreenProps) {
  const [liveUser, setLiveUser] = useState<any>(user);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Monitor live user document to get live referral code and rewards balance
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setLiveUser({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const referralCode = liveUser?.referralCode || "";

  // Query referred friends who have registered using this client's referral code
  useEffect(() => {
    if (!referralCode) {
      setLoadingFriends(false);
      return;
    }

    setLoadingFriends(true);
    const q = query(
      collection(db, "users"),
      where("referredBy", "==", referralCode)
    );

    const unsub = onSnapshot(q, (snap) => {
      const friends = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setReferredUsers(friends);
      setLoadingFriends(false);
    }, (err) => {
      console.error("Error loading referred friends:", err);
      setLoadingFriends(false);
    });

    return () => unsub();
  }, [referralCode]);

  // Monitor all users to build a real-time leaderboard
  useEffect(() => {
    setLoadingLeaderboard(true);
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      // Count referrals per referralCode
      const referrerMap: Record<string, { 
        name: string; 
        uid: string; 
        total: number; 
        completed: number; 
        role?: string;
      }> = {};

      // Seed referrers
      usersList.forEach((u: any) => {
        if (u.referralCode) {
          referrerMap[u.referralCode] = {
            name: u.name || u.displayName || "Cliente",
            uid: u.id,
            total: 0,
            completed: 0,
            role: u.role
          };
        }
      });

      // Aggregate counts from clients who registered using referredBy codes
      usersList.forEach((u: any) => {
        const refCode = u.referredBy;
        if (refCode && referrerMap[refCode]) {
          referrerMap[refCode].total += 1;
          if (u.referralRewardTriggered === true) {
            referrerMap[refCode].completed += 1;
          }
        }
      });

      // Filter out staff and managers, keep only participants with at least 1 referral
      const board = Object.keys(referrerMap)
        .map(code => ({
          code,
          ...referrerMap[code]
        }))
        .filter(item => item.role !== "manager" && item.role !== "barber" && item.total > 0)
        .sort((a, b) => {
          if (b.completed !== a.completed) {
            return b.completed - a.completed;
          }
          return b.total - a.total;
        });

      setLeaderboard(board);
      setLoadingLeaderboard(false);
    }, (err) => {
      console.error("Error loading referral leaderboard:", err);
      setLoadingLeaderboard(false);
    });

    return () => unsub();
  }, []);

  // Calculate rewards summary
  const completedReferrals = useMemo(() => {
    return referredUsers.filter(friend => friend.referralRewardTriggered === true);
  }, [referredUsers]);

  const pendingReferrals = useMemo(() => {
    return referredUsers.filter(friend => !friend.referralRewardTriggered);
  }, [referredUsers]);

  const totalEarnedCash = completedReferrals.length * 5;

  // Format friend name for elegant privacy: e.g. "Bruno S."
  const formatFriendName = (friend: any) => {
    const rawName = friend.name || friend.displayName || "Amigo Indicado";
    const parts = rawName.trim().split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return parts[0];
  };

  const formatLeaderboardName = (rawName: string) => {
    const parts = rawName.trim().split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }
    return parts[0];
  };

  // Split podium data
  const firstPlace = leaderboard[0] || null;
  const secondPlace = leaderboard[1] || null;
  const thirdPlace = leaderboard[2] || null;
  const remainingPlayers = leaderboard.slice(3, 10); // Show top 10 on list

  const renderPodiumSecond = () => {
    const item = secondPlace;
    const isMe = item?.uid === liveUser?.id;
    return (
      <div className="flex-1 flex flex-col items-center">
        <div className="relative mb-2">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-black border ${
            item 
              ? "bg-neutral-900 border-slate-400/50 shadow-[0_0_10px_rgba(148,163,184,0.15)] text-slate-300 font-sans" 
              : "bg-neutral-950/40 border-dashed border-white/5 text-neutral-600 font-sans"
          }`}>
            {item ? item.name.slice(0, 2).toUpperCase() : "?"}
          </div>
          {item && (
            <span className="absolute -bottom-1 -right-1 bg-slate-400 text-black text-[7px] font-black w-4 py-0.5 rounded-full flex items-center justify-center border border-black uppercase font-sans">
              2º
            </span>
          )}
        </div>
        <div className="text-center mb-1 max-w-[80px] truncate">
          <p className={`text-[9px] font-bold ${isMe ? "text-amber-500" : "text-neutral-300"} font-sans`}>
            {item ? formatLeaderboardName(item.name) : "Disponível"}
          </p>
          <p className="text-[7px] text-neutral-500 font-extrabold tracking-wider uppercase font-sans">
            {item ? `${item.completed} cortes` : "Indique já"}
          </p>
        </div>
        {/* Visual Podium Block */}
        <div className="w-full bg-gradient-to-t from-neutral-950 to-neutral-900/60 border border-white/5 border-b-0 rounded-t-2xl h-16 flex items-center justify-center flex-col shadow-inner relative overflow-hidden group">
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-slate-400" />
          <Trophy className="w-3.5 h-3.5 text-slate-400/30 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>
    );
  };

  const renderPodiumFirst = () => {
    const item = firstPlace;
    const isMe = item?.uid === liveUser?.id;
    return (
      <div className="flex-1 flex flex-col items-center z-10">
        <div className="relative mb-2">
          {item && (
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
            >
              <Crown className="w-4 h-4 fill-amber-500 text-amber-400" />
            </motion.div>
          )}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xs font-black border-2 ${
            item 
              ? "bg-neutral-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)] text-amber-400 font-sans" 
              : "bg-neutral-950/40 border-dashed border-white/5 text-neutral-600 font-sans"
          }`}>
            {item ? item.name.slice(0, 2).toUpperCase() : "?"}
          </div>
          {item && (
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[8px] font-black w-5 py-0.5 rounded-full flex items-center justify-center border border-black uppercase font-sans">
              1º
            </span>
          )}
        </div>
        <div className="text-center mb-1 max-w-[90px] truncate">
          <p className={`text-[10px] font-bold ${isMe ? "text-amber-500" : "text-neutral-200"} font-sans`}>
            {item ? formatLeaderboardName(item.name) : "Disponível"}
          </p>
          <p className="text-[7.5px] text-amber-500 font-black tracking-wider uppercase font-sans">
            {item ? `${item.completed} cortes` : "Seja o Rei"}
          </p>
        </div>
        {/* Visual Podium Block - Tallest */}
        <div className="w-full bg-gradient-to-t from-neutral-950 to-neutral-850/65 border border-white/5 border-b-0 rounded-t-3xl h-24 flex items-center justify-center flex-col shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-x-0 bottom-0 h-[4px] bg-amber-500" />
          <Trophy className="w-5 h-5 text-amber-500/45 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>
    );
  };

  const renderPodiumThird = () => {
    const item = thirdPlace;
    const isMe = item?.uid === liveUser?.id;
    return (
      <div className="flex-1 flex flex-col items-center">
        <div className="relative mb-2">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-black border ${
            item 
              ? "bg-neutral-900 border-amber-850/60 shadow-[0_0_10px_rgba(180,83,9,0.15)] text-amber-700 font-sans" 
              : "bg-neutral-950/40 border-dashed border-white/5 text-neutral-600 font-sans"
          }`}>
            {item ? item.name.slice(0, 2).toUpperCase() : "?"}
          </div>
          {item && (
            <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[7px] font-black w-4 py-0.5 rounded-full flex items-center justify-center border border-black uppercase font-sans">
              3º
            </span>
          )}
        </div>
        <div className="text-center mb-1 max-w-[80px] truncate">
          <p className={`text-[9px] font-bold ${isMe ? "text-amber-500" : "text-neutral-300"} font-sans`}>
            {item ? formatLeaderboardName(item.name) : "Disponível"}
          </p>
          <p className="text-[7px] text-neutral-500 font-extrabold tracking-wider uppercase font-sans">
            {item ? `${item.completed} cortes` : "Indique já"}
          </p>
        </div>
        {/* Visual Podium Block - Shortest */}
        <div className="w-full bg-gradient-to-t from-neutral-950 to-neutral-900/60 border border-white/5 border-b-0 rounded-t-2xl h-12 flex items-center justify-center flex-col shadow-inner relative overflow-hidden group">
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-amber-700" />
          <Trophy className="w-3 h-3 text-amber-700/30 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>
    );
  };

  // Actions
  const handleCopyCode = () => {
    if (!referralCode) {
      toast.error("Seu código ainda não foi gerado.");
      return;
    }
    triggerLightHaptic();
    navigator.clipboard.writeText(referralCode);
    toast.success("Código de indicação copiado! " + referralCode);
  };

  const handleShareLink = () => {
    if (!referralCode) return;
    triggerSuccessHaptic();
    const inviteText = `Use meu código ${referralCode} ao agendar seu corte na barbearia! Você ganha R$ 5,00 de saldo inicial na carteira e eu também ganho quando você cortar! Agende seu horário aqui: ${window.location.origin}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Ganhe R$ 5,00 na Barbearia!",
        text: inviteText,
        url: window.location.origin
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(inviteText);
      toast.success("Mensagem de convite copiada para a área de transferência!");
    }
  };

  const isLocked = stats.completedCount === 0;

  return (
    <div className="min-h-screen bg-black text-white px-6 pb-24 pt-6">
      {/* Header Area */}
      <div className="max-w-md mx-auto flex items-center justify-between mb-8">
        <button 
          onClick={() => {
            triggerLightHaptic();
            onBack();
          }} 
          className="p-3 bg-neutral-950 hover:bg-neutral-900 border border-white/5 hover:border-white/10 rounded-2xl text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 italic">Central de Prêmios</span>
        <div className="w-11" /> {/* Spacer */}
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Banner Section */}
        <div className="text-left bg-gradient-to-br from-neutral-950 to-neutral-900 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">Indique & Ganhe</h1>
            </div>
            <button 
              onClick={() => {
                triggerLightHaptic();
                setIsHowItWorksOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/15 hover:border-transparent rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5 animate-pulse" /> Como funciona?
            </button>
          </div>
          <p className="text-xs text-neutral-400 font-medium leading-relaxed">
            Convide seus amigos para cortarem com a gente. Seu amigo ganha <strong className="text-amber-400 font-semibold">R$ 5,00</strong> de crédito ao se cadastrar, e você ganha <strong className="text-amber-400 font-semibold">R$ 5,00</strong> adicionais na carteira assim que ele realizar o primeiro corte!
          </p>
        </div>

        {/* Locked State Notification */}
        {isLocked ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-950 border border-rose-500/10 p-6 rounded-[2rem] text-left space-y-4 shadow-xl relative overflow-hidden"
          >
            <div className="absolute right-[-10px] top-[-10px] text-rose-500/5 rotate-12">
              <Lock size={120} />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20 text-rose-400 shrink-0">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-400 leading-none mb-1">PROGRAMA BLOQUEADO</h4>
                <p className="text-[11px] text-neutral-300 font-semibold leading-none">Complete seu Corte de Estreia!</p>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
              Para liberar o seu código de indicação, você precisa realizar o seu <span className="text-amber-500 font-bold">primeiro atendimento</span>. Assim que seu primeiro corte for concluído, seu código promocional exclusivo será liberado automaticamente!
            </p>
            <div className="pt-2">
              <button 
                onClick={() => {
                  triggerLightHaptic();
                  onBack(); // Takes them back so they can tap Booking
                }} 
                className="w-full py-3.5 bg-amber-500 text-black rounded-2xl text-[9px] font-black uppercase tracking-widest italic cursor-pointer hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" /> AGENDAR MEU PRIMEIRO CORTE
              </button>
            </div>
          </motion.div>
        ) : (
          /* Active Referral Code Container */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-white/5 p-6 rounded-[2.5rem] text-center space-y-5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute left-[-20px] bottom-[-20px] text-white/5">
              <Coins size={140} />
            </div>

            <div className="space-y-1 relative z-10">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 italic">Seu Código Exclusivo</span>
              <div className="text-3xl font-black italic tracking-[0.1em] text-white select-all">
                {referralCode}
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
              <button 
                onClick={handleCopyCode}
                className="flex-1 py-3.5 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" /> COPIAR CÓDIGO
              </button>
              <button 
                onClick={handleShareLink}
                className="p-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl transition-all active:scale-[0.97] flex items-center justify-center cursor-pointer"
                title="Compartilhar"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Real-time Referral Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-3xl text-left relative overflow-hidden">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 block mb-1">Amigos Inscritos</span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-black italic text-white leading-none">{referredUsers.length}</p>
              <span className="text-[10px] text-neutral-500 font-bold">contas</span>
            </div>
            <Users2 className="absolute right-3 bottom-3 w-8 h-8 text-white/5" />
          </div>

          <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-3xl text-left relative overflow-hidden">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 block mb-1">Prêmios Ganhos</span>
            <p className="text-2xl font-black italic text-amber-500 leading-none">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEarnedCash)}
            </p>
            <Coins className="absolute right-3 bottom-3 w-8 h-8 text-amber-500/5" />
          </div>
        </div>

        {/* Real-Time Competitors Referral Leaderboard */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-5 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Placar de Líderes</h3>
            </div>
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/15 text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic tracking-tighter">
              Clã dos Campeões
            </span>
          </div>

          {loadingLeaderboard ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Styled Podium Visualizer */}
              <div className="flex items-end justify-center gap-2 pt-6 pb-2 border-b border-white/5">
                {renderPodiumSecond()}
                {renderPodiumFirst()}
                {renderPodiumThird()}
              </div>

              {/* Ranks 4+ List */}
              {remainingPlayers.length > 0 ? (
                <div className="space-y-2 mt-2 pt-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {remainingPlayers.map((player, index) => {
                    const isMe = player.uid === liveUser?.id;
                    return (
                      <div 
                        key={player.uid} 
                        className={`flex items-center justify-between p-3 bg-neutral-950/70 border rounded-2xl transition-all ${
                          isMe ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_8px_rgba(245,158,11,0.05)]" : "border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] font-black text-neutral-500 font-mono w-4 text-center">
                            #{index + 4}
                          </span>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black ${
                            isMe ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-neutral-900 border border-white/10 text-neutral-400"
                          }`}>
                            {player.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-white leading-none flex items-center gap-1.5 font-sans">
                              {formatLeaderboardName(player.name)}
                              {isMe && (
                                <span className="bg-amber-500 text-black text-[6.5px] font-black px-1.5 py-0.5 rounded scale-90 uppercase font-sans tracking-wide">Você</span>
                              )}
                            </h4>
                            <span className="text-[8px] font-bold text-neutral-500 mt-1 block uppercase tracking-wider font-sans">
                              {player.total} convites inscritos
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-black text-amber-500 italic block font-sans">
                            {player.completed} find.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : leaderboard.length <= 3 ? (
                <div className="text-center py-3 bg-neutral-950/30 rounded-2xl border border-dashed border-white/5">
                  <p className="text-[9px] text-neutral-500 font-black leading-relaxed tracking-wider uppercase font-sans">
                    A disputa pelo topo está aberta! Indique seus amigos e seja o próximo coroado.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Dynamic List of Friends: "Meus Convidados" */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-amber-500" />
              <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Amigos Convidados</h3>
            </div>
            <span className="bg-neutral-800 border border-white/5 text-neutral-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
              {referredUsers.length} total
            </span>
          </div>

          {loadingFriends ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="text-center py-8 px-4 bg-neutral-950/40 rounded-2xl border border-dashed border-white/5">
              <HelpCircle className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
              <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider">Nenhum convidado ainda</p>
              <p className="text-[9px] text-neutral-600 mt-1 uppercase font-semibold">Compartilhe seu código para começar!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar pr-1">
              {referredUsers.map((friend) => {
                const isPaid = friend.referralRewardTriggered === true;
                return (
                  <div 
                    key={friend.id}
                    className="flex items-center justify-between p-3.5 bg-neutral-950/70 border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-amber-500">
                        {(friend.name || "A").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-white leading-none mb-1">
                          {formatFriendName(friend)}
                        </h4>
                        <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider">
                          Cadastrado em {friend.createdAt?.toDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(friend.createdAt.toDate()) : "Recente"}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[8px] font-extrabold uppercase rounded-full">
                          <Sparkles className="w-2.5 h-2.5" /> Pago R$ 5,00
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 text-neutral-500 border border-white/5 text-[8px] font-extrabold uppercase rounded-full">
                          <Clock className="w-2.5 h-2.5" /> Aguardando 1º corte
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary of Rewards Progression Ledger: "Como funciona" */}
        <div className="bg-neutral-900/30 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-500" />
            <h3 className="text-[10px] font-black uppercase tracking-wider text-white">Como Funciona o Programa</h3>
          </div>

          <div className="relative border-l-2 border-white/5 pl-5 ml-2.5 space-y-6 text-left">
            {/* Step 1 */}
            <div className="relative">
              <span className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center border-2 border-black text-[7.5px] font-black text-black">1</span>
              <div>
                <h4 className="text-[10px] font-black uppercase text-amber-500 leading-none mb-1">Envie o código</h4>
                <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                  Copie e envie o seu código promocional {referralCode ? <span className="font-bold text-white">({referralCode})</span> : ""} para os seus amigos pelo WhatsApp.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <span className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-neutral-850 flex items-center justify-center border border-white/15 text-[7.5px] font-black text-neutral-400">2</span>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white leading-none mb-1">Seu amigo ganha saldo</h4>
                <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                  Ele se cadastra no aplicativo usando o seu código e ganha na hora <span className="text-white font-bold">R$ 5,00</span> de crédito ativo para abater no agendamento dele.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <span className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-neutral-850 flex items-center justify-center border border-white/15 text-[7.5px] font-black text-neutral-400">3</span>
              <div>
                <h4 className="text-[10px] font-black uppercase text-white leading-none mb-1">Ele realiza o corte</h4>
                <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                  Ele faz o primeiro corte e o barbeiro marca o atendimento como <span className="text-white font-bold">Concluído</span> no sistema.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <span className="absolute -left-[29px] top-0 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center border-2 border-black text-[7.5px] font-black text-black">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
              <div>
                <h4 className="text-[10px] font-black uppercase text-amber-500 leading-none mb-1">Você é recompensado!</h4>
                <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                  Automaticamente, <span className="text-amber-500 font-bold">R$ 5,00</span> são transferidos para a sua carteira digital para você acumular ou usar no seu próximo corte!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Como Funciona Modal */}
      <AnimatePresence>
        {isHowItWorksOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-neutral-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Subtle ambient lighting inside modal */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6 shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Guia de Recompensas</h3>
                </div>
                <button
                  onClick={() => {
                    triggerLightHaptic();
                    setIsHowItWorksOpen(false);
                  }}
                  className="px-3.5 py-1.5 bg-neutral-950 border border-white/5 hover:border-white/10 text-neutral-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                >
                  Fechar
                </button>
              </div>

              {/* Content Box */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pr-1 relative z-10 text-left">
                <div>
                  <h4 className="text-xl font-black italic uppercase tracking-tight text-white leading-tight">
                    SISTEMA DE INDICAÇÕES
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 font-semibold leading-relaxed">
                    Veja como novos clientes e você se tornam parceiros e lucram a cada novo agendamento de sucesso!
                  </p>
                </div>

                {/* Dual Rewards Visualizer */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  {/* Benefício Convidado */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-neutral-950/80 p-4 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center relative"
                  >
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[6.5px] font-black px-1.5 py-0.5 rounded-full uppercase scale-90 tracking-wider">
                      Amigo Novo
                    </span>
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-2">
                      <Gift className="w-4 h-4 text-amber-500" />
                    </div>
                    <h4 className="text-[9px] font-black uppercase text-neutral-400 tracking-wider mb-1">Seu amigo ganha</h4>
                    <p className="text-lg font-black text-amber-500 leading-none">R$ 5,00</p>
                    <p className="text-[7.5px] text-neutral-500 font-extrabold uppercase mt-1 leading-tight">Crédito inicial imediato</p>
                  </motion.div>

                  {/* Benefício Indicador */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-neutral-950/80 p-4 border border-white/5 rounded-2xl flex flex-col items-center text-center relative"
                  >
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center border border-white/10 mb-2">
                      <Coins className="w-4 h-4 text-neutral-400" />
                    </div>
                    <h4 className="text-[9px] font-black uppercase text-neutral-400 tracking-wider mb-1">Você ganha</h4>
                    <p className="text-lg font-black text-white leading-none">R$ 5,00</p>
                    <p className="text-[7.5px] text-neutral-500 font-extrabold uppercase mt-1 leading-tight">Por cada 1º corte dele</p>
                  </motion.div>
                </div>

                {/* Progress Visual Path */}
                <div className="space-y-3">
                  <h5 className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-500 italic">
                    Jornada do Novo Cliente
                  </h5>

                  {[
                    {
                      step: "1",
                      title: "Inscrição com Código",
                      desc: "O novo cliente cria a conta no aplicativo usando o seu código. O bônus de R$ 5,00 é injetado imediatamente no saldo dele.",
                      icon: <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                    },
                    {
                      step: "2",
                      title: "Agendamento Prático",
                      desc: "Ele faz o agendamento do corte. Ao ser confirmado, o sistema envia uma notificação push garantindo a segurança do bônus de estreia.",
                      icon: <Clock className="w-3.5 h-3.5 text-amber-500" />
                    },
                    {
                      step: "3",
                      title: "Desconto de Estreia",
                      desc: "No momento do pagamento, o valor promocional de R$ 5,00 é automaticamente descontado do total do corte dele.",
                      icon: <Gift className="w-3.5 h-3.5 text-amber-500" />
                    },
                    {
                      step: "4",
                      title: "Sua Recompensa de R$ 5,00",
                      desc: "Assim que o barbeiro concluir o atendimento dele, o sistema transfere R$ 5,00 na hora para sua carteira digital!",
                      icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 bg-neutral-950/50 border border-white/5 rounded-2xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-amber-500 font-mono">#{item.step}</span>
                      </div>
                      <div>
                        <h6 className="text-[10px] font-black uppercase text-white leading-none mb-1">
                          {item.title}
                        </h6>
                        <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer disclaimer */}
                <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <p className="text-[9px] text-amber-500 font-extrabold uppercase tracking-wide leading-relaxed text-center">
                    📢 Sem limite de indicações! Convide múltiplos amigos para acumular mais bônus e cortar cabelo totalmente de graça!
                  </p>
                </div>
              </div>

              {/* Bottom CTAs */}
              <div className="pt-4 border-t border-white/5 mt-5 shrink-0 relative z-10">
                <button
                  onClick={() => {
                    triggerSuccessHaptic();
                    setIsHowItWorksOpen(false);
                  }}
                  className="w-full py-4 bg-amber-500 text-black hover:bg-amber-400 rounded-2xl text-[10px] font-black uppercase tracking-widest italic cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-500/10"
                >
                  Entendido, vamos lá! 🚀
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
