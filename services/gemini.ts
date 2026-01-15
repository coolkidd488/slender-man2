
import { GoogleGenAI, Type } from "@google/genai";

// Tenta obter a chave, mas previne erro fatal se não existir no ambiente estático
const getAI = () => {
  try {
    if (process.env.API_KEY) {
      return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  } catch (e) {}
  return null;
};

const ai = getAI();

const FALLBACK_MESSAGES = [
  "ELE ESTÁ ATRÁS DE VOCÊ.",
  "CORRA ENQUANTO PODE.",
  "NÃO OLHE PARA TRÁS.",
  "VOCÊ É O PRÓXIMO.",
  "ELE TE VÊ.",
  "ESTÁ FICANDO TARDE.",
  "A FLORESTA TEM FOME.",
  "O SILÊNCIO É O FIM."
];

export const getCrypticMessage = async (pageCount: number): Promise<string> => {
  if (!ai) return FALLBACK_MESSAGES[pageCount % FALLBACK_MESSAGES.length];
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Gere uma frase curtíssima, enigmática e aterradora que o Slender Man deixaria em uma nota. O jogador coletou ${pageCount} de 8 páginas. Mantenha menos de 10 palavras e em PORTUGUÊS.`,
      config: {
        temperature: 0.9,
        topP: 0.95,
      },
    });
    return response.text || FALLBACK_MESSAGES[pageCount % FALLBACK_MESSAGES.length];
  } catch (error) {
    return FALLBACK_MESSAGES[pageCount % FALLBACK_MESSAGES.length];
  }
};

export const getDeathMessage = async (): Promise<string> => {
  if (!ai) return "VOCÊ NUNCA SAIRÁ DAQUI.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "O jogador foi pego pelo Slender Man na floresta. Escreva uma mensagem de morte curta e arrepiante em PORTUGUÊS.",
      config: {
        temperature: 1,
      },
    });
    return response.text || "FIM DA JORNADA.";
  } catch (error) {
    return "FIM DE JOGO";
  }
};
