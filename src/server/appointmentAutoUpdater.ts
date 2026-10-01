import { db } from "./firebaseAdmin";
import { collection, getDocs, query, where, updateDoc, doc, addDoc, Timestamp } from "firebase/firestore";
import { sendPushNotification } from "./pushNotificationService";

export function getExactAppointmentDate(data: any): Date {
  const baseDate = data.date && typeof data.date.toDate === "function"
    ? data.date.toDate()
    : (data.date && data.date._seconds ? new Date(data.date._seconds * 1000) : new Date(data.date));
  if (data.time && typeof data.time === "string") {
    const parts = data.time.split(":");
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      baseDate.setHours(hours, minutes, 0, 0);
    }
  }
  return baseDate;
}

export async function performHistoricalAppointmentUpdate() {
  console.log("[AutoUpdater] Performing historical appointment update using Client SDK...");
  try {
    const now = new Date();
    const snapshot = await getDocs(collection(db, "appointments"));
    
    let count = 0;
    const updates = snapshot.docs.map(async (d) => {
      const data = d.data();
      const status = data.status;
      
      if (status !== 'cancelled' && status !== 'completed') {
        const appointmentDate = getExactAppointmentDate(data);
        
        if (appointmentDate < now) {
          count++;
          await updateDoc(doc(db, "appointments", d.id), {
            status: "completed",
            paymentStatus: "paid"
          });
        }
      }
    });
    
    await Promise.all(updates);
    console.log(`[AutoUpdater] Successfully updated ${count} historical appointments.`);
  } catch (err: any) {
    console.error("[AutoUpdater] Error in historical update:", err.message);
  }
}

export function startAppointmentAutoUpdater() {
  console.log("[AutoUpdater] Initializing appointment auto-updater service...");
  
  performHistoricalAppointmentUpdate();

  setInterval(async () => {
    try {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      
      const q = query(collection(db, "appointments"), where("status", "==", "confirmed"));
      const snapshot = await getDocs(q);
      
      const updates = snapshot.docs.map(async (d) => {
        const data = d.data();
        const appointmentDate = getExactAppointmentDate(data);
        
        if (appointmentDate < now) {
          console.log(`[AutoUpdater] Auto-completing appointment: ${d.id}`);
          await updateDoc(doc(db, "appointments", d.id), {
            status: "completed",
            paymentStatus: "paid"
          });
          return;
        }

        // 1. Send the 2-hour reminder
        if (appointmentDate > now && appointmentDate <= twoHoursFromNow && !data.twoHourReminderSent) {
          const rawTarget = data.clientId && data.clientId !== "guest" ? data.clientId : data.clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          
          if (clientTarget) {
              await sendPushNotification(clientTarget, {
                  title: "Lembrete de Horário! 💈⏳",
                  body: `Faltam 2 horas para o seu agendamento de ${data.serviceName} às ${data.time}. Te esperamos!`,
                  url: "/"
              });
          }
          
          await updateDoc(doc(db, "appointments", d.id), {
              twoHourReminderSent: true
          });
        }

        // 2. Send the 1-hour reminder
        if (appointmentDate > now && appointmentDate <= oneHourFromNow && !data.oneHourReminderSent) {
          const rawTarget = data.clientId && data.clientId !== "guest" ? data.clientId : data.clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          
          if (clientTarget) {
              await sendPushNotification(clientTarget, {
                  title: "Está quase na hora! 💈⏳",
                  body: `Seu agendamento de ${data.serviceName} é em 1 hora (às ${data.time}). Até logo!`,
                  url: "/"
              });
          }
          
          await updateDoc(doc(db, "appointments", d.id), {
              oneHourReminderSent: true
          });
        }

        // 3. Send the 15-minute barber reminder
        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
        if (appointmentDate > now && appointmentDate <= fifteenMinutesFromNow && !data.barberFifteenMinReminderSent) {
          const barberId = data.barberId;
          const barberName = data.barberName || "Barbeiro";
          const clientName = data.clientName || "Cliente";
          const serviceName = data.serviceName || "Serviço";
          const time = data.time || "";

          if (barberId) {
            console.log(`[AutoUpdater] Sending 15-min reminder to barber: ${barberId} (${barberName})`);
            
            // Send Push Notification directly to the barber
            await sendPushNotification(barberId, {
              title: "Atendimento em 15 minutos! 💈⏰",
              body: `Faltam 15 minutos para o seu atendimento de ${serviceName} com o cliente ${clientName} às ${time}.`,
              url: "/agenda"
            });

            // Log inside staff_notifications collection so it appears on the professional feed/wall
            try {
              await addDoc(collection(db, "staff_notifications"), {
                title: "Atendimento Próximo! ⏳",
                message: `Seu agendamento de ${serviceName} com ${clientName} é em 15 minutos (às ${time}).`,
                timestamp: Timestamp.now(),
                read: false,
                type: "barber_reminder",
                clientId: data.clientId || "guest",
                appointmentId: d.id,
                barberId: barberId
              });
            } catch (e) {
              console.warn("[AutoUpdater] Error creating staff notification for barber 15-min reminder:", e);
            }
          }

          await updateDoc(doc(db, "appointments", d.id), {
            barberFifteenMinReminderSent: true
          });
        }
      });
      
      await Promise.all(updates);
    } catch (err: any) {
      console.error("[AutoUpdater] Error in auto-updater cycle:", err.message);
    }
  }, 60000);

  // Check for haircut renewal reminders every 6 hours
  setTimeout(() => {
    checkAndSendHaircutRenewalReminders();
  }, 10000);
  setInterval(() => {
    checkAndSendHaircutRenewalReminders();
  }, 6 * 60 * 60 * 1000);
}

