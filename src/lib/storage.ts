import type { ProviderConfig } from "./providers/types";

const CONFIG_KEY = "studykey-ai-config";
const REMEMBER_KEY = "studykey-ai-remember-key";

export interface StoredAIConfig extends ProviderConfig {
  /** Never itself persisted — derived from whether apiKey was saved. */
  remembered?: boolean;
}

/**
 * Section 3 of the architecture spec: if "remember API key" is unchecked,
 * the key must not be persisted at all — only provider/model/baseUrl are
 * saved, and apiKey lives in memory (React state) for the session only.
 */
export function saveConfig(config: ProviderConfig, rememberKey: boolean): void {
  const toStore: Partial<ProviderConfig> = {
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
  };
  if (rememberKey) {
    toStore.apiKey = config.apiKey;
  }
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(toStore));
    localStorage.setItem(REMEMBER_KEY, rememberKey ? "true" : "false");
  } catch {
    // Best-effort only — storage may be unavailable (private browsing, quota).
  }
}

export function loadConfig(): { config: Partial<ProviderConfig>; rememberKey: boolean } {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    const rememberKey = localStorage.getItem(REMEMBER_KEY) === "true";
    return { config: raw ? JSON.parse(raw) : {}, rememberKey };
  } catch {
    return { config: {}, rememberKey: false };
  }
}

export function clearApiKey(): void {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      delete parsed.apiKey;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(parsed));
    }
    localStorage.setItem(REMEMBER_KEY, "false");
  } catch {
    // no-op
  }
}

export function clearAllConfig(): void {
  try {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // no-op
  }
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 7)}${"•".repeat(12)}${key.slice(-4)}`;
}
