
export interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export async function uploadImage(file: File): Promise<ImgBBResponse> {
  // Detector de chave ultra-agressivo
  const apiKey = (import.meta as any).env?.VITE_IMGBB_API_KEY || 
                 (typeof process !== 'undefined' ? process.env?.VITE_IMGBB_API_KEY : null) ||
                 (typeof window !== 'undefined' ? (window as any).VITE_IMGBB_API_KEY : null);

  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "") {
    console.error("[Upload] VITE_IMGBB_API_KEY não encontrada.");
    throw new Error("Chave VITE_IMGBB_API_KEY não encontrada no App. Por favor, recarregue a página (F5). Se o erro persistir, verifique se salvou a chave exatamente como VITE_IMGBB_API_KEY.");
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[ImgBB Error]", errorData);
      throw new Error(errorData.error?.message || `Erro no ImgBB (${response.status})`);
    }

    return response.json();
  } catch (err: any) {
    if (err.message.includes("Failed to fetch")) {
      throw new Error("Erro de conexão ao ImgBB. Verifique se sua chave de API é válida e se há internet.");
    }
    throw err;
  }
}
