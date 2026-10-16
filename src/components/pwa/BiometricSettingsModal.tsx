import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ScanFace, 
  Fingerprint, 
  ShieldCheck, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  KeyRound, 
  Sparkles, 
  RefreshCw,
  Smartphone,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "../ui/Toast";
import { triggerLightHaptic, triggerSuccessHaptic, triggerWarningHaptic } from "../../lib/haptics";
import { getIOSInfo } from "../../lib/iosDetection";
import { 
  getBiometricStatus, 
  registerBiometricCredential, 
  authenticateWithBiometrics, 
  getBackupPin, 
  setBackupPin, 
  disableBiometrics 
} from "../../lib/biometrics";

interface BiometricSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export function BiometricSettingsModal({ isOpen, onClose, user }: BiometricSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [pin, setPin] = useState(() => getBackupPin());
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [tempPin, setTempPin] = useState("");
  const [status, setStatus] = useState(() => getBiometricStatus());

  const ios = getIOSInfo();

  useEffect(() => {
    if (isOpen) {
      setStatus(getBiometricStatus());
      setPin(getBackupPin());
      setTestSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegisterFaceId = async () => {
    setLoading(true);
    triggerLightHaptic();

    try {
      const res = await registerBiometricCredential({
        id: user?.id,
        name: user?.name || user?.displayName,
        email: user?.email
      });

      if (res.success) {
        triggerSuccessHaptic();
        setStatus(getBiometricStatus());
        toast.success("Face ID cadastrado e ativado com sucesso! 🎉");
      } else {
        triggerWarningHaptic();
        toast.error(res.error || "Não foi possível cadastrar o Face ID.");
      }
    } catch (e: any) {
      triggerWarningHaptic();
      toast.error(e.message || "Erro ao registrar biometria.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestBiometrics = async () => {
    setLoading(true);
    setTestSuccess(false);
    triggerLightHaptic();

    try {
      const res = await authenticateWithBiometrics();
      if (res.success) {
        triggerSuccessHaptic();
        setTestSuccess(true);
        toast.success("Face ID testado e validado com sucesso! 🛡️");
        setTimeout(() => setTestSuccess(false), 4000);
      } else {
        triggerWarningHaptic();
        toast.error(res.error || "Falha no teste biométrico.");
      }
    } catch (e: any) {
      triggerWarningHaptic();
      toast.error(e.message || "Erro ao testar biometria.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = () => {
    if (tempPin.length !== 4 || !/^\d{4}$/.test(tempPin)) {
      triggerWarningHaptic();
      toast.error("O PIN deve conter exatamente 4 números.");
      return;
    }
    triggerSuccessHaptic();
    setBackupPin(tempPin);
    setPin(tempPin);
    setIsEditingPin(false);
    setTempPin("");
    toast.success("Código PIN de emergência atualizado! 🔐");
  };

  const handleToggleDisable = () => {
    if (window.confirm("Deseja desativar o bloqueio por Face ID?")) {
      disableBiometrics();
      setStatus(getBiometricStatus());
      triggerSuccessHaptic();
      toast.success("Bloqueio biométrico desativado.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-md w-full bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5"
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {ios.isIOS ? <ScanFace className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                {ios.isIOS ? "Apple Face ID & Biometria" : "Biometria do Dispositivo"}
              </h3>
              <p className="text-[10px] text-neutral-400 font-medium">
                Proteção por reconhecimento facial e digital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300 font-bold">Status do Bloqueio:</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
              status.isEnabled
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-800 text-neutral-400 border border-white/10"
            }`}>
              {status.isEnabled ? "Ativado" : "Desativado"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300 font-bold">Face ID Vinculado:</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
              status.isEnrolled
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            }`}>
              {status.isEnrolled ? "Vinculado Neste iPhone" : "Pendente de Cadastro"}
            </span>
          </div>
        </div>

        {/* Warning if In-App Browser on iOS */}
        {ios.isInAppBrowser && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[10px] text-amber-300 font-medium leading-relaxed flex gap-2">
            <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Atenção iOS:</strong> Você está em um navegador embutido (Instagram/WhatsApp). O Face ID nativo só pode ser acionado no <strong>Safari</strong> ou no <strong>App instalado (PWA)</strong>.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {(!status.isEnabled || !status.isEnrolled) ? (
            <button
              onClick={handleRegisterFaceId}
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Abrindo Face ID...
                </>
              ) : (
                <>
                  <ScanFace className="w-4 h-4" />
                  Cadastrar / Ativar Face ID Agora
                </>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTestBiometrics}
                disabled={loading}
                className="py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <ScanFace className="w-4 h-4 text-amber-400" />
                )}
                Testar Face ID
              </button>

              <button
                onClick={handleToggleDisable}
                className="py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 border border-rose-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Desativar
              </button>
            </div>
          )}

          {testSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-[10px] text-emerald-300 font-bold flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Sensor Face ID validado com 100% de precisão!
            </motion.div>
          )}
        </div>

        {/* Backup PIN Section */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-white font-bold">PIN de Emergência:</span>
            </div>
            {!isEditingPin ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tracking-widest text-amber-400 font-bold">
                  {pin}
                </span>
                <button
                  onClick={() => {
                    setIsEditingPin(true);
                    setTempPin("");
                  }}
                  className="text-[10px] text-neutral-400 hover:text-white uppercase font-bold underline cursor-pointer"
                >
                  Alterar
                </button>
              </div>
            ) : null}
          </div>

          {isEditingPin && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-[10px] text-neutral-400 font-medium block">
                Digite o novo PIN de 4 dígitos:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="flex-1 bg-black/50 border border-white/20 rounded-xl px-3 py-2 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSavePin}
                  className="px-4 py-2 bg-amber-500 text-black text-xs font-black uppercase rounded-xl cursor-pointer hover:bg-amber-400 transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setIsEditingPin(false)}
                  className="px-3 py-2 bg-white/10 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer hover:bg-white/15"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer guidance */}
        <p className="text-[9.5px] text-neutral-500 text-center leading-relaxed">
          O Face ID utiliza a criptografia de chave pública da Apple (WebAuthn / Secure Enclave). Seus dados biométricos nunca saem do seu iPhone.
        </p>
      </motion.div>
    </div>
  );
}
