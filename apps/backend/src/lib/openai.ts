import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

let client: OpenAI | null = null;

/** Perezoso por el mismo motivo que Stripe: el SDK lanza si falta la apiKey, y
 * construirlo al importar el módulo obligaba a tener la clave para compilar. */
function openaiClient(): OpenAI {
  client ??= new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return client;
}

/** Analiza keyframes de un ejercicio y devuelve 3 correcciones de postura */
export async function analyzeForm(exerciseName: string, frameUrls: string[]): Promise<string> {
  const response = await openaiClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this ${exerciseName} form from the video frames. List 3 specific improvements for better safety and effectiveness. Be concise and actionable.`,
          },
          ...frameUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "No feedback generated.";
}
