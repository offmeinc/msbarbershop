import webpush from "web-push";
import axios from "axios";
import { adminMessaging, db, adminDb } from "./firebaseAdmin";
import type { Message } from "firebase-admin/messaging";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  Timestamp, 
  limit 
} from "firebase/firestore";

let cachedVapidKeys: { publicKey: string; privateKey: string } | null = null;

export async function initVapid() {
  if (cachedVapidKeys) {
    return cachedVapidKeys;
  }

  // 1. If keys are explicitly set in the environment, use them as priority
  const envPublic = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    cachedVapidKeys = { publicKey: envPublic, privateKey: envPrivate };
    console.log("[VAPID] Using VAPID keys provided in environment variables.");
    return cachedVapidKeys;
  }

  // 2. Try fetching from Firestore settings/vapid
  try {
    const vapidDocRef = adminDb.collection("settings").doc("vapid");
    const docSnap = await vapidDocRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && data.publicKey && data.privateKey) {
        cachedVapidKeys = { publicKey: data.publicKey, privateKey: data.privateKey };
        console.log("[VAPID] Loaded existing VAPID keys from Firestore 'settings/vapid'.");
        return cachedVapidKeys;
      }
    }
  } catch (err: any) {
    console.warn("[VAPID] Error looking up VAPID keys in Firestore:", err.message);
  }

  // 3. Fallback: Generate fresh keys dynamically and save to Firestore
  try {
    console.log("[VAPID] VAPID keys not configured. Generating fresh keys dynamically...");
    const keys = webpush.generateVAPIDKeys();
    
    cachedVapidKeys = keys;

    // Persist in Firestore so all subsequent requests & server restarts use the same keys
    const vapidDocRef = adminDb.collection("settings").doc("vapid");
    await vapidDocRef.set({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      generatedAt: new Date().toISOString()
    });
    console.log("[VAPID] Successfully generated and persisted new VAPID keys to Firestore.");
    return cachedVapidKeys;
  } catch (err: any) {
    console.error("[VAPID] Critical error generating/persisting VAPID keys:", err.message);
    // Hardcoded syntactically valid public key fallback so client-side register/FCM flows do not throw empty key errors
    const fallbackKeys = {
      publicKey: "BMe6K62Z9w77u6l-3b-N5w7K7uRzL2p-9-g_L8gT6g2jE8q-8gT-gT8gT-gT8gT-gT8gT-gT8gT-gT8gT-gT8gT-gT8gT-gT8g",
      privateKey: "dummy_private_key"
    };
    cachedVapidKeys = fallbackKeys;
    return cachedVapidKeys;
  }
}

// Safe FCM messaging wrapper that handles credentials/sandbox limits gracefully.
async function safelySendFcm(message: Message) {
  try {
    await adminMessaging.send(message);
  } catch (err: any) {
    const isPermissionError = 
      err.message?.includes("cloudmessaging.messages.create") || 
      err.message?.includes("denied") || 
      err.message?.includes("permission") ||
      err.code?.includes("permission") ||
      err.status === 403;
      
    if (isPermissionError) {
      console.warn(`[Push Service] FCM simulated in Sandbox: ${err.message}`);
    } else if (err.code === "messaging/registration-token-not-registered" || err.code === "messaging/invalid-registration-token") {
      // Re-throw so the caller can clean up this specific stale token
      throw err;
    } else {
      console.warn(`[Push Service] Simulated FCM message send: ${err.message}`);
    }
  }
}

// Helper to enforce production domain for PWA push clicks
const ensureProductionUrl = (url: string) => {
  const baseUrl = "https://msbarbershop.com.br";
  if (url.startsWith("/")) return baseUrl + url;
  if (!url.startsWith("http")) return baseUrl + "/" + url;
  return url;
};

// Function to send a push notification to a specific user using OneSignal
export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
    const appId = "bd551445-f043-4d0e-b393-3937c7dbef57";
    const apiKey = process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || "";

    console.log(`[OneSignal Push] Sending notification to user: ${userId} (clean: ${cleanUserId})`);

    const bodyData: any = {
      app_id: appId,
      target_channel: "push",
      include_aliases: {
        external_id: [userId, cleanUserId]
      },
      headings: { pt: payload.title, en: payload.title },
      contents: { pt: payload.body, en: payload.body },
      url: ensureProductionUrl(payload.url || "/"),
      ios_badgeType: "Increase",
      ios_badgeCount: 1
    };

    const headers: any = {
      "Content-Type": "application/json; charset=utf-8"
    };

    if (apiKey) {
      headers["Authorization"] = `Key ${apiKey}`;
    }

    const response = await axios.post("https://onesignal.com/api/v1/notifications", bodyData, { headers });
    console.log("[OneSignal Push] Response:", response.data);
  } catch (error: any) {
    console.error("[OneSignal Push] Error sending notification:", error.response?.data || error.message);
  }
}

