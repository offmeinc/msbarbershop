import axios from "axios";
import { db } from "../../../src/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { generatePixString } from "../../../src/lib/pix";

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
    const isPublicKey = Boolean(
      accessToken && /^APP_USR-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accessToken.trim())
    );
    const hasValidToken = Boolean(
      accessToken &&
      accessToken.trim() !== "" &&
      !accessToken.includes("YOUR_TOKEN") &&
      !isPublicKey &&
      accessToken.trim().length > 50
    );

    // Fallback generator for direct Barbearia PIX
    const generateDirectPixResponse = async (fallbackReason?: string) => {
      const directId = "pix-" + Date.now();
      const pixPayload = generatePixString("51992590046", "MS BARBER SHOP", "CACHOEIRINHA", amount);

      await setDoc(doc(db, "payments", directId), {
        id: directId,
        appointmentId: appointmentId || null,
        userId: userId || "guest",
        walletAmountToDeduct: walletAmountToDeduct || 0,
        amount,
        description: description || "Agendamento MS Barbearia",
        status: "pending",
        isDirectPix: true,
        pixPayload: pixPayload,
        fallbackReason: fallbackReason || null,
        createdAt: serverTimestamp()
      });

      return res.json({
        success: true,
        id: directId,
        payment_id: directId,
        isDirectPix: true,
        status: "pending",
        qr_code: pixPayload,
        qr_code_base64: "",
        ticket_url: "https://pix.bcb.gov.br"
      });
    };

    if (!hasValidToken) {
      console.warn("[Vercel MP API] Token not configured or Public Key supplied. Returning direct Barbearia PIX.");
      return await generateDirectPixResponse("Token não configurado ou Chave Pública detectada");
    }

    try {
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
          "Authorization": `Bearer ${accessToken.trim()}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        timeout: 12000
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
        id: mpPaymentId,
        payment_id: mpPaymentId,
        isMock: false,
        status: response.data.status,
        status_detail: response.data.status_detail,
        qr_code: response.data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: response.data.point_of_interaction?.transaction_data?.ticket_url
      });
    } catch (mpError: any) {
      console.error("[Vercel MP Route Error]:", mpError.response?.data || mpError.message);
      // Fallback to direct PIX so user is never blocked
      return await generateDirectPixResponse(mpError.response?.data?.message || mpError.message);
    }
  } catch (error: any) {
    console.error("[Create Payment Fatal Error]:", error);
    const errMsg = error.message || "Erro de Integração com o Mercado Pago";
    return res.status(500).json({ success: false, error: errMsg });
  }
}
