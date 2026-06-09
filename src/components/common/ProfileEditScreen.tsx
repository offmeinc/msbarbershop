import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { 
  doc, 
  updateDoc, 
  Timestamp, 
  onSnapshot,
  collection,
  query,
  where
} from "firebase/firestore";
import { 
  updateProfile 
} from "firebase/auth";
import { 
  ChevronLeft, 
  Camera, 
  Loader2, 
  Plus, 
  X,
  User,
  Phone,
  Lock,
  QrCode,
  Sparkles,
  LayoutGrid,
  Heart,
  StickyNote,
  Star
} from "lucide-react";
import { db } from "../../lib/firebase";
import { toast } from "../ui/Toast";

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
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!isClient || !user) return;
    const userId = user.uid || user.id;
    const q = query(
      collection(db, "appointments"),
      where("clientId", "==", userId),
      where("status", "==", "completed")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = (snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]).sort((a: any, b: any) => {
        const dateA = a.date instanceof Timestamp ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Timestamp ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      });
      setCompletedAppointments(list);
    }, (error) => {
      console.error("Error fetching completed appointments on profile screen:", error);
    });

    return unsubscribe;
  }, [isClient, user?.uid, user?.id]);

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
      onBack();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar perfil.");
    }
    setLoading(false);
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

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, isPortfolio: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isPortfolio) {
        setLoading(true);
    } else {
        setUploadingImage(true);
    }
    
    try {
      const { uploadImage } = await import('../../lib/uploadService');
      const data = await uploadImage(file);
      if (data.success) {
        if (isPortfolio) {
            setProfileData(prev => ({ ...prev, portfolio: [...prev.portfolio, data.data.url] }));
        } else {
            setProfileData(prev => ({ ...prev, photoUrl: data.data.url }));
        }
        toast.success("Imagem carregada!");
      } else {
        toast.error("Erro ao fazer upload da imagem.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro na conexão com ImgBB.");
    } finally {
      setUploadingImage(false);
      setLoading(false);
    }
  };

  const removePortfolioImage = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter((_, i) => i !== index)
    }));
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20 bg-black">
        <Loader2 className="animate-spin text-amber-500 w-8 h-8 font-black" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack} 
          className="liquid-glass flex items-center gap-2 text-neutral-500 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-2xl cursor-pointer shadow-md"
        >
          <ChevronLeft className="w-4 h-4 text-amber-500" />
          Voltar
        </button>
        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest liquid-glass px-4 py-2.5 rounded-2xl  flex items-center gap-1.5 label shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> MEU CADASTRO
        </span>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6 pb-20">
        
        {/* Avatar Interactive Circle Block */}
        <div className="flex flex-col items-center gap-3 py-6 liquid-glass  rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/[0.02] rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative group cursor-pointer decoration-none">
            <label className="block cursor-pointer">
              <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-2 border-amber-500 group-hover:border-amber-400 ring-8 ring-amber-500/5 group-hover:ring-amber-500/10 transition-all duration-300 relative shadow-2xl">
                <img 
                  src={profileData.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name)}&background=f59e0b&color=000`} 
                  alt="Profile picture" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  referrerPolicy="no-referrer"
                />
                
                {/* Loader Mask overlay on topup */}
                {uploadingImage && (
                  <div className="liquid-glass absolute inset-0 flex flex-col items-center justify-center gap-1.5 animate-fade-in z-20">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest">Processando</span>
                  </div>
                )}
              </div>
              
              {/* Camera camera-trigger circle overlap pin */}
              <div className="absolute -bottom-1 -right-1 bg-amber-400 hover:bg-amber-300 text-black w-9 h-9 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-black/20 z-10">
                <Camera className="w-4.5 h-4.5" />
              </div>

              {/* Hidden target file upload receiver */}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
                disabled={uploadingImage}
              />
            </label>
          </div>

          <div className="space-y-0.5 text-center">
            <h3 className="text-white text-sm font-black uppercase italic tracking-wider leading-tight">
              {profileData.name || "Seu Nome de Usuário"}
            </h3>
            <p className="text-[8.5px] text-neutral-500 uppercase font-black tracking-widest">
              Toque no círculo para fazer upload de nova foto
            </p>
          </div>
        </div>

        {/* Basic Information Layout Fields Card */}
        <div className=" liquid-glass backdrop-blur-md rounded-[2.5rem]  p-6 space-y-5 text-left shadow-xl relative overflow-hidden">
          <div className="border-b border-white/5 pb-3">
             <span className="text-[10px] text-amber-500 font-sans uppercase font-black tracking-widest block flex items-center gap-2">
               <User className="w-4 h-4 text-amber-500" /> DADOS DO SEU PERFIL
             </span>
          </div>

          <div className="space-y-5">
            {/* Input Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Nome Completo</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={profileData.name} 
                  required
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full liquid-glass  focus:border-amber-500 rounded-2xl p-4 text-xs font-bold text-white transition-all outline-none"
                  placeholder="Insira seu nome completo"
                />
              </div>
            </div>

            {/* Whatsapp */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">WhatsApp / Contato</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={profileData.whatsapp} 
                  onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full liquid-glass  focus:border-amber-500 rounded-2xl p-4 text-xs font-bold text-white transition-all outline-none"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Senha do Painel Web</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={profileData.password} 
                  onChange={(e) => setProfileData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full liquid-glass  focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all outline-none"
                  placeholder="Mínimo de 4 caracteres para segurança"
                />
              </div>
              <span className="text-[8px] text-neutral-600 block uppercase font-bold tracking-tight">
                Utilize esta senha para gerenciar ou agendar através dos canais automatizados.
              </span>
            </div>

            {/* Pix Key - Only for Professionals/Managers */}
            {!isClient && (
              <div className="space-y-1.5">
                <label className="text-[9px] text-emerald-400 uppercase font-black tracking-widest block flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> Chave Pix de Recebimento
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={profileData.pixKey} 
                    onChange={(e) => setProfileData(prev => ({ ...prev, pixKey: e.target.value }))}
                    className="liquid-glass w-full  -emerald-500/20 focus:-emerald-500 rounded-2xl p-4 text-xs font-bold text-emerald-300 transition-all outline-none placeholder:text-neutral-600"
                    placeholder="E-mail, CPF, celular ou aleatória"
                  />
                </div>
                <span className="text-[8px] text-neutral-600 block uppercase font-bold tracking-tight">
                  Esta chave facilitará seus recebimentos diretos. Clientes verão o QR Code correspondente no fluxo.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Profile Section */}
        {!isClient && (
          <div className=" liquid-glass backdrop-blur-md rounded-[2.5rem]  p-6 space-y-6 text-left shadow-xl">
            <div className="border-b border-white/5 pb-3">
               <span className="text-[10px] text-amber-500 font-sans uppercase font-black tracking-widest block flex items-center gap-2">
                 <LayoutGrid className="w-4 h-4 text-amber-500" /> EXPOSIÇÃO PROFISSIONAL E BIO
               </span>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-neutral-500" /> APRESENTAÇÃO / MINHA BIO
              </label>
              <textarea 
                value={profileData.bio} 
                onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="w-full liquid-glass  focus:border-amber-500 rounded-2xl p-4 text-xs text-white transition-all resize-none outline-none"
                placeholder="Descreva seu estilo, diferenciais ou quanto tempo atua na área profissional..."
              />
            </div>

            {/* Specialties tag adder */}
            <div className="space-y-3">
              <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-amber-500" /> HABILIDADES / ESPECIALIDADES ATIVAS
              </label>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newSpecialty} 
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                  placeholder="Ex: Degradê navalhado, Barba completa..."
                  className="flex-1 liquid-glass  focus:border-amber-500 rounded-2xl px-4 py-3 placeholder:text-neutral-600 text-xs text-white outline-none transition-all"
                />
                <button 
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {profileData.specialties.map((spec, index) => (
                  <div key={index} className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 group shadow-sm">
                    <span className="text-[10px] font-bold text-amber-400">{spec}</span>
                    <button 
                      type="button" 
                      onClick={() => removeSpecialty(index)}
                      className="text-amber-500/40 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {profileData.specialties.length === 0 && (
                  <span className="text-[10px] text-neutral-600 font-extrabold uppercase italic tracking-wide py-2">
                    Nenhuma habilidade cadastrada ainda
                  </span>
                )}
              </div>
            </div>

            {/* Gallery portfolio Grid Section */}
            <div className="space-y-3">
              <label className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">MINHAS MELHORES FOTOS (GALERIA)</label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profileData.portfolio.map((img, index) => (
                  <div key={index} className="liquid-glass relative group aspect-square rounded-2xl overflow-hidden shadow hover:-amber-500/20 transition-all duration-300">
                    <img src={img} alt={`Portfolio shot ${index}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <button 
                      type="button"
                      onClick={() => removePortfolioImage(index)}
                      className="absolute top-2 right-2 w-7 h-7 liquid-glass backdrop-blur-md rounded-lg flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-opacity  shadow cursor-pointer active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* File picker button for portfolio inside grid */}
                <label className="liquid-glass aspect-square rounded-[1.5rem] -2 -dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:-amber-500/40  transition-all duration-300 group">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 group-hover:scale-110 duration-300 shadow">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase text-neutral-500 tracking-widest block">Inserir Foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                    className="hidden" 
                    disabled={loading}
                  />
                </label>
              </div>
              <p className="text-[8px] text-neutral-600 uppercase tracking-tight block">
                Estas imagens aparecerão no catálogo virtual para clientes que buscarem referências do seu trabalho.
              </p>
            </div>

          </div>
        )}

        {/* Avaliar Meus Atendimentos Section */}
        {isClient && (
          <div className=" liquid-glass backdrop-blur-md rounded-[2.5rem]  p-6 space-y-6 text-left shadow-xl relative overflow-hidden">
             <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <span className="text-[10px] text-amber-500 font-sans uppercase font-black tracking-widest block flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-current" /> AVALIAR MEUS ATENDIMENTOS
                </span>
                <span className="text-[9px] bg-amber-500/10 text-amber-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  {completedAppointments.length} cortes realizados
                </span>
             </div>

             {completedAppointments.length === 0 ? (
               <div className="py-6 text-center text-[10px] text-neutral-500 uppercase font-black tracking-widest border border-dashed border-white/5 rounded-2xl">
                 Nenhum atendimento finalizado para avaliar.
               </div>
             ) : (
               <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                 {completedAppointments.map((app) => (
                   <AppointmentRatingCard key={app.id} app={app} />
                 ))}
               </div>
             )}
          </div>
        )}

        {/* Global form submit button at the bottom */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4.5 rounded-[1.5rem] font-sans font-black text-[11px] uppercase tracking-widest transition-all duration-300 transform active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 border-b border-amber-600"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 text-black animate-spin" />
              <span>Salvando dados...</span>
            </>
          ) : (
            <span>{isClient ? "SALVAR ALTERAÇÕES DE CLIENTE" : "ATUALIZAR MEU PERFIL DE PROFISSIONAL"}</span>
          )}
        </button>

      </form>
    </div>
  );
}

