export interface ImgBBResponse {
  data: {
    url: string;
    display_url: string;
    [key: string]: any;
  };
  success: boolean;
  status: number;
}

export async function uploadImage(file: File): Promise<ImgBBResponse> {
  try {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

    if (!apiKey) {
      throw new Error("A chave do ImgBB não foi configurada. No menu superior direito (ícone de engrenagem), vá em Settings, clique em API Keys e adicione VITE_IMGBB_API_KEY com a chave do api.imgbb.com");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
       throw new Error(data.error?.message || data.message || "Falha no upload para o servidor");
    }

    return data;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error.message || "Falha ao enviar imagem. Verifique se o servidor está online e a chave configurada.");
  }
}
