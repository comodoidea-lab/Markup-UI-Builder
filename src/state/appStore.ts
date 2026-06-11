import { create } from "zustand";

export type AppMode = "design" | "review";

interface AppState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: "design",
  setMode: (mode) => set({ mode }),
}));
