
export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    public_id: string;
  };
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro no upload (${response.status})`);
    }

    return response.json();
  } catch (err: any) {
    console.error("[UploadService] Error:", err.message);
    throw err;
  }
}
