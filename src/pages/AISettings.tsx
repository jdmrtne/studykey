import { useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { SelectPills } from "../components/ui/SelectPills";
import { useAISettingsStore } from "../store/aiSettingsStore";
import { getAdapter, listProviders, testConnection } from "../lib/aiService";
import type { ProviderId } from "../lib/providers/types";
import { maskKey } from "../lib/storage";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
  custom: "Other (OpenAI-compatible)",
};

type ConnState = { status: "idle" | "testing" | "success" | "error"; ms?: number; message?: string };

export function AISettings() {
  const {
    config,
    rememberKey,
    devMode,
    setProvider,
    setApiKey,
    setModel,
    setBaseUrl,
    setTemperature,
    setMaxOutputTokens,
    setRememberKey,
    setDevMode,
    persist,
    removeApiKey,
    clearAll,
  } = useAISettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [conn, setConn] = useState<ConnState>({ status: "idle" });
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const adapter = getAdapter(config.provider);
  const providers = listProviders();

  function log(line: string) {
    setDebugLog((l) => [...l.slice(-20), `${new Date().toLocaleTimeString()}  ${line}`]);
  }

  async function handleTest() {
    setConn({ status: "testing" });
    if (devMode) log(`Sending test request to ${PROVIDER_LABELS[config.provider]} (${maskKey(config.apiKey)})...`);
    const result = await testConnection(config);
    if (result.ok) {
      setConn({ status: "success", ms: Math.round(result.responseTimeMs) });
      if (devMode) log(`✓ Received. Response time ${Math.round(result.responseTimeMs)}ms.`);
    } else {
      setConn({ status: "error", message: result.error?.message ?? "Unknown error." });
      if (devMode) log(`✕ Failed: ${result.error?.message}`);
    }
  }

  function handleSave() {
    persist();
    setConn({ status: "idle" });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold">AI Settings</h1>
        <p className="text-paper/60 text-sm mt-1">
          StudyKey is BYOK (Bring Your Own Key) — your API key is used to call your chosen AI provider directly and
          is never sent to any StudyKey server.
        </p>
      </div>

      <Card className="p-6 flex flex-col gap-5">
        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">AI Provider</label>
          <SelectPills
            options={providers.map((p) => p.id)}
            value={config.provider}
            onChange={(id) => setProvider(id as ProviderId)}
            labels={PROVIDER_LABELS}
          />
        </div>

        <TextField
          label="API Key"
          type={showKey ? "text" : "password"}
          value={config.apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setConn({ status: "idle" });
          }}
          placeholder={config.provider === "anthropic" ? "sk-ant-..." : "your API key"}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="text-xs text-paper/50 hover:text-paper -mt-2 self-start flex items-center gap-1.5 py-2 px-1 -mx-1 touch-manipulation"
          onClick={() => setShowKey((v) => !v)}
        >
          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showKey ? "Hide key" : "Show key"}
        </button>

        {adapter.capabilities.supportsCustomBaseUrl && (
          <TextField
            label="API Base URL"
            value={config.baseUrl ?? ""}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://example.com/v1"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
          />
        )}

        <div>
          <label className="text-sm font-semibold text-paper/80 mb-2 block">Model</label>
          {adapter.defaultModels.length > 0 ? (
            <SelectPills
              options={adapter.defaultModels.map((m) => m.id)}
              value={config.model}
              onChange={setModel}
              labels={Object.fromEntries(adapter.defaultModels.map((m) => [m.id, m.label]))}
            />
          ) : (
            <TextField label="Model name" value={config.model} onChange={(e) => setModel(e.target.value)} placeholder="model-name" />
          )}
        </div>

        {adapter.capabilities.supportsTemperature && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <TextField
              label="Temperature"
              type="number"
              inputMode="decimal"
              min={0}
              max={2}
              step={0.1}
              value={config.temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
            <TextField
              label="Max Output Tokens"
              type="number"
              inputMode="numeric"
              min={256}
              step={256}
              value={config.maxOutputTokens}
              onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
            />
          </div>
        )}

        <label className="flex items-center gap-2.5 text-sm text-paper/70 py-1">
          <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} className="accent-signal w-5 h-5 flex-shrink-0" />
          Remember API key on this device
        </label>
        {rememberKey && (
          <p className="text-xs text-amber -mt-3">
            Your API key is stored locally in this browser. Do not enable this on a shared/public computer.
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 pt-2">
          <Button variant="primary" onClick={handleSave} className="w-full sm:w-auto">
            Save Settings
          </Button>
          <Button variant="ghost" onClick={handleTest} disabled={conn.status === "testing"} className="w-full sm:w-auto">
            {conn.status === "testing" ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
            Test Connection
          </Button>
          <Button variant="danger" onClick={removeApiKey} className="w-full sm:w-auto">
            Clear API Key
          </Button>
        </div>

        {conn.status === "success" && (
          <div className="flex items-center gap-2 text-mint text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Connection successful — {PROVIDER_LABELS[config.provider]} / {config.model} — {conn.ms}ms
          </div>
        )}
        {conn.status === "error" && (
          <div className="flex items-start gap-2 text-danger text-sm">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Connection failed. {conn.message}</span>
          </div>
        )}
      </Card>

      <Card className="p-5 text-xs text-paper/50 leading-relaxed">
        <p className="font-semibold text-paper/70 mb-1">BYOK</p>
        <p>
          This application uses your own AI API key. API usage and costs are billed directly by your selected AI
          provider. StudyKey does not provide AI credits and does not sell or share your key.
        </p>
      </Card>

      <Card className="p-5">
        <label className="flex items-center gap-2.5 text-sm font-semibold py-1">
          <input type="checkbox" checked={devMode} onChange={(e) => setDevMode(e.target.checked)} className="accent-signal w-5 h-5 flex-shrink-0" />
          Developer mode
        </label>
        {devMode && (
          <div className="mt-3 rounded-xl bg-ink px-3 py-2 font-mono text-xs text-paper/70 h-32 overflow-y-auto">
            {debugLog.length === 0 ? <p className="text-paper/30">No requests yet.</p> : debugLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </Card>

      <button
        type="button"
        className="text-xs text-danger/80 hover:text-danger self-start py-2 px-1 -mx-1 touch-manipulation"
        onClick={() => {
          if (confirm("Clear all saved AI configuration? This removes your key and settings from this device.")) {
            clearAll();
          }
        }}
      >
        Clear saved configuration
      </button>
    </div>
  );
}