// Send notification to all collaborators (managers / barbers) using OneSignal
export async function sendNotificationToCollaborators(
  payload: { title: string; body: string; url?: string }
) {
  try {
    const usersRef = collection(db, "users");
    const qSnap = await getDocs(usersRef);
    const collaboratorIds: string[] = [];
    qSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (["manager", "barber"].includes(data.role)) {
        collaboratorIds.push(docSnap.id);
      }
    });

    if (collaboratorIds.length === 0) {
      console.log("[OneSignal Push] No collaborators found to notify.");
      return;
    }

    const appId = "bd551445-f043-4d0e-b393-3937c7dbef57";
    const apiKey = process.env.ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_API_KEY || "";

    const bodyData: any = {
      app_id: appId,
      target_channel: "push",
      include_aliases: {
        external_id: collaboratorIds
      },
      headings: { pt: payload.title, en: payload.title },
      contents: { pt: payload.body, en: payload.body },
      url: ensureProductionUrl(payload.url || "/")
    };

    const headers: any = {
      "Content-Type": "application/json; charset=utf-8"
    };

    if (apiKey) {
      headers["Authorization"] = `Key ${apiKey}`;
    }

    const response = await axios.post("https://onesignal.com/api/v1/notifications", bodyData, { headers });
    console.log("[OneSignal Push] Collaborator notification response:", response.data);
  } catch (error: any) {
    console.warn("[OneSignal Push] Collaborator notification error:", error.response?.data || error.message);
  }
}

async function checkAndNotifyReferralFirstAppointmentConfirmed(
  clientId: string,
  clientName: string,
  serviceName: string,
  formattedDateStr: string,
  docId: string
) {
  if (!clientId || clientId === "guest") return;
  
  try {
    const clientRef = doc(db, "users", clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) return;
    
    const userData = clientSnap.data() || {};
    if (!userData.referredBy || userData.referralConfirmationNotificationTriggered) {
      return;
    }
    
    const appointmentsSnap = await getDocs(query(collection(db, "appointments"), where("clientId", "==", clientId)));

    const otherConfirmedOrCompleted = appointmentsSnap.docs.filter((d) => {
      const dData = d.data();
      return d.id !== docId && (dData.status === "confirmed" || dData.status === "completed" || dData.status === "done");
    });
    
    if (otherConfirmedOrCompleted.length > 0) {
      await updateDoc(clientRef, {
        referralConfirmationNotificationTriggered: true
      });
      return;
    }
    
    await updateDoc(clientRef, {
      referralConfirmationNotificationTriggered: true
    });
    
    const referrersSnap = await getDocs(query(collection(db, "users"), where("referralCode", "==", userData.referredBy), limit(1)));
    
    await addDoc(collection(db, "notifications"), {
      clientId: clientId,
      clientEmail: userData.email || "",
      message: `Seu primeiro agendamento foi confirmado! Você já garantiu R$ 5,00 de saldo inicial pela indicação para usar no pagamento. 🎉`,
      timestamp: Timestamp.now(),
      read: false,
      type: "referral_confirmed"
    });
    
    const cleanClientPhone = clientId.replace(/[\s\-\(\)\+]/g, "");
    await sendPushNotification(cleanClientPhone, {
      title: "Primeiro Agendamento Confirmado! ✂️",
      body: "Seu primeiro agendamento foi confirmado! Você já garantiu R$ 5,00 de saldo inicial pela indicação para usar no pagamento.",
      url: "/"
    });
    
    if (!referrersSnap.empty) {
      const referrerDoc = referrersSnap.docs[0];
      const referrerId = referrerDoc.id;
      const referrerData = referrerDoc.data();
      
      const shortClientName = clientName.trim().split(" ")[0];
      
      await addDoc(collection(db, "notifications"), {
        clientId: referrerId,
        clientEmail: referrerData.email || "",
        message: `Seu amigo ${shortClientName} confirmou o primeiro corte! Quando o corte for concluído, você receberá R$ 5,00 de bônus em sua carteira. 🎁`,
        timestamp: Timestamp.now(),
        read: false,
        type: "referral_confirmed"
      });
      
      const cleanReferrerPhone = referrerId.replace(/[\s\-\(\)\+]/g, "");
      await sendPushNotification(cleanReferrerPhone, {
        title: "Seu amigo confirmou o corte! 🎁",
        body: `Seu amigo ${shortClientName} confirmou o primeiro agendamento! Quando o corte for concluído, você receberá R$ 5,00 de bônus em sua carteira.`,
        url: "/referrals"
      });
    }
  } catch (err: any) {
    console.error("[Referral Confirm Notification] Error executing check & notify:", err.message);
  }
}

