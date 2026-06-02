import React, { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Key, Mail, Lock, User, Phone, Sparkles, LogIn, ChevronLeft } from "lucide-react";
import { BARBERSHOP_NAME } from "../../constants";

export function ClientPortalScreen({ onLogin, onForgotPassword, onBack }: { onLogin: (phone: string, code: string) => void, onForgotPassword: () => void, onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(phone, code);
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <button onClick={onBack} className="mb-8 p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all">
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-amber-500 rounded-[2.5rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/20">
          <Key className="w-10 h-10 text-black" />
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">Portal do Cliente</h2>
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Acesse seu histórico e agendamentos</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Qual seu WhatsApp?</label>
          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-950 border border-white/5 rounded-3xl p-5 pl-12 text-sm text-white focus:border-amber-500 outline-none transition-all"
              placeholder="(00) 00000-0000"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Sua Senha</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-neutral-950 border border-white/5 rounded-3xl p-5 pl-12 text-sm text-white focus:border-amber-500 outline-none transition-all"
              placeholder="Digite sua senha"
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-neutral-200 transition-all active:scale-95 shadow-xl shadow-white/5 mt-4"
        >
          Acessar Portal
        </button>

        <button 
          type="button"
          onClick={onForgotPassword}
          className="w-full text-neutral-600 text-[10px] font-black uppercase tracking-widest hover:text-amber-500 transition-colors py-4"
        >
          Esqueceu sua senha?
        </button>
      </form>
    </div>
  );
}

export function CollaboratorLoginScreen({ onLogin, setCurrentScreen, setRequestedRole }: { onLogin: (role: string, phone?: string, password?: string, isSignUp?: boolean, name?: string, whatsapp?: string) => void, setCurrentScreen: (screen: string) => void, setRequestedRole: (role: string) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"manager" | "barber">("barber");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRequestedRole(role);
    try {
      await onLogin(role, phone, password, isSignUp, name, phone);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-6">
      <button onClick={() => setCurrentScreen('home')} className="mb-8 p-3 bg-neutral-900 rounded-2xl text-neutral-500 hover:text-white border border-white/5 transition-all">
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-neutral-900 border border-white/5 rounded-[2.5rem] mx-auto flex items-center justify-center mb-6 shadow-2xl overflow-hidden group">
          <motion.div 
            animate={{ rotate: loading ? 360 : 0 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="text-amber-500"
          >
            <Sparkles className="w-10 h-10 ring-amber-500/20" />
          </motion.div>
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">{isSignUp ? 'Criar Conta' : 'Portal Profissional'}</h2>
        <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em]">{BARBERSHOP_NAME} • EXCLUSIVO EQUIPE</p>
      </div>

      <div className="bg-neutral-950/50 p-1 rounded-3xl flex mb-8 border border-white/5">
        <button 
          onClick={() => setRole('barber')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${role === 'barber' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
        >
          Barbeiro
        </button>
        <button 
          onClick={() => setRole('manager')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${role === 'manager' ? 'bg-amber-500 text-black' : 'text-neutral-500 hover:text-white'}`}
        >
          Gestor
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-4">Nome Completo</label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-white/5 rounded-[2rem] p-5 pl-14 text-sm text-white focus:border-amber-500 outline-none transition-all"
                placeholder="Seu nome"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-4">E-mail ou WhatsApp</label>
          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-neutral-950 border border-white/5 rounded-[2rem] p-5 pl-14 text-sm text-white focus:border-amber-500 outline-none transition-all"
              placeholder="seu@email.com ou (00) 00000-0000"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-4">Senha de Acesso</label>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-white/5 rounded-[2rem] p-5 pl-14 text-sm text-white focus:border-amber-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 text-black py-5 rounded-[2rem] font-black uppercase italic tracking-widest text-xs hover:bg-amber-400 transition-all active:scale-95 shadow-xl shadow-amber-500/10 mt-6 flex items-center justify-center gap-3"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {isSignUp ? 'Criar Minha Conta' : 'Acessar Painel'}
        </button>

        <button 
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-neutral-600 text-[10px] font-black uppercase tracking-widest hover:text-amber-500 transition-colors py-4"
        >
          {isSignUp ? 'Já possui conta? Clique para entrar' : 'Novo na equipe? Solicitar acesso'}
        </button>
      </form>
    </div>
  );
}