export async function checkAndSendHaircutRenewalReminders() {
  console.log("[AutoUpdater] Checking clients for haircut renewal reminders...");
  try {
    const now = new Date();
    const twentyOneDaysAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    const snapshot = await getDocs(collection(db, "appointments"));
    const clientLastCompletedMap = new Map<string, any>();
    const clientHasUpcoming = new Set<string>();

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const rawTarget = data.clientId && data.clientId !== "guest" ? data.clientId : data.clientPhone;
      if (!rawTarget) return;
      const targetId = rawTarget.replace(/[\s\-\(\)\+]/g, "");

      const appDate = getExactAppointmentDate(data);
      if (data.status === "completed") {
        const existing = clientLastCompletedMap.get(targetId);
        if (!existing || appDate > existing.date) {
          clientLastCompletedMap.set(targetId, {
            date: appDate,
            barberName: data.barberName,
            clientName: data.clientName,
            serviceName: data.serviceName,
            clientId: data.clientId,
            clientPhone: data.clientPhone
          });
        }
      } else if (data.status !== "cancelled" && appDate >= now) {
        clientHasUpcoming.add(targetId);
      }
    });

    let sentCount = 0;
    for (const [targetId, info] of clientLastCompletedMap.entries()) {
      if (clientHasUpcoming.has(targetId)) continue;
      if (info.date <= twentyOneDaysAgo && info.date >= fortyFiveDaysAgo) {
        const daysSince = Math.round((now.getTime() - info.date.getTime()) / (1000 * 60 * 60 * 24));
        
        try {
          await sendPushNotification(targetId, {
            title: "Hora de Renovar seu Corte! 💈✂️",
            body: `Já se passaram ${daysSince} dias desde seu último corte com ${info.barberName || "a gente"}. Mantenha o visual alinhado!`,
            url: "/"
          });

          await addDoc(collection(db, "notifications"), {
            title: "Hora de Renovar seu Corte! 💈✂️",
            message: `Já faz ${daysSince} dias desde seu último atendimento. Que tal garantir seu horário para renovar o corte?`,
            timestamp: Timestamp.now(),
            read: false,
            type: "haircut_renewal",
            clientId: info.clientId || targetId
          });
          sentCount++;
        } catch (e: any) {
          console.warn("[AutoUpdater] Failed to send automated renewal to", targetId, e.message);
        }
      }
    }
    console.log(`[AutoUpdater] Haircut renewal cycle complete: ${sentCount} reminders sent.`);
  } catch (err: any) {
    console.error("[AutoUpdater] Error in haircut renewal cycle:", err.message);
  }
}
