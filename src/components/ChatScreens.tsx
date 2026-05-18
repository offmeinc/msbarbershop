import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, getFirestore } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { ChevronLeft } from "lucide-react";

export function StaffChatScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const firestore = db || getFirestore();
    await addDoc(collection(firestore, "internal_chats"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      senderName: user.displayName || "Staff",
      senderId: user.uid
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-6 flex flex-col h-[600px]">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-white uppercase text-xs font-bold tracking-widest"><ChevronLeft className="w-4 h-4" /> Voltar</button>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-neutral-900 rounded-3xl mb-4 border border-white/5">
            {messages.map(m => <div key={m.id} className={`p-3 rounded-xl max-w-[80%] ${m.senderId === user.uid ? 'self-end bg-amber-500 text-black' : 'self-start bg-neutral-800 text-white'}`}>
                <p className="text-[10px] opacity-70 mb-1">{m.senderName}</p>
                <p>{m.text}</p>
            </div>)}
        </div>
        <div className="flex gap-2">
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-neutral-900 border border-white/5 rounded-xl p-4 text-white outline-none" placeholder="Digite sua mensagem..."/>
            <button onClick={sendMessage} className="bg-amber-500 p-4 rounded-xl text-black font-bold">Enviar</button>
        </div>
    </div>
  );
}

export function ChatScreen({ user, onBack }: { user: any, onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    const firestore = db || getFirestore();
    const q = query(
      collection(firestore, "chats", user.uid, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (user) {
        handleFirestoreError(error, OperationType.LIST, `chats/${user.uid}/messages`);
      }
    });
    return unsubscribe;
  }, [user]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const firestore = db || getFirestore();
    await addDoc(collection(firestore, "chats", user.uid, "messages"), {
      text: newMessage,
      createdAt: Timestamp.now(),
      userId: user.uid,
      sender: 'client'
    });
    setNewMessage("");
  };

  return (
    <div className="max-w-md mx-auto py-8 px-6 flex flex-col h-[600px]">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-neutral-500 hover:text-white uppercase text-xs font-bold tracking-widest"><ChevronLeft className="w-4 h-4" /> Voltar</button>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-neutral-900 rounded-3xl mb-4 border border-white/5">
            {messages.map(m => <div key={m.id} className={`p-3 rounded-xl max-w-[80%] ${m.sender === 'client' ? 'self-end bg-amber-500 text-black' : 'self-start bg-neutral-800 text-white'}`}>{m.text}</div>)}
        </div>
        <div className="flex gap-2">
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-neutral-900 border border-white/5 rounded-xl p-4 text-white outline-none" placeholder="Digite sua mensagem..."/>
            <button onClick={sendMessage} className="bg-amber-500 p-4 rounded-xl text-black font-bold">Enviar</button>
        </div>
    </div>
  );
}
