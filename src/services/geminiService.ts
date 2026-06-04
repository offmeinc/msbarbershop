import { GoogleGenAI } from "@google/genai";

export async function getBusinessInsights(stats: any) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
    const prompt = `Você é um consultor especializado em barbearias. Analise os seguintes dados de desempenho da barbearia na última semana e forneça um resumo curto (máximo 4 tópicos) com insights práticos para o barbeiro aumentar o faturamento ou melhorar o serviço.
    
    Dados:
    - Faturamento Total: R$ ${stats.totalRevenue.toFixed(2)}
    - Média de Avaliação: ${stats.avgRating.toFixed(1)} estrelas
    - Taxa de Retenção: ${stats.retentionRate.toFixed(1)}%
    - Serviços mais procurados: ${stats.popularServices?.join(", ") || "Dados não disponíveis"}
    - Número de Clientes: ${stats.totalClients}

    Responda de forma motivadora e em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível carregar os insights no momento. Tente novamente mais tarde.";
  }
}
