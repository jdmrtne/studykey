import type {
  ProviderAdapter,
  ProviderConfig,
  GenerateRequest,
  GenerateResult,
  TestConnectionResult,
} from "./types";
import { AIServiceError } from "./types";

function endpointFor(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

async function callGemini(config: ProviderConfig, req: GenerateRequest): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetch(endpointFor(config.model, config.apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: req.userPrompt }] }],
        systemInstruction: req.systemPrompt ? { parts: [{ text: req.systemPrompt }] } : undefined,
        generationConfig: {
          temperature: req.temperature ?? config.temperature,
          maxOutputTokens: req.maxOutputTokens ?? config.maxOutputTokens ?? 4096,
          ...(req.jsonMode
            ? {
                responseMimeType: "application/json",
                // Gemini 2.5 models "think" before answering and that thinking counts against maxOutputTokens,
                // which can leave too little room for a long JSON reply and cut it off. Cap it for structured output
                // (Flash can turn thinking off entirely; Pro can't go below a small minimum).
                thinkingConfig: { thinkingBudget: /flash/i.test(config.model) ? 0 : 1024 },
              }
            : {}),
        },
      }),
    });
  } catch {
    throw new AIServiceError("network_error", "Unable to reach the AI provider. Check your internet connection and try again.");
  }

  if (!res.ok) {
    throw mapHttpError(res.status, await safeText(res));
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) {
    throw new AIServiceError("invalid_response", "Gemini returned no candidate content.");
  }
  return { text, raw: data };
}

function mapHttpError(status: number, body: string): AIServiceError {
  if (status === 400 && /API key/i.test(body)) {
    return new AIServiceError("invalid_api_key", "Invalid API key. Please check your API key in AI Settings.");
  }
  if (status === 401 || status === 403) {
    return new AIServiceError("invalid_api_key", "Invalid API key. Please check your API key in AI Settings.");
  }
  if (status === 429) {
    return new AIServiceError(
      "rate_limit",
      "Rate limit reached. Please wait and try again, or switch to another provider/model."
    );
  }
  if (status === 404) {
    return new AIServiceError("model_unavailable", "The selected model is unavailable. Please select another model.");
  }
  return new AIServiceError("unknown", `Gemini request failed (${status}): ${body.slice(0, 200)}`);
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export const geminiAdapter: ProviderAdapter = {
  id: "gemini",
  capabilities: {
    supportsStructuredOutput: true,
    supportsVision: true,
    supportsStreaming: true,
    supportsSystemPrompt: true,
    supportsTemperature: true,
    supportsCustomBaseUrl: false,
  },
  defaultModels: [
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
    { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  async generate(config, req) {
    return callGemini(config, req);
  },
  async testConnection(config): Promise<TestConnectionResult> {
    const start = performance.now();
    try {
      await callGemini(config, { userPrompt: "Reply with the single word: pong", maxOutputTokens: 8 });
      return { ok: true, responseTimeMs: performance.now() - start };
    } catch (err) {
      return {
        ok: false,
        responseTimeMs: performance.now() - start,
        error: err instanceof AIServiceError ? err : new AIServiceError("unknown", String(err)),
      };
    }
  },
};
