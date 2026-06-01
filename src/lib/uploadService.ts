
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
  // Detector de chave direta do Vite
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    console.error("[Upload] VITE_IMGBB_API_KEY não encontrada no import.meta.env");
    throw new Error("A chave VITE_IMGBB_API_KEY não foi detectada. Verifique se ela está salva nas configurações do projeto com o prefixo VITE_ e recarregue a página.");
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
