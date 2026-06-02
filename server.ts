import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { initVapid, startAppointmentsListener, sendPushNotification, sendNotificationToCollaborators } from "./src/server/pushNotificationService";
import { startAppointmentAutoUpdater } from "./src/server/appointmentAutoUpdater";
import { db } from "./src/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp, increment, Timestamp, runTransaction, query, where, getDocs, limit } from "firebase/firestore";

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

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

  // API Route for Push Subscription (Save to Firestore)
  app.post("/api/subscribe", async (req, res) => {
    const { subscription, userId, userRole } = req.body;
    if (!subscription || !userId) {
      return res.status(400).json({ error: "Missing subscription or userId" });
    }
    
    try {
      const subRef = doc(db, "push_subscriptions", userId);
      await setDoc(subRef, {
        userId,
        userRole: userRole || "client",
        subscription,
        createdAt: serverTimestamp()
      }, { merge: true });
      res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("[Push Service] Error saving subscription:", err.message);
      res.status(500).json({ error: "Failed to save subscription" });
    }
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
        throw new Error("IMGBB_API_KEY não configurado no arquivo .env");
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem foi recebida" });
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

  // Helper to process approved payments and perform wallet recharges or appointment confirmations
  async function processApprovedPayment(paymentDoc: any) {
    const { appointmentId, amount, userId, email, id: paymentId } = paymentDoc;
    console.log(`[Payment Processor] Processing approved payment: ${paymentId} for target ${appointmentId}`);

    if (appointmentId && appointmentId.startsWith("wallet-topup-")) {
      // 1. Wallet Topup Flow
      let parsedUserId = userId;
      const withoutPrefix = appointmentId.substring("wallet-topup-".length);
      const lastDash = withoutPrefix.lastIndexOf("-");
      if (lastDash > 0) {
        parsedUserId = withoutPrefix.substring(0, lastDash);
      } else if (withoutPrefix.length > 0) {
        parsedUserId = withoutPrefix;
      }

      if (parsedUserId) {
        try {
          const userRef = doc(db, "users", parsedUserId);
          const paymentRef = doc(db, "payments", String(paymentId));
          
          let totalAdded = 0;
          let bonus = 0;
          let userData: any = null;
          
          await runTransaction(db, async (t) => {
             const pSnap = await t.get(paymentRef);
             if (!pSnap.exists()) return;
             const pData = pSnap.data();
             
             if (pData.processedWallet) {
                console.log(`[Payment Processor] Payment ${paymentId} already processed for wallet.`);
                return;
             }
             
             const userSnap = await t.get(userRef);
             if (!userSnap.exists()) return;
             
             userData = userSnap.data();
             const currentBalance = Number(userData.walletBalance || 0);

             let cutsReward = 0;
             if (amount >= 200) { bonus = 35; cutsReward = 2; }
             else if (amount >= 100) { bonus = 15; cutsReward = 1; }
             else if (amount >= 50) { bonus = 5; }

             const totalToAdd = amount + bonus;
             totalAdded = totalToAdd;

             t.update(userRef, {
               walletBalance: currentBalance + totalToAdd,
               cutsBalance: (Number(userData.cutsBalance) || 0) + cutsReward,
               updatedAt: serverTimestamp()
             });
             
             t.update(paymentRef, {
               processedWallet: true,
               updatedAt: serverTimestamp()
             });
          });
          
          if (totalAdded > 0 && userData) {
            // Create collection record of notification
            await addDoc(collection(db, "notifications"), {
              clientEmail: email || userData.email || "",
              message: `Recarga Aprovada! R$ ${totalAdded.toFixed(2).replace('.', ',')} adicionados à sua Carteira Digital através do Pix Mercado Pago.`,
              timestamp: serverTimestamp(),
              read: false
            });

            // Push notification to user
            await sendPushNotification(parsedUserId, {
              title: "Recarga Aprovada! 💰",
              body: `Seu Pix de R$ ${amount.toFixed(2).replace('.', ',')} foi recebido! R$ ${totalAdded.toFixed(2).replace('.', ',')} foram adicionados na sua carteira.`,
              url: "/"
            });

            console.log(`[Payment Processor] Successfully topped up wallet of user: ${parsedUserId} with R$ ${totalAdded}`);
          }
        } catch (err: any) {
          console.error(`[Payment Processor] Error during wallet topup: ${err.message}`);
        }
      }
    } else if (appointmentId) {
      // 2. Barber Appointment Booking Flow
      try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const paymentRef = doc(db, "payments", String(paymentId));
        
        let shouldNotify = false;
        let appData: any = null;

        await runTransaction(db, async (t) => {
           // 1. Check if payment record already marked this appointment as processed
           const pSnap = await t.get(paymentRef);
           const pData = pSnap.exists() ? pSnap.data() : null;
           
           if (pData?.processedAppointment) {
              console.log(`[Payment Processor] Payment ${paymentId} already processed for appointment ${appointmentId}.`);
              return;
           }

           // 2. Check appointment state
           const appSnap = await t.get(appointmentRef);
           if (!appSnap.exists()) {
              console.warn(`[Payment Processor] Appointment ${appointmentId} not found.`);
              return;
           }
           
           appData = appSnap.data();
           // If already paid and confirmed, skip
           if (appData.status === "confirmed" && appData.paymentStatus === "paid") {
              return;
           }

           // 3. Optional: Deduct from wallet if partial payment was used
           if (pData?.walletAmountToDeduct > 0 && pData?.userId && pData?.userId !== "guest") {
              const uRef = doc(db, "users", pData.userId);
              t.update(uRef, {
                 walletBalance: increment(-(pData.walletAmountToDeduct)),
                 updatedAt: serverTimestamp()
              });
           }

           // 4. Perform atomic update
           t.update(appointmentRef, {
             status: "confirmed",
             paymentStatus: "paid",
             updatedAt: serverTimestamp()
           });

           if (pSnap.exists()) {
             t.update(paymentRef, {
               processedAppointment: true,
               updatedAt: serverTimestamp()
             });
           }
           
           shouldNotify = true;
        });

        if (shouldNotify && appData) {
          // Referral Reward Logic: Referrer earns R$ 5,00 on referee's first confirmed payment
          const appClientId = appData.clientId;
          if (appClientId && appClientId !== "guest") {
             try {
                const userRef = doc(db, "users", appClientId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                   const userData = userSnap.data();
                   if (userData.referredBy && !userData.referralRewardTriggered) {
                      const appsQuery = query(
                         collection(db, "appointments"),
                         where("clientId", "==", appClientId),
                         where("paymentStatus", "==", "paid"),
                         limit(2)
                      );
                      const appsSnap = await getDocs(appsQuery);
                      if (appsSnap.size === 1) {
                         const referrerQuery = query(collection(db, "users"), where("referralCode", "==", userData.referredBy));
                         const referrerSnap = await getDocs(referrerQuery);
                         if (!referrerSnap.empty) {
                            const referrerDoc = referrerSnap.docs[0];
                            const referrerId = referrerDoc.id;
                            
                            await runTransaction(db, async (rt) => {
                               rt.update(doc(db, "users", referrerId), {
                                  walletBalance: increment(5),
                                  updatedAt: serverTimestamp()
                               });
                               rt.update(userRef, {
                                  referralRewardTriggered: true,
                                  updatedAt: serverTimestamp()
                               });
                            });

                            console.log(`[Referral] User ${referrerId} rewarded for referral of ${appClientId}`);
                            
                            await sendPushNotification(referrerId, {
                               title: "Bônus de Indicação! 🎁",
                               body: `Você ganhou R$ 5,00 pois um amigo que você indicou acaba de realizar o primeiro corte!`,
                               url: "/"
                            });
                         }
                      }
                   }
                }
             } catch (refErr: any) {
                console.error("[Referral Processor Error]:", refErr.message);
             }
          }

          const clientName = appData.clientName || "Cliente";
          const serviceName = appData.serviceName || "Serviço";
          const barberName = appData.barberName || "Profissional";
          const appClientIdForNotify = appData.clientId || "guest";
          const clientPhone = appData.clientPhone || "";

          let formattedDateStr = "";
          if (appData.date) {
            try {
              const dateVal = appData.date instanceof Timestamp ? appData.date.toDate() : new Date(appData.date);
              formattedDateStr = dateVal.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
            } catch {
              formattedDateStr = String(appData.date);
            }
          }

          await sendNotificationToCollaborators({
            title: "Novo Pagamento Pix Confirmado! 📱",
            body: `Pix de ${clientName} aprovado para ${serviceName} às ${appData.time} com ${barberName}.`,
            url: "/agenda"
          });

          const rawTarget = appClientIdForNotify && appClientIdForNotify !== "guest" ? appClientIdForNotify : clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Pagamento Confirmado! ✅",
              body: `Seu Pix foi recebido! Seu agendamento de ${serviceName} para ${formattedDateStr} está confirmado.`,
              url: "/"
            });
          }

          console.log(`[Payment Processor] Confirmed appointment: ${appointmentId} due to payment ${paymentId}`);
        }
      } catch (err: any) {
        console.error(`[Payment Processor] Error during appointment payment confirmation: ${err.message}`);
      }
    }
  }

  // API Route for Mercado Pago Pix Payment Creation
  app.post("/api/payments/mercado-pago/create-payment", async (req, res) => {
    console.log("[Route] Received request for /api/payments/mercado-pago/create-payment");
    const { transaction_amount, description, email, name, appointmentId, userId: providedUserId, walletAmountToDeduct } = req.body;
    const amount = Number(transaction_amount);
    console.log(`[Route] Params: amount=${amount}, userId=${providedUserId}`);

    try {
      if (isNaN(amount) || amount <= 0) {
        console.warn("[Route] Invalid transaction amount.");
        return res.status(400).json({ error: "Invalid transaction amount" });
      }

      // Try parsing userId from topup appointmentId
      let userId = providedUserId || "guest";
      if (userId === "guest" && appointmentId && appointmentId.startsWith("wallet-topup-")) {
        const withoutPrefix = appointmentId.substring("wallet-topup-".length);
        const lastDash = withoutPrefix.lastIndexOf("-");
        if (lastDash > 0) {
          userId = withoutPrefix.substring(0, lastDash);
        } else if (withoutPrefix.length > 0) {
          userId = withoutPrefix;
        }
      }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    console.log(`[Mercado Pago] ACCESS_TOKEN exists: ${!!accessToken}`);
      if (!accessToken || accessToken.trim() === "") {
        console.warn("[Mercado Pago] ACCESS_TOKEN not configured. Returning simulated payment payload.");
        const simulatedPaymentId = "mp-sim-" + Math.floor(Math.random() * 900000000 + 100000000).toString();
        
        const paymentPayload = {
          success: true,
          isMock: true,
          status: "pending",
          status_detail: "pending_waiting_transfer",
          qr_code: "00020101021226870014br.gov.bcb.pix2572em-breve-mercado-pago-completo-integrado-barbearia-prod",
          qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          payment_id: simulatedPaymentId,
          message: "Em breve estará disponível para o cliente"
        };

        // Record simulated payment inside Firebase for client interactivity simulation
        await setDoc(doc(db, "payments", simulatedPaymentId), {
          id: simulatedPaymentId,
          appointmentId: appointmentId || null,
          userId: userId,
          walletAmountToDeduct: walletAmountToDeduct || 0,
          amount: amount,
          description: description || "Simulated payment",
          status: "pending",
          email: email || "simulation@example.com",
          name: name || "Cliente de Teste",
          isMock: true,
          createdAt: serverTimestamp()
        });

        return res.json(paymentPayload);
      }

      // Real integration attempt
      const idempotencyKey = "mp-pix-" + Math.random().toString(36).substring(2) + Date.now().toString();
      const response = await axios.post("https://api.mercadopago.com/v1/payments", {
        transaction_amount: amount,
        description: description || "Agendamento MS Barbearia",
        payment_method_id: "pix",
        external_reference: appointmentId || userId || "guest",
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

      const mpPaymentId = String(response.data.id);

      // Record real payment in Firestore
      await setDoc(doc(db, "payments", mpPaymentId), {
        id: mpPaymentId,
        appointmentId: appointmentId || null,
        userId: userId || "guest",
        walletAmountToDeduct: walletAmountToDeduct || 0,
        amount: amount,
        description: description || "Agendamento MS Barbearia",
        status: response.data.status || "pending",
        email: email || "payment@example.com",
        name: name || "Cliente",
        isMock: false,
        createdAt: serverTimestamp()
      });

      res.json({
        success: true,
        isMock: false,
        status: response.data.status,
        status_detail: response.data.status_detail,
        qr_code: response.data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.data.point_of_interaction?.transaction_data?.qr_code_base64,
        payment_id: mpPaymentId
      });
    } catch (error: any) {
      console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
      // Return a professional fallback simulation database-backed so that user testing works
      const fallbackPaymentId = "mp-fallback-" + Math.floor(Math.random() * 900000000 + 100000000).toString();
      
      await setDoc(doc(db, "payments", fallbackPaymentId), {
        id: fallbackPaymentId,
        appointmentId: appointmentId || null,
        userId: "guest",
        amount: amount,
        description: description || "Agendamento MS Barbearia",
        status: "pending",
        email: email || "payment@example.com",
        name: name || "Cliente",
        isMock: true,
        createdAt: serverTimestamp()
      });

      res.json({
        success: true,
        isMock: true,
        status: "pending",
        status_detail: "pending_waiting_transfer",
        qr_code: "00020101021226870014br.gov.bcb.pix2572em-breve-mercado-pago-completo-integrado-barbearia-prod",
        qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        payment_id: fallbackPaymentId,
        message: `Mercado Pago falhou: ${error.response?.data?.message || error.message}`
      });
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

      const paymentData = paymentSnap.data();

      // If it's already approved, output directly
      if (paymentData.status === "approved" || paymentData.status === "completed") {
        return res.json({ status: "approved" });
      }

      // If it's a real payment, try fetching latest from Mercado Pago directly to sync state
      if (!paymentData.isMock && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        try {
          const mpResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
            }
          });

          const currentMpStatus = mpResponse.data.status;
          if (currentMpStatus === "approved") {
            await updateDoc(paymentRef, {
              status: "approved",
              updatedAt: serverTimestamp()
            });
            await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });
            return res.json({ status: "approved" });
          }
        } catch (mpError: any) {
          console.error("[Polling] Error verifying on MP:", mpError.message);
        }
      }

      res.json({ status: paymentData.status });
    } catch (e: any) {
      console.error("[Polling Error]:", e.message);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // POST endpoint to manually trigger a payment simulation (ideal for dev experience)
  app.post("/api/payments/mercado-pago/simulate-payment", async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ error: "Missing paymentId" });
      }

      const paymentRef = doc(db, "payments", paymentId);
      const paymentSnap = await getDoc(paymentRef);

      if (!paymentSnap.exists()) {
        return res.status(404).json({ error: "Payment not found in log" });
      }

      const paymentData = paymentSnap.data();
      if (paymentData.status === "approved" || paymentData.status === "completed") {
        return res.json({ success: true, alreadyPaid: true });
      }

      // Transition to approved and trigger automation
      await updateDoc(paymentRef, {
        status: "approved",
        updatedAt: serverTimestamp()
      });

      await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Simulation Error]:", e.message);
      res.status(500).json({ error: "Failed to simulate payment" });
    }
  });

  // POST webhook receiver for Mercado Pago instant notifications
  app.post("/api/payments/mercado-pago/webhook", async (req, res) => {
    try {
      // Mercado Pago Webhooks usually send either topic/id as query params or action/data inside body
      const paymentId = req.query.id || req.body.data?.id;
      const topic = req.query.topic || req.body.type;

      if ((topic === "payment" || topic === "payment.updated") && paymentId) {
        console.log(`[MP Webhook] Received payment update notification for: ${paymentId}`);
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        
        if (accessToken) {
          const mpResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });

          if (mpResponse.data.status === "approved") {
            const paymentRef = doc(db, "payments", String(paymentId));
            const paymentSnap = await getDoc(paymentRef);

            if (paymentSnap.exists()) {
              const paymentData = paymentSnap.data();
              if (paymentData.status !== "approved" && paymentData.status !== "completed") {
                await updateDoc(paymentRef, {
                  status: "approved",
                  updatedAt: serverTimestamp()
                });
                await processApprovedPayment({ id: String(paymentId), ...paymentData, status: "approved" });
              }
            } else {
              // Even if not found in db, try to record and run using external_reference from MP response
              console.warn(`[MP Webhook] Received webhook for unrecorded payment ${paymentId}. Creating record from MP data...`);
              
              const mpExtRef = mpResponse.data.external_reference;
              const payload = {
                id: String(paymentId),
                appointmentId: (mpExtRef && mpExtRef.includes("wallet-topup")) ? mpExtRef : (mpExtRef || null),
                userId: (mpExtRef && mpExtRef.includes("wallet-topup")) ? "guest" : (mpExtRef || "guest"),
                amount: mpResponse.data.transaction_amount,
                status: "approved",
                email: mpResponse.data.payer?.email || "",
                name: mpResponse.data.payer?.first_name || "",
                isMock: false,
                createdAt: serverTimestamp()
              };
              
              // Refine userId if it was a wallet topup string
              if (payload.appointmentId?.startsWith("wallet-topup-")) {
                 const withoutPrefix = payload.appointmentId.substring("wallet-topup-".length);
                 const lastDash = withoutPrefix.lastIndexOf("-");
                 if (lastDash > 0) {
                    payload.userId = withoutPrefix.substring(0, lastDash);
                 }
              }

              await setDoc(paymentRef, payload);
              await processApprovedPayment(payload);
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (e: any) {
      console.error("[MP Webhook Error]:", e.message);
      res.sendStatus(200); // Always respond 200 to Mercado Pago to acknowledge recept of callback
    }
  });

  // API Route for appointment cancellation with atomic refund
  app.post("/api/appointments/cancel", async (req, res) => {
    const { appointmentId, userId } = req.body;
    if (!appointmentId || !userId) {
      return res.status(400).json({ error: "Missing appointmentId or userId" });
    }

    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      
      let refundedAmount = 0;
      let appData: any = null;

      await runTransaction(db, async (t) => {
        const appSnap = await t.get(appointmentRef);
        if (!appSnap.exists()) {
          throw new Error("Appointment not found");
        }
        
        appData = appSnap.data();
        if (appData.status === "cancelled") {
          throw new Error("Appointment already cancelled");
        }

        // Verify ownership (simplified, in production use auth context)
        if (appData.clientId !== userId) {
           console.warn(`[Cancellation] Ownership mismatch: app.clientId(${appData.clientId}) != req.userId(${userId})`);
           // For now we proceed if it's the right ID, but in real app you'd check auth
        }

        const updates: any = {
           status: "cancelled",
           cancelledBy: "client",
           updatedAt: serverTimestamp()
        };

        // Refund logic
        if (appData.paymentStatus === "paid" && appData.totalPrice > 0 && userId !== "guest") {
           const userRef = doc(db, "users", userId);
           const userSnap = await t.get(userRef);
           if (userSnap.exists()) {
              t.update(userRef, {
                 walletBalance: increment(appData.totalPrice),
                 updatedAt: serverTimestamp()
              });
              refundedAmount = appData.totalPrice;
              updates.refundedToWallet = true;
           }
        }

        t.update(appointmentRef, updates);
      });

      // Staff notification
      if (appData) {
        try {
          const dateVal = appData.date instanceof Timestamp ? appData.date.toDate() : new Date(appData.date);
          const formattedDate = dateVal.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
          
          await addDoc(collection(db, "staff_notifications"), {
            type: "cancellation",
            message: `Agendamento Cancelado: ${appData.clientName} cancelou ${appData.serviceName} marcado para ${formattedDate}`,
            timestamp: serverTimestamp(),
            read: false,
            clientId: userId,
            appointmentId: appointmentId
          });
        } catch (notifierErr) {
          console.error("Error creating staff notification:", notifierErr);
        }
      }

      res.json({ success: true, refundedAmount });
    } catch (e: any) {
      console.error("[Cancellation Error]:", e.message);
      res.status(500).json({ error: e.message || "Failed to cancel appointment" });
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
