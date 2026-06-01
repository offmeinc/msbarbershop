import { getBackendUrl } from "./pushRegister";
import { safeStringify } from "./firebase";

export async function safeFetch(path: string, options: RequestInit = {}): Promise<any> {
  const url = getBackendUrl(path);
  
  try {
    const response = await fetch(url, options);
    
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    
    if (!isJson) {
      const text = await response.text();
      const isHtml = text.toLowerCase().includes("<html");

      if (!response.ok) {
        if (response.status === 404 && isHtml) {
           throw new Error(`Erro 404: O servidor não encontrou o endpoint "${path}". Se estiver usando celular ou domínio customizado, verifique se a variável VITE_BACKEND_URL está configurada corretamente.`);
        }
        throw new Error(`Erro no servidor (${response.status}): Resposta não configurada para JSON.`);
      }
      
      throw new Error(`O servidor retornou uma resposta inesperada (${contentType || 'texto/plano'}). Verifique se o backend está ativo.`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `Erro do servidor: ${response.status}`);
    }
    
    return data;
  } catch (error: any) {
    if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
       throw new Error(`Falha de conexão com o servidor. Verifique sua internet ou se o URL do backend (${url}) está correto.`);
    }
    console.error(`[API Error] Request to ${url} failed:`, error.message);
    throw error;
  }
}
