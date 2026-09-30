import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NavMode = "side" | "top";

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  navMode: NavMode;
  setNavMode: (mode: NavMode) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      navMode: "side",
      setNavMode: (navMode) => set({ navMode }),
    }),
    { name: "scolix-ui" },
  ),
);
