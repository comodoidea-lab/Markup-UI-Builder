import { create } from "zustand";

interface ToastState {
  message: string;
  visible: boolean;
  show: (message: string, duration?: number) => void;
}

let toastTimer: number | undefined;

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  visible: false,
  show: (message, duration = 2200) => {
    window.clearTimeout(toastTimer);
    set({ message, visible: true });
    toastTimer = window.setTimeout(() => set({ visible: false }), duration);
  },
}));

export const showToast = (message: string, duration?: number) =>
  useToastStore.getState().show(message, duration);
