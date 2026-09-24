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
    { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5 (via OpenRouter)" },
    { id: "openai/gpt-6-sol", label: "GPT-6 Sol (via OpenRouter)" },
    { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash (via OpenRouter)" },
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
