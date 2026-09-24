import type { ProviderAdapter, TestConnectionResult } from "./types";
import { AIServiceError } from "./types";
import { callOpenAICompatible } from "./openaiCompatible";

const BASE_URL = "https://api.groq.com/openai/v1";

/**
 * Groq hosts open-weight models (Llama, GPT-OSS, etc.) behind an
 * OpenAI-compatible /chat/completions endpoint, so — like OpenRouter — it
 * can reuse the shared caller rather than duplicating request handling.
 */
export const groqAdapter: ProviderAdapter = {
  id: "groq",
  capabilities: {
    supportsStructuredOutput: true,
    supportsVision: false,
    supportsStreaming: true,
    supportsSystemPrompt: true,
    supportsTemperature: true,
    supportsCustomBaseUrl: false,
  },
  defaultModels: [
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B (Groq)" },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B (Groq)" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (Groq)" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (Groq)" },
  ],
  async generate(config, req) {
    return callOpenAICompatible(BASE_URL, config, req);
  },
  async testConnection(config): Promise<TestConnectionResult> {
    const start = performance.now();
    try {
      await callOpenAICompatible(BASE_URL, config, {
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
