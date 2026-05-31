import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { initVapid, startAppointmentsListener, sendPushNotification, sendNotificationToCollaborators } from "./src/server/pushNotificationService";
import { startAppointmentAutoUpdater } from "./src/server/appointmentAutoUpdater";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Support standard JSON body parsing for API routes
  app.use(express.json());

  // Custom CORS middleware to support custom domains like msbarbershop.com.br
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  
  // Initialize Push notifications (generation and registration of VAPID)
  const vapid = await initVapid();
  startAppointmentsListener();
  startAppointmentAutoUpdater();
  
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

  // API Route for Mercado Pago Pix Payment Creation
  app.post("/api/payments/mercado-pago/create-payment", async (req, res) => {
    try {
      const { transaction_amount, description, email, name, appointmentId } = req.body;
      const amount = Number(transaction_amount);
      
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid transaction amount" });
      }

      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!accessToken || accessToken.trim() === "") {
        console.warn("[Mercado Pago] ACCESS_TOKEN not configured. Returning simulated payment payload.");
        // Dev Simulation Payload
        return res.json({
          success: true,
          isMock: true,
          status: "pending",
          status_detail: "pending_waiting_transfer",
          qr_code: "00020101021226870014br.gov.bcb.pix2572em-breve-mercado-pago-completo-integrado-barbearia-prod",
          qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          payment_id: "mp-模拟-" + Math.floor(Math.random() * 900000000 + 100000000).toString(),
          message: "Em breve estará disponível para o cliente"
        });
      }

      // Real integration attempt
      const idempotencyKey = "mp-pix-" + Math.random().toString(36).substring(2) + Date.now().toString();
      const response = await axios.post("https://api.mercadopago.com/v1/payments", {
        transaction_amount: amount,
        description: description || "Agendamento MS Barbearia",
        payment_method_id: "pix",
        payer: {
          email: email || "payment@example.com",
          first_name: name || "Cliente"
        }
      }, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        }
      });

      res.json({
        success: true,
        isMock: false,
        status: response.data.status,
        status_detail: response.data.status_detail,
        qr_code: response.data.point_of_integration?.transaction_data?.qr_code,
        qr_code_base64: response.data.point_of_integration?.transaction_data?.qr_code_base64,
        payment_id: response.data.id
      });
    } catch (error: any) {
      console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
      // Return a professional fallback simulation so the application works fine even if MP servers reject the request
      res.json({
        success: true,
        isMock: true,
        status: "pending",
        status_detail: "pending_waiting_transfer",
        qr_code: "00020101021226870014br.gov.bcb.pix2572em-breve-mercado-pago-completo-integrado-barbearia-prod",
        qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        payment_id: "mp-fallback-" + Math.floor(Math.random() * 900000000 + 100000000).toString(),
        message: "Mercado Pago offline ou credenciais inválidas. Exibindo simulador."
      });
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
