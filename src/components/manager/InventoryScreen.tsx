import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../../lib/firebase";
import { 
  ArrowLeft, 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Minus,
  X,
  SlidersHorizontal,
  Sparkles,
  Loader2,
  Archive,
  ArrowRight,
  TrendingDown,
  Barcode,
  Camera,
  Copy,
  MessageCircle,
  FileText,
  History,
  Tag,
  Boxes,
  Percent,
  Truck,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Scissors,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Send,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "../ui/Toast";
import { triggerLightHaptic, triggerSuccessHaptic, triggerWarningHaptic } from "../../lib/haptics";
import { BARBERSHOP_NAME } from "../../constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BrowserMultiFormatReader } from "@zxing/library";

type ScreenTab = "catalog" | "movements" | "reorder" | "financial";
type StockFilter = "all" | "low" | "excess" | "high_value";
type ItemType = "all" | "resale" | "internal_use";
type MovementType = "entry" | "sale" | "consumption" | "adjustment" | "loss";

export const PRODUCT_CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "finalizadores", label: "Pomadas & Ceras" },
  { id: "barba", label: "Barba & Óleos" },
  { id: "cabelo", label: "Cabelo & Tônicos" },
  { id: "frigobar", label: "Frigobar & Bar" },
  { id: "insumos", label: "Insumos Bancada" },
  { id: "acessorios", label: "Acessórios" },
  { id: "outros", label: "Outros" }
];

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<ScreenTab>("catalog");

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<ItemType>("all");
  const [logTypeFilter, setLogTypeFilter] = useState<string>("all");

  // Modals & Action Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Dedicated Stock Movement Modal
  const [movementModalProduct, setMovementModalProduct] = useState<any | null>(null);
  const [movementType, setMovementType] = useState<MovementType>("entry");
  const [movementQuantity, setMovementQuantity] = useState<number>(1);
  const [movementReason, setMovementReason] = useState<string>("");
  const [movementUnitCost, setMovementUnitCost] = useState<number>(0);

  // Barcode / Camera Scanner Modal
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerQuery, setScannerQuery] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // WhatsApp Order Customization
  const [orderSupplierFilter, setOrderSupplierFilter] = useState<string>("all");
  const [customOrderItems, setCustomOrderItems] = useState<{ [id: string]: number }>({});
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Product Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "finalizadores",
    itemType: "resale", // 'resale' or 'internal_use'
    sku: "",
    quantity: 0,
    price: 0,
    costPrice: 0,
    minQuantity: 5,
    idealQuantity: 15,
    supplier: "",
    supplierPhone: ""
  });

  // 1. Subscribe to inventory products
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

  // 2. Subscribe to inventory logs
  useEffect(() => {
    const qLogs = query(
      collection(db, "inventory_logs"), 
      orderBy("createdAt", "desc"),
      limit(80)
    );
    const unsubscribe = onSnapshot(qLogs, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(entries);
      setLogsLoading(false);
    }, (error) => {
      console.warn("Could not load inventory logs:", error);
      setLogsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync reorder suggestions whenever products load
  useEffect(() => {
    const initialSuggestions: { [id: string]: number } = {};
    products.forEach(p => {
      const qty = Number(p.quantity || 0);
      const min = Number(p.minQuantity || 5);
      const ideal = Number(p.idealQuantity || (min * 2));
      if (qty <= min) {
        initialSuggestions[p.id] = Math.max(1, ideal - qty);
      }
    });
    setCustomOrderItems(initialSuggestions);
  }, [products]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Stop camera when closing scanner modal
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Câmera não suportada neste dispositivo.");
        return;
      }
      stopCamera();

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const videoElement = videoRef.current;
      if (!videoElement) return;

      setCameraActive(true);

      try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        let selectedDeviceId = undefined;
        if (videoInputDevices.length > 0) {
          // Prefer back camera on mobile devices
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('traseira') ||
            device.label.toLowerCase().includes('environment')
          );
          selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[videoInputDevices.length - 1].deviceId;
        }

        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoElement,
          (result, err) => {
            if (result) {
              const text = result.getText();
              if (text) {
                triggerSuccessHaptic();
                codeReader.reset();
                handleBarcodeDetected(text);
              }
            }
          }
        );
      } catch (zxingErr) {
        console.warn("ZXing decode error, falling back to native detector:", zxingErr);
        // Fallback to native BarcodeDetector or getUserMedia stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });
        streamRef.current = stream;
        videoElement.srcObject = stream;
        await videoElement.play();

        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"]
          });

          const scanFrame = async () => {
            if (!videoElement || !streamRef.current) return;
            try {
              const barcodes = await barcodeDetector.detect(videoElement);
              if (barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                triggerSuccessHaptic();
                handleBarcodeDetected(rawVal);
                return;
              }
            } catch (e) {}
            if (streamRef.current) {
              requestAnimationFrame(scanFrame);
            }
          };
          requestAnimationFrame(scanFrame);
        }
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Permissão de câmera negada ou indisponível.");
      setCameraActive(false);
    }
  };

  const handleBarcodeDetected = (code: string) => {
    stopCamera();
    setScannerQuery(code);
    const matched = products.find(p => (p.sku && p.sku.toLowerCase() === code.toLowerCase()) || p.id === code);
    if (matched) {
      toast.success(`Produto localizado: ${matched.name} 📦`);
      setMovementModalProduct(matched);
      setMovementQuantity(1);
      setShowScannerModal(false);
    } else {
      toast.info(`Código detectado: ${code}. Nenhum produto cadastrado com este SKU.`);
    }
  };

  // Generate random SKU code
  const handleGenerateSku = () => {
    const randomSku = "MS-" + Math.floor(100000 + Math.random() * 900000);
    setFormData(prev => ({ ...prev, sku: randomSku }));
    triggerLightHaptic();
    toast.success("Código SKU gerado com sucesso!");
  };

  // 3. Save Product
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Por favor, preencha o nome do produto.");
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        itemType: formData.itemType,
        sku: formData.sku.trim(),
        quantity: Number(formData.quantity) || 0,
        price: Number(formData.price) || 0,
        costPrice: Number(formData.costPrice) || 0,
        minQuantity: Number(formData.minQuantity) || 0,
        idealQuantity: Number(formData.idealQuantity) || (Number(formData.minQuantity) * 2),
        supplier: formData.supplier.trim(),
        supplierPhone: formData.supplierPhone.trim().replace(/\D/g, ""),
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, "inventory", editingProduct.id), {
          ...itemData,
          createdAt: editingProduct.createdAt || serverTimestamp()
        });

        // Log edit event if quantity changed manually
        const oldQty = Number(editingProduct.quantity || 0);
        const newQty = itemData.quantity;
        if (oldQty !== newQty) {
          await addDoc(collection(db, "inventory_logs"), {
            productId: editingProduct.id,
            productName: itemData.name,
            type: "adjustment",
            quantityChanged: newQty - oldQty,
            previousQuantity: oldQty,
            newQuantity: newQty,
            reason: "Ajuste manual de cadastro/edição",
            performedBy: auth.currentUser?.displayName || "Gestor",
            createdAt: serverTimestamp()
          });
        }

        triggerSuccessHaptic();
        toast.success("Produto atualizado no estoque! 📦✨");
      } else {
        const newDoc = await addDoc(collection(db, "inventory"), {
          ...itemData,
          createdAt: serverTimestamp()
        });

        // Log initial entry
        if (itemData.quantity > 0) {
          await addDoc(collection(db, "inventory_logs"), {
            productId: newDoc.id,
            productName: itemData.name,
            type: "entry",
            quantityChanged: itemData.quantity,
            previousQuantity: 0,
            newQuantity: itemData.quantity,
            reason: "Cadastro inicial de mercadoria",
            unitCost: itemData.costPrice,
            performedBy: auth.currentUser?.displayName || "Gestor",
            createdAt: serverTimestamp()
          });
        }

        triggerSuccessHaptic();
        toast.success("Novo produto adicionado ao estoque! 🔥🛒");
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, "inventory");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
    setFormData({ 
      name: "", 
      description: "", 
      category: "finalizadores",
      itemType: "resale",
      sku: "",
      quantity: 0, 
      price: 0, 
      costPrice: 0,
      minQuantity: 5,
      idealQuantity: 15,
      supplier: "",
      supplierPhone: ""
    });
  };

  const handleEdit = (product: any) => {
    triggerLightHaptic();
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "finalizadores",
      itemType: product.itemType || "resale",
      sku: product.sku || "",
      quantity: product.quantity || 0,
      price: product.price || 0,
      costPrice: product.costPrice || 0,
      minQuantity: product.minQuantity || 5,
      idealQuantity: product.idealQuantity || 15,
      supplier: product.supplier || "",
      supplierPhone: product.supplierPhone || ""
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir item "${name}" permanentemente? Esta ação removerá o registro do estoque.`)) return;
    setActionInProgress(id + "-delete");
    try {
      await deleteDoc(doc(db, "inventory", id));
      triggerWarningHaptic();
      toast.success("Item removido do estoque.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "inventory");
    } finally {
      setActionInProgress(null);
    }
  };

  // Dedicated Stock Movement Execution (with full auditing)
  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModalProduct) return;

    const currentQty = Number(movementModalProduct.quantity || 0);
    const qtyChange = Number(movementQuantity);

    if (qtyChange <= 0 && movementType !== "adjustment") {
      toast.error("Informe uma quantidade válida maior que zero.");
      return;
    }

    let delta = 0;
    let newQty = currentQty;

    if (movementType === "entry") {
      delta = qtyChange;
      newQty = currentQty + delta;
    } else if (movementType === "consumption" || movementType === "loss") {
      delta = -qtyChange;
      newQty = Math.max(0, currentQty - qtyChange);
    } else if (movementType === "adjustment") {
      delta = qtyChange - currentQty;
      newQty = Math.max(0, qtyChange);
    }

    setActionInProgress(movementModalProduct.id + "-movement");
    try {
      // 1. Update product quantity
      await updateDoc(doc(db, "inventory", movementModalProduct.id), {
        quantity: newQty,
        ...(movementUnitCost > 0 && movementType === "entry" ? { costPrice: movementUnitCost } : {}),
        updatedAt: serverTimestamp()
      });

      // 2. Add detailed log to inventory_logs
      await addDoc(collection(db, "inventory_logs"), {
        productId: movementModalProduct.id,
        productName: movementModalProduct.name,
        category: movementModalProduct.category || "geral",
        type: movementType,
        quantityChanged: delta,
        previousQuantity: currentQty,
        newQuantity: newQty,
        unitCost: movementUnitCost || movementModalProduct.costPrice || 0,
        unitPrice: movementModalProduct.price || 0,
        reason: movementReason.trim() || getDefaultMovementReason(movementType),
        performedBy: auth.currentUser?.displayName || "Gestor / Barbeiro",
        createdAt: serverTimestamp()
      });

      triggerSuccessHaptic();
      toast.success(`Movimentação registrada! Novo estoque: ${newQty} un. 📦`);
      setMovementModalProduct(null);
      setMovementQuantity(1);
      setMovementReason("");
      setMovementUnitCost(0);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar movimentação de estoque.");
    } finally {
      setActionInProgress(null);
    }
  };

  const getDefaultMovementReason = (type: MovementType) => {
    switch (type) {
      case "entry": return "Entrada / Reposição de Fornecedor";
      case "consumption": return "Consumo interno de bancada";
      case "loss": return "Avaria, quebra ou perda de produto";
      case "adjustment": return "Ajuste de inventário físico";
      case "sale": return "Venda realizada";
      default: return "Movimentação manual de estoque";
    }
  };

  // Quick 1-Click Inline adjustment
  const handleInlineQuickAdjustment = async (product: any, delta: number) => {
    const currentQty = Number(product.quantity || 0);
    const newQty = Math.max(0, currentQty + delta);
    if (currentQty === newQty) return;

    setActionInProgress(product.id + "-quick");
    try {
      await updateDoc(doc(db, "inventory", product.id), {
        quantity: newQty,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "inventory_logs"), {
        productId: product.id,
        productName: product.name,
        category: product.category || "geral",
        type: delta > 0 ? "entry" : "consumption",
        quantityChanged: delta,
        previousQuantity: currentQty,
        newQuantity: newQty,
        reason: delta > 0 ? "Ajuste rápido (+1)" : "Ajuste rápido (-1)",
        performedBy: auth.currentUser?.displayName || "Gestor",
        createdAt: serverTimestamp()
      });

      triggerLightHaptic();
      toast.success(`Estoque atualizado: ${newQty} un.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao ajustar quantidade rápida.");
    } finally {
      setActionInProgress(null);
    }
  };

  // 4. Financial & Inventory Analytics
  const metrics = useMemo(() => {
    const totalRecords = products.length;
    let totalItemsSum = 0;
    let totalEstimatedSaleValue = 0;
    let totalEstimatedCostValue = 0;
    let criticalItemsCount = 0;
    let resaleItemsCount = 0;
    let internalUseItemsCount = 0;

    products.forEach(p => {
      const q = Number(p.quantity || 0);
      const salePr = Number(p.price || 0);
      const costPr = Number(p.costPrice || 0);
      const minVal = Number(p.minQuantity || 5);

      totalItemsSum += q;
      totalEstimatedSaleValue += (q * salePr);
      totalEstimatedCostValue += (q * costPr);

      if (q <= minVal) {
        criticalItemsCount++;
      }
      if (p.itemType === "internal_use") {
        internalUseItemsCount += q;
      } else {
        resaleItemsCount += q;
      }
    });

    const projectedProfit = totalEstimatedSaleValue - totalEstimatedCostValue;
    const averageMargin = totalEstimatedSaleValue > 0 
      ? ((projectedProfit / totalEstimatedSaleValue) * 100) 
      : 0;

    return {
      totalRecords,
      totalItemsSum,
      totalEstimatedSaleValue,
      totalEstimatedCostValue,
      projectedProfit,
      averageMargin,
      criticalItemsCount,
      resaleItemsCount,
      internalUseItemsCount
    };
  }, [products]);

  // 5. Unique suppliers list for filtering and orders
  const suppliers = useMemo(() => {
    const setNames = new Set<string>();
    products.forEach(p => {
      if (p.supplier && p.supplier.trim()) {
        setNames.add(p.supplier.trim());
      }
    });
    return Array.from(setNames);
  }, [products]);

  // 6. Filter products for catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Keyword search (Name, SKU, Description, Supplier)
      if (searchQuery.trim()) {
        const queryClean = searchQuery.toLowerCase().trim();
        const mainMatch = (p.name || "").toLowerCase().includes(queryClean);
        const descMatch = (p.description || "").toLowerCase().includes(queryClean);
        const skuMatch = (p.sku || "").toLowerCase().includes(queryClean);
        const supplierMatch = (p.supplier || "").toLowerCase().includes(queryClean);
        if (!mainMatch && !descMatch && !skuMatch && !supplierMatch) return false;
      }

      // Category filter
      if (categoryFilter !== "all") {
        if ((p.category || "outros") !== categoryFilter) return false;
      }

      // Type filter (resale vs internal_use)
      if (typeFilter !== "all") {
        const itemType = p.itemType || "resale";
        if (itemType !== typeFilter) return false;
      }

      // Status pill filter
      const qty = Number(p.quantity || 0);
      const min = Number(p.minQuantity || 5);
      if (stockFilter === "low") {
        return qty <= min;
      } else if (stockFilter === "excess") {
        return qty > (min * 3);
      } else if (stockFilter === "high_value") {
        return Number(p.price || 0) >= 49.90;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize low stock items
      const isCriticalA = Number(a.quantity || 0) <= Number(a.minQuantity || 5);
      const isCriticalB = Number(b.quantity || 0) <= Number(b.minQuantity || 5);
      if (isCriticalA && !isCriticalB) return -1;
      if (!isCriticalA && isCriticalB) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [products, searchQuery, stockFilter, categoryFilter, typeFilter]);

  // 7. Filter reorder items
  const criticalProductsForOrder = useMemo(() => {
    return products.filter(p => {
      const isCritical = Number(p.quantity || 0) <= Number(p.minQuantity || 5);
      if (!isCritical) return false;
      if (orderSupplierFilter !== "all") {
        return (p.supplier || "").trim() === orderSupplierFilter;
      }
      return true;
    });
  }, [products, orderSupplierFilter]);

  // 8. Generate WhatsApp Order Message
  const generatedWhatsAppOrder = useMemo(() => {
    const lines: string[] = [];
    const dateFormatted = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    lines.push(`💈 *PEDIDO DE REPOSIÇÃO — ${BARBERSHOP_NAME}*`);
    lines.push(`📅 Data: ${dateFormatted}`);
    lines.push(`👤 Solicitante: ${auth.currentUser?.displayName || "Gestão da Barbearia"}`);
    if (orderSupplierFilter !== "all") {
      lines.push(`🏢 Fornecedor: *${orderSupplierFilter}*`);
    }
    lines.push("");
    lines.push(`📦 *ITENS SOLICITADOS:*`);

    let totalUnits = 0;
    let estimatedCost = 0;

    criticalProductsForOrder.forEach((p, idx) => {
      const requestedQty = customOrderItems[p.id] !== undefined 
        ? customOrderItems[p.id] 
        : Math.max(1, (Number(p.idealQuantity || 15) - Number(p.quantity || 0)));

      if (requestedQty > 0) {
        totalUnits += requestedQty;
        estimatedCost += requestedQty * Number(p.costPrice || 0);

        const skuText = p.sku ? ` [SKU: ${p.sku}]` : "";
        lines.push(`${idx + 1}. *${requestedQty}x* ${p.name}${skuText}`);
        lines.push(`   • Estoque Atual: ${p.quantity || 0} | Limite Mín: ${p.minQuantity || 5}`);
      }
    });

    lines.push("");
    lines.push(`📊 *Resumo do Pedido:*`);
    lines.push(`• Total de Unidades: *${totalUnits} itens*`);
    if (estimatedCost > 0) {
      lines.push(`• Custo Estimado: *R$ ${estimatedCost.toFixed(2).replace(".", ",")}*`);
    }
    if (orderNotes.trim()) {
      lines.push("");
      lines.push(`📝 *Observações:* ${orderNotes.trim()}`);
    }
    lines.push("");
    lines.push(`Favor confirmar disponibilidade, valores e prazo de entrega. Obrigado! 🤝`);

    return {
      message: lines.join("\n"),
      totalUnits,
      estimatedCost
    };
  }, [criticalProductsForOrder, customOrderItems, orderSupplierFilter, orderNotes]);

  // Handle Copy WhatsApp message
  const handleCopyOrderMessage = () => {
    triggerLightHaptic();
    navigator.clipboard.writeText(generatedWhatsAppOrder.message);
    toast.success("Pedido copiado para a área de transferência! 📋");
  };

  // Handle Send WhatsApp directly
  const handleSendOrderWhatsApp = () => {
    triggerLightHaptic();
    // Try to find supplier phone if filtered
    let targetPhone = "";
    if (orderSupplierFilter !== "all") {
      const matchWithPhone = criticalProductsForOrder.find(p => p.supplierPhone);
      if (matchWithPhone && matchWithPhone.supplierPhone) {
        targetPhone = matchWithPhone.supplierPhone;
      }
    }

    const cleanPhone = targetPhone.replace(/\D/g, "");
    const waUrl = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(generatedWhatsAppOrder.message)}`
      : `https://wa.me/?text=${encodeURIComponent(generatedWhatsAppOrder.message)}`;

    window.open(waUrl, "_blank");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto py-6 px-4 sm:px-6 min-h-[100dvh] pb-36 text-left"
    >
      {/* Top Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 liquid-glass rounded-2xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5 text-amber-500" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight leading-none">
                Estoque Pro
              </h2>
              <span className="text-[7.5px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                MS BARBER
              </span>
            </div>
            <span className="text-[8.5px] text-neutral-400 font-extrabold uppercase tracking-widest leading-none mt-1 block">
              Controle, Lucro & Reposição Automática
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Scanner button */}
          <button 
            onClick={() => {
              triggerLightHaptic();
              setShowScannerModal(true);
            }}
            className="p-3 liquid-glass rounded-2xl text-neutral-400 hover:text-amber-400 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
            title="Escanear Código de Barras / SKU"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider">Bipar SKU</span>
          </button>

          {!showAddForm && (
            <button 
              onClick={() => {
                triggerLightHaptic();
                resetForm();
                setShowAddForm(true);
              }}
              className="px-4 py-3 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 text-black" />
              Novo Item
            </button>
          )}
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-black/40 border border-white/5 rounded-2xl mb-6 select-none">
        <button
          onClick={() => { triggerLightHaptic(); setActiveTab("catalog"); setShowAddForm(false); }}
          className={`py-2.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "catalog"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Package className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Estoque</span>
        </button>

        <button
          onClick={() => { triggerLightHaptic(); setActiveTab("financial"); setShowAddForm(false); }}
          className={`py-2.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "financial"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Lucro & DRE</span>
        </button>

        <button
          onClick={() => { triggerLightHaptic(); setActiveTab("reorder"); setShowAddForm(false); }}
          className={`py-2.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all relative cursor-pointer ${
            activeTab === "reorder"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Truck className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Reposição</span>
          {metrics.criticalItemsCount > 0 && (
            <span className={`w-2 h-2 rounded-full absolute top-1.5 right-1.5 ${activeTab === "reorder" ? "bg-black" : "bg-rose-500 animate-pulse"}`} />
          )}
        </button>

        <button
          onClick={() => { triggerLightHaptic(); setActiveTab("movements"); setShowAddForm(false); }}
          className={`py-2.5 px-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "movements"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Histórico</span>
        </button>
      </div>

      {/* TAB 1: CATALOG & INVENTORY */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Quick summary strip */}
          {!showAddForm && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="liquid-glass p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">Total de Itens</span>
                <span className="text-xl font-black text-white">{metrics.totalItemsSum} un.</span>
                <span className="text-[8px] text-neutral-500 block">{metrics.totalRecords} produtos únicos</span>
              </div>

              <div className="liquid-glass p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">Estoque Crítico</span>
                <span className={`text-xl font-black ${metrics.criticalItemsCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {metrics.criticalItemsCount} itens
                </span>
                <span className="text-[8px] text-neutral-500 block">Abaixo do mínimo</span>
              </div>

              <div className="liquid-glass p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">Custo Imobilizado</span>
                <span className="text-xl font-black text-amber-400">
                  R$ {metrics.totalEstimatedCostValue.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-[8px] text-neutral-500 block">Capital investido</span>
              </div>

              <div className="liquid-glass p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">Lucro Projetado</span>
                <span className="text-xl font-black text-emerald-400">
                  R$ {metrics.projectedProfit.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-[8px] text-emerald-500/80 font-bold block">{metrics.averageMargin.toFixed(0)}% margem média</span>
              </div>
            </div>
          )}

          {/* Form Modal/Section for Add/Edit */}
          <AnimatePresence mode="wait">
            {showAddForm ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="liquid-glass rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden border border-amber-500/20"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-mono text-amber-400 uppercase tracking-widest">
                      {editingProduct ? "Configuração de Produto" : "Novo Cadastro"}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-wider">
                      {editingProduct ? `Editar: ${editingProduct.name}` : "Cadastrar Nova Mercadoria"}
                    </h3>
                  </div>
                  <button 
                    onClick={resetForm}
                    className="p-2 text-neutral-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {/* Row 1: Name and Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                        Nome do Produto *
                      </label>
                      <div className="relative">
                        <Package className="absolute left-4 top-3.5 w-4 h-4 text-neutral-500" />
                        <input 
                          value={formData.name} 
                          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Pomada Efeito Matte Extra Forte 150g" 
                          className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 pl-11 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-semibold"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                        Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-semibold"
                      >
                        {PRODUCT_CATEGORIES.filter(c => c.id !== "all").map(c => (
                          <option key={c.id} value={c.id} className="bg-neutral-900 text-white">
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Type and SKU */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                        Tipo de Item
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, itemType: "resale" }))}
                          className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            formData.itemType === "resale"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-black/40 text-neutral-500 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          Revenda (Balcão)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, itemType: "internal_use" }))}
                          className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            formData.itemType === "internal_use"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : "bg-black/40 text-neutral-500 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          Insumo Bancada
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-1">
                        <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest block">
                          Código SKU / Barras
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateSku}
                          className="text-[8px] font-bold text-amber-400 hover:underline uppercase"
                        >
                          Gerar Código
                        </button>
                      </div>
                      <div className="relative">
                        <Barcode className="absolute left-4 top-3.5 w-4 h-4 text-neutral-500" />
                        <input 
                          value={formData.sku} 
                          onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                          placeholder="Ex: POM-MAT-01 ou 789123456789" 
                          className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 pl-11 text-xs text-white font-mono focus:border-amber-500 focus:outline-none transition-all uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Quantities and Stock Limits */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1 block text-center">
                        Estoque Atual
                      </label>
                      <input 
                        type="number"
                        value={formData.quantity} 
                        onChange={e => setFormData(prev => ({ ...prev, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-black text-center"
                        required
                        min="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1 block text-center">
                        Mínimo (Alerta)
                      </label>
                      <input 
                        type="number"
                        value={formData.minQuantity} 
                        onChange={e => setFormData(prev => ({ ...prev, minQuantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs text-rose-300 focus:border-rose-500 focus:outline-none transition-all font-black text-center"
                        required
                        min="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1 block text-center">
                        Meta Ideal (Repor)
                      </label>
                      <input 
                        type="number"
                        value={formData.idealQuantity} 
                        onChange={e => setFormData(prev => ({ ...prev, idealQuantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none transition-all font-black text-center"
                        required
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Row 4: Financial: Cost Price, Sale Price, and Margin Preview */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-500 block">
                      Valores & Margem de Lucro
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                          Preço de Custo (R$)
                        </label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.costPrice} 
                          onChange={e => setFormData(prev => ({ ...prev, costPrice: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          placeholder="0.00"
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-black text-center"
                          min="0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                          Preço de Venda (R$)
                        </label>
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.price} 
                          onChange={e => setFormData(prev => ({ ...prev, price: Math.max(0, parseFloat(e.target.value) || 0) }))}
                          placeholder="0.00"
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-xs text-emerald-400 focus:border-emerald-500 focus:outline-none transition-all font-black text-center"
                          required
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Dynamic Real-time Margin calculation */}
                    <div className="pt-2 flex items-center justify-between text-[10px] text-neutral-300 border-t border-white/5 px-1">
                      <span>
                        Lucro Líquido por unidade: <strong className="text-emerald-400 font-bold">R$ {Math.max(0, formData.price - formData.costPrice).toFixed(2).replace(".", ",")}</strong>
                      </span>
                      <span>
                        Margem Bruta: <strong className="text-amber-400 font-bold">
                          {formData.price > 0 ? (((formData.price - formData.costPrice) / formData.price) * 100).toFixed(0) : 0}%
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Row 5: Supplier info for Reorder WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                        Distribuidor / Fornecedor
                      </label>
                      <div className="relative">
                        <Truck className="absolute left-4 top-3.5 w-4 h-4 text-neutral-500" />
                        <input 
                          value={formData.supplier} 
                          onChange={e => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                          placeholder="Ex: Alfa Looks Cosméticos" 
                          className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 pl-11 text-xs text-white focus:border-amber-500 focus:outline-none transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                        WhatsApp do Fornecedor
                      </label>
                      <div className="relative">
                        <MessageCircle className="absolute left-4 top-3.5 w-4 h-4 text-emerald-500" />
                        <input 
                          value={formData.supplierPhone} 
                          onChange={e => setFormData(prev => ({ ...prev, supplierPhone: e.target.value }))}
                          placeholder="Ex: (11) 99999-9999" 
                          className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 pl-11 text-xs text-white focus:border-emerald-500 focus:outline-none transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 6: Description */}
                  <div className="space-y-1.5">
                    <label className="text-[8.5px] font-black text-neutral-400 uppercase tracking-widest ml-1 block">
                      Descrição / Instruções de Uso
                    </label>
                    <textarea 
                      value={formData.description} 
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Instruções de aplicação, modo de conservação ou notas internas..." 
                      className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 text-xs text-white focus:border-amber-500 focus:outline-none transition-all h-20 resize-none font-semibold leading-relaxed"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="liquid-glass flex-1 text-neutral-400 hover:text-white py-4 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-2xl font-black uppercase tracking-wider text-[10px] transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {editingProduct ? "Salvar Alterações" : "Concluir Cadastro"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Filtering & Search Bar */}
          {!showAddForm && (
            <div className="space-y-3">
              {/* Search input with SKU trigger */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, SKU, categoria ou fornecedor..."
                  className="w-full liquid-glass text-white placeholder-neutral-500 text-xs pl-10 pr-10 py-3.5 rounded-2xl border border-white/5 focus:border-amber-500 focus:outline-none transition-all font-semibold"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3.5 p-0.5 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category selector pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth select-none py-1">
                {PRODUCT_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { triggerLightHaptic(); setCategoryFilter(cat.id); }}
                    className={`text-[8.5px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border shrink-0 transition-all cursor-pointer ${
                      categoryFilter === cat.id
                        ? "bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/10"
                        : "bg-black/30 text-neutral-400 border-white/5 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Status and Item Type quick filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 mr-1 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" /> Filtro:
                  </span>
                  
                  <button
                    onClick={() => setStockFilter("all")}
                    className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      stockFilter === "all" ? "bg-white/10 text-white border-white/20" : "text-neutral-500 border-transparent hover:text-white"
                    }`}
                  >
                    Todos ({products.length})
                  </button>

                  <button
                    onClick={() => setStockFilter("low")}
                    className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      stockFilter === "low" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "text-neutral-500 border-transparent hover:text-rose-400"
                    }`}
                  >
                    Críticos ({products.filter(p => Number(p.quantity || 0) <= Number(p.minQuantity || 5)).length})
                  </button>

                  <button
                    onClick={() => setStockFilter("high_value")}
                    className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      stockFilter === "high_value" ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "text-neutral-500 border-transparent hover:text-amber-400"
                    }`}
                  >
                    Ticket Alto (R$49+)
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTypeFilter(prev => prev === "resale" ? "all" : "resale")}
                    className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      typeFilter === "resale" ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "text-neutral-500 border-transparent hover:text-neutral-300"
                    }`}
                  >
                    Revenda
                  </button>
                  <button
                    onClick={() => setTypeFilter(prev => prev === "internal_use" ? "all" : "internal_use")}
                    className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      typeFilter === "internal_use" ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "text-neutral-500 border-transparent hover:text-neutral-300"
                    }`}
                  >
                    Bancada
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product Cards List */}
          {!showAddForm && (
            <div className="space-y-3.5">
              <AnimatePresence initial={false}>
                {filteredProducts.map((product, idx) => {
                  const qty = Number(product.quantity || 0);
                  const min = Number(product.minQuantity || 5);
                  const isLow = qty <= min;
                  const price = Number(product.price || 0);
                  const costPrice = Number(product.costPrice || 0);
                  const unitProfit = Math.max(0, price - costPrice);
                  const marginPct = price > 0 ? ((unitProfit / price) * 100).toFixed(0) : "0";
                  const isResale = (product.itemType || "resale") === "resale";

                  return (
                    <motion.div
                      layout
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -10 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                      className={`liquid-glass p-5 rounded-[2.2rem] border transition-all relative overflow-hidden group text-left ${
                        isLow ? 'border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-500/5' : 'border-white/5 hover:border-amber-500/30 shadow-xl'
                      }`}
                    >
                      {/* Top Header Card */}
                      <div className="flex gap-3.5 items-start pb-3.5 border-b border-white/5">
                        {/* Icon */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isLow 
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' 
                            : isResale 
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                        }`}>
                          {isResale ? <Package className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
                        </div>

                        {/* Title and details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isLow ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-white/10 text-neutral-300"
                            }`}>
                              {isLow ? "⚠️ Reposição Urgente" : "Em Estoque"}
                            </span>

                            <span className="text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400">
                              {product.category || "Geral"}
                            </span>

                            {product.sku && (
                              <span className="text-[8px] font-mono text-neutral-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                SKU: {product.sku}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-black text-white uppercase italic tracking-tight truncate leading-tight mt-1">
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="text-[10px] text-neutral-400 line-clamp-1 font-medium">
                              {product.description}
                            </p>
                          )}

                          {/* Financial tags row */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[9.5px]">
                            <span className="text-emerald-400 font-black">
                              Venda: R$ {price.toFixed(2).replace(".", ",")}
                            </span>
                            {costPrice > 0 && (
                              <>
                                <span className="text-neutral-500">•</span>
                                <span className="text-neutral-400 font-medium">
                                  Custo: R$ {costPrice.toFixed(2).replace(".", ",")}
                                </span>
                                <span className="text-neutral-500">•</span>
                                <span className="text-amber-400 font-bold">
                                  Lucro: R$ {unitProfit.toFixed(2).replace(".", ",")} ({marginPct}%)
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button 
                            onClick={() => handleEdit(product)}
                            className="p-2 liquid-glass hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Editar Dados do Produto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={actionInProgress === product.id + "-delete"}
                            className="p-2 liquid-glass hover:bg-rose-500/20 hover:text-rose-400 rounded-xl text-neutral-500 transition-all cursor-pointer shadow-sm"
                            title="Excluir do Estoque"
                          >
                            {actionInProgress === product.id + "-delete" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bottom row: Quantity badge, inline quick actions, and open movement modal */}
                      <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3">
                        {/* Supplier badge if available */}
                        <div className="flex items-center gap-1.5 text-[9px] text-neutral-400">
                          {product.supplier ? (
                            <span className="flex items-center gap-1 text-neutral-400 truncate max-w-[140px]">
                              <Truck className="w-3 h-3 text-amber-500 shrink-0" />
                              {product.supplier}
                            </span>
                          ) : (
                            <span className="text-neutral-500">Mín: {min} un.</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          {/* Dedicated full movement button */}
                          <button
                            onClick={() => {
                              triggerLightHaptic();
                              setMovementModalProduct(product);
                              setMovementQuantity(1);
                              setMovementReason("");
                              setMovementUnitCost(costPrice);
                            }}
                            className="py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                            title="Lançar Entrada, Baixa de Bancada ou Avaria"
                          >
                            <History className="w-3 h-3" />
                            Movimentar
                          </button>

                          {/* Quick Inline Increment/Decrement */}
                          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/5">
                            <button
                              onClick={() => handleInlineQuickAdjustment(product, -1)}
                              disabled={qty <= 0 || actionInProgress === product.id + "-quick"}
                              className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-neutral-400 hover:text-rose-400 disabled:opacity-20 cursor-pointer transition-all active:scale-95"
                              title="Baixa rápida (-1)"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <div className="px-2.5 text-center min-w-[2.5rem]">
                              <span className={`text-xs font-black ${isLow ? 'text-rose-400' : 'text-white'}`}>
                                {qty}
                              </span>
                              <span className="text-[6px] block font-black uppercase tracking-widest text-neutral-500 leading-none">
                                UN
                              </span>
                            </div>

                            <button
                              onClick={() => handleInlineQuickAdjustment(product, 1)}
                              disabled={actionInProgress === product.id + "-quick"}
                              className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-neutral-400 hover:text-emerald-400 disabled:opacity-20 cursor-pointer transition-all active:scale-95"
                              title="Entrada rápida (+1)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredProducts.length === 0 && (
                <div className="liquid-glass py-16 text-center space-y-4 rounded-[2.5rem] border border-white/5">
                  <Archive className="w-12 h-12 text-neutral-700 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-wider">Nenhum Produto Localizado</h3>
                    <p className="text-neutral-500 text-[10px] max-w-xs mx-auto">
                      Não encontramos mercadorias com a busca ou filtros selecionados.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStockFilter("all");
                      setCategoryFilter("all");
                      setTypeFilter("all");
                    }}
                    className="px-4 py-2 liquid-glass hover:bg-white/10 rounded-xl text-neutral-300 text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    Limpar Filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FINANCIAL INTELLIGENCE & PROFITABILITY */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-neutral-900 to-black border border-amber-500/20 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-500">
                  DRE & Margem de Estoque
                </span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                  Inteligência Financeira
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <DollarSign className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">
                  Capital em Prateleira (Custo)
                </span>
                <span className="text-lg font-black text-white">
                  R$ {metrics.totalEstimatedCostValue.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-[8px] text-neutral-500 block">Valor pago a fornecedores</span>
              </div>

              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">
                  Faturamento Previsto (Venda)
                </span>
                <span className="text-lg font-black text-amber-400">
                  R$ {metrics.totalEstimatedSaleValue.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-[8px] text-neutral-500 block">Valor bruto no balcão</span>
              </div>

              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">
                  Lucro Líquido Projetado
                </span>
                <span className="text-lg font-black text-emerald-400">
                  R$ {metrics.projectedProfit.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-[8px] text-emerald-500 block">Retorno após zerar estoque</span>
              </div>

              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[7.5px] font-black uppercase tracking-widest text-neutral-400 block">
                  Margem Bruta Média
                </span>
                <span className="text-lg font-black text-amber-400">
                  {metrics.averageMargin.toFixed(1)}%
                </span>
                <span className="text-[8px] text-neutral-500 block">Markup médio saudável</span>
              </div>
            </div>
          </div>

          {/* Ranking of Most Profitable Items */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase italic tracking-wider text-neutral-300 ml-1">
              Top Produtos Mais Rentáveis (Maior Margem de Lucro)
            </h4>

            <div className="space-y-2.5">
              {[...products]
                .sort((a, b) => {
                  const profitA = (Number(a.price || 0) - Number(a.costPrice || 0));
                  const profitB = (Number(b.price || 0) - Number(b.costPrice || 0));
                  return profitB - profitA;
                })
                .slice(0, 10)
                .map((prod, idx) => {
                  const saleP = Number(prod.price || 0);
                  const costP = Number(prod.costPrice || 0);
                  const profit = Math.max(0, saleP - costP);
                  const margin = saleP > 0 ? ((profit / saleP) * 100).toFixed(0) : 0;
                  const totalProfitInStock = profit * Number(prod.quantity || 0);

                  return (
                    <div 
                      key={prod.id} 
                      className="liquid-glass p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-white uppercase italic truncate max-w-[180px] sm:max-w-md">
                            {prod.name}
                          </h5>
                          <span className="text-[9px] text-neutral-400 font-medium">
                            Custo: R$ {costP.toFixed(2).replace(".", ",")} • Venda: R$ {saleP.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-400 block">
                          +R$ {profit.toFixed(2).replace(".", ",")} / un ({margin}%)
                        </span>
                        <span className="text-[8.5px] text-neutral-500 font-medium">
                          R$ {totalProfitInStock.toFixed(2).replace(".", ",")} no estoque atual
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REORDER & WHATSAPP PURCHASE ORDER GENERATOR */}
      {activeTab === "reorder" && (
        <div className="space-y-6">
          {/* Header notice */}
          <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-neutral-900 to-black border border-amber-500/20 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-500 block">
                  Automação de Suprimentos
                </span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                  Reposição & Pedidos para Fornecedor
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Truck className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              O sistema detecta automaticamente produtos abaixo do estoque mínimo de segurança e formata um pedido profissional pronto para ser enviado via WhatsApp ao distribuidor.
            </p>
          </div>

          {/* Supplier selector filter */}
          {suppliers.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-500 shrink-0">
                Filtrar Fornecedor:
              </span>
              <button
                onClick={() => setOrderSupplierFilter("all")}
                className={`text-[8.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border shrink-0 transition-all cursor-pointer ${
                  orderSupplierFilter === "all"
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-black/30 text-neutral-400 border-white/5"
                }`}
              >
                Todos ({criticalProductsForOrder.length})
              </button>
              {suppliers.map(sup => (
                <button
                  key={sup}
                  onClick={() => setOrderSupplierFilter(sup)}
                  className={`text-[8.5px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border shrink-0 transition-all cursor-pointer ${
                    orderSupplierFilter === sup
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-black/30 text-neutral-400 border-white/5"
                  }`}
                >
                  {sup}
                </button>
              ))}
            </div>
          )}

          {/* Critical Items Checklist for order */}
          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                Itens Necessários para Reposição ({criticalProductsForOrder.length})
              </h4>
              <span className="text-[8px] text-neutral-400">Ajuste as quantidades conforme desejado</span>
            </div>

            {criticalProductsForOrder.length === 0 ? (
              <div className="liquid-glass p-8 rounded-3xl border border-white/5 text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h5 className="text-xs font-black uppercase text-white tracking-wider">Estoque em Nível Seguro!</h5>
                <p className="text-[9.5px] text-neutral-400">
                  Nenhum produto está atualmente no limite crítico ou abaixo do estoque mínimo.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {criticalProductsForOrder.map(product => {
                  const qty = Number(product.quantity || 0);
                  const min = Number(product.minQuantity || 5);
                  const ideal = Number(product.idealQuantity || (min * 2));
                  const requested = customOrderItems[product.id] !== undefined 
                    ? customOrderItems[product.id] 
                    : Math.max(1, ideal - qty);

                  return (
                    <div 
                      key={product.id}
                      className="liquid-glass p-4 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[7px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                            Estoque Atual: {qty} un
                          </span>
                          <span className="text-[8px] text-neutral-400">
                            (Mínimo: {min} | Meta: {ideal})
                          </span>
                        </div>
                        <h5 className="text-xs font-black text-white uppercase italic">
                          {product.name}
                        </h5>
                        {product.supplier && (
                          <span className="text-[9px] text-neutral-500 block">
                            Fornecedor: {product.supplier} {product.supplierPhone ? `(${product.supplierPhone})` : ''}
                          </span>
                        )}
                      </div>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase">Qtd a Pedir:</span>
                        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              setCustomOrderItems(prev => ({
                                ...prev,
                                [product.id]: Math.max(0, requested - 1)
                              }));
                            }}
                            className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="w-8 text-center text-xs font-black text-amber-400">
                            {requested}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              triggerLightHaptic();
                              setCustomOrderItems(prev => ({
                                ...prev,
                                [product.id]: requested + 1
                              }));
                            }}
                            className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes for supplier */}
          <div className="space-y-1.5 text-left">
            <label className="text-[8.5px] font-black uppercase tracking-wider text-neutral-400 ml-1 block">
              Observações Adicionais para a Mensagem (Opcional)
            </label>
            <input
              type="text"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Ex: Entregar até sexta-feira pela manhã; enviar boleto para 30 dias..."
              className="w-full liquid-glass rounded-2xl p-3.5 text-xs text-white placeholder-neutral-600 border border-white/5 focus:border-amber-500 focus:outline-none transition-all font-medium"
            />
          </div>

          {/* WhatsApp Message Preview Box */}
          <div className="p-5 rounded-3xl bg-black/60 border border-emerald-500/20 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Prévia do Pedido WhatsApp
              </span>
              <span className="text-[8px] text-neutral-500 font-mono">
                {generatedWhatsAppOrder.totalUnits} itens solicitados
              </span>
            </div>

            <pre className="text-[10px] text-neutral-300 font-mono bg-neutral-950 p-4 rounded-2xl whitespace-pre-wrap leading-relaxed border border-white/5 max-h-60 overflow-y-auto">
              {generatedWhatsAppOrder.message}
            </pre>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyOrderMessage}
                className="py-3.5 px-4 liquid-glass hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Copy className="w-4 h-4 text-amber-400" />
                Copiar Mensagem
              </button>

              <button
                type="button"
                onClick={handleSendOrderWhatsApp}
                className="py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Abrir no WhatsApp Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MOVEMENT HISTORY AUDIT LOG */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <h4 className="text-sm font-black uppercase italic tracking-wider text-white">
                Auditoria de Movimentações
              </h4>
              <p className="text-[9.5px] text-neutral-400 font-medium">
                Rastreabilidade de entradas, vendas, baixas de bancada e avarias
              </p>
            </div>

            {/* Log filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {[
                { id: "all", label: "Todas" },
                { id: "entry", label: "Entradas" },
                { id: "sale", label: "Vendas" },
                { id: "consumption", label: "Bancada" },
                { id: "loss", label: "Avarias" },
                { id: "adjustment", label: "Ajustes" }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { triggerLightHaptic(); setLogTypeFilter(f.id); }}
                  className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    logTypeFilter === f.id
                      ? "bg-amber-500 text-black border-amber-500"
                      : "bg-black/40 text-neutral-400 border-white/5 hover:border-white/10"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {logsLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
            </div>
          ) : logs.filter(l => logTypeFilter === "all" || l.type === logTypeFilter).length === 0 ? (
            <div className="liquid-glass py-16 text-center space-y-3 rounded-[2.5rem] border border-white/5">
              <History className="w-10 h-10 text-neutral-700 mx-auto" />
              <h5 className="text-xs font-black uppercase text-white tracking-wider">Nenhuma Movimentação Registrada</h5>
              <p className="text-[9.5px] text-neutral-500 max-w-xs mx-auto">
                As entradas, vendas no checkout e consumos de bancada aparecerão aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs
                .filter(l => logTypeFilter === "all" || l.type === logTypeFilter)
                .map((log) => {
                  const isPositive = Number(log.quantityChanged || 0) > 0;
                  const qtyText = isPositive ? `+${log.quantityChanged}` : `${log.quantityChanged}`;

                  let badgeColor = "bg-neutral-800 text-neutral-300";
                  let IconComponent = History;

                  if (log.type === "entry") {
                    badgeColor = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                    IconComponent = ArrowUpRight;
                  } else if (log.type === "sale") {
                    badgeColor = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
                    IconComponent = ShoppingBag;
                  } else if (log.type === "consumption") {
                    badgeColor = "bg-purple-500/20 text-purple-300 border border-purple-500/30";
                    IconComponent = Scissors;
                  } else if (log.type === "loss") {
                    badgeColor = "bg-rose-500/20 text-rose-300 border border-rose-500/30";
                    IconComponent = AlertTriangle;
                  } else if (log.type === "adjustment") {
                    badgeColor = "bg-blue-500/20 text-blue-300 border border-blue-500/30";
                    IconComponent = SlidersHorizontal;
                  }

                  let dateStr = "";
                  try {
                    const d = log.createdAt?.toDate ? log.createdAt.toDate() : (log.createdAt ? new Date(log.createdAt) : new Date());
                    dateStr = format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                  } catch {
                    dateStr = "Recente";
                  }

                  return (
                    <div 
                      key={log.id}
                      className="liquid-glass p-3.5 sm:p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badgeColor}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 text-neutral-400">
                              {log.type === "entry" ? "Entrada" : log.type === "sale" ? "Venda Caixa" : log.type === "consumption" ? "Uso Bancada" : log.type === "loss" ? "Avaria/Perda" : "Ajuste"}
                            </span>
                            <span className="text-[8px] text-neutral-500 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {dateStr}
                            </span>
                          </div>

                          <h5 className="text-xs font-black text-white uppercase italic truncate max-w-[170px] sm:max-w-md">
                            {log.productName}
                          </h5>

                          <p className="text-[9px] text-neutral-400 font-medium line-clamp-1">
                            {log.reason} • Por: <strong className="text-neutral-300">{log.performedBy || "Gestor"}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {qtyText} un
                        </span>
                        {log.newQuantity !== undefined && (
                          <span className="text-[7.5px] block font-mono text-neutral-500">
                            Saldo: {log.newQuantity} un
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* DEDICATED STOCK MOVEMENT MODAL */}
      <AnimatePresence>
        {movementModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md p-6 sm:p-7 liquid-glass rounded-[2.5rem] border border-amber-500/30 shadow-2xl text-left space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">
                    Lançamento de Estoque
                  </span>
                  <h3 className="text-base font-black text-white uppercase italic tracking-tight truncate max-w-[260px]">
                    {movementModalProduct.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMovementModalProduct(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current balance indicator */}
              <div className="p-3 bg-black/50 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase text-[9px] tracking-wider">
                  Estoque Atual:
                </span>
                <span className="text-white font-black">
                  {movementModalProduct.quantity || 0} unidades
                </span>
              </div>

              <form onSubmit={handleExecuteMovement} className="space-y-4">
                {/* Movement Type Select */}
                <div className="space-y-1.5">
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-neutral-400 block">
                    Tipo de Operação *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovementType("entry")}
                      className={`py-2.5 px-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        movementType === "entry" 
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                          : "bg-black/30 text-neutral-400 border-white/5"
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Entrada / Compra
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType("consumption")}
                      className={`py-2.5 px-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        movementType === "consumption" 
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                          : "bg-black/30 text-neutral-400 border-white/5"
                      }`}
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      Uso na Bancada
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType("loss")}
                      className={`py-2.5 px-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        movementType === "loss" 
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40" 
                          : "bg-black/30 text-neutral-400 border-white/5"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Avaria / Perda
                    </button>

                    <button
                      type="button"
                      onClick={() => setMovementType("adjustment")}
                      className={`py-2.5 px-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        movementType === "adjustment" 
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/40" 
                          : "bg-black/30 text-neutral-400 border-white/5"
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Balanço Físico
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="space-y-1.5">
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-neutral-400 block">
                    {movementType === "adjustment" ? "Nova Quantidade Contada *" : "Quantidade a Movimentar *"}
                  </label>
                  <input
                    type="number"
                    value={movementQuantity}
                    onChange={(e) => setMovementQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    min="1"
                    className="w-full bg-black/60 border border-white/10 rounded-2xl p-3.5 text-center text-sm font-black text-white focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                {/* If Entry: Optional Unit Cost update */}
                {movementType === "entry" && (
                  <div className="space-y-1.5">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-neutral-400 block">
                      Custo Unitário Desta Compra (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={movementUnitCost}
                      onChange={(e) => setMovementUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-black/60 border border-white/10 rounded-2xl p-3 text-xs text-white text-center font-bold"
                    />
                  </div>
                )}

                {/* Justification Reason */}
                <div className="space-y-1.5">
                  <label className="text-[8.5px] font-black uppercase tracking-wider text-neutral-400 block">
                    Motivo / Observação
                  </label>
                  <input
                    type="text"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder={`Ex: ${getDefaultMovementReason(movementType)}`}
                    className="w-full bg-black/60 border border-white/10 rounded-2xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none font-medium"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setMovementModalProduct(null)}
                    className="flex-1 py-3.5 liquid-glass hover:bg-white/10 text-neutral-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === movementModalProduct.id + "-movement"}
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {actionInProgress === movementModalProduct.id + "-movement" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Confirmar Lançamento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BARCODE / SKU CAMERA SCANNER MODAL */}
      <AnimatePresence>
        {showScannerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md p-6 liquid-glass rounded-[2.5rem] border border-amber-500/30 shadow-2xl text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-black text-white uppercase italic tracking-wider">
                    Leitor de Código de Barras / SKU
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setShowScannerModal(false);
                  }}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Camera Container */}
              <div className="relative w-full h-48 bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`} 
                />
                
                {cameraActive && (
                  <div className="absolute inset-0 border-2 border-amber-500/50 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-0.5 bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]" />
                  </div>
                )}

                {!cameraActive && (
                  <div className="text-center space-y-2 p-4">
                    <Camera className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-[10px] text-neutral-400">
                      Aponte a câmera para o código de barras ou digite o SKU abaixo.
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Ativar Câmera
                    </button>
                  </div>
                )}
              </div>

              {/* Manual SKU input search */}
              <div className="space-y-2">
                <label className="text-[8.5px] font-black uppercase tracking-wider text-neutral-400 block">
                  Ou digite o Código / SKU manualmente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannerQuery}
                    onChange={(e) => setScannerQuery(e.target.value)}
                    placeholder="Ex: MS-123456 ou 789123456"
                    className="flex-1 bg-black/60 border border-white/10 rounded-2xl p-3 text-xs text-white font-mono uppercase focus:border-amber-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && scannerQuery.trim()) {
                        handleBarcodeDetected(scannerQuery.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (scannerQuery.trim()) {
                        handleBarcodeDetected(scannerQuery.trim());
                      }
                    }}
                    className="px-4 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider rounded-2xl cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
