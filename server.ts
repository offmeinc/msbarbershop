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
import { adminMessaging, db } from "./src/server/firebaseAdmin";
import { doc, getDoc, updateDoc, setDoc, runTransaction, serverTimestamp, increment, deleteDoc } from "firebase/firestore";

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

async function startServer() {
  const app = express();
  const PORT = 3000;
  
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
  
  // Initialize Push notifications
  const vapid = await initVapid();
  startAppointmentsListener();
  startChatsListener();
  startAppointmentAutoUpdater();
  
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
      const paymentRef = doc(db, "payments", paymentId);
      const paymentSnap = await getDoc(paymentRef);

      if (!paymentSnap.exists()) {
        return res.status(404).json({ error: "Payment not found" });
      }

      const paymentData = paymentSnap.data() || {};
      if (paymentData.status === "approved" || paymentData.status === "completed") {
        return res.json({ status: "approved" });
      }

      if (!paymentData.isMock && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        try {
          const mpResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
          });
          if (mpResponse.data.status === "approved") {
            await updateDoc(paymentRef, { status: "approved", updatedAt: serverTimestamp() });
            await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });
            return res.json({ status: "approved" });
          }
        } catch (e) {}
      }
      res.json({ status: paymentData.status });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  async function processApprovedPayment(paymentDoc: any) {
    const { appointmentId, amount, userId, id: paymentId } = paymentDoc;
    if (appointmentId && appointmentId.startsWith("wallet-topup-")) {
      const parsedUserId = userId || appointmentId.split("-")[2];
      if (parsedUserId) {
        try {
          const userRef = doc(db, "users", parsedUserId);
          const paymentRef = doc(db, "payments", String(paymentId));
          await runTransaction(db, async (t) => {
            const pSnap = await t.get(paymentRef);
            if (!pSnap.exists() || pSnap.data()?.processedWallet) return;
            const uSnap = await t.get(userRef);
            if (!uSnap.exists()) return;
            const currentBalance = Number(uSnap.data()?.walletBalance || 0);
            t.update(userRef, { walletBalance: currentBalance + amount, updatedAt: serverTimestamp() });
            t.update(paymentRef, { processedWallet: true, updatedAt: serverTimestamp() });
          });
        } catch (e) {}
      }
    } else if (appointmentId) {
      try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const paymentRef = doc(db, "payments", String(paymentId));
        await runTransaction(db, async (t) => {
          const pSnap = await t.get(paymentRef);
          if (pSnap.data()?.processedAppointment) return;
          const appSnap = await t.get(appointmentRef);
          if (!appSnap.exists()) return;
          t.update(appointmentRef, { status: "confirmed", paymentStatus: "paid", updatedAt: serverTimestamp() });
          t.update(paymentRef, { processedAppointment: true, updatedAt: serverTimestamp() });
        });
      } catch (e) {}
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
      await runTransaction(db, async (t) => {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const appSnap = await t.get(appointmentRef);
        
        if (!appSnap.exists()) {
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
          updatedAt: serverTimestamp(),
          cancellationReason: reason || ""
        };

        if (appData.paymentStatus === "paid" && appData.totalPrice > 0 && appData.clientId && appData.clientId !== "guest") {
          const priceToRefund = Number(appData.totalPrice) || 0;
          console.log(`[API] Refunding R$ ${priceToRefund} to user: ${appData.clientId}`);
          const userRef = doc(db, "users", appData.clientId);
          const userSnap = await t.get(userRef);
          
          if (userSnap.exists()) {
            const currentBalance = Number(userSnap.data()?.walletBalance) || 0;
            t.update(userRef, { 
              walletBalance: currentBalance + priceToRefund, 
              updatedAt: serverTimestamp() 
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
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      
      if (!userData || (userData.role !== 'manager' && userData.role !== 'barber')) {
        console.log("[API] Permission denied for user:", userId);
        return res.status(403).json({ error: "Permissão negada. Apenas profissionais podem excluir registros." });
      }

      console.log("[API] Deleting appointment document: ", appointmentId);
      const appRef = doc(db, "appointments", appointmentId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) {
        console.log("[API] Document not found: ", appointmentId);
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }
      await deleteDoc(appRef);
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

  // Mercado Pago Payment Creation API
  app.post("/api/payments/mercado-pago/create-payment", async (req, res) => {
    const { transaction_amount, appointmentId, userId } = req.body;
    try {
      const mpRes = await axios.post("https://api.mercadopago.com/v1/payments", {
        transaction_amount,
        payment_method_id: "pix",
        payer: { email: "test@test.com" }
      }, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` }
      });
      const paymentData = {
        appointmentId,
        userId,
        status: mpRes.data.status,
        amount: transaction_amount,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, "payments", String(mpRes.data.id)), paymentData);
      res.json({ id: mpRes.data.id, qr_code_base64: mpRes.data.point_of_interaction.transaction_data.qr_code_base64 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite and Static handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
