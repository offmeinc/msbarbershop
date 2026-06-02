import { db } from "../../src/lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  runTransaction, 
  Timestamp, 
  addDoc, 
  collection 
} from "firebase/firestore";

export default async function handler(req: any, res: any) {
  // CORS configuration
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
        console.error("Error creating staff notification on Vercel serverless:", notifierErr);
      }
    }

    return res.status(200).json({ success: true, refundedAmount });
  } catch (e: any) {
    console.error("[Vercel Cancellation Error]:", e.message);
    return res.status(500).json({ error: e.message || "Failed to cancel appointment" });
  }
}
