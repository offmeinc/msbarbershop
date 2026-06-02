import axios from "axios";
import { db } from "../../../../src/lib/firebase";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  addDoc,
  collection, 
  serverTimestamp, 
  increment, 
  Timestamp, 
  runTransaction, 
  query, 
  where, 
  getDocs, 
  limit 
} from "firebase/firestore";
import { sendPushNotification, sendNotificationToCollaborators } from "../../../../src/server/pushNotificationService";

async function processApprovedPayment(paymentDoc: any) {
  const { appointmentId, amount, userId, email, id: paymentId } = paymentDoc;
  console.log(`[Vercel Serverless Processor] Processing approved payment: ${paymentId} for target ${appointmentId}`);

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
        const userRef = doc(db, "users", parsedUserId);
        const paymentRef = doc(db, "payments", String(paymentId));
        let totalAdded = 0;
        let bonus = 0;
        let userData: any = null;

        await runTransaction(db, async (t) => {
          const pSnap = await t.get(paymentRef);
          if (!pSnap.exists()) return;
          const pData = pSnap.data();
          if (pData.processedWallet) {
            console.log(`[Vercel Serverless Processor] Payment ${paymentId} already processed for wallet.`);
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
            updatedAt: serverTimestamp()
          });

          t.update(paymentRef, {
            processedWallet: true,
            updatedAt: serverTimestamp()
          });
        });

        if (totalAdded > 0 && userData) {
          try {
            await addDoc(collection(db, "notifications"), {
              clientEmail: email || userData.email || "",
              message: `Recarga Aprovada! R$ ${totalAdded.toFixed(2).replace(".", ",")} adicionados à sua Carteira Digital através do Pix Mercado Pago.`,
              timestamp: serverTimestamp(),
              read: false
            });

            await sendPushNotification(parsedUserId, {
              title: "Recarga Aprovada! 💰",
              body: `Seu Pix de R$ ${amount.toFixed(2).replace(".", ",")} foi recebido! R$ ${totalAdded.toFixed(2).replace(".", ",")} foram adicionados na sua carteira.`,
              url: "/"
            });
          } catch (notifErr: any) {
            console.error("[Vercel Serverless Processor] Push Notification Skip/Error:", notifErr.message);
          }
          console.log(`[Vercel Serverless Processor] Successfully topped up wallet of user: ${parsedUserId} with R$ ${totalAdded}`);
        }
      } catch (err: any) {
        console.error(`[Vercel Serverless Processor] Error during wallet topup: ${err.message}`);
      }
    }
  } else if (appointmentId) {
    try {
      const appointmentRef = doc(db, "appointments", appointmentId);
      const paymentRef = doc(db, "payments", String(paymentId));
      let shouldNotify = false;
      let appData: any = null;

      await runTransaction(db, async (t) => {
        const pSnap = await t.get(paymentRef);
        const pData = pSnap.exists() ? pSnap.data() : null;

        if (pData?.processedAppointment) {
          console.log(`[Vercel Serverless Processor] Payment ${paymentId} already processed for appointment ${appointmentId}.`);
          return;
        }

        const appSnap = await t.get(appointmentRef);
        if (!appSnap.exists()) {
          console.warn(`[Vercel Serverless Processor] Appointment ${appointmentId} not found.`);
          return;
        }

        appData = appSnap.data();
        if (appData.status === "confirmed" && appData.paymentStatus === "paid") {
          return;
        }

        if (pData?.walletAmountToDeduct > 0 && pData?.userId && pData?.userId !== "guest") {
          const uRef = doc(db, "users", pData.userId);
          t.update(uRef, {
            walletBalance: increment(-pData.walletAmountToDeduct),
            updatedAt: serverTimestamp()
          });
        }

        t.update(appointmentRef, {
          status: "confirmed",
          paymentStatus: "paid",
          updatedAt: serverTimestamp()
        });

        if (pSnap.exists()) {
          t.update(paymentRef, {
            processedAppointment: true,
            updatedAt: serverTimestamp()
          });
        }
        shouldNotify = true;
      });

      if (shouldNotify && appData) {
        const appClientId = appData.clientId;
        if (appClientId && appClientId !== "guest") {
          try {
            const userRef = doc(db, "users", appClientId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.referredBy && !userData.referralRewardTriggered) {
                const appsQuery = query(
                  collection(db, "appointments"),
                  where("clientId", "==", appClientId),
                  where("paymentStatus", "==", "paid"),
                  limit(2)
                );
                const appsSnap = await getDocs(appsQuery);
                if (appsSnap.size === 1) {
                  const referrerQuery = query(collection(db, "users"), where("referralCode", "==", userData.referredBy));
                  const referrerSnap = await getDocs(referrerQuery);
                  if (!referrerSnap.empty) {
                    const referrerDoc = referrerSnap.docs[0];
                    const referrerId = referrerDoc.id;
                    await runTransaction(db, async (rt) => {
                      rt.update(doc(db, "users", referrerId), {
                        walletBalance: increment(5),
                        updatedAt: serverTimestamp()
                      });
                      rt.update(userRef, {
                        referralRewardTriggered: true,
                        updatedAt: serverTimestamp()
                      });
                    });
                    console.log(`[Referral Vercel] User ${referrerId} rewarded for referral of ${appClientId}`);
                    try {
                      await sendPushNotification(referrerId, {
                        title: "Bônus de Indicação! 🎁",
                        body: `Você ganhou R$ 5,00 pois um amigo que você indicou acaba de realizar o primeiro corte!`,
                        url: "/"
                      });
                    } catch (notifErr2) {}
                  }
                }
              }
            }
          } catch (refErr: any) {
            console.error("[Referral Processor Vercel Error]:", refErr.message);
          }
        }

        const clientName = appData.clientName || "Cliente";
        const serviceName = appData.serviceName || "Serviço";
        const barberName = appData.barberName || "Profissional";
        const appClientIdForNotify = appData.clientId || "guest";
        const clientPhone = appData.clientPhone || "";
        let formattedDateStr = "";

        if (appData.date) {
          try {
            const dateVal = appData.date instanceof Timestamp ? appData.date.toDate() : new Date(appData.date);
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

        try {
          await sendNotificationToCollaborators({
            title: "Novo Pagamento Pix Confirmado! 📱",
            body: `Pix de ${clientName} aprovado para ${serviceName} às ${appData.time} com ${barberName}.`,
            url: "/agenda"
          });

          const rawTarget = appClientIdForNotify && appClientIdForNotify !== "guest" ? appClientIdForNotify : clientPhone;
          const clientTarget = rawTarget ? rawTarget.replace(/[\s\-\(\)\+]/g, "") : "";
          if (clientTarget) {
            await sendPushNotification(clientTarget, {
              title: "Pagamento Confirmado! ✅",
              body: `Seu Pix foi recebido! Seu agendamento de ${serviceName} para ${formattedDateStr} está confirmado.`,
              url: "/"
            });
          }
        } catch (notifErr3: any) {
          console.error("[Push error skipped]:", notifErr3.message);
        }
        console.log(`[Vercel Serverless Processor] Confirmed appointment: ${appointmentId} due to payment ${paymentId}`);
      }
    } catch (err: any) {
      console.error(`[Vercel Serverless Processor] Error during appointment payment confirmation: ${err.message}`);
    }
  }
}

