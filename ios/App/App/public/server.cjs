var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path2 = __toESM(require("path"), 1);
var import_url = require("url");
var import_multer = __toESM(require("multer"), 1);
var import_axios = __toESM(require("axios"), 1);
var import_form_data = __toESM(require("form-data"), 1);

// src/server/pushNotificationService.ts
var import_web_push = __toESM(require("web-push"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_firestore2 = require("firebase/firestore");

// src/lib/firebase.ts
var import_app = require("firebase/app");
var import_auth = require("firebase/auth");
var import_firestore = require("firebase/firestore");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "gen-lang-client-0419449301",
  appId: "1:122028701634:web:30bbacb9f7755d969ec85b",
  apiKey: "AIzaSyD4ZPKEi3EQbsI9uesSIxNzEd8BzWwBst8",
  authDomain: "gen-lang-client-0419449301.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-fdc281f5-3b5c-4ac2-9537-de942578c2a6",
  storageBucket: "gen-lang-client-0419449301.firebasestorage.app",
  messagingSenderId: "122028701634",
  measurementId: ""
};

// src/lib/firebase.ts
var app = (0, import_app.initializeApp)(firebase_applet_config_default);
var db = (0, import_firestore.getFirestore)(app, firebase_applet_config_default.firestoreDatabaseId || "(default)");
var auth = (0, import_auth.getAuth)(app);
(0, import_auth.setPersistence)(auth, import_auth.browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

// src/server/pushNotificationService.ts
var VAPID_FILE = import_path.default.join(process.cwd(), "vapid-keys.json");
var loadedVapidKeys = null;
async function initVapid() {
  if (loadedVapidKeys) return loadedVapidKeys;
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    console.log("[Push Service] Using VAPID keys from environment variables.");
    import_web_push.default.setVapidDetails(
      "mailto:suporte@barbearia.com",
      publicKey,
      privateKey
    );
    loadedVapidKeys = { publicKey, privateKey };
    return loadedVapidKeys;
  }
  try {
    const docRef = (0, import_firestore2.doc)(db, "system_config", "vapid_keys");
    const docSnap = await (0, import_firestore2.getDoc)(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.publicKey && data.privateKey) {
        console.log("[Push Service] Using saved stable VAPID keys from Firestore /system_config/vapid_keys.");
        import_web_push.default.setVapidDetails(
          "mailto:suporte@barbearia.com",
          data.publicKey,
          data.privateKey
        );
        loadedVapidKeys = { publicKey: data.publicKey, privateKey: data.privateKey };
        return loadedVapidKeys;
      }
    }
  } catch (error) {
    console.error("[Push Service] Firestore VAPID retrieval failed or skipped:", error.message);
  }
  if (import_fs.default.existsSync(VAPID_FILE)) {
    try {
      const keys = JSON.parse(import_fs.default.readFileSync(VAPID_FILE, "utf-8"));
      if (keys.publicKey && keys.privateKey) {
        console.log("[Push Service] Using saved VAPID keys from vapid-keys.json.");
        import_web_push.default.setVapidDetails(
          "mailto:suporte@barbearia.com",
          keys.publicKey,
          keys.privateKey
        );
        loadedVapidKeys = keys;
        return keys;
      }
    } catch (e) {
      console.error("[Push Service] Error reading vapid-keys.json:", e.message);
    }
  }
  console.log("[Push Service] Generating new stable VAPID key pair...");
  const newKeys = import_web_push.default.generateVAPIDKeys();
  try {
    import_fs.default.writeFileSync(VAPID_FILE, JSON.stringify(newKeys, null, 2), "utf-8");
  } catch (e) {
    console.error("[Push Service] Failed to write vapid-keys.json:", e.message);
  }
  try {
    const { setDoc: setDoc2 } = await import("firebase/firestore");
    await setDoc2((0, import_firestore2.doc)(db, "system_config", "vapid_keys"), newKeys);
    console.log("[Push Service] New stable VAPID keys saved inside persistent Firestore.");
  } catch (e) {
    console.error("[Push Service] Failed to write VAPID keys to Firestore:", e.message);
  }
  import_web_push.default.setVapidDetails(
    "mailto:suporte@barbearia.com",
    newKeys.publicKey,
    newKeys.privateKey
  );
  loadedVapidKeys = newKeys;
  return newKeys;
}
async function sendPushNotification(userId, payload) {
  try {
    const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
    const q1 = (0, import_firestore2.query)(
      (0, import_firestore2.collection)(db, "push_subscriptions"),
      (0, import_firestore2.where)("userId", "==", cleanUserId)
    );
    const q2 = (0, import_firestore2.query)(
      (0, import_firestore2.collection)(db, "push_subscriptions"),
      (0, import_firestore2.where)("userId", "==", userId)
    );
    const [snap1, snap2] = await Promise.all([(0, import_firestore2.getDocs)(q1), (0, import_firestore2.getDocs)(q2)]);
    const docMap = /* @__PURE__ */ new Map();
    snap1.docs.forEach((d) => docMap.set(d.id, d));
    snap2.docs.forEach((d) => docMap.set(d.id, d));
    const uniqueDocs = Array.from(docMap.values());
    if (uniqueDocs.length === 0) {
      console.log(`[Push Service] No active push subscriptions found for user: ${cleanUserId} or ${userId}`);
      return;
    }
    console.log(`[Push Service] Sending notification to ${uniqueDocs.length} device(s) for user: ${userId}`);
    const promises = uniqueDocs.map(async (docSnap) => {
      const data = docSnap.data();
      const subscription = data.subscription;
      try {
        await import_web_push.default.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        console.error(`[Push Service] Error sending to subscription:`, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Push Service] Subscription is dead. Cleaning up subscription: ${docSnap.id}`);
          try {
            await (0, import_firestore2.deleteDoc)((0, import_firestore2.doc)(db, "push_subscriptions", docSnap.id));
          } catch (deleteErr) {
            console.error(`[Push Service] Error deleting stale subscription:`, deleteErr.message);
          }
        }
      }
    });
    await Promise.all(promises);
  } catch (error) {
    console.error(`[Push Service] Failed to process notification for user ${userId}:`, error.message);
  }
}
async function sendNotificationToCollaborators(payload) {
  try {
    const q = (0, import_firestore2.query)((0, import_firestore2.collection)(db, "push_subscriptions"));
    const snapshot = await (0, import_firestore2.getDocs)(q);
    const targetRoles = ["manager", "barber"];
    const collaboratorsToNotify = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data();
      return targetRoles.includes(data.userRole || "");
    });
    console.log(`[Push Service] Notifying ${collaboratorsToNotify.length} collaborator devices`);
    const promises = collaboratorsToNotify.map(async (docSnap) => {
      const data = docSnap.data();
      try {
        await import_web_push.default.sendNotification(data.subscription, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await (0, import_firestore2.deleteDoc)((0, import_firestore2.doc)(db, "push_subscriptions", docSnap.id));
        }
      }
    });
    await Promise.all(promises);
  } catch (error) {
    console.error("[Push Service] Error in notifying collaborators:", error.message);
  }
}
function startAppointmentsListener() {
  console.log("[Push Service] Initializing appointments snapshot service...");
  let isInitial = true;
  const initialDocs = /* @__PURE__ */ new Set();
  const appointmentsRef = (0, import_firestore2.collection)(db, "appointments");
  const unsubscribe = (0, import_firestore2.onSnapshot)(appointmentsRef, (snapshot) => {
    if (isInitial) {
      snapshot.docs.forEach((docSnap) => {
        initialDocs.add(docSnap.id);
      });
      isInitial = false;
      console.log(`[Push Service] Baselined ${initialDocs.size} existing appointments. Real-time notifications active.`);
      return;
    }
    snapshot.docChanges().forEach(async (change) => {
      const docId = change.doc.id;
      const data = change.doc.data();
      let formattedDateStr = "";
      if (data.date) {
        try {
          const dateVal = data.date instanceof import_firestore2.Timestamp ? data.date.toDate() : new Date(data.date);
          formattedDateStr = dateVal.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (e) {
          formattedDateStr = String(data.date);
        }
      }
      const clientName = data.clientName || "Cliente";
      const serviceName = data.serviceName || "Servi\xE7o";
      const barberName = data.barberName || "Profissional";
      const clientId = data.clientId || "guest";
      const clientPhone = data.clientPhone || "";
      if (change.type === "added") {
        if (initialDocs.has(docId)) {
          return;
        }
        console.log(`[Push Service] New appointment created: ${docId}`);
        await sendNotificationToCollaborators({
          title: "Novo Agendamento! \u{1F4C5}",
          body: `${clientName} agendou ${serviceName} com ${barberName} em ${formattedDateStr}`,
          url: "/agenda"
        });
        const rawTarget = clientId && clientId !== "guest" ? clientId : clientPhone;
        const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
        if (clientTarget) {
          await sendPushNotification(clientTarget, {
            title: "Agendamento Solicitado! \u{1F389}",
            body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi recebido. Aguarde a confirma\xE7\xE3o!`,
            url: "/"
          });
        }
      }
      if (change.type === "modified") {
        console.log(`[Push Service] Appointment updated: ${docId}`);
        const status = data.status;
        const rawTarget = clientId && clientId !== "guest" ? clientId : clientPhone;
        const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
        const urlPath = "/";
        if (status === "confirmed" && clientTarget) {
          await sendPushNotification(clientTarget, {
            title: "Agendamento Confirmado! \u2705",
            body: `Excelente! Seu agendamento de ${serviceName} com ${barberName} foi confirmado para ${formattedDateStr}.`,
            url: urlPath
          });
        } else if (status === "cancelled") {
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Agendamento Cancelado \u274C",
              body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi cancelado.`,
              url: urlPath
            });
          }
          await sendNotificationToCollaborators({
            title: "Agendamento Cancelado \u26A0\uFE0F",
            body: `${clientName} cancelou o agendamento de ${serviceName} marcado para ${formattedDateStr}`,
            url: "/agenda"
          });
        } else if (status === "completed" && clientTarget) {
          await sendPushNotification(clientTarget, {
            title: "Atendimento Conclu\xEDdo! \u2B50",
            body: `Obrigado pela prefer\xEAncia! Avalie seu atendimento e ajude o profissional ${barberName}.`,
            url: urlPath
          });
        }
      }
    });
  }, (err) => {
    console.error("[Push Service] Snapshot error on appointments:", err.message);
  });
  return unsubscribe;
}

// src/server/appointmentAutoUpdater.ts
var import_firestore3 = require("firebase/firestore");
async function performHistoricalAppointmentUpdate() {
  console.log("[AutoUpdater] Performing historical appointment update...");
  try {
    const now = /* @__PURE__ */ new Date();
    const appointmentsRef = (0, import_firestore3.collection)(db, "appointments");
    const q = (0, import_firestore3.query)(appointmentsRef);
    const snapshot = await (0, import_firestore3.getDocs)(q);
    let count = 0;
    const updates = snapshot.docs.map(async (d) => {
      const data = d.data();
      const status = data.status;
      if (status !== "cancelled" && status !== "completed") {
        const appointmentDate = data.date instanceof import_firestore3.Timestamp ? data.date.toDate() : new Date(data.date);
        if (appointmentDate < now) {
          count++;
          await (0, import_firestore3.updateDoc)((0, import_firestore3.doc)(db, "appointments", d.id), {
            status: "completed",
            paymentStatus: "paid"
          });
        }
      }
    });
    await Promise.all(updates);
    console.log(`[AutoUpdater] Successfully updated ${count} historical appointments.`);
  } catch (err) {
    console.error("[AutoUpdater] Error in historical update:", err.message);
  }
}
function startAppointmentAutoUpdater() {
  console.log("[AutoUpdater] Initializing appointment auto-updater service...");
  performHistoricalAppointmentUpdate();
  setInterval(async () => {
    try {
      const now = /* @__PURE__ */ new Date();
      const appointmentsRef = (0, import_firestore3.collection)(db, "appointments");
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1e3);
      const q = (0, import_firestore3.query)(
        appointmentsRef,
        (0, import_firestore3.where)("status", "==", "confirmed")
      );
      const snapshot = await (0, import_firestore3.getDocs)(q);
      const updates = snapshot.docs.map(async (d) => {
        const data = d.data();
        const appointmentDate = data.date instanceof import_firestore3.Timestamp ? data.date.toDate() : new Date(data.date);
        if (appointmentDate < now) {
          console.log(`[AutoUpdater] Auto-completing appointment: ${d.id}`);
          await (0, import_firestore3.updateDoc)((0, import_firestore3.doc)(db, "appointments", d.id), {
            status: "completed",
            paymentStatus: "paid"
          });
          return;
        }
        if (appointmentDate > now && appointmentDate <= oneHourFromNow && !data.reminderSent) {
          console.log(`[Reminders] Preparing reminder for appointment: ${d.id}`);
          const latestDoc = await (0, import_firestore3.getDoc)((0, import_firestore3.doc)(db, "appointments", d.id));
          const latestData = latestDoc.data();
          if (latestData && latestData.status === "confirmed" && !latestData.reminderSent) {
            const rawTarget = latestData.clientId && latestData.clientId !== "guest" ? latestData.clientId : latestData.clientPhone;
            const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
            if (clientTarget) {
              console.log(`[Reminders] Sending notification to ${clientTarget}`);
              await sendPushNotification(clientTarget, {
                title: "Lembrete de Hor\xE1rio! \u{1F488}",
                body: `Lembrete: seu agendamento de ${latestData.serviceName} \xE9 em breve!`,
                url: "/"
              });
            }
            await (0, import_firestore3.updateDoc)((0, import_firestore3.doc)(db, "appointments", d.id), {
              reminderSent: true
            });
          }
        }
      });
      await Promise.all(updates);
    } catch (err) {
      console.error("[AutoUpdater] Error in auto-updater cycle:", err.message);
    }
  }, 6e4);
}

// server.ts
var import_firestore4 = require("firebase/firestore");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path2.default.dirname(__filename);
async function startServer() {
  const app2 = (0, import_express.default)();
  const PORT = 3e3;
  app2.use(import_express.default.json({ limit: "50mb" }));
  app2.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app2.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  const vapid = await initVapid();
  startAppointmentsListener();
  startAppointmentAutoUpdater();
  const upload = (0, import_multer.default)({
    storage: import_multer.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
    // 50MB limit
  });
  app2.get("/api/push-config", (req, res) => {
    res.json({ publicKey: vapid.publicKey });
  });
  app2.post("/api/subscribe", async (req, res) => {
    const { subscription, userId, userRole } = req.body;
    if (!subscription || !userId) {
      return res.status(400).json({ error: "Missing subscription or userId" });
    }
    try {
      const subRef = (0, import_firestore4.doc)(db, "push_subscriptions", userId);
      await (0, import_firestore4.setDoc)(subRef, {
        userId,
        userRole: userRole || "client",
        subscription,
        createdAt: (0, import_firestore4.serverTimestamp)()
      }, { merge: true });
      res.status(201).json({ success: true });
    } catch (err) {
      console.error("[Push Service] Error saving subscription:", err.message);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });
  app2.post("/api/push-test", async (req, res) => {
    const { userId, isCollaborator, delayMs = 5e3, title, body } = req.body;
    res.json({ success: true, message: `Push test scheduled to run in ${delayMs / 1e3} seconds.` });
    setTimeout(async () => {
      try {
        const payload = {
          title: title || "Teste em 2\xBA Plano! \u{1F488}",
          body: body || "Esta \xE9 uma notifica\xE7\xE3o simulando o app em segundo plano ap\xF3s 5 segundos.",
          url: "/"
        };
        if (isCollaborator) {
          await sendNotificationToCollaborators(payload);
        } else if (userId) {
          await sendPushNotification(userId, payload);
        }
      } catch (err) {
        console.error("[Push Test Route] Error delivering delayed push:", err.message);
      }
    }, delayMs);
  });
  app2.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      const apiKey = process.env.IMGBB_API_KEY || process.env.VITE_IMGBB_API_KEY;
      if (!apiKey) {
        throw new Error("IMGBB_API_KEY ou VITE_IMGBB_API_KEY n\xE3o configurada no servidor");
      }
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }
      const formData = new import_form_data.default();
      formData.append("image", req.file.buffer, {
        filename: req.file.originalname || "image.jpg",
        contentType: req.file.mimetype || "image/jpeg"
      });
      const response = await import_axios.default.post(`https://api.imgbb.com/1/upload?key=${apiKey}`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      res.json(response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error("ImgBB Upload error details:", error.response?.data || error.message);
      res.status(500).json({ error: errorMsg || "Erro ao processar upload na MS Barbearia" });
    }
  });
  async function processApprovedPayment(paymentDoc) {
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
          const userRef = (0, import_firestore4.doc)(db, "users", parsedUserId);
          const paymentRef = (0, import_firestore4.doc)(db, "payments", String(paymentId));
          let totalAdded = 0;
          let bonus = 0;
          let userData = null;
          await (0, import_firestore4.runTransaction)(db, async (t) => {
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
              updatedAt: (0, import_firestore4.serverTimestamp)()
            });
            t.update(paymentRef, {
              processedWallet: true,
              updatedAt: (0, import_firestore4.serverTimestamp)()
            });
          });
          if (totalAdded > 0 && userData) {
            await (0, import_firestore4.addDoc)((0, import_firestore4.collection)(db, "notifications"), {
              clientEmail: email || userData.email || "",
              message: `Recarga Aprovada! R$ ${totalAdded.toFixed(2).replace(".", ",")} adicionados \xE0 sua Carteira Digital atrav\xE9s do Pix Mercado Pago.`,
              timestamp: (0, import_firestore4.serverTimestamp)(),
              read: false
            });
            await sendPushNotification(parsedUserId, {
              title: "Recarga Aprovada! \u{1F4B0}",
              body: `Seu Pix de R$ ${amount.toFixed(2).replace(".", ",")} foi recebido! R$ ${totalAdded.toFixed(2).replace(".", ",")} foram adicionados na sua carteira.`,
              url: "/"
            });
            console.log(`[Payment Processor] Successfully topped up wallet of user: ${parsedUserId} with R$ ${totalAdded}`);
          }
        } catch (err) {
          console.error(`[Payment Processor] Error during wallet topup: ${err.message}`);
        }
      }
    } else if (appointmentId) {
      try {
        const appointmentRef = (0, import_firestore4.doc)(db, "appointments", appointmentId);
        const paymentRef = (0, import_firestore4.doc)(db, "payments", String(paymentId));
        let shouldNotify = false;
        let appData = null;
        await (0, import_firestore4.runTransaction)(db, async (t) => {
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
            const uRef = (0, import_firestore4.doc)(db, "users", pData.userId);
            t.update(uRef, {
              walletBalance: (0, import_firestore4.increment)(-pData.walletAmountToDeduct),
              updatedAt: (0, import_firestore4.serverTimestamp)()
            });
          }
          t.update(appointmentRef, {
            status: "confirmed",
            paymentStatus: "paid",
            updatedAt: (0, import_firestore4.serverTimestamp)()
          });
          if (pSnap.exists()) {
            t.update(paymentRef, {
              processedAppointment: true,
              updatedAt: (0, import_firestore4.serverTimestamp)()
            });
          }
          shouldNotify = true;
        });
        if (shouldNotify && appData) {
          const appClientId = appData.clientId;
          if (appClientId && appClientId !== "guest") {
            try {
              const userRef = (0, import_firestore4.doc)(db, "users", appClientId);
              const userSnap = await (0, import_firestore4.getDoc)(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.referredBy && !userData.referralRewardTriggered) {
                  const appsQuery = (0, import_firestore4.query)(
                    (0, import_firestore4.collection)(db, "appointments"),
                    (0, import_firestore4.where)("clientId", "==", appClientId),
                    (0, import_firestore4.where)("paymentStatus", "==", "paid"),
                    (0, import_firestore4.limit)(2)
                  );
                  const appsSnap = await (0, import_firestore4.getDocs)(appsQuery);
                  if (appsSnap.size === 1) {
                    const referrerQuery = (0, import_firestore4.query)((0, import_firestore4.collection)(db, "users"), (0, import_firestore4.where)("referralCode", "==", userData.referredBy));
                    const referrerSnap = await (0, import_firestore4.getDocs)(referrerQuery);
                    if (!referrerSnap.empty) {
                      const referrerDoc = referrerSnap.docs[0];
                      const referrerId = referrerDoc.id;
                      await (0, import_firestore4.runTransaction)(db, async (rt) => {
                        rt.update((0, import_firestore4.doc)(db, "users", referrerId), {
                          walletBalance: (0, import_firestore4.increment)(5),
                          updatedAt: (0, import_firestore4.serverTimestamp)()
                        });
                        rt.update(userRef, {
                          referralRewardTriggered: true,
                          updatedAt: (0, import_firestore4.serverTimestamp)()
                        });
                      });
                      console.log(`[Referral] User ${referrerId} rewarded for referral of ${appClientId}`);
                      await sendPushNotification(referrerId, {
                        title: "B\xF4nus de Indica\xE7\xE3o! \u{1F381}",
                        body: `Voc\xEA ganhou R$ 5,00 pois um amigo que voc\xEA indicou acaba de realizar o primeiro corte!`,
                        url: "/"
                      });
                    }
                  }
                }
              }
            } catch (refErr) {
              console.error("[Referral Processor Error]:", refErr.message);
            }
          }
          const clientName = appData.clientName || "Cliente";
          const serviceName = appData.serviceName || "Servi\xE7o";
          const barberName = appData.barberName || "Profissional";
          const appClientIdForNotify = appData.clientId || "guest";
          const clientPhone = appData.clientPhone || "";
          let formattedDateStr = "";
          if (appData.date) {
            try {
              const dateVal = appData.date instanceof import_firestore4.Timestamp ? appData.date.toDate() : new Date(appData.date);
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
            title: "Novo Pagamento Pix Confirmado! \u{1F4F1}",
            body: `Pix de ${clientName} aprovado para ${serviceName} \xE0s ${appData.time} com ${barberName}.`,
            url: "/agenda"
          });
          const rawTarget = appClientIdForNotify && appClientIdForNotify !== "guest" ? appClientIdForNotify : clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Pagamento Confirmado! \u2705",
              body: `Seu Pix foi recebido! Seu agendamento de ${serviceName} para ${formattedDateStr} est\xE1 confirmado.`,
              url: "/"
            });
          }
          console.log(`[Payment Processor] Confirmed appointment: ${appointmentId} due to payment ${paymentId}`);
        }
      } catch (err) {
        console.error(`[Payment Processor] Error during appointment payment confirmation: ${err.message}`);
      }
    }
  }
  app2.post("/api/payments/mercado-pago/create-payment", async (req, res) => {
    const { transaction_amount, description, email, name, appointmentId, userId: providedUserId, walletAmountToDeduct } = req.body;
    const amount = Number(transaction_amount);
    try {
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid transaction amount" });
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
        console.warn("[Mercado Pago] ACCESS_TOKEN not configured. Returning simulated payment payload.");
        const simulatedPaymentId = "mp-sim-" + Math.floor(Math.random() * 9e8 + 1e8).toString();
        const paymentPayload = {
          success: true,
          isMock: true,
          status: "pending",
          status_detail: "pending_waiting_transfer",
          qr_code: "00020101021226870014br.gov.bcb.pix2572em-breve-mercado-pago-completo-integrado-barbearia-prod",
          qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          payment_id: simulatedPaymentId,
          message: "Em breve estar\xE1 dispon\xEDvel para o cliente"
        };
        await (0, import_firestore4.setDoc)((0, import_firestore4.doc)(db, "payments", simulatedPaymentId), {
          id: simulatedPaymentId,
          appointmentId: appointmentId || null,
          userId,
          walletAmountToDeduct: walletAmountToDeduct || 0,
          amount,
          description: description || "Simulated payment",
          status: "pending",
          email: email || "simulation@example.com",
          name: name || "Cliente de Teste",
          isMock: true,
          createdAt: (0, import_firestore4.serverTimestamp)()
        });
        return res.json(paymentPayload);
      }
      const idempotencyKey = "mp-pix-" + Math.random().toString(36).substring(2) + Date.now().toString();
      const response = await import_axios.default.post("https://api.mercadopago.com/v1/payments", {
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
      await (0, import_firestore4.setDoc)((0, import_firestore4.doc)(db, "payments", mpPaymentId), {
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
        createdAt: (0, import_firestore4.serverTimestamp)()
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
    } catch (error) {
      console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
      const fallbackPaymentId = "mp-fallback-" + Math.floor(Math.random() * 9e8 + 1e8).toString();
      await (0, import_firestore4.setDoc)((0, import_firestore4.doc)(db, "payments", fallbackPaymentId), {
        id: fallbackPaymentId,
        appointmentId: appointmentId || null,
        userId: "guest",
        amount,
        description: description || "Agendamento MS Barbearia",
        status: "pending",
        email: email || "payment@example.com",
        name: name || "Cliente",
        isMock: true,
        createdAt: (0, import_firestore4.serverTimestamp)()
      });
      res.json({
        success: true,
        isMock: true,
        status: "pending",
        status_detail: "pending_waiting_transfer",
        qr_code: "00020101021226870014br.gov.bcb.pix2572em-breve-mercado-pago-completo-integrado-barbearia-prod",
        qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        payment_id: fallbackPaymentId,
        message: "Mercado Pago offline ou credenciais inv\xE1lidas. Exibindo simulador."
      });
    }
  });
  app2.get("/api/payments/mercado-pago/status/:paymentId", async (req, res) => {
    try {
      const { paymentId } = req.params;
      const paymentRef = (0, import_firestore4.doc)(db, "payments", paymentId);
      const paymentSnap = await (0, import_firestore4.getDoc)(paymentRef);
      if (!paymentSnap.exists()) {
        return res.status(404).json({ error: "Payment not found" });
      }
      const paymentData = paymentSnap.data();
      if (paymentData.status === "approved" || paymentData.status === "completed") {
        return res.json({ status: "approved" });
      }
      if (!paymentData.isMock && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        try {
          const mpResponse = await import_axios.default.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
            }
          });
          const currentMpStatus = mpResponse.data.status;
          if (currentMpStatus === "approved") {
            await (0, import_firestore4.updateDoc)(paymentRef, {
              status: "approved",
              updatedAt: (0, import_firestore4.serverTimestamp)()
            });
            await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });
            return res.json({ status: "approved" });
          }
        } catch (mpError) {
          console.error("[Polling] Error verifying on MP:", mpError.message);
        }
      }
      res.json({ status: paymentData.status });
    } catch (e) {
      console.error("[Polling Error]:", e.message);
      res.status(500).json({ error: "Failed to check status" });
    }
  });
  app2.post("/api/payments/mercado-pago/simulate-payment", async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ error: "Missing paymentId" });
      }
      const paymentRef = (0, import_firestore4.doc)(db, "payments", paymentId);
      const paymentSnap = await (0, import_firestore4.getDoc)(paymentRef);
      if (!paymentSnap.exists()) {
        return res.status(404).json({ error: "Payment not found in log" });
      }
      const paymentData = paymentSnap.data();
      if (paymentData.status === "approved" || paymentData.status === "completed") {
        return res.json({ success: true, alreadyPaid: true });
      }
      await (0, import_firestore4.updateDoc)(paymentRef, {
        status: "approved",
        updatedAt: (0, import_firestore4.serverTimestamp)()
      });
      await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });
      res.json({ success: true });
    } catch (e) {
      console.error("[Simulation Error]:", e.message);
      res.status(500).json({ error: "Failed to simulate payment" });
    }
  });
  app2.post("/api/payments/mercado-pago/webhook", async (req, res) => {
    try {
      const paymentId = req.query.id || req.body.data?.id;
      const topic = req.query.topic || req.body.type;
      if ((topic === "payment" || topic === "payment.updated") && paymentId) {
        console.log(`[MP Webhook] Received payment update notification for: ${paymentId}`);
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (accessToken) {
          const mpResponse = await import_axios.default.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });
          if (mpResponse.data.status === "approved") {
            const paymentRef = (0, import_firestore4.doc)(db, "payments", String(paymentId));
            const paymentSnap = await (0, import_firestore4.getDoc)(paymentRef);
            if (paymentSnap.exists()) {
              const paymentData = paymentSnap.data();
              if (paymentData.status !== "approved" && paymentData.status !== "completed") {
                await (0, import_firestore4.updateDoc)(paymentRef, {
                  status: "approved",
                  updatedAt: (0, import_firestore4.serverTimestamp)()
                });
                await processApprovedPayment({ id: String(paymentId), ...paymentData, status: "approved" });
              }
            } else {
              console.warn(`[MP Webhook] Received webhook for unrecorded payment ${paymentId}. Creating record from MP data...`);
              const mpExtRef = mpResponse.data.external_reference;
              const payload = {
                id: String(paymentId),
                appointmentId: mpExtRef && mpExtRef.includes("wallet-topup") ? mpExtRef : mpExtRef || null,
                userId: mpExtRef && mpExtRef.includes("wallet-topup") ? "guest" : mpExtRef || "guest",
                amount: mpResponse.data.transaction_amount,
                status: "approved",
                email: mpResponse.data.payer?.email || "",
                name: mpResponse.data.payer?.first_name || "",
                isMock: false,
                createdAt: (0, import_firestore4.serverTimestamp)()
              };
              if (payload.appointmentId?.startsWith("wallet-topup-")) {
                const withoutPrefix = payload.appointmentId.substring("wallet-topup-".length);
                const lastDash = withoutPrefix.lastIndexOf("-");
                if (lastDash > 0) {
                  payload.userId = withoutPrefix.substring(0, lastDash);
                }
              }
              await (0, import_firestore4.setDoc)(paymentRef, payload);
              await processApprovedPayment(payload);
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (e) {
      console.error("[MP Webhook Error]:", e.message);
      res.sendStatus(200);
    }
  });
  app2.post("/api/appointments/cancel", async (req, res) => {
    const { appointmentId, userId } = req.body;
    if (!appointmentId || !userId) {
      return res.status(400).json({ error: "Missing appointmentId or userId" });
    }
    try {
      const appointmentRef = (0, import_firestore4.doc)(db, "appointments", appointmentId);
      let refundedAmount = 0;
      let appData = null;
      await (0, import_firestore4.runTransaction)(db, async (t) => {
        const appSnap = await t.get(appointmentRef);
        if (!appSnap.exists()) {
          throw new Error("Appointment not found");
        }
        appData = appSnap.data();
        if (appData.status === "cancelled") {
          throw new Error("Appointment already cancelled");
        }
        if (appData.clientId !== userId) {
          console.warn(`[Cancellation] Ownership mismatch: app.clientId(${appData.clientId}) != req.userId(${userId})`);
        }
        const updates = {
          status: "cancelled",
          cancelledBy: "client",
          updatedAt: (0, import_firestore4.serverTimestamp)()
        };
        if (appData.paymentStatus === "paid" && appData.totalPrice > 0 && userId !== "guest") {
          const userRef = (0, import_firestore4.doc)(db, "users", userId);
          const userSnap = await t.get(userRef);
          if (userSnap.exists()) {
            t.update(userRef, {
              walletBalance: (0, import_firestore4.increment)(appData.totalPrice),
              updatedAt: (0, import_firestore4.serverTimestamp)()
            });
            refundedAmount = appData.totalPrice;
            updates.refundedToWallet = true;
          }
        }
        t.update(appointmentRef, updates);
      });
      if (appData) {
        try {
          const dateVal = appData.date instanceof import_firestore4.Timestamp ? appData.date.toDate() : new Date(appData.date);
          const formattedDate = dateVal.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
          await (0, import_firestore4.addDoc)((0, import_firestore4.collection)(db, "staff_notifications"), {
            type: "cancellation",
            message: `Agendamento Cancelado: ${appData.clientName} cancelou ${appData.serviceName} marcado para ${formattedDate}`,
            timestamp: (0, import_firestore4.serverTimestamp)(),
            read: false,
            clientId: userId,
            appointmentId
          });
        } catch (notifierErr) {
          console.error("Error creating staff notification:", notifierErr);
        }
      }
      res.json({ success: true, refundedAmount });
    } catch (e) {
      console.error("[Cancellation Error]:", e.message);
      res.status(500).json({ error: e.message || "Failed to cancel appointment" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
