
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
  // Tenta obter a chave de múltiplas formas comuns no Vite
  const apiKey = (import.meta as any).env.VITE_IMGBB_API_KEY || 
                 (import.meta as any).env?.VITE_IMGBB_API_KEY;

  if (!apiKey || apiKey === "undefined") {
    console.error("[Upload] VITE_IMGBB_API_KEY is missing. Environment:", (import.meta as any).env);
    throw new Error("Configuração ausente: VITE_IMGBB_API_KEY não foi encontrada no cliente. Verifique se a variável de ambiente está definida e se inicia com 'VITE_'.");
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