export default async function handler(req: any, res: any) {
  // CORS configuration
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { paymentId } = req.query;

    if (!paymentId || paymentId.trim() === "") {
      return res.status(400).json({ error: "Parâmetro paymentId ausente" });
    }

    const paymentRef = doc(db, "payments", String(paymentId));
    const paymentSnap = await getDoc(paymentRef);

    if (!paymentSnap.exists()) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const paymentData = paymentSnap.data();

    // If it's already approved, output directly
    if (paymentData.status === "approved" || paymentData.status === "completed") {
      return res.json({ status: "approved" });
    }

    // If it's a real payment, try fetching latest from Mercado Pago directly to sync state
    if (!paymentData.isMock && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      try {
        const mpResponse = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
          }
        });

        const currentMpStatus = mpResponse.data.status;
        if (currentMpStatus === "approved") {
          await updateDoc(paymentRef, {
            status: "approved",
            updatedAt: serverTimestamp()
          });
          await processApprovedPayment({ id: paymentId, ...paymentData, status: "approved" });
          return res.json({ status: "approved" });
        }
      } catch (mpError: any) {
        console.error("[Vercel Serverless Polling] Error verifying on MP:", mpError.message);
      }
    }

    return res.json({ status: paymentData.status });
  } catch (e: any) {
    console.error("[Vercel Serverless Polling Error]:", e.message);
    return res.status(500).json({ error: "Failed to check status" });
  }
}
