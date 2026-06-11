import { create } from "zustand";
import type { AIProvider, AISettings } from "./types";

const STORAGE_KEY = "markup-ai-settings";

const DEFAULTS: AISettings = {
  provider: "anthropic",
  keys: { anthropic: "", openai: "", gemini: "" },
  models: {
    anthropic: "claude-sonnet-4-5",
    openai: "gpt-4o",
    gemini: "gemini-2.5-flash",
  },
};

function loadSettings(): AISettings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored) return DEFAULTS;
    return {
      provider: stored.provider ?? DEFAULTS.provider,
      keys: { ...DEFAULTS.keys, ...stored.keys },
      models: { ...DEFAULTS.models, ...stored.models },
    };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsState extends AISettings {
  settingsOpen: boolean;
  setProvider: (provider: AIProvider) => void;
  setKey: (provider: AIProvider, key: string) => void;
  setModel: (provider: AIProvider, model: string) => void;
  openSettings: (open: boolean) => void;
  hasKey: () => boolean;
}

function persist(state: AISettings) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ provider: state.provider, keys: state.keys, models: state.models }),
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),
  settingsOpen: false,
  setProvider: (provider) => {
    set({ provider });
    persist(get());
  },
  setKey: (provider, key) => {
    set({ keys: { ...get().keys, [provider]: key } });
    persist(get());
  },
  setModel: (provider, model) => {
    set({ models: { ...get().models, [provider]: model } });
    persist(get());
  },
  openSettings: (settingsOpen) => set({ settingsOpen }),
  hasKey: () => Boolean(get().keys[get().provider]),
}));
