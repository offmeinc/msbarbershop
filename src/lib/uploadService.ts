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
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
       throw new Error(data.error || data.message || "Falha no upload para o servidor");
    }

    return data;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error.message || "Falha ao enviar imagem. Verifique se o servidor está online e a chave configurada.");
  }
}
