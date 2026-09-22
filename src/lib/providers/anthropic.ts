import type {
  ProviderAdapter,
  ProviderConfig,
  GenerateRequest,
  GenerateResult,
  TestConnectionResult,
} from "./types";
import { AIServiceError } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";

async function callAnthropic(config: ProviderConfig, req: GenerateRequest): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        // Required for direct browser calls (client-side BYOK, no proxy).
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: req.maxOutputTokens ?? config.maxOutputTokens ?? 4096,
        temperature: req.temperature ?? config.temperature,
        system: req.systemPrompt,
        messages: [{ role: "user", content: req.userPrompt }],
      }),
    });
  } catch (err) {
    throw new AIServiceError(
      "network_error",
      "Unable to reach Anthropic. Check your internet connection, or that your browser isn't blocking the cross-origin request."
    );
  }

  if (!res.ok) {
    throw mapHttpError(res.status, await safeText(res));
  }

  const data = await res.json();
  const textBlock = Array.isArray(data.content)
    ? data.content.find((b: { type: string }) => b.type === "text")
    : undefined;
  if (!textBlock?.text) {
    throw new AIServiceError("invalid_response", "Anthropic returned no text content.");
  }
  return { text: textBlock.text, raw: data };
}

function mapHttpError(status: number, body: string): AIServiceError {
  if (status === 401 || status === 403) {
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
  return new AIServiceError("unknown", `Anthropic request failed (${status}): ${body.slice(0, 200)}`);
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  capabilities: {
    supportsStructuredOutput: true,
    supportsVision: true,
    supportsStreaming: true,
    supportsSystemPrompt: true,
    supportsTemperature: true,
    supportsCustomBaseUrl: false,
  },
  defaultModels: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  async generate(config, req) {
    return callAnthropic(config, req);
  },
  async testConnection(config): Promise<TestConnectionResult> {
    const start = performance.now();
    try {
      await callAnthropic(config, {
        userPrompt: "Reply with the single word: pong",
        maxOutputTokens: 8,
      });
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
