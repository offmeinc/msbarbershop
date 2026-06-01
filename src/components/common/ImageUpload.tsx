import React, { useState, useRef } from "react";
import { Camera, Loader2, X, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  label?: string;
  className?: string;
  folder?: string;
}

export function ImageUpload({ onUpload, currentUrl, label = "Upload de Imagem", className = "", folder = "msbarbershop" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         const text = await response.text();
         throw new Error(`Upload falhou: Resposta inválida do servidor (${response.status}). ${text.substring(0, 50)}`);
      }

      const result = await response.json();
      if (result.success && result.data.url) {
        onUpload(result.data.url);
        setPreview(result.data.url);
      } else {
        throw new Error(result.error || "Erro no upload");
      }
    } catch (error) {
      console.error("[ImageUpload] Error:", error);
      alert("Falha no upload da imagem. Tente novamente.");
      setPreview(currentUrl); // Reset to current if failed
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview("");
    onUpload("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">{label}</label>}
      
      <div 
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative group cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-300 ${
          preview 
            ? "border-transparent aspect-square rounded-[2rem]" 
            : "border-white/10 hover:border-amber-500/50 bg-neutral-900/50 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-3"
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <button 
                onClick={removeImage}
                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="contents"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-black text-white uppercase tracking-widest">Clique para subir foto</p>
                <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">PNG, JPG até 10MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {uploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest animate-pulse">Enviando para Nuvem...</p>
          </div>
        )}
      </div>
    </div>
  );
}
