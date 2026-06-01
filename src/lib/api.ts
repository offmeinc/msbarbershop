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
      console.error(`[API] Expected JSON but got ${contentType || 'unknown'}:`, text.substring(0, 500));
      
      if (!response.ok) {
        throw new Error(`Erro no servidor (${response.status}): Resposta inválida.`);
      }
      throw new Error("O servidor retornou uma resposta inesperada (não JSON). Verifique se o backend está rodando.");
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `Erro do servidor: ${response.status}`);
    }
    
    return data;
  } catch (error: any) {
    console.error(`[API Error] Request to ${url} failed:`, error.message);
    throw error;
  }
}
