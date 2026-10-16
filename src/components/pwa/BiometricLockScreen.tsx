import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ScanFace,
  Fingerprint, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  KeyRound,
  Delete,
  AlertCircle,
  Loader2,
  Sparkles,
  Smartphone,
  Check,
  RefreshCw,
  X
} from "lucide-react";
import { toast } from "../ui/Toast";
import { triggerLightHaptic, triggerSuccessHaptic, triggerWarningHaptic } from "../../lib/haptics";
import { getIOSInfo } from "../../lib/iosDetection";
import { 
  authenticateWithBiometrics, 
  registerBiometricCredential, 
  verifyBackupPin, 
  disableBiometrics,
  getBiometricStatus
} from "../../lib/biometrics";

interface BiometricLockScreenProps {
  onUnlock: () => void;
  userEmail?: string;
  userName?: string;
}

export function BiometricLockScreen({ onUnlock, userEmail, userName }: BiometricLockScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPinPad, setShowPinPad] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const ios = getIOSInfo();
  const status = getBiometricStatus();

  // Try authenticating automatically on mount
  useEffect(() => {
    // If not enrolled yet, flag it
    if (!status.isEnrolled) {
      setNeedsEnrollment(true);
      return;
    }

    // Attempt biometrics after slight delay so UI is rendered
    const timer = setTimeout(() => {
      handleBiometricAuth(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const handleBiometricAuth = async (isManualClick = true) => {
    if (loading || isSuccess) return;
    setLoading(true);
    setErrorMsg(null);
    if (isManualClick) triggerLightHaptic();

    try {
      // If credential not enrolled, trigger registration flow
      if (needsEnrollment || !localStorage.getItem("ais_biometric_credential_id")) {
        console.log("[BiometricLock] No credential enrolled yet. Triggering registration flow...");
        const regResult = await registerBiometricCredential({
          email: userEmail,
          name: userName
        });

        if (regResult.success) {
          triggerSuccessHaptic();
          setIsSuccess(true);
          toast.success("Face ID vinculado e desbloqueado! 🎉");
          setTimeout(() => {
            onUnlock();
          }, 600);
          return;
        } else {
          setErrorMsg(regResult.error || "Não foi possível vincular o Face ID.");
          if (regResult.code === "CANCELED") {
            setNeedsEnrollment(true);
          }
          triggerWarningHaptic();
          setLoading(false);
          return;
        }
      }

      // Existing enrolled credential verification
      const result = await authenticateWithBiometrics();

      if (result.success) {
        triggerSuccessHaptic();
        setIsSuccess(true);
        setTimeout(() => {
          onUnlock();
        }, 500);
        return;
      }

      // If failed because not enrolled on this domain
      if (result.code === "NOT_ENROLLED") {
        setNeedsEnrollment(true);
        setErrorMsg("Face ID precisa ser configurado neste aparelho. Toque no botão abaixo para ativar.");
      } else if (result.code === "CANCELED") {
        setErrorMsg("Autenticação cancelada. Toque para tentar novamente ou use o PIN.");
      } else {
        setErrorMsg(result.error || "Rosto ou digital não reconhecido.");
      }

      triggerWarningHaptic();
      setLoading(false);
    } catch (e: any) {
      console.error("[BiometricLockScreen] Auth exception:", e);
      setLoading(false);
      setErrorMsg("Erro na verificação biométrica. Use o código PIN.");
      triggerWarningHaptic();
    }
  };

  const handleEnrollFaceId = async () => {
    setLoading(true);
    setErrorMsg(null);
    triggerLightHaptic();

    const regResult = await registerBiometricCredential({
      email: userEmail,
      name: userName
    });

    if (regResult.success) {
      triggerSuccessHaptic();
      setIsSuccess(true);
      setNeedsEnrollment(false);
      toast.success("Face ID configurado com sucesso! 🎉");
      setTimeout(() => {
        onUnlock();
      }, 600);
    } else {
      setLoading(false);
      setErrorMsg(regResult.error || "Falha ao registrar Face ID.");
      triggerWarningHaptic();
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    triggerLightHaptic();
    const newPin = pin + digit;
    setPin(newPin);
    setPinError(false);

    if (newPin.length === 4) {
      // Validate PIN
      const ok = verifyBackupPin(newPin);
      if (ok) {
        triggerSuccessHaptic();
        setIsSuccess(true);
        toast.success("Código PIN correto! Desbloqueado.");
        setTimeout(() => {
          onUnlock();
        }, 500);
      } else {
        triggerWarningHaptic();
        setPinError(true);
        toast.error("PIN incorreto. Tente novamente (padrão: 1234).");
        setTimeout(() => {
          setPin("");
        }, 600);
      }
    }
  };

  const handlePinDelete = () => {
    triggerLightHaptic();
    setPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const handleDisableSecurity = () => {
    if (window.confirm("Deseja desativar o bloqueio por Face ID e PIN?")) {
      disableBiometrics();
      triggerSuccessHaptic();
      toast.success("Bloqueio biométrico desativado.");
      onUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 text-center select-none overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-sm w-full bg-neutral-900/90 border border-white/10 rounded-[2.5rem] p-7 shadow-2xl relative overflow-hidden backdrop-blur-2xl"
      >
        {/* Success Splash Overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-950/98 z-50 flex flex-col items-center justify-center gap-4 p-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30">
                <Check className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-wider">
                Desbloqueado!
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Acessando seu painel MS Barber...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Branding */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8.5px] font-black uppercase tracking-[0.25em] text-neutral-400">
              PWA Security Shield
            </span>
          </div>
          <span className="text-[8px] font-mono uppercase bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-amber-400">
            {ios.isIOS ? "Apple Face ID" : "Biometria"}
          </span>
        </div>

        {!showPinPad ? (
          /* Face ID / Biometrics View */
          <div className="space-y-6">
            {/* Animated Face ID Scanner Frame */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              {/* Outer scanning corners */}
              <div className="absolute inset-0 border-2 border-amber-500/30 rounded-3xl" />
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400 rounded-br-xl" />

              {/* Animated Laser Scanning Beam */}
              {loading && (
                <motion.div
                  animate={{ y: [-45, 45, -45] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] z-20 pointer-events-none"
                />
              )}

              {/* Icon Container */}
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
                {ios.isIOS ? (
                  <ScanFace className={`w-10 h-10 ${loading ? "animate-pulse" : ""}`} />
                ) : (
                  <Fingerprint className={`w-10 h-10 ${loading ? "animate-pulse" : ""}`} />
                )}
              </div>
            </div>

            {/* Title & Instructions */}
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                {ios.isIOS ? "Desbloquear com Face ID" : "Desbloquear com Biometria"}
              </h2>
              <p className="text-xs text-neutral-400 font-medium leading-relaxed px-2">
                {needsEnrollment
                  ? "Seu Face ID ainda não foi ativado para este aplicativo. Toque abaixo para autorizar no iPhone."
                  : ios.isIOS
                  ? "Olhe para a tela do iPhone para desbloquear o app instantaneamente."
                  : "Posicione sua digital no leitor biométrico ou use o reconhecimento facial."}
              </p>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-left"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-[10px] text-rose-300 font-semibold leading-tight">
                  {errorMsg}
                </p>
              </motion.div>
            )}

            {/* In-app browser warning on iOS */}
            {ios.isInAppBrowser && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-[10px] text-amber-300 font-medium leading-relaxed text-left flex gap-2">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Atenção:</strong> Navegadores embutidos (Instagram/Facebook) restringem o Face ID nativo da Apple. Use o botão <strong>Usar Código PIN</strong> abaixo ou abra no <strong>Safari</strong>.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {needsEnrollment ? (
                <button
                  type="button"
                  onClick={handleEnrollFaceId}
                  disabled={loading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase italic tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AUTORIZANDO FACE ID...
                    </>
                  ) : (
                    <>
                      <ScanFace className="w-4 h-4" />
                      ATIVAR FACE ID NO IPHONE
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBiometricAuth(true)}
                  disabled={loading}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase italic tracking-wider text-xs rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      ESCANEANDO ROSTO...
                    </>
                  ) : (
                    <>
                      {ios.isIOS ? <ScanFace className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                      {ios.isIOS ? "AUTENTICAR COM FACE ID" : "TOCAR PARA DESBLOQUEAR"}
                    </>
                  )}
                </button>
              )}

              {/* Alternative: PIN Pad */}
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setShowPinPad(true);
                  setErrorMsg(null);
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Usar Código PIN de Acesso
              </button>
            </div>
          </div>
        ) : (
          /* PIN Pad View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  triggerLightHaptic();
                  setShowPinPad(false);
                  setPin("");
                }}
                className="text-neutral-400 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                ← Voltar para Face ID
              </button>
              <span className="text-[9px] font-mono text-neutral-500 uppercase">
                PIN de Segurança
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
                Digite o Código PIN
              </h2>
              <p className="text-[11px] text-neutral-400">
                Insira o código de 4 dígitos configurado (padrão: 1234)
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <motion.div
                    key={idx}
                    animate={pinError ? { x: [-8, 8, -6, 6, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      filled
                        ? pinError
                          ? "bg-rose-500 border-rose-500"
                          : "bg-amber-400 border-amber-400 scale-110 shadow-[0_0_10px_#f59e0b]"
                        : "border-neutral-600 bg-transparent"
                    }`}
                  />
                );
              })}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinDigit(digit)}
                  className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-amber-500/20 border border-white/5 text-xl font-bold text-white transition-all flex items-center justify-center active:scale-90 cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handlePinDigit("0")}
                className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-amber-500/20 border border-white/5 text-xl font-bold text-white transition-all flex items-center justify-center active:scale-90 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-14 rounded-2xl bg-white/5 hover:bg-rose-500/20 border border-white/5 text-neutral-400 hover:text-rose-400 transition-all flex items-center justify-center active:scale-90 cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Emergency unlock / disable */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDisableSecurity}
                className="text-[9.5px] text-neutral-500 hover:text-neutral-300 uppercase tracking-wider underline cursor-pointer"
              >
                Esqueci o PIN / Desativar Bloqueio
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] text-neutral-600 font-mono uppercase tracking-wider">
          <span>MS BARBER SHOP</span>
          <span>Apple Secure Enclave / WebAuthn</span>
        </div>
      </motion.div>
    </div>
  );
}
