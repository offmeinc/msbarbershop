import { adminMessaging, adminDb, db } from "./firebaseAdmin";
import type { Message } from "firebase-admin/messaging";
import firebaseConfig from "../../firebase-applet-config.json";
import { Timestamp } from "firebase-admin/firestore";
import { collection, onSnapshot } from "firebase/firestore";

// Service logic
export async function initVapid() {
  // We keep this function so it doesn't break server.ts which imports it.
  // With FCM, VAPID is handled by Firebase config. We can just return a dummy object or read from VITE_VAPID_PUBLIC_KEY.
  return { publicKey: process.env.VITE_VAPID_PUBLIC_KEY || "" };
}

// Function to send a push notification to a specific user using FCM
export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
    
    // Query FCM tokens collection
    const snap1 = await adminDb.collection("fcm_tokens").where("userId", "==", cleanUserId).get();
    const snap2 = await adminDb.collection("fcm_tokens").where("userId", "==", userId).get();
    
    const docMap = new Map();
    snap1.docs.forEach((d) => docMap.set(d.id, d));
    snap2.docs.forEach((d) => docMap.set(d.id, d));
    const uniqueDocs = Array.from(docMap.values());
    
    if (uniqueDocs.length === 0) {
      console.log(`[Push Service] No FCM tokens found for user: ${cleanUserId} or ${userId}`);
      return;
    }

    console.log(`[Push Service] Sending FCM notification to ${uniqueDocs.length} device(s) for user: ${userId}`);
    const promises = uniqueDocs.map(async (docSnap: any) => {
      const data = docSnap.data();
      const token = data.token;

      if (!token) return;

      const message: Message = {
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          url: payload.url || "/",
        },
        webpush: {
          fcmOptions: {
            link: payload.url || "/",
          }
        }
      };

      try {
        await adminMessaging.send(message);
      } catch (err: any) {
        console.error(`[Push Service] Error sending FCM message to token:`, err.message);
        if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token') {
          console.log(`[Push Service] Cleaning up expired token: ${docSnap.id}`);
          try {
            await adminDb.collection("fcm_tokens").doc(docSnap.id).delete();
          } catch (deleteErr: any) {
             console.error(`[Push Service] Error deleting stale token:`, deleteErr.message);
          }
        }
      }
    });

    await Promise.all(promises);
  } catch (error: any) {
    console.error(`[Push Service] Failed to process notification for user ${userId}:`, error.message);
  }
}

// Send notification to all collaborators (managers / barbers) using FCM
export async function sendNotificationToCollaborators(
  payload: { title: string; body: string; url?: string }
) {
  try {
    const snapshot = await adminDb.collection("fcm_tokens").get();
    const targetRoles = ["manager", "barber"];

    const collaboratorsToNotify = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data();
      return targetRoles.includes(data.userRole || "");
    });

    console.log(`[Push Service] Notifying ${collaboratorsToNotify.length} collaborator devices via FCM`);
    const promises = collaboratorsToNotify.map(async (docSnap) => {
      const data = docSnap.data();
      const token = data.token;
      if (!token) return;

      const message: Message = {
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          url: payload.url || "/",
        },
        webpush: {
          fcmOptions: {
            link: payload.url || "/",
          }
        }
      };

      try {
        await adminMessaging.send(message);
      } catch (err: any) {
        if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token') {
          await adminDb.collection("fcm_tokens").doc(docSnap.id).delete();
        }
      }
    });

    await Promise.all(promises);
  } catch (error: any) {
    console.error("[Push Service] Error in notifying collaborators:", error.message);
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
    const clientRef = adminDb.collection("users").doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) return;
    
    const userData = clientSnap.data() || {};
    if (!userData.referredBy || userData.referralConfirmationNotificationTriggered) {
      return;
    }
    
    const appointmentsSnap = await adminDb.collection("appointments").where("clientId", "==", clientId).get();

    const otherConfirmedOrCompleted = appointmentsSnap.docs.filter((d) => {
      const dData = d.data();
      return d.id !== docId && (dData.status === "confirmed" || dData.status === "completed" || dData.status === "done");
    });
    
    if (otherConfirmedOrCompleted.length > 0) {
      await clientRef.update({
        referralConfirmationNotificationTriggered: true
      });
      return;
    }
    
    await clientRef.update({
      referralConfirmationNotificationTriggered: true
    });
    
    const referrersSnap = await adminDb.collection("users").where("referralCode", "==", userData.referredBy).limit(1).get();
    
    await adminDb.collection("notifications").add({
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
      
      await adminDb.collection("notifications").add({
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
  console.log("[Push Service] Initializing with firebase admin SDK snapshot service...");
  
  let isInitial = true;

  const setupListener = () => {
    return onSnapshot(collection(db, "appointments"), (snapshot) => {
      if (isInitial) {
        isInitial = false;
        console.log(`[Push Service] Baselined existing appointments. Real-time notifications active.`);
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        const docId = change.doc.id;
        const data = change.doc.data();

        // Check format of date to display
        let formattedDateStr = "";
        if (data.date) {
          try {
            const dateVal = data.date instanceof Timestamp 
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
          await sendNotificationToCollaborators({
            title: "Novo Agendamento! 📅",
            body: `${clientName} agendou ${serviceName} com ${barberName} em ${formattedDateStr}`,
            url: "/agenda"
          });

          const rawTarget = clientId && clientId !== "guest" ? clientId : clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Agendamento Solicitado! 🎉",
              body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi recebido. Aguarde a confirmação!`,
              url: "/"
            });
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

          if (status === "confirmed" && clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Agendamento Confirmado! ✅",
              body: `Excelente! Seu agendamento de ${serviceName} com ${barberName} foi confirmado para ${formattedDateStr}.`,
              url: urlPath
            });
            await checkAndNotifyReferralFirstAppointmentConfirmed(clientId, clientName, serviceName, formattedDateStr, docId);
          } else if (status === "cancelled") {
            if (clientTarget) {
              await sendPushNotification(clientTarget, {
                title: "Agendamento Cancelado ❌",
                body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi cancelado.`,
                url: urlPath
              });
            }
            await sendNotificationToCollaborators({
              title: "Agendamento Cancelado ⚠️",
              body: `${clientName} cancelou o agendamento de ${serviceName} marcado para ${formattedDateStr}`,
              url: "/agenda"
            });
          } else if (status === "completed" && clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Atendimento Concluído! ⭐",
              body: `Obrigado pela preferência! Avalie seu atendimento e ajude o profissional ${barberName}.`,
              url: urlPath
            });
          }
        }
      });
    }, (err: any) => {
      console.error("[Push Service] Snapshot error on appointments:", err.message);
      console.log("[Push Service] Attempting to restart listener in 5 seconds...");
      setTimeout(() => {
        setupListener();
      }, 5000);
    });
  };

  return setupListener();
}