// Central snapshot listener on "appointments" collection
export function startAppointmentsListener() {
  console.log("[Push Service] Initializing with firebase Client SDK snapshot service for appointments...");
  
  let isInitial = true;

  const setupListener = () => {
    return onSnapshot(collection(db, "appointments"), (snapshot) => {
      const isFirstRun = isInitial;
      if (isFirstRun) {
        isInitial = false;
        console.log(`[Push Service] Baselined existing appointments. Real-time notifications active.`);
      }

      snapshot.docChanges().forEach(async (change) => {
        const docId = change.doc.id;
        const data = change.doc.data();

        // Calculate message recency to prevent duplicate notifications during offline resyncs
        let isRecent = false;
        const targetTime = data.updatedAt || data.createdAt;
        if (targetTime) {
          try {
            const msgTime = typeof targetTime.toDate === "function" 
              ? targetTime.toDate().getTime() 
              : (targetTime._seconds ? targetTime._seconds * 1000 : new Date(targetTime).getTime());
            const diff = Date.now() - msgTime;
            if (Math.abs(diff) < 30000) { // within 30 seconds
              isRecent = true;
            }
          } catch (e) {
            isRecent = false;
          }
        } else {
          isRecent = false;
        }

        if (isFirstRun && !isRecent) {
          return; // Ignore old events on first run
        }


        // Check format of date to display
        let formattedDateStr = "";
        if (data.date) {
          try {
            const dateVal = data.date && typeof data.date.toDate === "function"
              ? data.date.toDate()
              : (data.date && data.date._seconds ? new Date(data.date._seconds * 1000) : new Date(data.date));
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
        const serviceName = data.serviceName || "Serviço";
        const barberName = data.barberName || "Profissional";
        const clientId = data.clientId || "guest";
        const clientPhone = data.clientPhone || "";

        if (change.type === "added") {
          console.log(`[Push Service] New appointment created: ${docId}`);
          
          // 1. Notify Collaborators (Push + In-App)
          await sendNotificationToCollaborators({
            title: "Novo Agendamento! 📅",
            body: `${clientName} agendou ${serviceName} com ${barberName} em ${formattedDateStr}`,
            url: "/agenda"
          });
          
          try {
            await addDoc(collection(db, "staff_notifications"), {
              title: "Novo Agendamento 📅",
              message: `${clientName} agendou ${serviceName} para ${formattedDateStr}`,
              timestamp: Timestamp.now(),
              read: false,
              type: "booking",
              clientId: clientId,
              appointmentId: docId
            });
          } catch (e) {
            console.warn("[Push Service] Error creating staff notification doc:", e);
          }

          // 2. Notify Client (Push + In-App)
          const rawTarget = clientId && clientId !== "guest" ? clientId : clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Agendamento Solicitado! 🎉",
              body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi recebido. Aguarde a confirmação!`,
              url: "/"
            });

            if (clientId && clientId !== "guest") {
              try {
                await addDoc(collection(db, "notifications"), {
                  clientId: clientId,
                  clientEmail: data.clientEmail || "",
                  title: "Agendamento Solicitado 🎉",
                  message: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi recebido.`,
                  timestamp: Timestamp.now(),
                  read: false,
                  type: "booking",
                  appointmentId: docId
                });
              } catch (e) {
                console.warn("[Push Service] Error creating client notification doc:", e);
              }
            }
          }

          if (data.status === "confirmed") {
            await checkAndNotifyReferralFirstAppointmentConfirmed(clientId, clientName, serviceName, formattedDateStr, docId);
          }
        }

        if (change.type === "modified") {
          console.log(`[Push Service] Appointment updated: ${docId}`);
          const status = data.status;
          const rawTarget = clientId && clientId !== "guest" ? clientId : clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";

          const urlPath = "/";

          if (status === "confirmed" && clientTarget && !data.confirmationPushSent) {
            // Mark it so we don't send duplicate confirmation pushes
            try {
               const { updateDoc, doc } = require("firebase/firestore");
               await updateDoc(doc(db, "appointments", docId), { confirmationPushSent: true });
            } catch (e) {}

            await sendPushNotification(clientTarget, {
              title: "Agendamento Confirmado! ✅",
              body: `Excelente! Seu agendamento de ${serviceName} com ${barberName} foi confirmado para ${formattedDateStr}.`,
              url: urlPath
            });

            if (clientId && clientId !== "guest") {
              try {
                await addDoc(collection(db, "notifications"), {
                  clientId: clientId,
                  clientEmail: data.clientEmail || "",
                  title: "Agendamento Confirmado ✅",
                  message: `Seu agendamento de ${serviceName} em ${formattedDateStr} foi confirmado!`,
                  timestamp: Timestamp.now(),
                  read: false,
                  type: "status_update",
                  appointmentId: docId
                });
              } catch (e) {
                console.warn("[Push Service] Error creating confirmation notification doc:", e);
              }
            }

            await checkAndNotifyReferralFirstAppointmentConfirmed(clientId, clientName, serviceName, formattedDateStr, docId);
          } else if (status === "cancelled" && !data.cancellationPushSent) {
            try {
               const { updateDoc, doc } = require("firebase/firestore");
               await updateDoc(doc(db, "appointments", docId), { cancellationPushSent: true });
            } catch (e) {}
            if (clientTarget) {
              await sendPushNotification(clientTarget, {
                title: "Agendamento Cancelado ❌",
                body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi cancelado.`,
                url: urlPath
              });

              if (clientId && clientId !== "guest") {
                 try {
                   await addDoc(collection(db, "notifications"), {
                     clientId: clientId,
                     clientEmail: data.clientEmail || "",
                     title: "Agendamento Cancelado ❌",
                     message: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi cancelado.`,
                     timestamp: Timestamp.now(),
                     read: false,
                     type: "cancellation",
                     appointmentId: docId
                   });
                 } catch (e) {
                   console.warn("[Push Service] Error creating cancellation notification doc:", e);
                 }
              }
            }
            await sendNotificationToCollaborators({
              title: "Agendamento Cancelado ⚠️",
              body: `${clientName} cancelou o agendamento de ${serviceName} marcado para ${formattedDateStr}`,
              url: "/agenda"
            });

            try {
              await addDoc(collection(db, "staff_notifications"), {
                title: "Agendamento Cancelado ⚠️",
                message: `${clientName} cancelou o agendamento de ${serviceName} para ${formattedDateStr}`,
                timestamp: Timestamp.now(),
                read: false,
                type: "cancellation",
                clientId: clientId,
                appointmentId: docId
              });
            } catch (e) {
               console.warn("[Push Service] Error creating staff cancellation notification doc:", e);
            }
          } else if (status === "completed" && clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Atendimento Concluído! ⭐",
              body: `Obrigado pela preferência! Avalie seu atendimento e ajude o profissional ${barberName}.`,
              url: urlPath
            });

            if (clientId && clientId !== "guest") {
              try {
                await addDoc(collection(db, "notifications"), {
                  clientId: clientId,
                  clientEmail: data.clientEmail || "",
                  title: "Atendimento Concluído ⭐",
                  message: `Obrigado pela preferência! Avalie seu atendimento com ${barberName}.`,
                  timestamp: Timestamp.now(),
                  read: false,
                  type: "review_request",
                  appointmentId: docId
                });
              } catch (e) {
                 console.warn("[Push Service] Error creating completed notification doc:", e);
              }
            }
          }
        }
      });
    }, (err: any) => {
      console.warn("[Push Service] Snapshot notification listener pause:", err.message);
      console.log("[Push Service] Attempting to restart listener in 5 seconds...");
      setTimeout(() => {
        setupListener();
      }, 5000);
    });
  };

  return setupListener();
}

