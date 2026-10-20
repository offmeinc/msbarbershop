import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import axios from "axios";
import FormData from "form-data";
import { GoogleGenAI, Type } from "@google/genai";
import { initVapid, startAppointmentsListener, startChatsListener, notifyUserAccess, sendPushNotification, sendNotificationToCollaborators } from "./src/server/pushNotificationService";
import { startAppointmentAutoUpdater } from "./src/server/appointmentAutoUpdater";
import { adminMessaging, adminDb } from "./src/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { generatePixString } from "./src/lib/pix";

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Error] Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  const app = express();
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArgs = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
  const PORT = portFromArgs || 3000;
  
  // Support standard JSON body parsing for API routes
  app.use(express.json());

  // Logging for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });
  
  // Standard CORS middleware
  app.use(cors({
    origin: function (origin, callback) {
      // Allow all origins
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  
  const upload = multer({ storage: multer.memoryStorage() });

  // Assistant Chat API Route
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    try {
        const ai = getGeminiClient();
        const chat = ai.chats.create({
            model: "gemini-3.5-flash",
            config: {
                systemInstruction: "Você é o assistente virtual da MS Barbearia. Ajude os clientes com dúvidas sobre agendamentos, serviços e carteira digital. Seja amigável e direto.",
            },
        });
        
        const lastMessage = messages[messages.length - 1].text;
        const response = await chat.sendMessage({ message: lastMessage });
        res.json({ reply: response.text });
    } catch (error) {
        console.error("[Chat API Error]:", error);
        res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // Client User Access Webhook
  app.post("/api/user-access", async (req, res) => {
    const { userId, userName, role } = req.body;
    try {
      await notifyUserAccess(userId, userName, role);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[User Access API Error]:", error.message);
      res.status(500).json({ error: "Failed to record access log" });
    }
  });

  // Gemini Weekly Report Generation API Route
  app.post("/api/gemini/week-report", async (req, res) => {
    const { professionalName, appointments } = req.body;
    try {
      const summaryAppointments = (appointments || []).map((app: any) => ({
        date: app.date,
        time: app.time,
        clientName: app.clientName,
        serviceName: app.serviceName,
        totalPrice: app.totalPrice || app.price,
        status: app.status,
        paymentStatus: app.paymentStatus
      }));

      const prompt = `Analise a agenda semanal do profissional ${professionalName || "Profissional"} na MS Barbearia.
Aqui estão os agendamentos registrados: ${JSON.stringify(summaryAppointments)}
Gere um relatório de desempenho em português (pt-BR).`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ report: response.text });
    } catch (error: any) {
      console.error("[Gemini Report Error]:", error.message);
      res.status(500).json({ error: "Erro ao gerar relatório" });
    }
  });

  // Natural Language & Voice Scheduling Parsing Interface
  app.post("/api/voice-booking", async (req, res) => {
    const { prompt, clientLocalDate, services, barbers } = req.body;
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Extrair agendamento: ${prompt}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              serviceId: { type: Type.STRING },
              barberId: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["explanation"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
      res.status(500).json({ error: "Erro voz" });
    }
  });

  // GET Polling endpoint to check status of a given payment
  app.get("/api/payments/mercado-pago/status/:paymentId", async (req, res) => {
    try {
      const { paymentId } = req.params;
      if (String(paymentId).startsWith("recharge-") || String(paymentId).startsWith("pix-")) {
        return res.json({ status: "pending" });
      }
      try {
        const paymentRef = adminDb.collection("payments").doc(String(paymentId));
        const paymentSnap = await paymentRef.get();

        if (!paymentSnap.exists) {
          try {
            await paymentRef.set({
              id: paymentId,
              status: "pending",
              isDirectPix: true,
              createdAt: FieldValue.serverTimestamp()
            }, { merge: true });
          } catch (err) {}
          return res.json({ status: "pending" });
        }

        const paymentData = paymentSnap.data() || {};
        if (paymentData.status === "approved" || paymentData.status === "completed") {
          return res.json({ status: "approved" });
        }

        const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
        const isPublicKey = /^APP_USR-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accessToken);
        if (!paymentData.isDirectPix && accessToken && !isPublicKey && accessToken.length > 50) {
          try {
            const mpResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { "Authorization": `Bearer ${accessToken}` },
              timeout: 5000
            });
            if (mpResponse.data?.status === "approved") {
              await paymentRef.update({ 
                status: "approved", 
                updatedAt: FieldValue.serverTimestamp() 
              });
              await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });
              return res.json({ status: "approved" });
            }
          } catch (e) {}
        }
        return res.json({ status: paymentData.status || "pending" });
      } catch (dbErr) {
        return res.json({ status: "pending" });
      }
    } catch (e: any) {
      return res.json({ status: "pending" });
    }
  });

  async function processApprovedPayment(paymentDoc: any) {
    const { appointmentId, amount, userId, id: paymentId } = paymentDoc;
    if (appointmentId && appointmentId.startsWith("wallet-topup-")) {
      const parsedUserId = userId || appointmentId.split("-")[2];
      if (parsedUserId) {
        try {
          const userRef = adminDb.collection("users").doc(parsedUserId);
          const paymentRef = adminDb.collection("payments").doc(String(paymentId));
          await adminDb.runTransaction(async (t) => {
            const pSnap = await t.get(paymentRef);
            if (!pSnap.exists || pSnap.data()?.processedWallet) return;
            const uSnap = await t.get(userRef);
            if (!uSnap.exists) return;
            const currentBalance = Number(uSnap.data()?.walletBalance || 0);
            t.update(userRef, { 
              walletBalance: currentBalance + amount, 
              updatedAt: FieldValue.serverTimestamp() 
            });
            t.update(paymentRef, { 
              processedWallet: true, 
              updatedAt: FieldValue.serverTimestamp() 
            });
          });
        } catch (e) {
          console.error("[Process Wallet Payment Error]:", e);
        }
      }
    } else if (appointmentId) {
      try {
        const appointmentRef = adminDb.collection("appointments").doc(String(appointmentId));
        const paymentRef = adminDb.collection("payments").doc(String(paymentId));
        await adminDb.runTransaction(async (t) => {
          const pSnap = await t.get(paymentRef);
          if (pSnap.data()?.processedAppointment) return;
          const appSnap = await t.get(appointmentRef);
          if (!appSnap.exists) return;
          t.update(appointmentRef, { 
            status: "confirmed", 
            paymentStatus: "paid", 
            updatedAt: FieldValue.serverTimestamp() 
          });
          t.update(paymentRef, { 
            processedAppointment: true, 
            updatedAt: FieldValue.serverTimestamp() 
          });
        });
      } catch (e) {
        console.error("[Process Appointment Payment Error]:", e);
      }
    }
  }

  // API Route for appointment cancellation with atomic refund
  app.post("/api/appointments/cancel", async (req, res) => {
    console.log("[API] /api/appointments/cancel called with body:", JSON.stringify(req.body));
    const { appointmentId, userId, reason } = req.body;
    if (!appointmentId || !userId) {
      console.warn("[API] Cancel missing data:", { appointmentId, userId });
      return res.status(400).json({ error: "Missing data" });
    }

    try {
      let refundedAmount = 0;
      let cancelledBy: "client" | "professional" = "client";

      console.log(`[API] Starting transaction for appointment: ${appointmentId}`);
      await adminDb.runTransaction(async (t) => {
        const appointmentRef = adminDb.collection("appointments").doc(String(appointmentId));
        const appSnap = await t.get(appointmentRef);
        
        if (!appSnap.exists) {
           console.warn(`[API] Appointment ${appointmentId} not found`);
           throw new Error("Agendamento não encontrado");
        }
        const appData = appSnap.data() || {};
        if (appData.status === "cancelled") {
           console.warn(`[API] Appointment ${appointmentId} already cancelled`);
           throw new Error("Agendamento já está cancelado");
        }

        // Determine who is cancelling
        if (appData.clientId !== userId) {
          cancelledBy = "professional";
        } else {
          cancelledBy = "client";
        }

        const updates: any = { 
          status: "cancelled", 
          cancelledBy, 
          updatedAt: FieldValue.serverTimestamp(),
          cancellationReason: reason || ""
        };

        if (appData.paymentStatus === "paid" && appData.totalPrice > 0 && appData.clientId && appData.clientId !== "guest") {
          const priceToRefund = Number(appData.totalPrice) || 0;
          console.log(`[API] Refunding R$ ${priceToRefund} to user: ${appData.clientId}`);
          const userRef = adminDb.collection("users").doc(String(appData.clientId));
          const userSnap = await t.get(userRef);
          
          if (userSnap.exists) {
            const currentBalance = Number(userSnap.data()?.walletBalance) || 0;
            t.update(userRef, { 
              walletBalance: currentBalance + priceToRefund, 
              updatedAt: FieldValue.serverTimestamp() 
            });
            updates.refundedToWallet = true;
            refundedAmount = priceToRefund;
          } else {
            console.warn(`[API] User ${appData.clientId} not found for refund`);
          }
        }

        console.log(`[API] Updating appointment ${appointmentId} status to cancelled`);
        t.update(appointmentRef, updates);
      });

      console.log(`[API] Cancel success for ${appointmentId}. Refunded: ${refundedAmount}`);
      res.json({ success: true, refundedAmount, cancelledBy });
    } catch (e: any) {
      console.error("[API Error] Cancel failed with exception:", e);
      res.status(500).json({ error: e.message || "Internal transaction error" });
    }
  });

  // API Route for permanent appointment deletion (Manager only)
  app.post("/api/appointments/delete", async (req, res) => {
    console.log("[API] Received request to delete appointment");
    const { appointmentId, userId } = req.body;
    if (!appointmentId || !userId) {
        console.log("[API] Missing data:", { appointmentId, userId });
        return res.status(400).json({ error: "Missing data" });
    }
    console.log(`[API] Deleting appointment: ${appointmentId} by user: ${userId}`);

    try {
      // Security check: only managers or barbers can purge records
      console.log(`[API] Checking permissions for user: ${userId}`);
      const userRef = adminDb.collection("users").doc(String(userId));
      const userSnap = await userRef.get();
      const userData = userSnap.data();
      
      if (!userData || (userData.role !== 'manager' && userData.role !== 'barber')) {
        console.log("[API] Permission denied for user:", userId);
        return res.status(403).json({ error: "Permissão negada. Apenas profissionais podem excluir registros." });
      }

      console.log("[API] Deleting appointment document: ", appointmentId);
      const appRef = adminDb.collection("appointments").doc(String(appointmentId));
      const appSnap = await appRef.get();
      if (!appSnap.exists) {
        console.log("[API] Document not found: ", appointmentId);
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      await appRef.delete();
      console.log("[API] Deletion successful for: ", appointmentId);
      res.json({ success: true });
    } catch (e: any) {
      console.error("[API Error] Delete failed (details):", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Ping endpoint to wake up Cloud Run background listeners
  app.post("/api/wake-up", (req, res) => {
    res.json({ ok: true, message: "Server is awake" });
  });

  // VAPID Public Key Endpoint
  app.get("/api/push/vapid-key", async (req, res) => {
    try {
      const keys = await initVapid();
      res.json({ publicKey: keys.publicKey });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to load VAPID key", details: err.message });
    }
  });

  // Save W3C Web Push subscription
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { userId, userRole, subscription } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: "Missing userId or subscription" });
      }
      const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
      await adminDb.collection("web_push_subscriptions").doc(cleanUserId).set({
        userId,
        userRole,
        subscription,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Test Push Notification Endpoint
  app.post("/api/push/test", async (req, res) => {
    const { userId, title, body } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    try {
      console.log(`[API] Dispatching test notification to userId: ${userId}`);
      await sendPushNotification(userId, {
        title: title || "Teste de Notificação 🔔",
        body: body || "Seu dispositivo está configurado corretamente!",
        url: "/"
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Push Test Error]:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Instant Notify Collaborators Endpoint
  app.post("/api/push/notify-collaborators", async (req, res) => {
    const { title, body, url } = req.body;
    try {
      await sendNotificationToCollaborators({
        title: title || "Nova Atualização 📅",
        body: body || "Você tem uma nova atualização.",
        url: url || "/agenda"
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Instant Notify Client Endpoint
  app.post("/api/push/notify-client", async (req, res) => {
    const { clientId, title, body, url } = req.body;
    if (!clientId) return res.status(400).json({ error: "Missing clientId" });
    try {
      await sendPushNotification(clientId, {
        title: title || "Atualização da Reserva 💈",
        body: body || "Você tem uma nova atualização.",
        url: url || "/"
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Haircut Renewal Push Notification & In-App Notification Dispatcher
  app.post("/api/push/send-haircut-reminder", async (req, res) => {
    const { clientId, clientPhone, clientName, daysSince, barberName } = req.body;
    if (!clientId && !clientPhone) {
      return res.status(400).json({ error: "Missing clientId or clientPhone" });
    }
    const cleanId = (clientId && clientId !== "guest" ? clientId : clientPhone).replace(/[\s\-\(\)\+]/g, "");
    const title = "Hora de Renovar seu Corte! 💈✂️";
    const body = daysSince 
      ? `Já se passaram ${daysSince} dias desde seu último corte com ${barberName || "a gente"}. Mantenha seu visual alinhado! Agende seu horário.`
      : `Já está na hora de renovar seu corte na barbearia! Garanta seu horário e mantenha o visual na régua.`;

    try {
      // 1. Send PWA / WebPush notification
      await sendPushNotification(cleanId, {
        title,
        body,
        url: "/"
      });

      // 2. Also register in the Firestore notifications collection
      try {
        const targetUserId = clientId || cleanId;
        await adminDb.collection("notifications").add({
          title,
          message: body,
          clientId: targetUserId,
          type: "haircut_renewal",
          read: false,
          createdAt: new Date().toISOString(),
          timestamp: new Date()
        });

        // 3. Mark last reminder timestamp on user doc
        await adminDb.collection("users").doc(targetUserId).set({
          lastHaircutReminderSent: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("[Haircut Reminder] Warning writing to notifications collection:", dbErr);
      }

      res.json({ success: true, message: "Lembrete de corte enviado com sucesso!" });
    } catch (err: any) {
      console.error("[Haircut Reminder Error]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Mercado Pago Payment Creation API
  app.post("/api/payments/mercado-pago/create-payment", async (req, res) => {
    const { transaction_amount, appointmentId, userId, email, name, description } = req.body;
    try {
      const amount = Number(transaction_amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: "Valor de transação inválido" });
      }

      const accessToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || "").trim();
      const isPublicKey = Boolean(
        accessToken && /^APP_USR-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accessToken)
      );
      const hasValidToken = Boolean(
        accessToken &&
        accessToken !== "" &&
        !accessToken.includes("YOUR_TOKEN") &&
        !isPublicKey &&
        accessToken.length > 50
      );

      // Helper to generate official Barbearia PIX Copia-e-Cola (EMVCo)
      const generateDirectPixResponse = async (fallbackReason?: string) => {
        const directId = "pix-" + Date.now();
        const pixPayload = generatePixString("51992590046", "MS BARBER SHOP", "CACHOEIRINHA", amount);

        try {
          await adminDb.collection("payments").doc(directId).set({
            id: directId,
            appointmentId: appointmentId || "temp",
            userId: userId || null,
            status: "pending",
            amount: amount,
            isDirectPix: true,
            pixPayload: pixPayload,
            fallbackReason: fallbackReason || null,
            createdAt: FieldValue.serverTimestamp()
          });
        } catch (dbErr) {
          console.warn("[Payments] Failed to save payment record to adminDb, returning direct PIX payload anyway:", dbErr);
        }

        return res.json({
          success: true,
          id: directId,
          payment_id: directId,
          qr_code: pixPayload,
          qr_code_base64: "", // frontend QRCodeCanvas renders qr_code directly
          status: "pending",
          isDirectPix: true,
          ticket_url: "https://pix.bcb.gov.br",
          chave_pix: "(51) 99259-0046",
          beneficiario: "MS BARBER SHOP"
        });
      };

      if (!hasValidToken) {
        console.warn(`[Mercado Pago] Access Token is not set or Public Key was configured instead (isPublicKey: ${isPublicKey}). Falling back to direct Barbearia PIX Copia-e-Cola.`);
        return await generateDirectPixResponse(isPublicKey ? "Chave Pública configurada no lugar do Access Token" : "Token não configurado");
      }

      try {
        const idempotencyKey = "mp-pix-" + Math.random().toString(36).substring(2) + Date.now().toString();
        const mpRes = await axios.post("https://api.mercadopago.com/v1/payments", {
          transaction_amount: amount,
          description: description || "Pagamento MS Barber Shop",
          payment_method_id: "pix",
          external_reference: appointmentId || userId || "guest",
          payer: {
            email: email || "cliente@msbarbershop.com.br",
            first_name: name || "Cliente"
          }
        }, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey
          },
          timeout: 12000
        });

        const mpPaymentId = String(mpRes.data.id);
        const paymentData = {
          id: mpPaymentId,
          appointmentId: appointmentId || "temp",
          userId: userId || null,
          status: mpRes.data.status || "pending",
          amount: amount,
          isMock: false,
          createdAt: FieldValue.serverTimestamp()
        };
        try {
          await adminDb.collection("payments").doc(mpPaymentId).set(paymentData);
        } catch (dbErr) {
          console.warn("[Payments] Failed to save mp payment to adminDb:", dbErr);
        }
        
        const tData = mpRes.data.point_of_interaction?.transaction_data || {};
        return res.json({
          success: true,
          id: mpPaymentId,
          payment_id: mpPaymentId,
          qr_code_base64: tData.qr_code_base64 || "",
          qr_code: tData.qr_code || "",
          ticket_url: tData.ticket_url || ""
        });
      } catch (mpErr: any) {
        console.error("Mercado Pago API error:", mpErr.response?.data || mpErr.message);
        // Fallback to direct PIX so client is never blocked!
        return await generateDirectPixResponse(mpErr.response?.data?.message || mpErr.message);
      }
    } catch (e: any) {
      console.error("[Create Payment Fatal Error]:", e);
      // Graceful fallback to direct Pix so user is NEVER blocked
      try {
        const amount = Number(transaction_amount) || 10;
        const directId = "pix-fallback-" + Date.now();
        const pixPayload = generatePixString("51992590046", "MS BARBER SHOP", "CACHOEIRINHA", amount);
        return res.json({
          success: true,
          id: directId,
          payment_id: directId,
          qr_code: pixPayload,
          qr_code_base64: "",
          status: "pending",
          isDirectPix: true,
          ticket_url: "https://pix.bcb.gov.br",
          chave_pix: "(51) 99259-0046"
        });
      } catch (fallbackErr) {
        return res.status(500).json({ success: false, error: e.message || "Erro ao processar pagamento Pix." });
      }
    }
  });

  // Manual payment confirmation endpoint
  app.post("/api/payments/mercado-pago/confirm", async (req, res) => {
    const { paymentId, appointmentId } = req.body;
    try {
      if (paymentId) {
        const paymentRef = adminDb.collection("payments").doc(String(paymentId));
        await paymentRef.set({
          status: "approved",
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
        const pSnap = await paymentRef.get();
        if (pSnap.exists) {
          await processApprovedPayment({ id: paymentId, ...pSnap.data(), status: "approved" });
        }
      }
      if (appointmentId) {
        const appointmentRef = adminDb.collection("appointments").doc(String(appointmentId));
        await appointmentRef.set({
          status: "confirmed",
          paymentStatus: "paid",
          paidVia: "pix",
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      res.json({ success: true, message: "Pagamento confirmado com sucesso!" });
    } catch (err: any) {
      console.error("[Confirm Payment Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite and Static handling
  let viteMiddleware: any = null;
  if (process.env.NODE_ENV !== "production") {
    createViteServer({ server: { middlewareMode: true }, appType: "spa" })
      .then((vite) => {
        viteMiddleware = vite.middlewares;
        console.log("[Vite] Middleware mode initialized.");
      })
      .catch((err) => {
        console.error("[Vite] Failed to create Vite server:", err);
      });

    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      const checkInterval = setInterval(() => {
        if (viteMiddleware) {
          clearInterval(checkInterval);
          viteMiddleware(req, res, next);
        }
      }, 50);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);

    // Initialize Push notifications and background listeners asynchronously without delaying server readiness
    initVapid()
      .then(() => {
        startAppointmentsListener();
        startChatsListener();
        startAppointmentAutoUpdater();
      })
      .catch((err) => {
        console.warn("[Push Service] Background init warning:", err?.message || err);
      });
  });
}

startServer();
