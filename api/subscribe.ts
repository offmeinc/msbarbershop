import { db } from "../src/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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

  const { subscription, userId, userRole } = req.body;
  if (!subscription || !userId) {
    return res.status(400).json({ error: "Missing subscription or userId" });
  }

  try {
    const subRef = doc(db, "push_subscriptions", userId);
    await setDoc(subRef, {
      userId,
      userRole: userRole || "client",
      subscription,
      createdAt: serverTimestamp()
    }, { merge: true });
    return res.status(201).json({ success: true });
  } catch (err: any) {
    console.error("[Push Service Vercel] Error saving subscription:", err.message);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
}
