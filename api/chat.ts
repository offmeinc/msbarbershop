import { GoogleGenAI } from "@google/genai";

// Lazy initialize Gemini client inside the Vercel context
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return ai;
}

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

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing or invalid messages parameter" });
  }

  try {
    const aiInstance = getGeminiClient();
    const chat = aiInstance.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: "Você é o assistente virtual da MS Barbearia. Ajude os clientes com dúvidas sobre agendamentos, serviços e carteira digital. Seja amigável e direto.",
      },
    });
    
    // Take the last message text as the prompt
    const lastMessageObj = messages[messages.length - 1];
    const lastMessageText = lastMessageObj ? (lastMessageObj.text || lastMessageObj.content || "") : "";
    
    if (!lastMessageText || lastMessageText.trim() === "") {
      return res.status(400).json({ error: "Missing message text" });
    }

    const response = await chat.sendMessage({ message: lastMessageText });
    return res.status(200).json({ reply: response.text });
  } catch (error: any) {
    console.error("[Chat API Error on Vercel]:", error);
    return res.status(500).json({ error: error.message || "Failed to process chat" });
  }
}
