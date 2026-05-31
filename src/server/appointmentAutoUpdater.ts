import { collection, query, where, getDocs, updateDoc, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sendPushNotification } from "./pushNotificationService";

export async function performHistoricalAppointmentUpdate() {
  console.log("[AutoUpdater] Performing historical appointment update...");
  try {
    const now = new Date();
    const appointmentsRef = collection(db, "appointments");
    const q = query(appointmentsRef);
    const snapshot = await getDocs(q);
    
    let count = 0;
    const updates = snapshot.docs.map(async (d) => {
      const data = d.data();
      const status = data.status;
      
      // We want to update if it's confirmed, pending, or undefined, AND it hasn't been cancelled.
      if (status !== 'cancelled' && status !== 'completed') {
        const appointmentDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        
        // If the appointment time passed
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
  
  // Run once immediately on start
  performHistoricalAppointmentUpdate();

  // Run check every minute (60,000ms)
  setInterval(async () => {
    try {
      const now = new Date();
      const appointmentsRef = collection(db, "appointments");
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Optimized query
      const q = query(
        appointmentsRef,
        where("status", "==", "confirmed")
      );
      
      const snapshot = await getDocs(q);
      
      const updates = snapshot.docs.map(async (d) => {
        const data = d.data();
        const appointmentDate = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
        
        // 1. Auto-complete past appointments
        if (appointmentDate < now) {
          console.log(`[AutoUpdater] Auto-completing appointment: ${d.id}`);
          await updateDoc(doc(db, "appointments", d.id), {
            status: "completed",
            paymentStatus: "paid"
          });
          return;
        }

        // 2. Reminder Notification (within 1 hour)
        if (appointmentDate > now && appointmentDate <= oneHourFromNow && !data.reminderSent) {
          console.log(`[Reminders] Preparing reminder for appointment: ${d.id}`);
          
          // Double-check latest status in Firestore per requirement
          const latestDoc = await getDoc(doc(db, "appointments", d.id));
          const latestData = latestDoc.data();
          
          if (latestData && latestData.status === "confirmed" && !latestData.reminderSent) {
            const rawTarget = latestData.clientId && latestData.clientId !== "guest" ? latestData.clientId : latestData.clientPhone;
            const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
            
            if (clientTarget) {
                console.log(`[Reminders] Sending notification to ${clientTarget}`);
                await sendPushNotification(clientTarget, {
                    title: "Lembrete de Horário! 💈",
                    body: `Lembrete: seu agendamento de ${latestData.serviceName} é em breve!`,
                    url: "/"
                });
            }
            
            await updateDoc(doc(db, "appointments", d.id), {
                reminderSent: true
            });
          }
        }
      });
      
      await Promise.all(updates);
      
    } catch (err: any) {
      console.error("[AutoUpdater] Error in auto-updater cycle:", err.message);
    }
  }, 60000);
}
