import { AlertTriangle } from "lucide-react";
import { AIServiceError } from "../../lib/aiService";
import { Button } from "../ui/Button";

const MESSAGES: Record<string, { title: string; body: string }> = {
  invalid_api_key: { title: "Invalid API key", body: "Please check your API key in AI Settings." },
  rate_limit: { title: "Rate limit reached", body: "Please wait and try again, or switch to another provider/model." },
  insufficient_quota: { title: "Insufficient quota", body: "Your API provider reported that the account has insufficient quota." },
  model_unavailable: { title: "Model unavailable", body: "The selected model is unavailable. Please select another model." },
  network_error: { title: "Network error", body: "Unable to reach the AI provider. Check your internet connection and try again." },
  invalid_response: { title: "Unexpected response", body: "The AI returned an unexpected response. The generated content was not loaded." },
  unknown: { title: "Something went wrong", body: "The AI request failed unexpectedly." },
};

export function AIErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = error instanceof AIServiceError ? error.kind : "unknown";
  const copy = MESSAGES[kind] ?? MESSAGES.unknown;
  const detail = error instanceof Error ? error.message : String(error);

  return (
    <div className="rounded-2xl border-2 border-danger/40 bg-danger/5 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-danger font-semibold text-sm">
        <AlertTriangle className="w-4 h-4" />
        {copy.title}
      </div>
      <p className="text-sm text-paper/70">{detail && detail !== copy.body ? detail : copy.body}</p>
      {onRetry && (
        <Button variant="ghost" size="md" onClick={onRetry} className="self-start mt-1">
          Retry
        </Button>
      )}
    </div>
  );
}