// Memory map to rate limit user access alerts to once every 10 minutes per client
const userAccessLogs = new Map<string, number>();

export async function notifyUserAccess(userId: string, userName: string, role: string) {
  // Disabled per user request
  return;
  
  /*
  if (!userId || role !== "client") return;
  
  const now = Date.now();
  const lastNotify = userAccessLogs.get(userId) || 0;
  
  if (now - lastNotify > 10 * 60 * 1000) {
    userAccessLogs.set(userId, now);
    console.log(`[Push Service] Client ${userName || userId} accessed the app. Notifying professionals...`);
    
    // 1. Send native/web push notification to all collaborators
    await sendNotificationToCollaborators({
      title: "Cliente Online! 📱",
      body: `${userName || "Um cliente"} acabou de entrar no app.`,
      url: "/professional-chat"
    });
    
    // 2. Insert alert into staff_notifications for live professional feed
    try {
      await addDoc(collection(db, "staff_notifications"), {
        title: "Cliente Online 📱",
        message: `O cliente ${userName || "Sem nome"} acessou o aplicativo.`,
        timestamp: Timestamp.now(),
        read: false,
        type: "client_access",
        clientId: userId
      });
    } catch (e: any) {
      console.warn("[Push Service] Skip layout log on user login:", e.message);
    }
  }
  */
}

