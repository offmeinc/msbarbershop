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
  Timestamp, 
  getFirestore,
  where,
  getDocs
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getBackendUrl } from "../lib/pushRegister";
import { safeFetch } from "../lib/api";
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
  Square
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
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-neutral-950 rounded-3xl mb-4 border border-white/5 no-scrollbar">
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
      
      <div className="flex gap-2 bg-neutral-900 border border-white/5 p-2 rounded-2xl">
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
        
        const formData = new FormData();
        formData.append("image", file);
        
        const result = await safeFetch("/api/upload", {
            method: "POST",
            body: formData
        });
        
        if (result.data && result.data.url) {
            const docData = {
              audioUrl: result.data.url,
              text: "🎙️ Mensagem de voz",
              createdAt: Timestamp.now(),
              userId: clientUid,
              sender: "client"
            };
            console.log("DEBUG: Data to add (ChatScreen):", docData);
            await addDoc(collection(db, "chats", clientUid!, "messages"), docData);
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

  // Read message receipt when client opens their own chat
  useEffect(() => {
    if (!clientUid) return;
    const firestore = db || getFirestore();
    const chatDocRef = doc(firestore, "chats", clientUid);
    updateDoc(chatDocRef, { unreadByClient: false }).catch(() => {
      // Ignore if chat document doesn't exist yet
    });
  }, [clientUid, messages.length]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !clientUid) return;
    const firestore = db || getFirestore();
    
    // Add real message
    await addDoc(collection(firestore, "chats", clientUid, "messages"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      userId: clientUid,
      sender: "client"
    });

    // Update parent metadata for professional summary list
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

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-950 animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-neutral-950">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-neutral-500 hover:text-white uppercase text-[10px] font-black tracking-widest transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">
          Falar com a Barbearia
        </span>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 no-scrollbar bg-neutral-900/50">
        {messages.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-3 opacity-50">
            <MessageCircle className="w-12 h-12 text-amber-500 animate-bounce" />
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Inicie a conversa</h4>
          </div>
        ) : (
          messages.map((m) => {
            const isClientUser = m.sender === "client";
            return (
              <div 
                key={m.id} 
                className={`p-3.5 rounded-2xl max-w-[85%] ${
                  isClientUser ? "self-end bg-amber-500 text-black rounded-tr-none" : "self-start bg-neutral-900 text-white rounded-tl-none border border-white/5"
                }`}
              >
                <div className={`flex items-end gap-2 ${isClientUser ? "flex-row-reverse" : ""}`}>
                    {isClientUser ? (
                      <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-white/5 shrink-0">
                         <User className="w-4 h-4 text-neutral-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-black">B</span>
                      </div>
                    )}
                    <div 
                      className={`p-3.5 rounded-2xl max-w-[75%] ${
                        isClientUser ? "bg-amber-500 text-black rounded-tr-none" : "bg-neutral-900 text-white rounded-tl-none border border-white/5"
                      }`}
                    >
                      {!isClientUser && (
                        <p className="text-[8px] font-black uppercase text-amber-500 mb-1 tracking-wider">
                          {m.senderName || "Equipe"}
                        </p>
                      )}
                      {m.imageUrl && (
                          <img src={m.imageUrl} alt="chat" className="max-w-full rounded-lg mb-2" />
                      )}
                      {m.audioUrl && (
                        <audio controls className="w-full mb-2">
                           <source src={m.audioUrl} type="audio/ogg" />
                           Seu navegador não suporta áudio.
                        </audio>
                      )}
                      <p className="text-xs font-semibold leading-relaxed break-words">{m.text}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1.5 ${isClientUser ? "text-neutral-950/60" : "text-neutral-500"}`}>
                        <span className="text-[7px] font-bold uppercase">
                            {m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), "HH:mm") : ""}
                        </span>
                        {isClientUser && (
                            <span className="text-[7px] font-bold uppercase">
                                - {m.status === 'read' ? 'Lida' : 'Entregue'}
                            </span>
                        )}
                      </div>
                    </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2 bg-neutral-900 border-t border-white/5 p-3 shrink-0">
        <label className="p-3.5 rounded-xl border border-white/10 hover:bg-neutral-800 cursor-pointer">
            <Image className="w-4 h-4 text-neutral-400" />
            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append("image", file);
                
                const result = await safeFetch("/api/upload", {
                    method: "POST",
                    body: formData
                });
                
                if (result.data && result.data.url) {
                    await addDoc(collection(db, "chats", clientUid, "messages"), {
                      imageUrl: result.data.url,
                      text: "📷 Imagem",
                      createdAt: Timestamp.now(),
                      userId: clientUid,
                      sender: "client"
                    });
                }
            }} />
        </label>
        <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3.5 rounded-xl border ${isRecording ? "border-red-500/50 bg-red-500/20 text-red-500" : "border-white/10 hover:bg-neutral-800 text-neutral-400"}`}
        >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          className="flex-1 bg-neutral-800 rounded-xl px-4 py-2 text-xs text-white outline-none placeholder:text-neutral-500" 
          placeholder="Escreva algo..."
        />
        <button 
          onClick={sendMessage} 
          className="bg-amber-500 hover:bg-amber-400 text-black p-3.5 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 shadow-lg"
        >
          <Send className="w-4 h-4" />
        </button>
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
        
        const formData = new FormData();
        formData.append("image", file);
        
        const result = await safeFetch("/api/upload", {
            method: "POST",
            body: formData
        });
        
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
    <div className="max-w-xl mx-auto py-8 px-4 flex flex-col h-[700px] animate-in fade-in duration-500">
      {!activeClientId ? (
        // MASTER: LIST OF ACTIVE CLIENT CHATS OR SELECT CLIENT VIEW
        <div className="flex flex-col h-full">
          {!isSelectingClient ? (
            <>
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
                    className="p-2 bg-neutral-900 border border-white/10 rounded-xl hover:bg-neutral-800 text-amber-500 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-6 focus-within:border-amber-500/50 transition-colors">
                <Search className="w-4 h-4 text-amber-500 shrink-0" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-xs text-white placeholder:text-neutral-500 placeholder:font-black placeholder:uppercase placeholder:tracking-wider font-semibold"
                  placeholder="Buscar por cliente, telefone ou mensagem..."
                />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
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
                        <div className="w-11 h-11 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-center relative overflow-hidden shrink-0">
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
                              <span className="text-[8px] font-black tracking-wider bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-md text-neutral-500">
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
            </>
          ) : (
            // SELECT CLIENT VIEW
            <>
              <div className="flex items-center gap-2 mb-6">
                <button 
                  onClick={() => setIsSelectingClient(false)}
                  className="p-2 text-white hover:bg-neutral-800 rounded-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-500" /> Iniciar Novo Chat
                </h2>
              </div>

              {/* Search bar */}
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 flex items-center gap-3 mb-6 focus-within:border-amber-500/50 transition-colors">
                <Search className="w-4 h-4 text-amber-500 shrink-0" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-xs text-white placeholder:text-neutral-500 placeholder:font-black placeholder:uppercase placeholder:tracking-wider font-semibold"
                  placeholder="Buscar cliente cadastrado..."
                />
              </div>

              <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                        setActiveClientId(client.id);
                        setActiveClientName(client.name || "Cliente");
                        setIsSelectingClient(false);
                    }}
                    className="w-full bg-neutral-900/50 border border-white/5 hover:border-amber-500/25 p-4 rounded-[1.8rem] text-left transition-all flex items-center gap-4"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-neutral-950 border border-white/10 flex items-center justify-center shrink-0">
                       <User className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{client.name}</h4>
                      <p className="text-[10px] text-neutral-500 font-semibold">{client.whatsapp || client.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        // DETAILS: CONVERSATION SCREEN WITH ACTIVE CLIENT
        <div className="flex flex-col h-full bg-neutral-950 border border-white/5 rounded-[2.5rem] p-4">
          {/* Internal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 px-2">
            <button 
              onClick={() => {
                setActiveClientId(null);
                setMessages([]);
                setNewMessage("");
              }}
              className="flex items-center gap-1 bg-white/5 border border-white/5 hover:bg-white/10 text-white py-2 px-3 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="flex items-center gap-2.5">
              <h3 className="font-extrabold text-sm text-white uppercase italic tracking-tight">
                {activeClientName}
              </h3>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>

          <div className="flex-grow overflow-y-auto p-2.5 flex flex-col gap-3.5 no-scrollbar">
            {messages.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center opacity-30 gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Conversa Vazia</p>
              </div>
            ) : (
              messages.map((m) => {
                const isClientMsg = m.sender === "client";
                return (
                  <div 
                    key={m.id} 
                    className={`flex items-end gap-2 ${!isClientMsg ? "flex-row-reverse" : ""}`}
                  >
                    {!isClientMsg ? (
                        profPhoto && typeof profPhoto === 'string' ? (
                            <img src={profPhoto} alt={profName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-black text-black">{profName.charAt(0)}</span>
                            </div>
                        )
                    ) : (
                       clientPhoto && typeof clientPhoto === 'string' ? (
                           <img src={clientPhoto} alt={clientName} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/5" />
                       ) : (
                           <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-white/5 shrink-0">
                               <User className="w-4 h-4 text-neutral-500" />
                           </div>
                       )
                    )}
                    <div 
                      className={`p-3.5 rounded-2xl max-w-[75%] ${
                        !isClientMsg ? "bg-amber-500 text-black rounded-tr-none" : "bg-neutral-900 text-white rounded-tl-none border border-white/5"
                      }`}
                    >
                      {isClientMsg && (
                        <p className="text-[8px] font-black uppercase text-amber-500 mb-1 tracking-wider leading-none">
                          {m.senderName || activeClientName || "Cliente"}
                        </p>
                      )}
                      {m.imageUrl && (
                          <img src={m.imageUrl} alt="chat" className="max-w-full rounded-lg mb-2" />
                      )}
                      {m.audioUrl && (
                        <audio controls className="w-full mb-2">
                           <source src={m.audioUrl} type="audio/ogg" />
                           Seu navegador não suporta áudio.
                        </audio>
                      )}
                      <p className="text-xs font-semibold leading-relaxed break-words">{m.text}</p>
                      <span className={`text-[7px] font-bold uppercase block text-right mt-1.5 ${!isClientMsg ? "text-neutral-950/60" : "text-neutral-500"}`}>
                        {m.createdAt instanceof Timestamp ? format(m.createdAt.toDate(), "HH:mm") : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {errorMessage && (
            <div className="text-[10px] text-red-500 font-bold uppercase text-center mb-2 px-4 py-1.5 bg-red-500/10 rounded-full border border-red-500/20">
              {errorMessage}
            </div>
          )}
          <div className="flex gap-2 border-t border-white/5 pt-4 mt-2">
            <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3.5 rounded-2xl border ${isRecording ? "border-red-500/50 bg-red-500/20 text-red-500" : "border-white/10 hover:bg-neutral-800 text-neutral-400"}`}
            >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <label className="p-3.5 rounded-2xl border border-white/10 hover:bg-neutral-800 cursor-pointer flex items-center justify-center">
              <Image className="w-5 h-5 text-neutral-400" />
              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !activeClientId) return;
                  
                  const formData = new FormData();
                  formData.append("image", file);
                  
                  const result = await safeFetch("/api/upload", {
                      method: "POST",
                      body: formData
                  });
                  
                  if (result.data && result.data.url) {
                      await addDoc(collection(db, "chats", activeClientId, "messages"), {
                        imageUrl: result.data.url,
                        text: "📷 Imagem",
                        createdAt: Timestamp.now(),
                        sender: "professional",
                        senderName: user?.displayName || user?.name || "Suporte",
                        senderId: user?.uid || user?.id
                      });
                  }
              }} />
            </label>
            <input 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && sendResponse()}
              className="flex-1 bg-neutral-900 border border-white/5 rounded-2xl px-4 py-3 text-xs text-white outline-none placeholder:text-neutral-600 placeholder:font-black placeholder:uppercase placeholder:tracking-wider font-semibold" 
              placeholder={`Escreva uma resposta para ${activeClientName.split(' ')[0]}...`}
            />
            <button 
              onClick={sendResponse} 
              className="bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-2xl font-black transition-all flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
