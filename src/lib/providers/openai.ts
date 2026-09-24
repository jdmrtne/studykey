import type {
  ProviderAdapter,
  ProviderConfig,
  GenerateRequest,
  GenerateResult,
  TestConnectionResult,
} from "./types";
import { AIServiceError } from "./types";

const API_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(config: ProviderConfig, req: GenerateRequest): Promise<GenerateResult> {
  const messages = [];
  if (req.systemPrompt) messages.push({ role: "system", content: req.systemPrompt });
  messages.push({ role: "user", content: req.userPrompt });

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: req.temperature ?? config.temperature,
        max_tokens: req.maxOutputTokens ?? config.maxOutputTokens ?? 4096,
        ...(req.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch {
    throw new AIServiceError(
      "network_error",
      "Unable to reach OpenAI. Note: OpenAI's API does not enable CORS for direct browser calls from most origins, " +
        "so this may fail even with a valid key — if so, use the 'Other (OpenAI-compatible)' provider with a local " +
        "proxy base URL, or run this app through a backend."
    );
  }

  if (!res.ok) {
    throw mapHttpError(res.status, await safeText(res));
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new AIServiceError("invalid_response", "OpenAI returned no message content.");
  }
  return { text, raw: data };
}

function mapHttpError(status: number, body: string): AIServiceError {
  if (status === 401) {
    return new AIServiceError("invalid_api_key", "Invalid API key. Please check your API key in AI Settings.");
  }
  if (status === 429) {
    return new AIServiceError(
      "rate_limit",
      "Rate limit reached. Please wait and try again, or switch to another provider/model."
    );
  }
  if (status === 402) {
    return new AIServiceError(
      "insufficient_quota",
      "Your API provider reported that the account has insufficient quota."
    );
  }
  if (status === 404) {
    return new AIServiceError("model_unavailable", "The selected model is unavailable. Please select another model.");
  }
  return new AIServiceError("unknown", `OpenAI request failed (${status}): ${body.slice(0, 200)}`);
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export const openaiAdapter: ProviderAdapter = {
  id: "openai",
  capabilities: {
    supportsStructuredOutput: true,
    supportsVision: true,
    supportsStreaming: true,
    supportsSystemPrompt: true,
    supportsTemperature: true,
    supportsCustomBaseUrl: false,
  },
  defaultModels: [
    { id: "gpt-6-astra", label: "GPT-6 Astra (most capable)" },
    { id: "gpt-6-sol", label: "GPT-6 Sol (coding & agentic)" },
    { id: "gpt-6-luna", label: "GPT-6 Luna (efficient)" },
    { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
    { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  ],
  async generate(config, req) {
    return callOpenAI(config, req);
  },
  async testConnection(config): Promise<TestConnectionResult> {
    const start = performance.now();
    try {
      await callOpenAI(config, { userPrompt: "Reply with the single word: pong", maxOutputTokens: 8 });
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
