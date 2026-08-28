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
async function compressImageToDataUrl(file: File, maxWidth = 800, maxHeight = 800, quality = 0.8, addWatermark = false): Promise<string> {
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

        if (addWatermark) {
          ctx.save();
          const text = "MS BARBERSHOP";
          const fontSize = Math.max(16, Math.floor(width * 0.05));
          ctx.font = `900 italic ${fontSize}px sans-serif`;
          
          const padding = width * 0.04;
          const x = padding;
          const y = height - padding;

          // Shadow/Stroke for visibility on any background
          ctx.lineWidth = Math.max(2, fontSize * 0.15);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.strokeText(text, x, y);
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.fillText(text, x, y);
          
          // Add a small subtile watermark "APP" or similar
          const subText = "AGENDAMENTO OFICIAL";
          const subFontSize = fontSize * 0.4;
          ctx.font = `800 ${subFontSize}px sans-serif`;
          ctx.lineWidth = Math.max(1, subFontSize * 0.15);
          const subY = y + subFontSize + 4;
          
          ctx.strokeText(subText, x, subY);
          ctx.fillStyle = "rgba(245, 158, 11, 0.95)"; // amber-500
          ctx.fillText(subText, x, subY);
          
          ctx.restore();
        }

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

export async function uploadImage(file: File, addWatermark = false): Promise<ImgBBResponse> {
  const apiKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_IMGBB_API_KEY) || "";

  // Always compress locally first (with optional watermark)
  let compressedDataUrl = "";
  try {
    compressedDataUrl = await compressImageToDataUrl(file, 800, 800, 0.8, addWatermark);
  } catch (err: any) {
    console.error("Local image compression error:", err);
    throw new Error(err.message || "Falha ao processar imagem.");
  }

  // If ImgBB key is provided, attempt external upload
  if (apiKey && apiKey.trim().length > 5) {
    try {
      const formData = new FormData();
      const base64Data = compressedDataUrl.split(',')[1];
      if (base64Data) {
        formData.append("image", base64Data);
      } else {
        formData.append("image", file);
      }

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

  // Resilient fallback: Return standard data URL
  return {
    success: true,
    status: 200,
    data: {
      url: compressedDataUrl,
      display_url: compressedDataUrl,
    },
  };
}

