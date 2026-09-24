import type {
  ProviderAdapter,
  ProviderId,
  ProviderConfig,
  GenerateRequest,
  GenerateResult,
  TestConnectionResult,
} from "./providers/types";
import { AIServiceError } from "./providers/types";
import { anthropicAdapter } from "./providers/anthropic";
import { openaiAdapter } from "./providers/openai";
import { geminiAdapter } from "./providers/gemini";
import { groqAdapter } from "./providers/groq";
import { openrouterAdapter } from "./providers/openrouter";
import { customAdapter } from "./providers/custom";

const adapters: Record<ProviderId, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
  custom: customAdapter,
};

export function getAdapter(provider: ProviderId): ProviderAdapter {
  return adapters[provider];
}

export function listProviders(): ProviderAdapter[] {
  return Object.values(adapters);
}

/**
 * Everything downstream (Reviewer Generator, Quiz Generator, Flashcard
 * Generator) calls only these two functions. None of it imports a
 * provider adapter directly or knows which provider is active — see
 * architecture spec section 4.
 */
export async function generate(config: ProviderConfig, req: GenerateRequest): Promise<GenerateResult> {
  if (!config.apiKey) {
    throw new AIServiceError("invalid_api_key", "No API key configured. Connect an AI provider in AI Settings.");
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new AIServiceError(
      "network_error",
      "You're offline. AI generation needs an internet connection — your saved study materials are still available."
    );
  }
  const adapter = getAdapter(config.provider);
  return adapter.generate(config, req);
}

export async function testConnection(config: ProviderConfig): Promise<TestConnectionResult> {
  if (!config.apiKey) {
    return {
      ok: false,
      responseTimeMs: 0,
      error: new AIServiceError("invalid_api_key", "No API key entered."),
    };
  }
  const adapter = getAdapter(config.provider);
  return adapter.testConnection(config);
}

/**
 * Ask the model for JSON and parse it. Retries once with a stricter
 * "return ONLY JSON" instruction if the first parse fails, per spec
 * section 12 (never render malformed AI output).
 */
export async function generateJSON<T>(
  config: ProviderConfig,
  req: GenerateRequest,
  validate: (value: unknown) => value is T
): Promise<T> {
  const adapter = getAdapter(config.provider);
  const jsonMode = adapter.capabilities.supportsStructuredOutput;

  const attempt = async (strict: boolean): Promise<T> => {
    const result = await generate(config, {
      ...req,
      jsonMode,
      systemPrompt: strict
        ? `${req.systemPrompt ?? ""}\n\nRespond with ONLY valid JSON. No prose, no markdown code fences, no commentary before or after.`
        : req.systemPrompt,
    });
    const parsed = tryParseJSON(result.text);
    if (parsed === undefined) {
      // Almost always a reply that hit the output limit mid-JSON (reasoning models spend part of the limit thinking).
      throw new AIServiceError(
        "invalid_response",
        "The AI's reply wasn't complete, valid JSON — it was most likely cut off by the output limit. Raise Max Output Tokens in AI Settings (try 8192 or more) and try again."
      );
    }
    if (!validate(parsed)) {
      throw new AIServiceError(
        "invalid_response",
        "The AI's reply was missing some required fields. Please try again."
      );
    }
    return parsed;
  };

  try {
    return await attempt(false);
  } catch {
    // One repair attempt before giving up, per spec section 12.
    return await attempt(true);
  }
}

function tryParseJSON(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Some models wrap valid JSON in leading/trailing prose — try to
    // find the outermost { ... } or [ ... ] block as a last resort.
    const objMatch = candidate.match(/\{[\s\S]*\}/);
    const arrMatch = candidate.match(/\[[\s\S]*\]/);
    const block = objMatch?.[0] ?? arrMatch?.[0];
    if (!block) return undefined;
    try {
      return JSON.parse(block);
    } catch {
      return undefined;
    }
  }
}

export { AIServiceError };
export type { ProviderConfig, ProviderId };
