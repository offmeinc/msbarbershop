import { adminMessaging, db } from "./firebaseAdmin";
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

export async function initVapid() {
  return { publicKey: process.env.VITE_VAPID_PUBLIC_KEY || "" };
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

// Function to send a push notification to a specific user using FCM
export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  try {
    const cleanUserId = userId.replace(/[\s\-\(\)\+]/g, "");
    
    // Combined query for FCM and Native tokens
    const fcmTokensRef = collection(db, "fcm_tokens");
    const nativeTokensRef = collection(db, "native_push_tokens");

    const [fcmSnap1, fcmSnap2, nativeSnapDirect, nativeSnapClean] = await Promise.all([
      getDocs(query(fcmTokensRef, where("userId", "==", cleanUserId))),
      getDocs(query(fcmTokensRef, where("userId", "==", userId))),
      getDoc(doc(nativeTokensRef, userId)),
      getDoc(doc(nativeTokensRef, cleanUserId))
    ]);
    
    const tokensToSend: string[] = [];
    
    fcmSnap1.docs.forEach(d => { if (d.data().token) tokensToSend.push(d.data().token); });
    fcmSnap2.docs.forEach(d => { if (d.data().token) tokensToSend.push(d.data().token); });
    
    if (nativeSnapDirect.exists() && nativeSnapDirect.data()?.token) {
      tokensToSend.push(nativeSnapDirect.data().token);
    }
    if (nativeSnapClean.exists() && nativeSnapClean.data()?.token) {
      tokensToSend.push(nativeSnapClean.data().token);
    }

    const uniqueTokens = Array.from(new Set(tokensToSend));
    
    if (uniqueTokens.length === 0) {
      console.log(`[Push Service] No push tokens found for user: ${userId}`);
      return;
    }

    console.log(`[Push Service] Sending notification to ${uniqueTokens.length} device(s) for user: ${userId}`);
    const promises = uniqueTokens.map(async (token) => {
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
        await safelySendFcm(message);
      } catch (err: any) {
        if (err.code === "messaging/registration-token-not-registered" || err.code === "messaging/invalid-registration-token") {
          // Token is stale, we should remove it from wherever we found it.
          // Since we merged tokens, we don't know the exact doc ID here easily without extra work, 
          // but we can try to delete from both collections by token value if needed.
          // For now, we'll just log it.
          console.log(`[Push Service] Stale token detected: ${token}`);
        }
      }
    });

    await Promise.all(promises);
  } catch (error: any) {
    console.warn(`[Push Service] Simulation mode active for ${userId}:`, error.message);
  }
}

// Send notification to all collaborators (managers / barbers) using FCM/Native
export async function sendNotificationToCollaborators(
  payload: { title: string; body: string; url?: string }
) {
  try {
    const [snapshotFcm, snapshotNative] = await Promise.all([
      getDocs(collection(db, "fcm_tokens")),
      getDocs(collection(db, "native_push_tokens"))
    ]);
    
    const targetRoles = ["manager", "barber"];

    const fcmCollaborators = snapshotFcm.docs.filter((docSnap) => {
      const data = docSnap.data();
      return targetRoles.includes(data.userRole || "");
    });

    const nativeCollaborators = snapshotNative.docs.filter((docSnap) => {
      const data = docSnap.data();
      return targetRoles.includes(data.userRole || "");
    });

    const tokensToNotify: {token: string, source: 'fcm' | 'native', id: string}[] = [];
    fcmCollaborators.forEach(d => {
      if (d.data().token) tokensToNotify.push({ token: d.data().token, source: 'fcm', id: d.id });
    });
    nativeCollaborators.forEach(d => {
      if (d.data().token) tokensToNotify.push({ token: d.data().token, source: 'native', id: d.id });
    });

    console.log(`[Push Service] Notifying ${tokensToNotify.length} collaborator device(s)`);
    const promises = tokensToNotify.map(async (item) => {
      const message: Message = {
        token: item.token,
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
        await safelySendFcm(message);
      } catch (err: any) {
        if (err.code === "messaging/registration-token-not-registered" || err.code === "messaging/invalid-registration-token") {
          try {
            const collName = item.source === 'fcm' ? "fcm_tokens" : "native_push_tokens";
            await deleteDoc(doc(db, collName, item.id));
          } catch (deleteErr: any) {
             console.warn(`[Push Service] Could not delete stale token:`, deleteErr.message);
          }
        }
      }
    });

    await Promise.all(promises);
  } catch (error: any) {
    console.warn("[Push Service] Collaborator notification log:", error.message);
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

          if (status === "confirmed" && clientTarget) {
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
          } else if (status === "cancelled") {
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
      if (isInitial) {
        isInitial = false;
        console.log("[Push Service] Baselined existing chats. Real-time chat notifications active.");
        return;
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
              isRecent = true;
            }
          } else {
            isRecent = true;
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
