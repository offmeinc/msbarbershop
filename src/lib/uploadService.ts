export interface ImgBBResponse {
  data: {
    url: string;
    display_url: string;
    [key: string]: any;
  };
  success: boolean;
  status: number;
}

// Compress image to a lightweight Base64 / Data URL to ensure 100% reliable local uploads
async function compressImageToDataUrl(file: File, maxWidth = 600, maxHeight = 600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<ImgBBResponse> {
  const apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_IMGBB_API_KEY) || "";

  // If ImgBB key is provided, attempt external upload first
  if (apiKey && apiKey.trim().length > 5) {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.url) {
        return data;
      }
      console.warn("ImgBB upload returned non-success, falling back to embedded compressed image:", data);
    } catch (error) {
      console.warn("ImgBB upload failed, falling back to embedded compressed image:", error);
    }
  }

  // Resilient fallback: Compress and produce standard data URL
  try {
    const compressedDataUrl = await compressImageToDataUrl(file);
    return {
      success: true,
      status: 200,
      data: {
        url: compressedDataUrl,
        display_url: compressedDataUrl,
      },
    };
  } catch (fallbackError: any) {
    console.error("Local image compression error:", fallbackError);
    throw new Error(fallbackError.message || "Falha ao processar imagem.");
  }
}

