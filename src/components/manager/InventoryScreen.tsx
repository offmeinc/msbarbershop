import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { ArrowLeft, Package, Plus, Search, Edit2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    quantity: 0,
    price: 0,
    minQuantity: 5
  });

  useEffect(() => {
    const q = query(collection(db, "inventory"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "inventory");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, "inventory", editingProduct.id), {
          ...formData,
          createdAt: editingProduct.createdAt
        });
      } else {
        await addDoc(collection(db, "inventory"), {
          ...formData,
          createdAt: new Date()
        });
      }
      setShowAddForm(false);
      setEditingProduct(null);
      setFormData({ name: "", description: "", quantity: 0, price: 0, minQuantity: 5 });
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, "inventory");
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      quantity: product.quantity,
      price: product.price,
      minQuantity: product.minQuantity
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este produto?")) {
      try {
        await deleteDoc(doc(db, "inventory", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, "inventory");
      }
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-2xl mx-auto py-8 px-4"
    >
      <div className="flex items-center justify-between mb-8">
         <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Voltar
         </button>
         <button 
           onClick={() => {
             setEditingProduct(null);
             setFormData({ name: "", description: "", quantity: 0, price: 0, minQuantity: 5 });
             setShowAddForm(!showAddForm);
           }} 
           className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-colors"
         >
           {showAddForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Novo Produto</>}
         </button>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Controle de Estoque</h2>
      </div>

      {showAddForm && (
        <form onSubmit={handleSave} className="bg-neutral-900 p-6 rounded-[2rem] border border-white/5 space-y-4 mb-8">
          <div>
            <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Nome do Produto</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white placeholder:text-neutral-700 outline-none focus:border-amber-500 transition-colors"
              placeholder="Ex: Cera modeladora"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Descrição</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white placeholder:text-neutral-700 outline-none focus:border-amber-500 transition-colors h-24 resize-none"
              placeholder="Detalhes opcionais do produto"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Qtd.</label>
              <input 
                type="number" 
                required
                value={formData.quantity}
                onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Preço (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Qtd. Mínima</label>
              <input 
                type="number" 
                required
                value={formData.minQuantity}
                onChange={e => setFormData({...formData, minQuantity: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-amber-500 text-black font-black uppercase text-sm py-4 rounded-full mt-4 hover:bg-amber-400 transition-colors">
            {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </form>
      )}

      <div className="bg-neutral-900 border border-white/10 rounded-full p-2 flex items-center mb-8">
        <Search className="w-5 h-5 text-neutral-500 ml-3 mr-2" />
        <input 
          type="text"
          placeholder="Buscar produto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-white outline-none flex-1 placeholder:text-neutral-600"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-neutral-500 text-center py-10">Carregando estoque...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-neutral-500 text-center py-10">Nenhum produto encontrado no estoque.</p>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="bg-neutral-900 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${product.quantity <= product.minQuantity ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-neutral-400'}`}>
                   <Package className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="text-lg font-black text-white">{product.name}</h3>
                   <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      <span>R$ {product.price.toFixed(2)}</span>
                      <span>•</span>
                      <span className={product.quantity <= product.minQuantity ? 'text-red-500' : ''}>
                        {product.quantity} em estoque
                      </span>
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(product)} className="p-2 text-neutral-500 hover:text-white transition-colors bg-white/5 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 text-neutral-500 hover:text-red-500 transition-colors bg-white/5 rounded-xl">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </motion.div>
  );
}