function AppointmentRatingCard({ app }: { app: any; key?: any }) {
  const [rating, setRating] = useState(app.rating || 0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState(app.review?.comment || "");
  const [loading, setLoading] = useState(false);

  const hasChanges = rating !== (app.rating || 0) || comment !== (app.review?.comment || "");

  const handleSave = async () => {
    if (rating === 0) {
      toast.error("Por favor, selecione uma nota de 1 a 5 estrelas! ⭐");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "appointments", app.id), {
        rating,
        review: {
          rating,
          comment: comment.trim(),
          createdAt: Timestamp.now()
        }
      });
      toast.success("Muito obrigado pela sua avaliação! ✨");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar a avaliação.");
    } finally {
      setLoading(false);
    }
  };

  const appDate = app.date instanceof Timestamp ? app.date.toDate() : new Date(app.date);

  return (
    <div className=" liquid-glass  rounded-2xl p-4 space-y-3 relative hover:border-white/10 transition-all text-left">
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-white uppercase italic tracking-tight text-sans">
            {app.serviceName}
          </h4>
          <p className="text-[9px] text-neutral-400 font-extrabold uppercase">
            Com {app.barberName || "Barbeiro"} • {app.time}
          </p>
          <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
            {appDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        
        {app.rating && !hasChanges && (
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
            AVALIADO
          </span>
        )}
      </div>

      {/* Star Selector */}
      <div className="flex items-center gap-1.5 py-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            onClick={() => setRating(star)}
            className={`transition-all active:scale-125 focus:outline-none ${
              (hoveredRating !== null ? hoveredRating >= star : rating >= star)
                ? "text-amber-500 scale-105"
                : "text-neutral-800"
            }`}
          >
            <Star className={`w-5 h-5 ${ (hoveredRating !== null ? hoveredRating >= star : rating >= star) ? "fill-current" : ""}`} />
          </button>
        ))}
      </div>

      {/* Optional Comment Input */}
      {rating > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Deixe um comentário sobre o atendimento (opcional)"
            className="w-full liquid-glass  focus:border-amber-500/50 rounded-xl px-3 py-2 text-[11px] text-white placeholder-neutral-700 outline-none transition-all font-medium"
            maxLength={100}
          />

          {hasChanges && (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black py-2 rounded-xl text-[9px] font-black uppercase italic tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "SALVAR NOTA"
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
