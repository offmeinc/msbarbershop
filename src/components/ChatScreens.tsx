import { useState, useEffect, useRef, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp, 
  getFirestore,
  where,
  getDocs
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getBackendUrl } from "../lib/pushRegister";
import { 
  ChevronLeft, 
  Send, 
  Search, 
  MessageSquare, 
  User, 
  Clock, 
  MessageCircle, 
  Sparkles,
  Inbox,
  Plus,
  Image,
  Mic,
  Square,
  Trash2,
  MoreVertical,
  Check,
  CheckCheck
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Existing Staff (internal) Chat - kept and polished
export function StaffChatScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "internal_chats"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "internal_chats");
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const firestore = db || getFirestore();
    await addDoc(collection(firestore, "internal_chats"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      senderName: user.displayName || user.name || "Colega",
      senderId: user.uid || user.id
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 flex flex-col h-[650px] animate-in fade-in duration-300">
      <button 
        onClick={onBack} 
        className="mb-4 flex items-center gap-2 text-neutral-500 hover:text-white uppercase text-[10px] font-black tracking-widest transition-colors w-fit"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 liquid-glass rounded-3xl mb-4  no-scrollbar">
        <div className="text-center py-2 border-b border-white/5 mb-2">
          <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
            Mural Interno da Equipe
          </span>
        </div>
        
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center gap-2">
            <MessageSquare className="w-8 h-8 text-neutral-500" />
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Nenhuma mensagem enviada</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === (user.uid || user.id);
            return (
              <div 
                key={m.id} 
                className={`p-3.5 rounded-2xl max-w-[85%] ${
                  isMe ? "self-end bg-amber-500 text-black rounded-tr-none" : "self-start bg-neutral-900 text-white rounded-tl-none border border-white/5"
                }`}
              >
                {!isMe && <p className="text-[9px] font-black uppercase opacity-70 mb-1 tracking-wide">{m.senderName}</p>}
                <p className="text-xs font-medium leading-relaxed break-words">{m.text}</p>
                <span className={`text-[7px] font-bold uppercase block text-right mt-1.5 opacity-60`}>
                  {m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), "HH:mm") : ""}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2 liquid-glass  p-2 rounded-2xl">
        <input 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none placeholder:text-neutral-600 placeholder:font-bold placeholder:uppercase placeholder:tracking-wider font-medium" 
          placeholder="Digite um recado interno..."
        />
        <button 
          onClick={sendMessage} 
          className="bg-amber-500 text-black px-4 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-amber-400 transition-all"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

// Client Chat Screen with Live Messaging & Summary Metadata sync
export function ChatScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientUid = user ? (user.uid || user.id) : null;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.addEventListener("dataavailable", (e) => {
        audioChunksRef.current.push(e.data);
      });
      
      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" });
        const file = new File([audioBlob], "audio.ogg", { type: "audio/ogg" });
        
        try {
          const { uploadImage } = await import('../lib/uploadService');
          const result = await uploadImage(file);
          
          if (result.data && result.data.url) {
              const docData = {
                audioUrl: result.data.url,
                text: "🎙️ Mensagem de voz",
                createdAt: Timestamp.now(),
                userId: clientUid,
                sender: "client"
              };
              await addDoc(collection(db, "chats", clientUid!, "messages"), docData);
          }
        } catch (error) {
          console.error("Audio upload error:", error);
        }
        
        stream.getTracks().forEach(track => track.stop());
      });
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    if (!clientUid) return;
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "chats", clientUid, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${clientUid}/messages`);
    });
    return unsubscribe;
  }, [clientUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!clientUid) return;
    const firestore = db || getFirestore();
    updateDoc(doc(firestore, "chats", clientUid), { unreadByClient: false }).catch(() => {});
  }, [clientUid, messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !clientUid) return;
    const firestore = db || getFirestore();
    
    await addDoc(collection(firestore, "chats", clientUid, "messages"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      userId: clientUid,
      sender: "client"
    });

    await setDoc(doc(firestore, "chats", clientUid), {
      clientId: clientUid,
      clientName: user.name || user.displayName || "Cliente",
      clientPhoto: user.photoURL || user.photoUrl || "",
      clientPhone: user.phone || "",
      lastMessage: newMessage,
      lastMessageTime: Timestamp.now(),
      unreadByStaff: true,
      unreadByClient: false
    }, { merge: true });

    setNewMessage("");
  };

  const deleteMessage = async (msgId: string) => {
    if (!clientUid) return;
    try {
      await deleteDoc(doc(db, "chats", clientUid, "messages", msgId));
      setDeletingId(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col h-[100dvh] overflow-hidden">
      {/* HEADER: WPP Inspired */}
      <div className="bg-neutral-900/95 backdrop-blur-md border-b border-white/5 p-3 flex items-center gap-3 shrink-0 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button onClick={onBack} className="p-1 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/10">
          <span className="text-sm font-black text-amber-500">B</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">Barbearia Suporte</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>

      {/* CHAT BODY: WPP Inspired Background */}
      <div className="flex-1 overflow-y-auto px-3 py-6 flex flex-col gap-2 relative no-scrollbar" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        {messages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-3 opacity-30">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
              <MessageCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h4 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Inicie sua conversa com a equipe</h4>
            <p className="text-[9px] text-neutral-500 font-bold uppercase max-w-[200px]">Suas mensagens são criptografadas e seguras.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender === "client";
            return (
              <div 
                key={m.id} 
                className={`flex w-full mb-1 ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`relative group max-w-[88%] min-w-[65px] p-2.5 rounded-2xl shadow-sm ${
                    isMe 
                      ? "bg-emerald-600/90 text-white rounded-tr-none" 
                      : "bg-neutral-800 text-white rounded-tl-none border border-white/5"
                  }`}
                >
                  {/* Context Menu for Deletion */}
                  {isMe && (
                    <button 
                      onClick={() => setDeletingId(deletingId === m.id ? null : m.id)}
                      className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3 h-3 text-white/50" />
                    </button>
                  )}
                  
                  {deletingId === m.id && (
                    <div className="absolute -top-10 right-0 bg-neutral-900 border border-white/10 rounded-lg p-1 z-10 shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-2">
                      <button 
                        onClick={() => deleteMessage(m.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Deletar
                      </button>
                    </div>
                  )}

                  {m.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                      <img src={m.imageUrl} alt="Anexo" className="w-full max-h-60 object-cover" />
                    </div>
                  )}
                  
                  {m.audioUrl && (
                    <div className="mb-2 w-full max-w-[200px]">
                      <audio controls className="h-8 w-full filter invert opacity-80 scale-90 origin-left">
                        <source src={m.audioUrl} type="audio/ogg" />
                      </audio>
                    </div>
                  )}

                  <p className="text-[13px] leading-snug font-medium break-words px-0.5">{m.text}</p>
                  
                  <div className="flex items-center justify-end gap-1 mt-1 shrink-0 h-3">
                    <span className="text-[9px] font-medium text-white/50">
                      {m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), "HH:mm") : ""}
                    </span>
                    {isMe && (
                      <span className="text-sky-400">
                        {m.status === 'read' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT BAR: WPP Inspired Fixed Bottom */}
      <div className="bg-neutral-900/95 backdrop-blur-md border-t border-white/10 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex items-center gap-2 shrink-0">
        <label className="p-3 hover:bg-white/5 rounded-full transition-colors cursor-pointer text-neutral-400">
          <Plus className="w-6 h-6 rotate-45" />
          <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const { uploadImage } = await import('../lib/uploadService');
              const result = await uploadImage(file);
              if (result.data?.url) {
                await addDoc(collection(db, "chats", clientUid!, "messages"), {
                  imageUrl: result.data.url,
                  text: "📷 Imagem",
                  createdAt: Timestamp.now(),
                  userId: clientUid,
                  sender: "client"
                });
              }
            } catch (err) { console.error(err); }
          }} />
        </label>

        <div className="flex-1 relative flex items-center">
          <input 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            className="w-full bg-neutral-800 rounded-[1.5rem] px-5 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-500 font-medium" 
            placeholder="Mensagem"
          />
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3.5 rounded-full transition-all ${isRecording ? "bg-red-500 text-white animate-pulse" : "text-neutral-400 hover:bg-white/5"}`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={sendMessage} 
            disabled={!newMessage.trim()}
            className={`p-3.5 rounded-full flex items-center justify-center transition-all ${newMessage.trim() ? "bg-emerald-600 shadow-lg scale-110" : "bg-neutral-800 text-neutral-600 opacity-50"}`}
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// NEW Professional Interface to Chat with any Clients
export function ProfessionalClientChatsScreen({ user, onBack, initialClientId, initialClientName }: { user: any, onBack: () => void, initialClientId?: string, initialClientName?: string }) {
  const [chats, setChats] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeClientId, setActiveClientId] = useState<string | null>(initialClientId || null);
  const [activeClientName, setActiveClientName] = useState(initialClientName || "");
  const [isSelectingClient, setIsSelectingClient] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);
  
  // Detail state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const startRecording = async () => {
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.addEventListener("dataavailable", (e) => {
        audioChunksRef.current.push(e.data);
      });
      
      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" });
        const file = new File([audioBlob], "audio.ogg", { type: "audio/ogg" });
        
        try {
          const { uploadImage } = await import('../lib/uploadService');
          const result = await uploadImage(file);
          
          if (result.data && result.data.url) {
              const docData = {
                audioUrl: result.data.url,
                text: "🎙️ Mensagem de voz",
                createdAt: Timestamp.now(),
                sender: "professional",
                senderName: user?.displayName || user?.name || "Suporte",
                senderId: user?.uid || user?.id
              };
              console.log("DEBUG: Data to add:", docData);
              await addDoc(collection(db, "chats", activeClientId!, "messages"), docData);
          }
        } catch (error) {
          console.error("Upload error:", error);
        }
        
        stream.getTracks().forEach(track => track.stop());
      });
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setErrorMessage("Permissão de microfone negada ou indisponível.");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const activeChat = useMemo(() => chats.find(c => c.id === activeClientId), [chats, activeClientId]);
  const profPhoto = user?.photoURL || user?.photoUrl || "";
  const profName = user?.displayName || user?.name || "Equipe";
  const clientPhoto = activeChat?.clientPhoto || "";
  const clientName = activeClientName;

  // Load chats lists
  useEffect(() => {
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "chats"),
      orderBy("lastMessageTime", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "chats");
    });
    return unsubscribe;
  }, []);

  // Fetch all registered clients when needed
  useEffect(() => {
    if (!isSelectingClient) return;
    const fetchClients = async () => {
      const firestore = db || getFirestore();
      const q = query(collection(firestore, "users"), where("role", "==", "client"));
      const snapshot = await getDocs(q);
      setAllClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClients();
  }, [isSelectingClient]);

  // Listen to messages of active client chat
  useEffect(() => {
    if (!activeClientId) return;
    
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "chats", activeClientId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeClientId}/messages`);
    });
    
    // Clear unread mark
    updateDoc(doc(firestore, "chats", activeClientId), { unreadByStaff: false }).catch(() => {});

    return unsubscribe;
  }, [activeClientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendResponse = async () => {
    if (!newMessage.trim() || !activeClientId) return;
    const firestore = db || getFirestore();
    
    // Add professional reply
    await addDoc(collection(firestore, "chats", activeClientId, "messages"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      userId: activeClientId,
      sender: "professional",
      senderName: user?.displayName || user?.name || "Suporte",
      senderId: user?.uid || user?.id
    });

    // Update parent metadata
    await setDoc(doc(firestore, "chats", activeClientId), {
      lastMessage: newMessage,
      lastMessageTime: Timestamp.now(),
      unreadByClient: true,
      unreadByStaff: false
    }, { merge: true });

    setNewMessage("");
  };

  const filteredChats = useMemo(() => chats.filter(c => 
    (c.clientName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.clientPhone || "").toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.lastMessage || "").toLowerCase().includes(searchTerm.toLowerCase())
  ), [chats, searchTerm]);

  const filteredClients = useMemo(() => allClients.filter(c => 
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.whatsapp || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  ), [allClients, searchTerm]);

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col h-[100dvh] overflow-hidden">
      {!activeClientId ? (
        // MASTER: LIST OF ACTIVE CLIENT CHATS OR SELECT CLIENT VIEW
        <div className="flex flex-col h-full pt-[calc(env(safe-area-inset-top)+1rem)]">
          {!isSelectingClient ? (
            <div className="px-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <button 
                    onClick={onBack} 
                    className="mb-2 flex items-center gap-1.5 text-neutral-500 hover:text-white uppercase text-[9px] font-black tracking-widest transition-colors w-fit"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Painel Principal
                  </button>
                  <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-amber-500" /> Chats com Clientes
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                    {chats.filter(c => c.unreadByStaff).length} não lidos
                  </span>
                  <button 
                    onClick={() => setIsSelectingClient(true)}
                    className="p-2 liquid-glass  rounded-xl hover:bg-neutral-800 text-amber-500 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className=" liquid-glass  rounded-2xl p-4 flex items-center gap-3 mb-6 focus-within:border-amber-500/50 transition-colors shrink-0">
                <Search className="w-4 h-4 text-amber-500 shrink-0" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-xs text-white placeholder:text-neutral-500 placeholder:font-black placeholder:uppercase placeholder:tracking-wider font-semibold"
                  placeholder="Buscar por cliente, telefone ou mensagem..."
                />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 no-scrollbar pb-10">
                {filteredChats.length === 0 ? (
                  <div className="h-64 border border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center p-6 gap-3 opacity-30 mt-4">
                    <Inbox className="w-10 h-10 text-neutral-500 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase text-white tracking-widest">Nenhum chat ativo</h4>
                      <p className="text-[9px] text-neutral-500 font-bold uppercase">
                        As conversas iniciadas por clientes no aplicativo aparecerão listadas aqui!
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredChats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveClientId(c.id);
                        setActiveClientName(c.clientName || "Cliente");
                      }}
                      className={`w-full bg-neutral-900/50 border border-white/5 hover:border-amber-500/25 p-4 rounded-[1.8rem] text-left transition-all flex items-center justify-between group relative ${
                        c.unreadByStaff ? "border-amber-500/20 bg-neutral-900" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl liquid-glass  flex items-center justify-center relative overflow-hidden shrink-0">
                          {c.clientPhoto ? (
                            <img src={c.clientPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-neutral-600" />
                          )}
                          {c.unreadByStaff && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-neutral-900 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm group-hover:text-amber-500 transition-colors">
                              {c.clientName || "Cliente"}
                            </h4>
                            {c.clientPhone && (
                              <span className="liquid-glass text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-md text-neutral-500">
                                {c.clientPhone}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-semibold truncate max-w-[200px] mt-0.5">
                            {c.lastMessage}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="text-[8px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {c.lastMessageTime instanceof Timestamp 
                            ? format(c.lastMessageTime.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR }) 
                            : ""
                          }
                        </span>
                        {c.unreadByStaff && (
                          <span className="bg-amber-500 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider leading-none shrink-0">
                            PENDENTE
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            // SELECT CLIENT VIEW
            <div className="px-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <button 
                  onClick={() => setIsSelectingClient(false)}
                  className="liquid-glass p-2 text-white  rounded-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-500" /> Iniciar Novo Chat
                </h2>
              </div>

              {/* Search bar */}
              <div className=" liquid-glass  rounded-2xl p-4 flex items-center gap-3 mb-6 focus-within:border-amber-500/50 transition-colors shrink-0">
                <Search className="w-4 h-4 text-amber-500 shrink-0" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-xs text-white placeholder:text-neutral-500 placeholder:font-black placeholder:uppercase placeholder:tracking-wider font-semibold"
                  placeholder="Buscar cliente cadastrado..."
                />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 no-scrollbar pb-10">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                        setActiveClientId(client.id);
                        setActiveClientName(client.name || "Cliente");
                        setIsSelectingClient(false);
                    }}
                    className="w-full liquid-glass/50  hover:border-amber-500/25 p-4 rounded-[1.8rem] text-left transition-all flex items-center gap-4"
                  >
                    <div className="w-11 h-11 rounded-2xl liquid-glass  flex items-center justify-center shrink-0">
                       <User className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{client.name}</h4>
                      <p className="text-[10px] text-neutral-500 font-semibold">{client.whatsapp || client.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // DETAILS: CONVERSATION SCREEN WITH ACTIVE CLIENT
        <div className="flex flex-col h-full bg-neutral-950 overflow-hidden relative">
          {/* Internal Header: WPP Inspired Professional */}
          <div className="bg-neutral-900 border-b border-white/5 p-3 flex items-center gap-3 shrink-0 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <button 
              onClick={() => {
                setActiveClientId(null);
                setMessages([]);
                setNewMessage("");
              }}
              className="p-1 hover:bg-white/5 rounded-full transition-colors text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center shrink-0 overflow-hidden">
               {clientPhoto ? <img src={clientPhoto} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-neutral-600" />}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">
                {activeClientName}
              </h3>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Cliente Online</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-6 flex flex-col gap-2 relative no-scrollbar" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.02) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            {messages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30 gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((m) => {
                const isClientMsg = m.sender === "client";
                return (
                  <div 
                    key={m.id} 
                    className={`flex w-full mb-1 ${!isClientMsg ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`relative group max-w-[88%] min-w-[65px] p-2.5 rounded-2xl shadow-sm ${
                        !isClientMsg 
                          ? "bg-amber-600/90 text-white rounded-tr-none" 
                          : "bg-neutral-800 text-white rounded-tl-none border border-white/5"
                      }`}
                    >
                      {/* Deletion Option */}
                      {!isClientMsg && (
                        <button 
                          onClick={async () => {
                            if (window.confirm("Deseja apagar esta mensagem?")) {
                              await deleteDoc(doc(db, "chats", activeClientId!, "messages", m.id));
                            }
                          }}
                          className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-white/50" />
                        </button>
                      )}

                      {m.imageUrl && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                          <img src={m.imageUrl} alt="Anexo" className="w-full max-h-60 object-cover" />
                        </div>
                      )}
                      
                      {m.audioUrl && (
                        <div className="mb-2 w-full max-w-[200px]">
                          <audio controls className="h-8 w-full filter invert opacity-80 scale-90 origin-left">
                            <source src={m.audioUrl} type="audio/ogg" />
                          </audio>
                        </div>
                      )}

                      <p className="text-[13px] leading-snug font-medium break-words px-0.5">{m.text}</p>
                      
                      <div className="flex items-center justify-end gap-1 mt-1 shrink-0 h-3">
                        <span className="text-[9px] font-medium text-white/50 uppercase">
                          {m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), "HH:mm") : ""}
                        </span>
                        {!isClientMsg && (
                          <span className="text-sky-400">
                             <CheckCheck className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {errorMessage && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 text-[9px] text-red-500 font-black uppercase px-4 py-2 bg-neutral-900 border border-red-500/20 rounded-full shadow-2xl">
              {errorMessage}
            </div>
          )}

          {/* INPUT BAR: WPP Inspired Professional */}
          <div className="bg-neutral-900 border-t border-white/10 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex items-center gap-2 shrink-0">
             <label className="p-3 text-neutral-400 hover:bg-white/5 rounded-full cursor-pointer transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !activeClientId) return;
                  try {
                    const { uploadImage } = await import('../lib/uploadService');
                    const result = await uploadImage(file);
                    if (result.data?.url) {
                        await addDoc(collection(db, "chats", activeClientId, "messages"), {
                          imageUrl: result.data.url,
                          text: "📷 Imagem",
                          createdAt: Timestamp.now(),
                          sender: "professional",
                          senderName: user?.displayName || user?.name || "Suporte",
                          senderId: user?.uid || user?.id
                        });
                    }
                  } catch (err) { console.error(err); }
              }} />
            </label>

            <div className="flex-1 relative flex items-center">
              <input 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                onKeyDown={e => e.key === "Enter" && sendResponse()}
                className="w-full bg-neutral-800 rounded-[1.5rem] px-5 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-neutral-500 font-medium" 
                placeholder={`Mensagem para ${activeClientName.split(' ')[0]}`}
              />
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3.5 rounded-full transition-all ${isRecording ? "bg-red-500 text-white animate-pulse" : "text-neutral-400 hover:bg-white/5"}`}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={sendResponse} 
                disabled={!newMessage.trim()}
                className={`p-3.5 rounded-full flex items-center justify-center transition-all ${newMessage.trim() ? "bg-amber-500 shadow-lg scale-110" : "bg-neutral-800 text-neutral-600 opacity-50"}`}
              >
                <Send className="w-5 h-5 text-black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
