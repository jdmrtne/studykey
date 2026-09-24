import { create } from "zustand";
import type { ProviderConfig, ProviderId } from "../lib/providers/types";
import { loadConfig, saveConfig, clearApiKey, clearAllConfig } from "../lib/storage";
import { getAdapter } from "../lib/aiService";

interface AISettingsState {
  config: ProviderConfig;
  rememberKey: boolean;
  /** True when the last attempt to write settings to browser storage failed (storage full/blocked). */
  saveFailed: boolean;
  devMode: boolean;
  setProvider: (provider: ProviderId) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setTemperature: (temperature: number) => void;
  setMaxOutputTokens: (n: number) => void;
  setRememberKey: (remember: boolean) => void;
  setDevMode: (on: boolean) => void;
  persist: () => void;
  removeApiKey: () => void;
  clearAll: () => void;
}

const { config: storedConfig, rememberKey: storedRemember } = loadConfig();

const defaultProvider: ProviderId = storedConfig.provider ?? "anthropic";

export const useAISettingsStore = create<AISettingsState>((set, get) => {
  // Every setter below persists immediately after updating state (same
  // load/persist-on-every-change pattern as useLessonsStore), so the API
  // key and the rest of the config survive a refresh as soon as they're
  // entered — the user never has to remember to press "Save Settings" for
  // persistence to actually happen. This was the root cause of the key
  // disappearing on refresh: it only used to persist when a *previous*
  // version of this function was called explicitly.
  function persistNow() {
    const { config, rememberKey } = get();
    const ok = saveConfig(config, rememberKey);
    if (get().saveFailed === ok) set({ saveFailed: !ok });
  }

  return {
    config: {
      provider: defaultProvider,
      apiKey: storedConfig.apiKey ?? "",
      model: storedConfig.model ?? getAdapter(defaultProvider).defaultModels[0]?.id ?? "",
      baseUrl: storedConfig.baseUrl,
      temperature: storedConfig.temperature ?? 0.3,
      maxOutputTokens: storedConfig.maxOutputTokens ?? 4096,
    },
    rememberKey: storedRemember,
    saveFailed: false,
    devMode: false,

    setProvider: (provider) => {
      set((s) => ({
        config: { ...s.config, provider, model: getAdapter(provider).defaultModels[0]?.id ?? "" },
      }));
      persistNow();
    },
    setApiKey: (apiKey) => {
      set((s) => ({ config: { ...s.config, apiKey } }));
      persistNow();
    },
    setModel: (model) => {
      set((s) => ({ config: { ...s.config, model } }));
      persistNow();
    },
    setBaseUrl: (baseUrl) => {
      set((s) => ({ config: { ...s.config, baseUrl } }));
      persistNow();
    },
    setTemperature: (temperature) => {
      set((s) => ({ config: { ...s.config, temperature } }));
      persistNow();
    },
    setMaxOutputTokens: (maxOutputTokens) => {
      set((s) => ({ config: { ...s.config, maxOutputTokens } }));
      persistNow();
    },
    setRememberKey: (rememberKey) => {
      set({ rememberKey });
      // Toggling this off wipes the key from storage right away, not just
      // future saves — otherwise a previously-remembered key would linger
      // in localStorage after the user opts out.
      persistNow();
    },
    setDevMode: (devMode) => set({ devMode }),

    // Kept for the existing "Save Settings" button in AISettings — every
    // setter above already persists on its own, so this is now a harmless,
    // idempotent explicit save rather than the only path to persistence.
    persist: () => persistNow(),
    removeApiKey: () => {
      clearApiKey();
      set((s) => ({ config: { ...s.config, apiKey: "" } }));
    },
    clearAll: () => {
      clearAllConfig();
      const provider: ProviderId = "anthropic";
      set({
        config: {
          provider,
          apiKey: "",
          model: getAdapter(provider).defaultModels[0]?.id ?? "",
          baseUrl: undefined,
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
        rememberKey: true,
      });
    },
  };
});

// Components read "is an API key configured" via this selector so it
// always reflects the live store value (e.g. `useAISettingsStore(selectIsConfigured)`).
export function selectIsConfigured(s: AISettingsState) {
  return !!s.config.apiKey;
}
