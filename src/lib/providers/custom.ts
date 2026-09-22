import type { ProviderAdapter, TestConnectionResult } from "./types";
import { AIServiceError } from "./types";
import { callOpenAICompatible } from "./openaiCompatible";

/**
 * "Other (OpenAI-compatible API)" — lets users point at any endpoint that
 * implements the /chat/completions shape (local models, self-hosted
 * gateways, less common hosted providers) without a new app release.
 * Not every compatible API implements every OpenAI feature/parameter —
 * this adapter doesn't assume more than the base chat completion.
 */
export const customAdapter: ProviderAdapter = {
  id: "custom",
  capabilities: {
    supportsStructuredOutput: false,
    supportsVision: false,
    supportsStreaming: false,
    supportsSystemPrompt: true,
    supportsTemperature: true,
    supportsCustomBaseUrl: true,
  },
  defaultModels: [],
  async generate(config, req) {
    if (!config.baseUrl) {
      throw new AIServiceError("invalid_response", "No API Base URL configured for the custom provider.");
    }
    return callOpenAICompatible(config.baseUrl, config, req);
  },
  async testConnection(config): Promise<TestConnectionResult> {
    const start = performance.now();
    if (!config.baseUrl) {
      return {
        ok: false,
        responseTimeMs: 0,
        error: new AIServiceError("invalid_response", "No API Base URL configured for the custom provider."),
      };
    }
    try {
      await callOpenAICompatible(config.baseUrl, config, {
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
