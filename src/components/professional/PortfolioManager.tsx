import React, { useState, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, where, limit } from "firebase/firestore";
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Image as ImageIcon, 
  Camera, 
  Upload, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  X,
  Search,
  Check,
  User,
  Scissors
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { uploadImage } from "../../lib/uploadService";

export function PortfolioManager({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Custom Upload and Drag-n-Drop states
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Client link states
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Hidden references to file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "portfolio"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "portfolio"));
    return () => unsubscribe();
  }, []);

  // Sync / fetch clients
  useEffect(() => {
    const qClients = query(
      collection(db, "users"), 
      where("role", "==", "client"), 
      limit(100)
    );
    const unsubscribe = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("[PortfolioManager] Error fetching clients list:", err));
    return () => unsubscribe();
  }, []);

  // Centralized file processing & ImgBB upload handler
  const processAndUploadFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor, selecione apenas arquivos de imagem.");
      return;
    }
    
    setUploading(true);
    setUploadError("");
    
    try {
      const response = await uploadImage(file);
      if (response && response.success && response.data?.url) {
        setImageUrl(response.data.url);
      } else {
        throw new Error("Resposta inválida do servidor de upload.");
      }
    } catch (err: any) {
      console.error("[Upload Error]", err);
      setUploadError(err?.message || "Não foi possível enviar a foto. Verifique a configuração da chave ImgBB.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleAdd = async () => {
    if (!imageUrl) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "portfolio"), {
        imageUrl,
        caption,
        clientId: selectedClient ? (selectedClient.id || selectedClient.uid || null) : null,
        clientName: selectedClient ? (selectedClient.name || null) : null,
        clientEmail: selectedClient ? (selectedClient.email || null) : null,
        createdAt: serverTimestamp()
      });
      setImageUrl("");
      setCaption("");
      setSelectedClient(null);
      setClientSearch("");
      setUploadError("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta foto?")) return;
    try {
      await deleteDoc(doc(db, "portfolio", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "portfolio");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[100dvh] bg-black text-white p-6 pb-32 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto">
      <header className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="liquid-glass p-3 rounded-2xl text-neutral-500 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Galeria</h2>
      </header>

      <div className=" liquid-glass/50 p-6 rounded-[2.5rem]  mb-10">
        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-6 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Novo Corte
        </h3>
        <div className="space-y-4">
            
            {/* Native Secret Photo & Camera Inputs */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={cameraInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />

            {/* ERROR SUMMARY */}
            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{uploadError}</span>
              </div>
            )}

            {/* PREVIEW OR DRAG AREA */}
            <AnimatePresence mode="wait">
              {imageUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative aspect-video rounded-[2rem] overflow-hidden border border-white/10 group"
                >
                  <img src={imageUrl} alt="Corte carregado" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <button 
                      onClick={() => setImageUrl("")}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                    >
                      <X className="w-4 h-4" /> Remover Imagem
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all duration-300 relative ${
                    dragActive 
                      ? "border-amber-500 bg-amber-500/5 scale-[1.01]" 
                      : "border-white/5 bg-black/40 hover:border-white/10"
                  }`}
                >
                  {uploading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Enviando imagem...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="liquid-glass p-4 rounded-2xl text-neutral-400">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mt-2">
                          Arraste sua foto aqui ou use as opções abaixo
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                        <button 
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 bg-neutral-900  liquid-glass  active:scale-95 text-xs font-black uppercase tracking-wider py-4 px-3 rounded-2xl transition-all"
                        >
                          <Camera className="w-4 h-4 text-amber-500" />
                          Tirar Foto
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 bg-neutral-900  liquid-glass  active:scale-95 text-xs font-black uppercase tracking-wider py-4 px-3 rounded-2xl transition-all"
                        >
                          <Upload className="w-4 h-4 text-amber-500" />
                          Galeria
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Client Selector */}
            {selectedClient ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold overflow-hidden border border-amber-500/30">
                    {selectedClient.photoURL ? (
                      <img src={selectedClient.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest leading-none mb-1">Corte do Cliente</p>
                    <p className="text-sm font-black uppercase italic text-white">{selectedClient.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="p-3 bg-neutral-900  liquid-glass rounded-2xl text-neutral-400 hover:text-red-500 transition-all  active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black uppercase text-neutral-600 tracking-widest px-2">Vincular a um Cliente (Opcional)</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar cliente por nome..." 
                    value={clientSearch}
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 pl-12 text-xs font-bold uppercase tracking-widest focus:border-amber-500 transition-colors placeholder:text-neutral-700"
                  />
                  {clientSearch && (
                    <button 
                      onClick={() => { setClientSearch(""); setShowClientDropdown(false); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Search Dropdown */}
                {showClientDropdown && (
                  <div className="absolute left-0 right-0 max-h-52 overflow-y-auto liquid-glass  rounded-2xl mt-2.5 z-[60] shadow-2xl divide-y divide-white/5 no-scrollbar">
                    {clients
                      .filter(c => (c.name || "").toLowerCase().includes(clientSearch.toLowerCase()))
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClient(c);
                            setClientSearch(c.name || "");
                            setShowClientDropdown(false);
                          }}
                          className="liquid-glass w-full text-left p-4  transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl liquid-glass  overflow-hidden flex items-center justify-center text-[10px] font-bold text-neutral-400">
                              {c.photoURL ? <img src={c.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-white uppercase">{c.name}</p>
                              <p className="text-[9px] text-neutral-500">{c.email || c.whatsapp || "Sem contato"}</p>
                            </div>
                          </div>
                          <Check className="w-4 h-4 text-neutral-800 hover:text-amber-500" />
                        </button>
                      ))}
                    {clients.filter(c => (c.name || "").toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                      <p className="p-4 text-center text-[10px] uppercase font-black tracking-widest text-neutral-600">Nenhum cliente encontrado</p>
                    )}
                  </div>
                )}
                {showClientDropdown && (
                  /* Overlay wrapper for simple clicks outside */
                  <div className="fixed inset-0 z-50 bg-transparent" onClick={() => setShowClientDropdown(false)} />
                )}
              </div>
            )}

            <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-neutral-600 tracking-widest px-2">Legenda do Corte</label>
                <input 
                    type="text" 
                    placeholder="ex: Degradê Navalhado" 
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xs font-bold uppercase tracking-widest focus:border-amber-500 transition-colors placeholder:text-neutral-700"
                />
            </div>
            <button 
                onClick={handleAdd}
                disabled={loading || uploading || !imageUrl}
                className="w-full bg-amber-500 text-black py-5 rounded-2xl font-black uppercase italic tracking-widest text-xs disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2"
            >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ADICIONANDO...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    ADICIONAR À GALERIA
                  </>
                )}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
            <div key={item.id} className="relative aspect-square rounded-[2rem] overflow-hidden group border border-white/5">
                <img src={item.imageUrl} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent p-4 flex flex-col justify-end">
                    <p className="text-[10px] font-black uppercase text-white truncate">{item.caption || "Sem legenda"}</p>
                    {item.clientName && (
                        <p className="text-[8px] font-black uppercase tracking-wider text-amber-500/90 truncate flex items-center gap-1 mt-1">
                            💇‍♂️ {item.clientName}
                        </p>
                    )}
                </div>
                <button 
                    onClick={() => handleDelete(item.id)}
                    className="absolute top-2 right-2 p-2 bg-red-600/90 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ))}
        {items.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-neutral-800" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-700">Nenhum corte na galeria</p>
            </div>
        )}
      </div>
    </motion.div>
  );
}
