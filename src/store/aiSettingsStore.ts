import { create } from "zustand";
import type { ProviderConfig, ProviderId } from "../lib/providers/types";
import { loadConfig, saveConfig, clearApiKey, clearAllConfig } from "../lib/storage";
import { getAdapter } from "../lib/aiService";

interface AISettingsState {
  config: ProviderConfig;
  rememberKey: boolean;
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

export const useAISettingsStore = create<AISettingsState>((set, get) => ({
  config: {
    provider: defaultProvider,
    apiKey: storedConfig.apiKey ?? "",
    model: storedConfig.model ?? getAdapter(defaultProvider).defaultModels[0]?.id ?? "",
    baseUrl: storedConfig.baseUrl,
    temperature: storedConfig.temperature ?? 0.3,
    maxOutputTokens: storedConfig.maxOutputTokens ?? 4096,
  },
  rememberKey: storedRemember,
  devMode: false,

  setProvider: (provider) =>
    set((s) => ({
      config: { ...s.config, provider, model: getAdapter(provider).defaultModels[0]?.id ?? "" },
    })),
  setApiKey: (apiKey) => set((s) => ({ config: { ...s.config, apiKey } })),
  setModel: (model) => set((s) => ({ config: { ...s.config, model } })),
  setBaseUrl: (baseUrl) => set((s) => ({ config: { ...s.config, baseUrl } })),
  setTemperature: (temperature) => set((s) => ({ config: { ...s.config, temperature } })),
  setMaxOutputTokens: (maxOutputTokens) => set((s) => ({ config: { ...s.config, maxOutputTokens } })),
  setRememberKey: (rememberKey) => set({ rememberKey }),
  setDevMode: (devMode) => set({ devMode }),

  persist: () => {
    const { config, rememberKey } = get();
    saveConfig(config, rememberKey);
  },
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
      rememberKey: false,
    });
  },
}));

// Components read "is an API key configured" via this selector so it
// always reflects the live store value (e.g. `useAISettingsStore(selectIsConfigured)`).
export function selectIsConfigured(s: AISettingsState) {
  return !!s.config.apiKey;
}
