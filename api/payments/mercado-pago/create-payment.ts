import axios from "axios";
import { db } from "../../../src/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { transaction_amount, description, email, name, appointmentId, userId: providedUserId, walletAmountToDeduct } = req.body;
  const amount = Number(transaction_amount);

  try {
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Valor de transação inválido" });
    }

    let userId = providedUserId || "guest";
    if (userId === "guest" && appointmentId && appointmentId.startsWith("wallet-topup-")) {
      const withoutPrefix = appointmentId.substring("wallet-topup-".length);
      const lastDash = withoutPrefix.lastIndexOf("-");
      if (lastDash > 0) {
        userId = withoutPrefix.substring(0, lastDash);
      } else if (withoutPrefix.length > 0) {
        userId = withoutPrefix;
      }
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken || accessToken.trim() === "") {
      return res.status(400).json({ 
        error: "Token de acesso do Mercado Pago não configurado. Por favor configure a variável MERCADO_PAGO_ACCESS_TOKEN." 
      });
    }

    const idempotencyKey = "mp-pix-" + Math.random().toString(36).substring(2) + Date.now().toString();
    const response = await axios.post("https://api.mercadopago.com/v1/payments", {
      transaction_amount: amount,
      description: description || "Agendamento MS Barbearia",
      payment_method_id: "pix",
      external_reference: appointmentId || userId || "guest",
      payer: {
        email: email || "payment@example.com",
        first_name: name || "Cliente"
      }
    }, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey
      }
    });

    const mpPaymentId = String(response.data.id);
    await setDoc(doc(db, "payments", mpPaymentId), {
      id: mpPaymentId,
      appointmentId: appointmentId || null,
      userId: userId || "guest",
      walletAmountToDeduct: walletAmountToDeduct || 0,
      amount,
      description: description || "Agendamento MS Barbearia",
      status: response.data.status || "pending",
      email: email || "payment@example.com",
      name: name || "Cliente",
      isMock: false,
      createdAt: serverTimestamp()
    });

    return res.json({
      success: true,
      isMock: false,
      status: response.data.status,
      status_detail: response.data.status_detail,
      qr_code: response.data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: response.data.point_of_interaction?.transaction_data?.qr_code_base64,
      payment_id: mpPaymentId
    });
  } catch (error: any) {
    console.error("[Mercado Pago Route Error]:", error.response?.data || error.message);
    const errMsg = error.response?.data?.message || error.message || "Erro de Integração com o Mercado Pago";
    return res.status(500).json({ error: errMsg });
  }
}
