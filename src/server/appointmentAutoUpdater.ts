import { db } from "./firebaseAdmin";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
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
      });
      
      await Promise.all(updates);
    } catch (err: any) {
      console.error("[AutoUpdater] Error in auto-updater cycle:", err.message);
    }
  }, 60000);
}
