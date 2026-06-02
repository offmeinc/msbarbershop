import { GoogleGenAI } from "@google/genai";

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

  const { professionalName, appointments } = req.body;

  try {
    const summaryAppointments = (appointments || []).map((app: any) => ({
      date: app.date,
      time: app.time,
      clientName: app.clientName,
      serviceName: app.serviceName,
      totalPrice: app.totalPrice || app.price,
      status: app.status,
      paymentStatus: app.paymentStatus
    }));

    const prompt = `Analise a agenda semanal do profissional ${professionalName || "Profissional"} na MS Barbearia.
Aqui estão os agendamentos cadastrados nesta semana:
${JSON.stringify(summaryAppointments, null, 2)}

Por favor, gere uma avaliação de desempenho semanal premium, amigável, acolhedora e extremamente estratégica de negócios em português brasileiro (pt-BR). Organize exatamente com as seguintes seções em Markdown elegante:

### 🌟 Bem-vindo ao seu Resumo Semanal!
(Uma saudação empolgante, reconhecendo o trabalho duro do profissional).

### 📈 Métricas de Ocupação e Faturamento
- **Faturamento Estimado:** R$ [Soma dos preços de agendamentos onde status != 'cancelled']
- **Atendimentos Confirmados:** [Quantidade em confirmed] agendamentos ativos
- **Atendimentos Concluídos:** [Quantidade em completed] cortes
- **Atendimentos Cancelados:** [Quantidade em cancelled] cancelados
- **Taxa de Comparecimento estimada:** [Porcentagem baseada em concluídos/(concluídos + cancelados), se aplicável]

### ⚡ Destaques de Demanda
(Indicar os serviços que foram mais procurados no período e os horários de pico).

### 🎯 Plano de Ação Estratégico AI
(2 a 3 sugestões super práticas exclusivas para este profissional: como preencher horários de menor movimento, técnicas de upsell de produtos como pomadas/óleos ou serviços combinados barbinha+cabelo).

Seja motivador, conciso e profissional em português do Brasil! Garanta que os valores estimados em reais sejam calculados de maneira razoavelmente correta baseando-se nos preços de agendamentos não cancelados informados.`;

    const aiInstance = getGeminiClient();
    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.status(200).json({ report: response.text });
  } catch (error: any) {
    console.error("[Weekly Report API Error on Vercel]:", error);
    return res.status(500).json({ error: error.message || "Failed to generate report" });
  }
}
