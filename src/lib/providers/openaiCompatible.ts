import type { ProviderConfig, GenerateRequest, GenerateResult } from "./types";
import { AIServiceError } from "./types";

/**
 * OpenRouter and any "Other (OpenAI-compatible)" backend speak the same
 * /chat/completions wire format as OpenAI. Rather than duplicate the
 * request/response handling in both adapters, they share it here — each
 * adapter only supplies its base URL and any extra headers it needs.
 */
export async function callOpenAICompatible(
  baseUrl: string,
  config: ProviderConfig,
  req: GenerateRequest,
  extraHeaders: Record<string, string> = {}
): Promise<GenerateResult> {
  const messages = [];
  if (req.systemPrompt) messages.push({ role: "system", content: req.systemPrompt });
  messages.push({ role: "user", content: req.userPrompt });

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...extraHeaders,
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
    throw new AIServiceError("network_error", "Unable to reach the AI provider. Check your internet connection and try again.");
  }

  if (!res.ok) {
    const body = await safeText(res);
    throw mapHttpError(res.status, body);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new AIServiceError("invalid_response", "The AI returned an unexpected response. The generated content was not loaded.");
  }
  return { text, raw: data };
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
  return new AIServiceError("unknown", `Request failed (${status}): ${body.slice(0, 200)}`);
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
