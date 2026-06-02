import { initVapid } from "../src/server/pushNotificationService";

export default async function handler(req: any, res: any) {
  // CORS configuration
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const vapid = await initVapid();
    return res.status(200).json({ publicKey: vapid.publicKey });
  } catch (err: any) {
    console.error("[Push Config Vercel Error]:", err.message);
    return res.status(500).json({ error: err.message || "Failed to load push configuration" });
  }
}
