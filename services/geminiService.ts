
import { GoogleGenAI, Type } from "@google/genai";
import { SheetAnalysis, DataRow } from "../types";

export const analyzeDataWithGemini = async (dataSample: DataRow[]): Promise<SheetAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are an expert Beyblade X Meta Analyst for the WBO (World Beyblade Organization).
    Analyze this tournament result data sample:
    ${JSON.stringify(dataSample, null, 2)}
    
    Tasks:
    1. Summarize the Current Meta: What is the most dominant archetype (Attack, Stamina, Defense, Balance) and part based on the data?
    2. Strategic Insights: Provide 4 key insights about part synergies (e.g., specific Ratchet/Bit pairings for a Blade) or counter-play observed in podium finishes.
    3. Visual Suggestions: Identify the most important trends to chart.
    
    IMPORTANT: Be technical and use Beyblade X terminology (e.g., Extreme Dash, Burst resistance).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          insights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          visualizations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                xAxis: { type: Type.STRING },
                yAxis: { type: Type.STRING },
              },
              required: ["type", "title", "xAxis", "yAxis"]
            }
          }
        },
        required: ["summary", "insights", "visualizations"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as SheetAnalysis;
};
