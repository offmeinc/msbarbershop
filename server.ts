import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { initVapid, startAppointmentsListener, sendPushNotification, sendNotificationToCollaborators } from "./src/server/pushNotificationService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Support standard JSON body parsing for API routes
  app.use(express.json());
  
  // Initialize Push notifications (generation and registration of VAPID)
  const vapid = initVapid();
  startAppointmentsListener();
  
  const upload = multer({ storage: multer.memoryStorage() });

  // API Route for Push Config (Retrieve VAPID PublicKey)
  app.get("/api/push-config", (req, res) => {
    res.json({ publicKey: vapid.publicKey });
  });

  // API Route for simulating delayed push notifications (perfect for background testing)
  app.post("/api/push-test", async (req, res) => {
    const { userId, isCollaborator, delayMs = 5000, title, body } = req.body;
    res.json({ success: true, message: `Push test scheduled to run in ${delayMs / 1000} seconds.` });

    setTimeout(async () => {
      try {
        const payload = {
          title: title || "Teste em 2º Plano! 💈",
          body: body || "Esta é uma notificação simulando o app em segundo plano após 5 segundos.",
          url: "/"
        };

        if (isCollaborator) {
          await sendNotificationToCollaborators(payload);
        } else if (userId) {
          await sendPushNotification(userId, payload);
        }
      } catch (err: any) {
        console.error("[Push Test Route] Error delivering delayed push:", err.message);
      }
    }, delayMs);
  });

  // API Route for ImgBB Upload
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      const apiKey = process.env.IMGBB_API_KEY;
      if (!apiKey) {
        throw new Error("IMGBB_API_KEY is not configured");
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      const formData = new FormData();
      formData.append("image", req.file.buffer.toString("base64"));

      const response = await axios.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Upload error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
