import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { 
  doc, 
  updateDoc, 
  Timestamp, 
  onSnapshot 
} from "firebase/firestore";
import { 
  updateProfile 
} from "firebase/auth";
import { 
  ChevronLeft, 
  Loader2,
  Plus, 
  X,
  Camera
} from "lucide-react";
import { db } from "../../lib/firebase";
import { toast } from "../ui/Toast";
import { uploadImage } from "../../lib/uploadService";

export function ProfileEditScreen({ user, onBack, isClient = false }: { user: any, onBack: () => void, isClient?: boolean }) {
  const [profileData, setProfileData] = useState({
    name: user?.displayName || user?.name || "",
    photoUrl: user?.photoURL || user?.photoUrl || "",
    whatsapp: "",
    bio: "",
    password: "",
    pixKey: "",
    portfolio: [] as string[],
    specialties: [] as string[]
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (!userId) {
      setFetching(false);
      return;
    }
    const docRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          name: data.name || data.displayName || user?.displayName || "",
          photoUrl: data.photoUrl || data.photoURL || user?.photoURL || "",
          whatsapp: data.whatsapp || "",
          bio: data.bio || "",
          password: data.password || "",
          pixKey: data.pixKey || "",
          portfolio: data.portfolio || [],
          specialties: data.specialties || []
        });
      }
      setFetching(false);
    }, (error) => {
      console.error("Error fetching profile:", error);
      setFetching(false);
    });
    return unsubscribe;
  }, [user?.uid, user?.id]);

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update Firebase Auth profile if applicable
      if (user && typeof user.getIdToken === 'function') {
        await updateProfile(user, { 
          displayName: profileData.name,
          photoURL: profileData.photoUrl
        });
      }

      // Update Firestore
      const userId = user.uid || user.id;
      await updateDoc(doc(db, "users", userId), { 
        name: profileData.name,
        displayName: profileData.name,
        photoUrl: profileData.photoUrl,
        photoURL: profileData.photoUrl,
        whatsapp: profileData.whatsapp,
        bio: profileData.bio,
        password: profileData.password,
        pixKey: profileData.pixKey,
        portfolio: profileData.portfolio,
        specialties: profileData.specialties,
        updatedAt: Timestamp.now()
      });
      
      toast.success("Perfil atualizado com sucesso! ✨");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar perfil.");
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, isPortfolio: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPortfolio) {
        setLoading(true);
    } else {
        setUploadingImage(true);
    }
    
    try {
      const result = await uploadImage(file);
      if (result.success && result.data.url) {
        if (isPortfolio) {
            setProfileData(prev => ({ ...prev, portfolio: [...prev.portfolio, result.data.url] }));
        } else {
            setProfileData(prev => ({ ...prev, photoUrl: result.data.url }));
        }
        toast.success("Imagem carregada!");
      } else {
        toast.error("Erro ao fazer upload da imagem.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro no upload.");
    } finally {
      setUploadingImage(false);
      setLoading(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !profileData.specialties.includes(newSpecialty.trim())) {
      setProfileData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  const removePortfolioImage = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter((_, i) => i !== index)
    }));
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-amber-500 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-white italic uppercase">Configurações de Perfil</h2>
        <div className="w-10" />
      </div>

      <form onSubmit={handleUpdate} className="space-y-8 pb-20">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-amber-500 ring-8 ring-amber-500/10 transition-all group-hover:scale-105">
              <img 
                src={profileData.photoUrl || `https://ui-avatars.com/api/?name=${profileData.name}&background=f59e0b&color=000`} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 w-8 h-8 rounded-xl flex items-center justify-center text-black shadow-lg">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="w-full">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2">Foto de Perfil</label>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer bg-neutral-900 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-amber-500 transition-all group">
                <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">
                  {uploadingImage ? 'Enviando...' : (profileData.photoUrl ? 'Trocar imagem atual' : 'Selecionar foto')}
                </span>
                <div className="bg-amber-500 text-black px-4 py-2 rounded-xl font-bold text-[10px] uppercase flex items-center gap-2">
                  {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  {uploadingImage ? 'Processando' : 'Upload'}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  disabled={uploadingImage}
                />
              </label>
            </div>
            <p className="text-[9px] text-neutral-600 mt-2 uppercase tracking-tight">Otimize seu perfil com uma foto profissional.</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Nome Completo</label>
            <input 
              type="text" 
              value={profileData.name} 
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all font-bold"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">WhatsApp / Contato</label>
            <input 
              type="text" 
              value={profileData.whatsapp} 
              onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Alterar Senha do Portal</label>
            <input 
              type="text" 
              value={profileData.password} 
              onChange={(e) => setProfileData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
              placeholder="Senha de 4 dígitos ou mais"
            />
            <p className="text-[9px] text-neutral-600 mt-1 uppercase tracking-tight">Esta senha será usada para acessar seu painel pelo WhatsApp.</p>
          </div>

          {!isClient && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Chave Pix</label>
              <input 
                type="text" 
                value={profileData.pixKey} 
                onChange={(e) => setProfileData(prev => ({ ...prev, pixKey: e.target.value }))}
                className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all font-bold"
                placeholder="Sua chave Pix (CPF, E-mail, Celular ou Aleatória)"
              />
              <p className="text-[9px] text-neutral-600 mt-1 uppercase tracking-tight">Será exibida como QR Code para pagamento após o cliente confirmar o agendamento.</p>
            </div>
          )}

          {!isClient && (
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Galeria de Portfólio</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profileData.portfolio.map((img, index) => (
                  <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/5 bg-neutral-900">
                    <img src={img} alt={`Portfolio ${index}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removePortfolioImage(index)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/80 backdrop-blur-md rounded-lg flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-white/5 bg-neutral-900/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500/50 hover:bg-neutral-900 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase text-neutral-500">Adicionar</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                    className="hidden" 
                    disabled={loading}
                  />
                </label>
              </div>
              <p className="text-[9px] text-neutral-600 uppercase tracking-tight">Mostre seus melhores cortes para os clientes na hora do agendamento.</p>
            </div>
          )}

          {!isClient && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Biografia / Sobre você</label>
              <textarea 
                value={profileData.bio} 
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all resize-none"
                placeholder="Conte um pouco sobre sua experiência e estilo..."
              />
            </div>
          )}
        </div>

        {/* Specialties */}
        {!isClient && (
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest">Especialidades</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newSpecialty} 
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                placeholder="Ex: Degradê, Barba, Pigmentação..."
                className="flex-1 bg-neutral-900 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-amber-500 transition-all"
              />
              <button 
                type="button"
                onClick={addSpecialty}
                className="w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-neutral-200 transition-colors"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {profileData.specialties.map((spec, index) => (
                <div key={index} className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center gap-2 group">
                  <span className="text-xs font-bold text-amber-500">{spec}</span>
                  <button 
                    type="button" 
                    onClick={() => removeSpecialty(index)}
                    className="text-amber-500/40 hover:text-amber-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {profileData.specialties.length === 0 && (
                <p className="text-neutral-600 text-xs font-bold uppercase italic">Nenhuma especialidade adicionada</p>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase italic tracking-widest hover:bg-amber-400 transition-all transform active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/20"
        >
          {loading ? "Salvando Alterações..." : (isClient ? "Salvar Alterações" : "Salvar Perfil Profissional")}
        </button>
      </form>
    </div>
  );
}
