import type { ProviderConfig } from "./providers/types";

const CONFIG_KEY = "studykey-ai-config";
const REMEMBER_KEY = "studykey-ai-remember-key";

export interface StoredAIConfig extends ProviderConfig {
  /** Never itself persisted — derived from whether apiKey was saved. */
  remembered?: boolean;
}

/**
 * The API key is persisted to localStorage by default (like the rest of
 * the config) so it survives a refresh without any extra action — see
 * `loadConfig` below for the matching default on read. `rememberKey` is
 * still respected as an explicit opt-out: unchecking "Remember API key on
 * this device" in AISettings persists everything except the key itself,
 * for shared/public-computer use.
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
    // No REMEMBER_KEY entry yet means this is a first-ever visit (or an
    // install from before this default changed) — default to remembering,
    // so a key typed in survives a refresh without an extra opt-in step.
    const storedRemember = localStorage.getItem(REMEMBER_KEY);
    const rememberKey = storedRemember === null ? true : storedRemember === "true";

    const parsed: unknown = raw ? JSON.parse(raw) : {};
    // Guard against corrupted/unexpected data (e.g. manually edited
    // localStorage, or a value from an incompatible older version) so a
    // bad value can't crash startup — fall back to an empty config.
    const config =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Partial<ProviderConfig>)
        : {};

    return { config, rememberKey };
  } catch {
    return { config: {}, rememberKey: true };
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
