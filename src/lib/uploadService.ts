
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

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(`Upload fail: ${response.status} - ${text.substring(0, 50)}`);
    }

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
