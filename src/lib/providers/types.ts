/**
 * Provider-agnostic contracts. Nothing outside `lib/providers/` and
 * `lib/aiService.ts` should ever import an SDK or know a provider's
 * request/response shape — the rest of the app only sees this file.
 */

export type ProviderId = "anthropic" | "openai" | "gemini" | "groq" | "openrouter" | "custom";

export interface ProviderCapabilities {
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsSystemPrompt: boolean;
  supportsTemperature: boolean;
  supportsCustomBaseUrl: boolean;
}

export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  /** Only meaningful for provider === "custom" (OpenAI-compatible). */
  baseUrl?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Ask the adapter to constrain output to valid JSON when the provider supports it. */
  jsonMode?: boolean;
}

export interface GenerateResult {
  text: string;
  raw?: unknown;
}

export type AIErrorKind =
  | "invalid_api_key"
  | "rate_limit"
  | "insufficient_quota"
  | "model_unavailable"
  | "network_error"
  | "invalid_response"
  | "unknown";

export class AIServiceError extends Error {
  kind: AIErrorKind;
  constructor(kind: AIErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "AIServiceError";
  }
}

export interface TestConnectionResult {
  ok: boolean;
  responseTimeMs: number;
  error?: AIServiceError;
}

/**
 * Every provider adapter implements exactly this. The rest of the app
 * (aiService, prompts, UI) only ever talks to this interface — see
 * section 4/13 of the architecture spec.
 */
export interface ProviderAdapter {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  defaultModels: ModelOption[];
  generate(config: ProviderConfig, req: GenerateRequest): Promise<GenerateResult>;
  testConnection(config: ProviderConfig): Promise<TestConnectionResult>;
}
