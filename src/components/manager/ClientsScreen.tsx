import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, Loader2, ChevronRight, User } from "lucide-react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";

export function ClientsScreen({ onBack, onScheduleClient, onClientClick }: { onBack: () => void, onScheduleClient?: (client: any) => void, onClientClick?: (client: any) => void, key?: any }) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "client"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter(client => 
    (client.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.whatsapp || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-2xl mx-auto py-8 px-4"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black italic uppercase text-white">Clientes</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-900 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white outline-none focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map(client => (
            <div key={client.id} onClick={() => onClientClick?.(client)} className="bg-neutral-900 p-4 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 font-bold overflow-hidden border border-white/10">
                  {client.photoURL ? <img src={client.photoURL} alt={client.name} className="w-full h-full object-cover" /> : client.name?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-white">{client.name}</h4>
                  <p className="text-xs text-neutral-500 uppercase font-medium">{client.whatsapp || client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onScheduleClient && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onScheduleClient(client); }}
                    className="px-4 py-2 bg-amber-500 text-black font-black text-[10px] uppercase rounded-full hover:bg-amber-400 transition-colors"
                  >
                    Agendar
                  </button>
                )}
                <button className="p-2 text-neutral-500 hover:text-amber-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
