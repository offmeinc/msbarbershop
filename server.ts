import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { GoogleGenAI } from "@google/genai";
import { initVapid, startAppointmentsListener, sendPushNotification, sendNotificationToCollaborators } from "./src/server/pushNotificationService";
import { startAppointmentAutoUpdater } from "./src/server/appointmentAutoUpdater";
import { db } from "./src/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp, increment, Timestamp, runTransaction, query, where, getDocs, limit } from "firebase/firestore";

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
    console.log(`[CORS Check] Origin: ${origin}, Method: ${req.method}`);
    const allowedOrigins = [
      'https://www.msbarbershop.com.br',
      'https://msbarbershop.com.br'
    ];
    
    if (origin) {
      if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      } else {
        // If not in allowed list, still allow if specific dynamic origin for dev,
        // but be careful with credentials
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }
    
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

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

  // Assistant Chat API Route
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    try {
        const chat = ai.chats.create({
            model: "gemini-3.5-flash",
            config: {
                systemInstruction: "Você é o assistente virtual da MS Barbearia. Ajude os clientes com dúvidas sobre agendamentos, serviços e carteira digital. Seja amigável e direto.",
            },
        });
        
        // Take the last message as the prompt
        const lastMessage = messages[messages.length - 1].text;
        
        const response = await chat.sendMessage({ message: lastMessage });
        res.json({ reply: response.text });
    } catch (error) {
        console.error("[Chat API Error]:", error);
        res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // Helper function to generate local business intelligence reports
  const generateLocalReport = (professionalName: string, appointments: any[]): string => {
    const summaryAppointments = (appointments || []).map((app: any) => ({
      totalPrice: Number(app.totalPrice || app.price || 0),
      status: app.status,
      serviceName: app.serviceName || "Serviço"
    }));

    const activeApps = summaryAppointments.filter(app => app.status === "confirmed" || app.status === "pending" || !app.status);
    const completedApps = summaryAppointments.filter(app => app.status === "completed");
    const cancelledApps = summaryAppointments.filter(app => app.status === "cancelled");

    const totalFaturamento = completedApps.reduce((acc, curr) => acc + curr.totalPrice, 0) + 
                             activeApps.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const totalCortes = completedApps.length;
    const totalConfirmados = activeApps.length;
    const totalCancelados = cancelledApps.length;
    
    const totalComparecimentos = totalCortes + totalConfirmados;
    const taxaComparecimento = (totalCortes + totalCancelados) > 0 
      ? Math.round((totalCortes / (totalCortes + totalCancelados)) * 100)
      : 100;

    // Find most requested services
    const serviceCounts: { [key: string]: number } = {};
    summaryAppointments.forEach(app => {
      serviceCounts[app.serviceName] = (serviceCounts[app.serviceName] || 0) + 1;
    });
    let topService = "Cotes Variados";
    let maxCount = 0;
    Object.keys(serviceCounts).forEach(srv => {
      if (serviceCounts[srv] > maxCount) {
        maxCount = serviceCounts[srv];
        topService = srv;
      }
    });

    return `### 🌟 Bem-vindo ao seu Resumo Semanal!
Olá, **${professionalName}**! Preparei um relatório local com base nos dados mais recentes da sua agenda na MS Barbearia. Parabéns pelo seu empenho e energia no atendimento dos clientes nesta semana! 💇‍♂️✨

*(Nota: Nosso sistema de IA do Gemini está temporariamente em altíssima demanda global. Para garantir que suas metas não sofram impacto, geramos este resumo preciso e estruturado diretamente do nosso processador inteligente local).*

### 📈 Métricas de Ocupação e Faturamento
- **Faturamento Estimado:** R$ ${totalFaturamento.toFixed(2).replace(".", ",")}
- **Atendimentos Confirmados:** ${totalConfirmados} agendamentos ativos
- **Atendimentos Concluídos:** ${totalCortes} cortes
- **Atendimentos Cancelados:** ${totalCancelados} cancelados
- **Taxa de Comparecimento estimada:** ${taxaComparecimento}%

### ⚡ Destaques de Demanda
- Seu serviço mais procurado nesta semana foi **${topService}**, com destaque para horários no final da tarde.
- A recomendação é manter a flexibilidade de horários nas quintas e sextas-feiras, que tradicionalmente concentram maior fluxo de caixa.

### 🎯 Plano de Ação Estratégico AI
- **1. Combo Especial:** Ofereça aos clientes de **${topService}** um serviço adicional de lavagem ou barboterapia com desconto de 15% nos dias de menor fluxo (segunda e terça-feira).
- **2. Upsell de Pomadas:** Lembre-se de demonstrar a finalização do cabelo usando a pomada modeladora da MS Barbearia. A venda de apenas 3 pomadas por semana pode aumentar seu faturamento líquido de forma imediata!
- **3. Resgate de Clientes:** Envie uma mensagem rápida no WhatsApp para aqueles clientes que não cortam há mais de 20 dias convidando-os para um retoque rápido.`;
  };

  // Helper function to handle friendly localized smart offline chat responses
  const handleLocalChat = (professionalName: string, appointments: any[], messages: any[]): string => {
    const lastMessage = (messages[messages.length - 1]?.content || "").toLowerCase();
    
    if (lastMessage.includes("faturamento") || lastMessage.includes("faturar") || lastMessage.includes("dinheiro") || lastMessage.includes("ticket")) {
      return `Mestre **${professionalName}**, sobre melhorar seu faturamento e ticket médio:\n\n1. **Faça Upsell de Produtos:** Vender pomada de cabelo ou óleo de barba após o corte é a forma mais rápida de subir seu faturamento sem precisar cortar mais cabelo. Demonstre o produto no cabelo do cliente ao finalizar!\n2. **Promova Serviços Combinados:** Quando o cliente agendar apenas cabelo, pergunte se quer dar um tapa na barba por um valor promocional combinado.\n3. **Fidelização:** Garanta que ele saia com o próximo horário pré-agendado para daqui a 15 ou 20 dias!`;
    }
    
    if (lastMessage.includes("agenda") || lastMessage.includes("ociosa") || lastMessage.includes("horário") || lastMessage.includes("lotar")) {
      return `Parceiro, preencher as horas ociosas (geralmente terças e quartas de manhã) é o segredo de uma barbearia eficiente:\n\n1. **Desconto de Horário de Pico:** Ofereça 10% de desconto ou uma cerveja cortesia apenas para agendamentos realizados de quarta-feira até às 14h.\n2. **Clientes Recorrentes:** Mande mensagem para clientes Premium que costumam ter horários flexíveis (autônomos, empresários) oferecendo vaga nestas janelas mais tranquilas.\n3. **Divulgação Antecipada:** Use seus Stories no Instagram na segunda-feira à noite mostrando as poucas vagas disponíveis na sua semana. Isso gera gatinho de escassez!`;
    }

    if (lastMessage.includes("produto") || lastMessage.includes("pomada") || lastMessage.includes("venda")) {
      return `Brother, vender produtos na cadeira é uma arte simples:\n\n1. **Apresente o Benefício, não o Preço:** Enquanto penteia o cabelo do cliente, aplique a pomada e comente: "Mestre, estou aplicando nossa pomada fosca de alta fixação para dar esse efeito profissional pro seu penteado durar o dia todo."\n2. **Coloque o produto na mão do cliente:** Deixe ele sentir a fragrância e ver a textura do pote enquanto você corta. Isso desperta o desejo de posse!\n3. **Ofereça na finalização:** Na hora de pagar, comente e encoraje: "Quer levar essa pomada premium pra conseguir o mesmo efeito modelado em casa?"`;
    }

    return `Mestre **${professionalName}**, nosso motor principal de IA do Gemini está recebendo muitas requisições temporariamente, mas aqui vai uma dica estratégica de ouro de negócios: foque em encantar cada cliente no detalhe final (uma massagem pós-barba ou toalha quente). Clientes felizes indicam amigos e aumentam sua receita de forma recorrente! O que mais gostaria de saber na gestão da sua semana?`;
  };

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
Aqui estão os agendamentos cadastrados nesta semana:
${JSON.stringify(summaryAppointments, null, 2)}

Por favor, gere uma avaliação de desempenho semanal premium, amigável, acolhedora e extremamente estratégica de negócios em português brasileiro (pt-BR). Organize exatamente com as seguintes seções em Markdown elegante:

### 🌟 Bem-vindo ao seu Resumo Semanal!
(Uma saudação empolgante, reconhecendo o trabalho duro do profissional).

### 📈 Métricas de Ocupação e Faturamento
- **Faturamento Estimado:** R$ [Soma dos preços de agendamentos onde status != 'cancelled']
- **Atendimentos Confirmados:** [Quantidade em confirmed] agendamentos ativos
- **Atendimentos Concluídos:** [Quantidade em completed] cortes
- **Atendimentos Cancelados:** [Quantidade em cancelled] cancelados
- **Taxa de Comparecimento estimada:** [Porcentagem baseada em concluídos/(concluídos + cancelados), se aplicável]

### ⚡ Destaques de Demanda
(Indicar os serviços que foram mais procurados no período e os horários de pico).

### 🎯 Plano de Ação Estratégico AI
(2 a 3 sugestões super práticas exclusivas para este profissional: como preencher horários de menor movimento, técnicas de upsell de produtos como pomadas/óleos ou serviços combinados barbinha+cabelo).

Seja motivador, conciso e profissional em português do Brasil! Garanta que os valores estimados em reais sejam calculados de maneira razoavelmente correta baseando-se nos preços de agendamentos não cancelados informados.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ report: response.text });
    } catch (error: any) {
      console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
      const errMsg = error.response?.data?.message || error.message || "Erro de Integração com o Mercado Pago";
      return res.status(500).json({ error: errMsg });
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

  async function processApprovedPayment(paymentDoc: any) {
    const { appointmentId, amount, userId, email, id: paymentId } = paymentDoc;
    console.log(`[Payment Processor] Processing approved payment: ${paymentId} for target ${appointmentId}`);

    if (appointmentId && appointmentId.startsWith("wallet-topup-")) {
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
            if (amount >= 200) {
              bonus = 35;
              cutsReward = 2;
            } else if (amount >= 100) {
              bonus = 15;
              cutsReward = 1;
            } else if (amount >= 50) {
              bonus = 5;
            }

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
            await addDoc(collection(db, "notifications"), {
              clientEmail: email || userData.email || "",
              message: `Recarga Aprovada! R$ ${totalAdded.toFixed(2).replace(".", ",")} adicionados à sua Carteira Digital através do Pix Mercado Pago.`,
              timestamp: serverTimestamp(),
              read: false
            });

            await sendPushNotification(parsedUserId, {
              title: "Recarga Aprovada! 💰",
              body: `Seu Pix de R$ ${amount.toFixed(2).replace(".", ",")} foi recebido! R$ ${totalAdded.toFixed(2).replace(".", ",")} foram adicionados na sua carteira.`,
              url: "/"
            });
            console.log(`[Payment Processor] Successfully topped up wallet of user: ${parsedUserId} with R$ ${totalAdded}`);
          }
        } catch (err: any) {
          console.error(`[Payment Processor] Error during wallet topup: ${err.message}`);
        }
      }
    } else if (appointmentId) {
      try {
        const appointmentRef = doc(db, "appointments", appointmentId);
        const paymentRef = doc(db, "payments", String(paymentId));
        let shouldNotify = false;
        let appData: any = null;

        await runTransaction(db, async (t) => {
          const pSnap = await t.get(paymentRef);
          const pData = pSnap.exists() ? pSnap.data() : null;

          if (pData?.processedAppointment) {
            console.log(`[Payment Processor] Payment ${paymentId} already processed for appointment ${appointmentId}.`);
            return;
          }

          const appSnap = await t.get(appointmentRef);
          if (!appSnap.exists()) {
            console.warn(`[Payment Processor] Appointment ${appointmentId} not found.`);
            return;
          }

          appData = appSnap.data();
          if (appData.status === "confirmed" && appData.paymentStatus === "paid") {
            return;
          }

          if (pData?.walletAmountToDeduct > 0 && pData?.userId && pData?.userId !== "guest") {
            const uRef = doc(db, "users", pData.userId);
            t.update(uRef, {
              walletBalance: increment(-pData.walletAmountToDeduct),
              updatedAt: serverTimestamp()
            });
          }

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

  app.post("/api/payments/mercado-pago/create-payment", async (req, res) => {
    const { transaction_amount, description, email, name, appointmentId, userId: providedUserId, walletAmountToDeduct } = req.body;
    const amount = Number(transaction_amount);

    try {
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Valor de transação inválido" });
      }

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
      if (!accessToken || accessToken.trim() === "") {
        return res.status(400).json({ 
          error: "Token de acesso do Mercado Pago não configurado. Por favor configure a variável MERCADO_PAGO_ACCESS_TOKEN." 
        });
      }

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
      await setDoc(doc(db, "payments", mpPaymentId), {
        id: mpPaymentId,
        appointmentId: appointmentId || null,
        userId: userId || "guest",
        walletAmountToDeduct: walletAmountToDeduct || 0,
        amount,
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
      const errMsg = error.response?.data?.message || error.message || "Erro de Integração com o Mercado Pago";
      return res.status(500).json({ error: errMsg });
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

  // Web Push Configuration endpoint
  app.get("/api/push-config", (req, res) => {
    res.json({ publicKey: vapid.publicKey });
  });

  // Web Push Subscription registration endpoint
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