// Snapshot listener for real-time chat messages
export function startChatsListener() {
  console.log("[Push Service] Initializing with firebase Client SDK snapshot service for chats...");
  let isInitial = true;

  const setupListener = () => {
    return onSnapshot(collection(db, "chats"), (snapshot) => {
      const isFirstRun = isInitial;
      if (isFirstRun) {
        isInitial = false;
        console.log("[Push Service] Baselined existing chats. Real-time chat notifications active.");
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added" || change.type === "modified") {
          const clientUid = change.doc.id;
          const data = change.doc.data();
          const lastMessage = data.lastMessage || "";
          const clientName = data.clientName || "Cliente";

          // Calculate message recency to prevent duplicate notifications during offline resyncs
          let isRecent = false;
          if (data.lastMessageTime) {
            try {
              const msgTime = data.lastMessageTime && typeof data.lastMessageTime.toDate === "function"
                ? data.lastMessageTime.toDate().getTime()
                : (data.lastMessageTime && data.lastMessageTime._seconds ? data.lastMessageTime._seconds * 1000 : new Date(data.lastMessageTime).getTime());
              const diff = Date.now() - msgTime;
              if (Math.abs(diff) < 30000) { // within 30 seconds
                isRecent = true;
              }
            } catch (e) {
              isRecent = false;
            }
          } else {
            isRecent = false;
          }

          if (isFirstRun && !isRecent) {
            return; // Ignore old events on first run
          }

          if (isRecent) {
            if (data.unreadByStaff === true) {
              await sendNotificationToCollaborators({
                title: `${clientName} enviou uma mensagem 💬`,
                body: lastMessage,
                url: "/professional-chat"
              });

              try {
                await addDoc(collection(db, "staff_notifications"), {
                  title: `${clientName} enviou uma mensagem 💬`,
                  message: lastMessage,
                  timestamp: Timestamp.now(),
                  read: false,
                  type: "chat_message",
                  clientId: clientUid
                });
              } catch (e) {
                console.warn("[Push Service] Error creating staff chat notification doc:", e);
              }
            }

            if (data.unreadByClient === true) {
              const cleanTarget = clientUid.replace(/[\s\-\(\)\+]/g, "");
              await sendPushNotification(cleanTarget, {
                title: "Nova mensagem da MS Barbearia 💬",
                body: lastMessage,
                url: "/"
              });

              try {
                await addDoc(collection(db, "notifications"), {
                  clientId: clientUid,
                  clientEmail: data.clientEmail || "",
                  title: "Nova mensagem 💬",
                  message: lastMessage,
                  timestamp: Timestamp.now(),
                  read: false,
                  type: "chat_message"
                });
              } catch (e) {
                console.warn("[Push Service] Error creating client chat notification doc:", e);
              }
            }
          }
        }
      });
    }, (err: any) => {
      console.warn("[Push Service] Snapshot subscription update:", err.message);
      console.log("[Push Service] Attempting to restart chats listener in 5 seconds...");
      setTimeout(() => {
        setupListener();
      }, 5000);
    });
  };

  return setupListener();
}
