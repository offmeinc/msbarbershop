import { adminDb } from "./firebaseAdmin";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";
import { sendPushNotification } from "./pushNotificationService";

export function getExactAppointmentDate(data: any): Date {
  const baseDate = data.date instanceof AdminTimestamp ? data.date.toDate() : (data.date && data.date._seconds ? new Date(data.date._seconds * 1000) : new Date(data.date));
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
  console.log("[AutoUpdater] Performing historical appointment update using Admin SDK...");
  try {
    const now = new Date();
    const snapshot = await adminDb.collection("appointments").get();
    
    let count = 0;
    const updates = snapshot.docs.map(async (d) => {
      const data = d.data();
      const status = data.status;
      
      if (status !== 'cancelled' && status !== 'completed') {
        const appointmentDate = getExactAppointmentDate(data);
        
        if (appointmentDate < now) {
          count++;
          await d.ref.update({
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
      
      const snapshot = await adminDb.collection("appointments").where("status", "==", "confirmed").get();
      
      const updates = snapshot.docs.map(async (d) => {
        const data = d.data();
        const appointmentDate = getExactAppointmentDate(data);
        
        if (appointmentDate < now) {
          console.log(`[AutoUpdater] Auto-completing appointment: ${d.id}`);
          await d.ref.update({
            status: "completed",
            paymentStatus: "paid"
          });
          return;
        }

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
          
          await d.ref.update({
              twoHourReminderSent: true
          });
        }
      });
      
      await Promise.all(updates);
    } catch (err: any) {
      console.error("[AutoUpdater] Error in auto-updater cycle:", err.message);
    }
  }, 60000);
}
