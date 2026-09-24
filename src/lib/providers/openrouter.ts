import type { ProviderAdapter, TestConnectionResult } from "./types";
import { AIServiceError } from "./types";
import { callOpenAICompatible } from "./openaiCompatible";

const BASE_URL = "https://openrouter.ai/api/v1";

export const openrouterAdapter: ProviderAdapter = {
  id: "openrouter",
  capabilities: {
    supportsStructuredOutput: true,
    supportsVision: true,
    supportsStreaming: true,
    supportsSystemPrompt: true,
    supportsTemperature: true,
    supportsCustomBaseUrl: false,
  },
  defaultModels: [
    { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 (via OpenRouter)" },
    { id: "openai/gpt-5.1", label: "GPT-5.1 (via OpenRouter)" },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (via OpenRouter)" },
  ],
  async generate(config, req) {
    return callOpenAICompatible(BASE_URL, config, req, {
      "HTTP-Referer": window.location.origin,
      "X-Title": "Memora",
    });
  },
  async testConnection(config): Promise<TestConnectionResult> {
    const start = performance.now();
    try {
      await callOpenAICompatible(
        BASE_URL,
        config,
        { userPrompt: "Reply with the single word: pong", maxOutputTokens: 8 },
        { "HTTP-Referer": window.location.origin, "X-Title": "Memora" }
      );
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
