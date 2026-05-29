import webpush from "web-push";
import fs from "fs";
import path from "path";
import { 
  collection, 
  onSnapshot, 
  query, 
  getDocs, 
  where, 
  deleteDoc, 
  doc, 
  getDoc,
  Timestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";

// File-based backup for stable VAPID Keys in local environments
const VAPID_FILE = path.join(process.cwd(), "vapid-keys.json");

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

// Ensure VAPID keys are initialized and set up
export function initVapid(): VapidKeys {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    console.log("[Push Service] Using VAPID keys from environment variables.");
    webpush.setVapidDetails(
      "mailto:suporte@barbearia.com",
      publicKey,
      privateKey
    );
    return { publicKey, privateKey };
  }

  // Check if we have saved keys in file
  if (fs.existsSync(VAPID_FILE)) {
    try {
      const keys = JSON.parse(fs.readFileSync(VAPID_FILE, "utf-8")) as VapidKeys;
      if (keys.publicKey && keys.privateKey) {
        console.log("[Push Service] Using saved VAPID keys from vapid-keys.json.");
        webpush.setVapidDetails(
          "mailto:suporte@barbearia.com",
          keys.publicKey,
          keys.privateKey
        );
        return keys;
      }
    } catch (e: any) {
      console.error("[Push Service] Error reading vapid-keys.json:", e.message);
    }
  }

  // Generate new keys and save
  console.log("[Push Service] Generating new stable VAPID Vey pair...");
  const newKeys = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(newKeys, null, 2), "utf-8");
  } catch (e: any) {
    console.error("[Push Service] Failed to write vapid-keys.json:", e.message);
  }

  webpush.setVapidDetails(
    "mailto:suporte@barbearia.com",
    newKeys.publicKey,
    newKeys.privateKey
  );
  return newKeys;
}

// Function to send a push notification to a specific user (and delete if expired)
export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
    const q = query(
      collection(db, "push_subscriptions"),
      where("userId", "==", cleanUserId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`[Push Service] No active push subscriptions found for user: ${cleanUserId}`);
      return;
    }

    console.log(`[Push Service] Sending notification to ${snapshot.size} device(s) for user: ${cleanUserId}`);
    const promises = snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const subscription = data.subscription;

      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err: any) {
        console.error(`[Push Service] Error sending to subscription:`, err.message);
        // If subscription is expired or revoked (410, 404), delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[Push Service] Subscription is dead. Cleaning up subscription: ${docSnap.id}`);
          try {
            await deleteDoc(doc(db, "push_subscriptions", docSnap.id));
          } catch (deleteErr: any) {
            console.error(`[Push Service] Error deleting stale subscription:`, deleteErr.message);
          }
        }
      }
    });

    await Promise.all(promises);
  } catch (error: any) {
    console.error(`[Push Service] Failed to process notification for user ${userId}:`, error.message);
  }
}

// Send notification to all collaborators (managers / barbers)
export async function sendNotificationToCollaborators(
  payload: { title: string; body: string; url?: string }
) {
  try {
    const q = query(collection(db, "push_subscriptions"));
    const snapshot = await getDocs(q);
    const targetRoles = ["manager", "barber"];

    const collaboratorsToNotify = snapshot.docs.filter((docSnap) => {
      const data = docSnap.data();
      return targetRoles.includes(data.userRole || "");
    });

    console.log(`[Push Service] Notifying ${collaboratorsToNotify.length} collaborator devices`);
    const promises = collaboratorsToNotify.map(async (docSnap) => {
      const data = docSnap.data();
      try {
        await webpush.sendNotification(data.subscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await deleteDoc(doc(db, "push_subscriptions", docSnap.id));
        }
      }
    });

    await Promise.all(promises);
  } catch (error: any) {
    console.error("[Push Service] Error in notifying collaborators:", error.message);
  }
}

// Central snapshot listener on "appointments" collection to auto-trigger notifications
export function startAppointmentsListener() {
  console.log("[Push Service] Initializing appointments snapshot service...");
  
  let isInitial = true;
  const initialDocs = new Set<string>();

  // Fetch initial documents first to set the baseline
  const appointmentsRef = collection(db, "appointments");

  const unsubscribe = onSnapshot(appointmentsRef, (snapshot) => {
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

      // Check format of date to display
      let formattedDateStr = "";
      if (data.date) {
        try {
          const dateVal = data.date instanceof Timestamp 
            ? data.date.toDate() 
            : new Date(data.date);
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
        // If it was already in the baseline, ignore it
        if (initialDocs.has(docId)) {
          return;
        }

        console.log(`[Push Service] New appointment created: ${docId}`);
        // 1. Notify Collaborators
        await sendNotificationToCollaborators({
          title: "Novo Agendamento! 📅",
          body: `${clientName} agendou ${serviceName} com ${barberName} em ${formattedDateStr}`,
          url: "/agenda"
        });

        // 2. Notify client (if they registered push, as guest or user)
        const rawTarget = clientId && clientId !== "guest" ? clientId : clientPhone;
        const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
        if (clientTarget) {
          await sendPushNotification(clientTarget, {
            title: "Agendamento Solicitado! 🎉",
            body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi recebido. Aguarde a confirmação!`,
            url: "/"
          });
        }
      }

      if (change.type === "modified") {
        console.log(`[Push Service] Appointment updated: ${docId}`);
        // Look up the transition of status
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
        } else if (status === "cancelled") {
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Agendamento Cancelado ❌",
              body: `Seu agendamento de ${serviceName} para ${formattedDateStr} foi cancelado.`,
              url: urlPath
            });
          }
          // Also notify professional/collaborator
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
  }, (err) => {
    console.error("[Push Service] Snapshot error on appointments:", err.message);
  });

  return unsubscribe;
}
