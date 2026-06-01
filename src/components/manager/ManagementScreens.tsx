import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Scissors, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Sparkles, 
  Save, 
  Pencil 
} from "lucide-react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  where,
  setDoc,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { toast } from "../ui/Toast";
import { ImageUpload } from "../common/ImageUpload";

export function CollaboratorsManager() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBarbers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsubscribe();
  }, []);

  const handleAddBarber = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { 
        displayName: name,
        photoURL: photoURL
      });
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        role: 'barber',
        photoURL: photoURL,
        createdAt: Timestamp.now(),
      });
      setName("");
      setEmail("");
      setPassword("");
      setPhotoURL("");
      toast.success("Colaborador criado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar colaborador.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBarber = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este colaborador da listagem? (Isso não exclui a conta de acesso, apenas remove o perfil)")) return;
    try {
      await updateDoc(doc(db, "users", id), { role: 'inactive_barber' });
      toast.success("Colaborador removido com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover colaborador.");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-20">
      <form onSubmit={handleAddBarber} className="bg-neutral-900 p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <User className="w-5 h-5" />
            </div>
            <h4 className="text-xl font-bold text-white">Novo Colaborador</h4>
        </div>

        <ImageUpload 
          onUpload={setPhotoURL} 
          currentUrl={photoURL} 
          label="Foto do Profissional"
          folder="barbers"
        />

        <div className="space-y-3">
            <input type="text" placeholder="Nome completo" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="email" placeholder="E-mail profissional" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Senha de acesso" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-transform" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : "CADASTRAR COLABORADOR"}
        </button>
      </form>

      <div className="space-y-4 px-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Time de Especialistas</h4>
        <div className="grid grid-cols-1 gap-3">
            {barbers.map(barber => (
              <div key={barber.id} className="bg-neutral-900 p-4 rounded-3xl border border-white/5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 border border-white/5 overflow-hidden">
                    {barber.photoURL ? <img src={barber.photoURL} alt={barber.name} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                  </div>
                  <div>
                      <p className="font-bold text-white leading-none mb-1">{barber.name}</p>
                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-tight">{barber.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteBarber(barber.id)}
                  className="p-2 text-neutral-700 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export function WorkingHoursManager() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "in", ["barber", "manager"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const barbersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBarbers(barbersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
    <span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Carregando profissionais...</span>
  </div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col gap-2 px-4">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Horários <span className="text-amber-500">Operacionais</span></h3>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Configure a disponibilidade dos profissionais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0">
        {barbers.map(barber => (
          <BarberHoursItem key={barber.id} barber={barber} />
        ))}
      </div>
    </div>
  );
}

function BarberHoursItem({ barber }: { barber: any; key?: any }) {
  const [hours, setHours] = useState<any[]>([]);
  
  useEffect(() => {
    const q = query(collection(db, "workingHours"), where("barberId", "==", barber.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHours(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "workingHours");
    });
    return () => unsubscribe();
  }, [barber.id]);

  const saveHours = async (dayOfWeek: number, startTime: string, endTime: string) => {
    try {
      const existing = hours.find(h => h.dayOfWeek === dayOfWeek);
      if (existing) {
        await updateDoc(doc(db, "workingHours", existing.id), { startTime, endTime });
      } else {
        await addDoc(collection(db, "workingHours"), {
          barberId: barber.id,
          dayOfWeek,
          startTime,
          endTime,
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-neutral-900 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
        </div>
        <div>
            <h4 className="font-bold text-white leading-none mb-1">{barber.name}</h4>
            <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Jornada de Trabalho</p>
        </div>
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const dayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][day];
          const workingDay = hours.find(h => h.dayOfWeek === day);
          return (
            <div key={day} className="bg-black/40 p-4 rounded-2xl flex items-center justify-between border border-white/5 group hover:border-amber-500/20 transition-all">
              <span className="text-xs font-black uppercase text-neutral-500 w-10">{dayName}</span>
              <div className="flex gap-4 items-center">
                <input 
                  type="time" 
                  defaultValue={workingDay?.startTime || (day === 0 ? "" : "09:00")}
                  onBlur={(e) => saveHours(day, e.target.value, workingDay?.endTime || (day === 6 ? "19:30" : (day === 0 ? "" : "20:00")))}
                  className="bg-transparent text-sm font-bold text-neutral-300 outline-none focus:text-amber-500 transition-colors"
                />
                <span className="text-neutral-800">|</span>
                <input 
                  type="time" 
                  defaultValue={workingDay?.endTime || (day === 6 ? "19:30" : (day === 0 ? "" : "20:00"))}
                  onBlur={(e) => saveHours(day, workingDay?.startTime || (day === 0 ? "" : "09:00"), e.target.value)}
                  className="bg-transparent text-sm font-bold text-neutral-300 outline-none focus:text-amber-500 transition-colors"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ServicesManagement({ services }: { services: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    duration: 30,
    active: true
  });

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price,
      duration: service.duration,
      active: service.active !== false
    });
    setIsAdding(false);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", price: 0, duration: 30, active: true });
  };

  const importServices = async () => {
    const defaultServices = [
      { name: "Corte + Barba", duration: 60, price: 60 },
      { name: "Corte Degrade", duration: 30, price: 35 },
      { name: "Barba completa", duration: 30, price: 30 },
      { name: "Corte Infantil", duration: 30, price: 35 },
      { name: "Corte social", duration: 30, price: 30 },
      { name: "Corte+ sobrancelha", duration: 30, price: 40 },
      { name: "Corte fast ( 1 pente )", duration: 20, price: 20 },
      { name: "Corte+barba+limpeza", duration: 60, price: 80 },
      { name: "Corte+limpeza", duration: 60, price: 60 },
      { name: "Luzes", duration: 90, price: 120 },
      { name: "Platinado", duration: 90, price: 150 },
      { name: "Sobrancelhas", duration: 10, price: 10 },
    ];
    setLoading(true);
    try {
      await Promise.all(defaultServices.map(service => 
        addDoc(collection(db, "services"), { ...service, active: true, createdAt: Timestamp.now() })
      ));
      toast.success("Serviços importados com sucesso!");
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, "services");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        // Update future appointments for this service
        const qApps = query(collection(db, "appointments"), where("serviceId", "==", editingId), where("date", ">", Timestamp.now()));
        const snapshot = await getDocs(qApps);
        
        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => {
                batch.update(d.ref, { serviceDuration: formData.duration });
            });
            await batch.commit();
        }

        await updateDoc(doc(db, "services", editingId), formData);
      } else {
        await addDoc(collection(db, "services"), { ...formData, createdAt: Timestamp.now() });
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, editingId ? `services/${editingId}` : 'services');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (service: any) => {
    try {
      await updateDoc(doc(db, "services", service.id), { active: service.active === false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `services/${service.id}`);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white">Catálogo de <span className="text-amber-500">Serviços</span></h4>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Gerencie os serviços oferecidos</p>
        </div>
        {!isAdding && !editingId && (
          <div className="flex gap-2">
            <button 
              onClick={importServices}
              className="bg-neutral-800 text-white px-6 py-2 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-neutral-700 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Importar Padrão
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-amber-500 text-black px-6 py-2 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Novo Serviço
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-neutral-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-2 tracking-widest">Nome do Serviço</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Corte e Barba"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-2 tracking-widest">Preço (R$)</label>
                  <input 
                    type="number"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 ml-2 tracking-widest">Duração (min)</label>
                  <input 
                    type="number"
                    required
                    placeholder="Ex: 30"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-sm"
                  />
                </div>
                <div className="flex flex-col pt-6">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-2xl font-black uppercase text-[10px] transition-all border ${
                      formData.active ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-red-500/10 border-red-500/50 text-red-500"
                    }`}
                  >
                    {formData.active ? <><CheckCircle2 className="w-4 h-4" /> Ativo</> : <><XCircle className="w-4 h-4" /> Inativo</>}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 text-black px-10 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> {editingId ? "Atualizar" : "Confirmar"}</>}
                </button>
                <button 
                  type="button"
                  onClick={resetForm}
                  className="bg-white/5 text-neutral-400 px-10 py-4 rounded-2xl font-black uppercase text-xs hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {services.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/10 rounded-[3rem]">
            <div className="w-16 h-16 mb-4 rounded-3xl overflow-hidden border border-white/5 opacity-50 grayscale">
              <img 
                src="/logo.png" 
                alt="Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="font-black uppercase tracking-[0.2em] text-[10px] text-neutral-400">Nenhum serviço catalogado</p>
          </div>
        ) : (
          services.map((service) => (
            <div 
              key={service.id} 
              className={`bg-neutral-900 p-8 rounded-[2.5rem] border transition-all relative group shadow-2xl flex flex-col ${
                service.active === false ? "opacity-50 grayscale border-white/5" : "border-white/5 hover:border-amber-500/30"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 ${
                  service.active === false ? "opacity-50 grayscale" : ""
                }`}>
                  <img 
                    src="/logo.png" 
                    alt="Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="w-10 h-10 bg-white/5 hover:bg-amber-500 hover:text-black text-neutral-500 rounded-xl transition-all flex items-center justify-center"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => toggleActive(service)}
                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${
                      service.active === false ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black" : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                    }`}
                    title={service.active === false ? "Ativar" : "Desativar"}
                  >
                    {service.active === false ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <h5 className="text-xl font-bold text-white mb-1 leading-tight">{service.name}</h5>
              <div className="space-y-1 mb-8 flex-1">
                <p className="text-amber-500 font-black text-3xl">R${service.price}</p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                  <Clock className="w-3.5 h-3.5" /> {service.duration} min
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-white/5 pt-4 mt-auto">
                <div className={`w-2 h-2 rounded-full ${service.active === false ? "bg-red-500" : "bg-amber-500"}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  {service.active === false ? "Oculto" : "Disponível"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
